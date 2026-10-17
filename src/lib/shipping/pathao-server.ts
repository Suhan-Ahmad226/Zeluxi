import 'server-only';

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const TOKEN_ROW_ID = 1;
const API_PREFIX = '/aladdin/api/v1';
type TokenResponse = { token_type: string; expires_in: number; access_token: string; refresh_token: string };
export class PathaoApiError extends Error {
  constructor(message: string, readonly status?: number, readonly safeCode = 'PATHAO_REQUEST_FAILED') { super(message); this.name = 'PathaoApiError'; }
}
function config() {
  const mode = (process.env.PATHAO_MODE || 'sandbox').toLowerCase();
  const base = (process.env.PATHAO_BASE_URL || (mode === 'production' ? 'https://api-hermes.pathao.com' : 'https://courier-api-sandbox.pathao.com')).replace(/\/+$/, '');
  if (!['sandbox', 'production'].includes(mode)) throw new PathaoApiError('PATHAO_MODE must be sandbox or production.', undefined, 'CONFIG_INVALID');
  const allowed = mode === 'production' ? 'https://api-hermes.pathao.com' : 'https://courier-api-sandbox.pathao.com';
  if (base !== allowed) throw new PathaoApiError('Pathao base URL does not match the selected environment.', undefined, 'CONFIG_INVALID');
  return { mode, base, clientId: process.env.PATHAO_CLIENT_ID || '', clientSecret: process.env.PATHAO_CLIENT_SECRET || '', username: process.env.PATHAO_USERNAME || '', password: process.env.PATHAO_PASSWORD || '', storeId: Number(process.env.PATHAO_STORE_ID || 0), encryptionKey: process.env.PATHAO_TOKEN_ENCRYPTION_KEY || '' };
}
function encryptionKey(raw: string, strict = true): Buffer | null {
  if (!raw) { if (strict) throw new PathaoApiError('PATHAO_TOKEN_ENCRYPTION_KEY is missing.', undefined, 'CONFIG_INVALID'); return null; }
  const key = /^[a-f0-9]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (key.length !== 32) { if (strict) throw new PathaoApiError('PATHAO_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes.', undefined, 'CONFIG_INVALID'); return null; }
  return key;
}
export function getPathaoConfigStatus() {
  const c = config();
  const credentialsReady = Boolean(c.clientId && c.clientSecret && c.username && c.password);
  const encryptionReady = encryptionKey(c.encryptionKey, false) !== null;
  return {
    configured: credentialsReady && encryptionReady,
    environment: credentialsReady ? c.mode : 'unconfigured',
    storeIdConfigured: Number.isSafeInteger(c.storeId) && c.storeId > 0,
    tokenReady: false,
    message: !credentialsReady ? 'Add Pathao credentials to server-side environment variables.' : !encryptionReady ? 'Set PATHAO_TOKEN_ENCRYPTION_KEY to a 32-byte key (base64 or 64-character hex).' : 'Credentials configured. Test the connection to verify merchant access.',
  };
}
function encrypt(value: string): string {
  const key = encryptionKey(config().encryptionKey)!;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), ciphertext.toString('base64url')].join('.');
}
function decrypt(value: string): string {
  const key = encryptionKey(config().encryptionKey)!;
  const parts = value.split('.');
  if (parts.length !== 3) throw new PathaoApiError('Stored Pathao token could not be decrypted. Reconnect credentials.', undefined, 'TOKEN_DECRYPT_FAILED');
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(parts[0], 'base64url'));
    decipher.setAuthTag(Buffer.from(parts[1], 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(parts[2], 'base64url')), decipher.final()]).toString('utf8');
  } catch { throw new PathaoApiError('Stored Pathao token could not be decrypted. Reconnect credentials.', undefined, 'TOKEN_DECRYPT_FAILED'); }
}
function adminDb(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new PathaoApiError('Supabase server credentials are not configured.', undefined, 'CONFIG_INVALID');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
async function readToken(db: SupabaseClient) {
  const { data, error } = await db.from('courier_tokens').select('*').eq('id', TOKEN_ROW_ID).maybeSingle();
  if (error) throw new PathaoApiError('Pathao token storage is unavailable. Apply the courier migration.', undefined, 'TOKEN_STORAGE_UNAVAILABLE');
  if (!data?.access_token_ciphertext || !data?.expires_at) return null;
  return { accessToken: decrypt(data.access_token_ciphertext), refreshToken: data.refresh_token_ciphertext ? decrypt(data.refresh_token_ciphertext) : '', expiresAt: new Date(data.expires_at).getTime() };
}
async function saveToken(db: SupabaseClient, token: TokenResponse) {
  if (!token.access_token || !token.refresh_token || !Number.isFinite(token.expires_in) || token.expires_in <= 0) throw new PathaoApiError('Pathao returned an invalid token response.', undefined, 'TOKEN_RESPONSE_INVALID');
  const expiresAt = new Date(Date.now() + token.expires_in * 1000 - 120000).toISOString();
  const { error } = await db.from('courier_tokens').upsert({ id: TOKEN_ROW_ID, token_type: token.token_type || 'Bearer', access_token_ciphertext: encrypt(token.access_token), refresh_token_ciphertext: encrypt(token.refresh_token), expires_at: expiresAt, updated_at: new Date().toISOString() });
  if (error) throw new PathaoApiError('Pathao token could not be persisted. Check the courier database migration.', undefined, 'TOKEN_STORAGE_UNAVAILABLE');
  return { accessToken: token.access_token, refreshToken: token.refresh_token, expiresAt: new Date(expiresAt).getTime() };
}
async function issueToken(db: SupabaseClient, refreshToken?: string) {
  const c = config();
  if (!c.clientId || !c.clientSecret || (!refreshToken && (!c.username || !c.password))) throw new PathaoApiError('Pathao credentials are incomplete.', undefined, 'CONFIG_INVALID');
  const body = refreshToken ? { client_id: c.clientId, client_secret: c.clientSecret, grant_type: 'refresh_token', refresh_token: refreshToken } : { client_id: c.clientId, client_secret: c.clientSecret, grant_type: 'password', username: c.username, password: c.password };
  const response = await fetch(c.base + API_PREFIX + '/issue-token', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(15000) }).catch(() => { throw new PathaoApiError('Could not reach Pathao token service. Check connectivity.', undefined, 'PATHAO_NETWORK_ERROR'); });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new PathaoApiError(response.status === 401 ? 'Pathao rejected the configured credentials.' : 'Pathao token request failed (HTTP ' + response.status + ').', response.status, 'TOKEN_REQUEST_FAILED');
  return saveToken(db, payload as TokenResponse);
}
async function getAccessToken(db: SupabaseClient, forceRefresh = false) {
  const saved = await readToken(db);
  if (!forceRefresh && saved && saved.expiresAt > Date.now() + 30000) return saved.accessToken;
  if (saved?.refreshToken) {
    try { return (await issueToken(db, saved.refreshToken)).accessToken; }
    catch (error) {
      if (error instanceof PathaoApiError && error.status && error.status < 500 && error.status !== 429) return (await issueToken(db)).accessToken;
      throw error;
    }
  }
  return (await issueToken(db)).accessToken;
}
async function request<T>(path: string, init: RequestInit = {}, allowRefresh = true): Promise<{ status: number; data: T }> {
  const c = config();
  const db = adminDb();
  const token = await getAccessToken(db);
  const response = await fetch(c.base + API_PREFIX + path, { ...init, headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: 'Bearer ' + token, ...(init.headers || {}) }, cache: 'no-store', signal: init.signal || AbortSignal.timeout(20000) }).catch(() => { throw new PathaoApiError('Pathao request timed out or network failed. Booking outcome may be unknown; check Pathao before retrying.', undefined, 'PATHAO_OUTCOME_UNKNOWN'); });
  const payload = await response.json().catch(() => null);
  if (response.status === 401 && allowRefresh) { await getAccessToken(db, true); return request<T>(path, init, false); }
  if (!response.ok) {
    const message = response.status === 422 ? 'Pathao rejected shipment fields. Review address, phone, weight and store.' : response.status === 401 ? 'Pathao authorization failed. Recheck merchant credentials and store access.' : response.status === 429 ? 'Pathao rate limit reached. Wait before trying again.' : 'Pathao API returned HTTP ' + response.status + '.';
    throw new PathaoApiError(message, response.status, 'PATHAO_API_ERROR');
  }
  return { status: response.status, data: payload as T };
}
function unwrap<T>(payload: any): T {
  if (payload && payload.type === 'error') throw new PathaoApiError(typeof payload.message === 'string' ? payload.message.slice(0, 240) : 'Pathao returned an error.', undefined, 'PATHAO_BUSINESS_ERROR');
  return (payload?.data ?? payload) as T;
}
export async function testPathaoConnection() {
  const result = await request<any>('/stores');
  const data: any = unwrap(result.data);
  const stores = Array.isArray(data?.data) ? data.data : [];
  return { ok: true, storeCount: stores.length, stores };
}
export async function getPathaoStores() {
  const result = await request<any>('/stores'); const data: any = unwrap(result.data);
  return (Array.isArray(data?.data) ? data.data : []) as Array<{ store_id: number; store_name: string; store_address: string; is_active: number; city_id: number; zone_id: number; hub_id: number }>;
}
export async function createPathaoStore(input: {
  name: string; contactName: string; contactNumber: string; secondaryContact?: string; otpNumber?: string;
  address: string; cityId: number; zoneId: number; areaId: number;
}) {
  if (input.name.trim().length < 3 || input.name.trim().length > 50) throw new PathaoApiError('Store name must be 3 to 50 characters.', 400, 'VALIDATION_ERROR');
  if (input.contactName.trim().length < 3 || input.contactName.trim().length > 50) throw new PathaoApiError('Contact name must be 3 to 50 characters.', 400, 'VALIDATION_ERROR');
  if (!/^01[3-9]\d{8}$/.test(input.contactNumber)) throw new PathaoApiError('Contact number must be an 11-digit Bangladesh mobile number.', 400, 'VALIDATION_ERROR');
  if (input.secondaryContact && !/^01[3-9]\d{8}$/.test(input.secondaryContact)) throw new PathaoApiError('Secondary contact must be an 11-digit Bangladesh mobile number.', 400, 'VALIDATION_ERROR');
  if (input.otpNumber && !/^01[3-9]\d{8}$/.test(input.otpNumber)) throw new PathaoApiError('OTP number must be an 11-digit Bangladesh mobile number.', 400, 'VALIDATION_ERROR');
  if (input.address.trim().length < 15 || input.address.trim().length > 120) throw new PathaoApiError('Store address must be 15 to 120 characters.', 400, 'VALIDATION_ERROR');
  for (const id of [input.cityId, input.zoneId, input.areaId]) if (!Number.isSafeInteger(id) || id <= 0) throw new PathaoApiError('Valid city, zone and area IDs are required.', 400, 'VALIDATION_ERROR');
  const body: Record<string, unknown> = { name: input.name.trim(), contact_name: input.contactName.trim(), contact_number: input.contactNumber, address: input.address.trim(), city_id: input.cityId, zone_id: input.zoneId, area_id: input.areaId };
  if (input.secondaryContact) body.secondary_contact = input.secondaryContact;
  if (input.otpNumber) body.otp_number = input.otpNumber;
  const result = await request<any>('/stores', { method: 'POST', body: JSON.stringify(body) }, false);
  const data: any = unwrap(result.data);
  return { message: typeof result.data?.message === 'string' ? result.data.message : 'Store creation request submitted.', storeName: data?.store_name || input.name, accepted: result.status >= 200 && result.status < 300 };
}
export async function getPathaoCities() {
  const result = await request<any>('/city-list'); const data: any = unwrap(result.data);
  return (Array.isArray(data?.data) ? data.data : []) as Array<{ city_id: number; city_name: string }>;
}
export async function getPathaoZones(cityId: number) {
  const result = await request<any>('/cities/' + cityId + '/zone-list'); const data: any = unwrap(result.data);
  return (Array.isArray(data?.data) ? data.data : []) as Array<{ zone_id: number; zone_name: string }>;
}
export async function getPathaoAreas(zoneId: number) {
  const result = await request<any>('/zones/' + zoneId + '/area-list'); const data: any = unwrap(result.data);
  return (Array.isArray(data?.data) ? data.data : []) as Array<{ area_id: number; area_name: string; home_delivery_available: boolean; pickup_available: boolean }>;
}
export async function calculatePathaoPrice(input: { storeId: number; itemType: 1 | 2; deliveryType: 48 | 12; weightKg: number; cityId: number; zoneId: number }) {
  if (!Number.isSafeInteger(input.storeId) || input.storeId <= 0 || !Number.isSafeInteger(input.cityId) || input.cityId <= 0 || !Number.isSafeInteger(input.zoneId) || input.zoneId <= 0) throw new PathaoApiError('Valid store, city and zone IDs are required.', 400, 'VALIDATION_ERROR');
  if (!Number.isFinite(input.weightKg) || input.weightKg < 0.5 || input.weightKg > 10) throw new PathaoApiError('Parcel weight must be between 0.5 and 10 kg.', 400, 'VALIDATION_ERROR');
  const result = await request<any>('/merchant/price-plan', { method: 'POST', body: JSON.stringify({ store_id: input.storeId, item_type: input.itemType, delivery_type: input.deliveryType, item_weight: input.weightKg, recipient_city: input.cityId, recipient_zone: input.zoneId }) });
  return unwrap<{ price: number; discount: number; promo_discount: number; plan_id: number; cod_enabled: number; cod_percentage: number; additional_charge: number; final_price: number }>(result.data);
}
export async function createPathaoOrder(input: {
  storeId: number; merchantOrderId: string; recipientName: string; recipientPhone: string; recipientAddress: string;
  recipientCity?: number; recipientZone?: number; recipientArea?: number; deliveryType: 48 | 12; itemType: 1 | 2;
  specialInstruction?: string; itemQuantity: number; weightKg: number; amountToCollect: number; itemDescription?: string;
}) {
  if (!Number.isSafeInteger(input.storeId) || input.storeId <= 0) throw new PathaoApiError('Configure a valid PATHAO_STORE_ID before booking.', 400, 'CONFIG_INVALID');
  if (input.recipientName.trim().length < 3 || input.recipientName.length > 100) throw new PathaoApiError('Recipient name must be 3 to 100 characters.', 400, 'VALIDATION_ERROR');
  if (!/^01[3-9]\d{8}$/.test(input.recipientPhone.replace(/^\+?88/, ''))) throw new PathaoApiError('Recipient phone must be a valid Bangladesh mobile number with 11 digits.', 400, 'VALIDATION_ERROR');
  if (input.recipientAddress.trim().length < 10 || input.recipientAddress.length > 220) throw new PathaoApiError('Recipient address must be 10 to 220 characters.', 400, 'VALIDATION_ERROR');
  if (!Number.isSafeInteger(input.itemQuantity) || input.itemQuantity < 1) throw new PathaoApiError('Parcel quantity must be a positive integer.', 400, 'VALIDATION_ERROR');
  if (!Number.isFinite(input.weightKg) || input.weightKg < 0.5 || input.weightKg > 10) throw new PathaoApiError('Parcel weight must be between 0.5 and 10 kg.', 400, 'VALIDATION_ERROR');
  if (!Number.isSafeInteger(input.amountToCollect) || input.amountToCollect < 0) throw new PathaoApiError('COD collection amount must be a non-negative integer in BDT.', 400, 'VALIDATION_ERROR');
  const body: Record<string, unknown> = { store_id: input.storeId, merchant_order_id: input.merchantOrderId, recipient_name: input.recipientName.trim(), recipient_phone: input.recipientPhone.replace(/^\+?88/, ''), recipient_address: input.recipientAddress.trim(), delivery_type: input.deliveryType, item_type: input.itemType, item_quantity: input.itemQuantity, item_weight: input.weightKg, amount_to_collect: input.amountToCollect };
  if (input.recipientCity) body.recipient_city = input.recipientCity;
  if (input.recipientZone) body.recipient_zone = input.recipientZone;
  if (input.recipientArea) body.recipient_area = input.recipientArea;
  if (input.specialInstruction) body.special_instruction = input.specialInstruction.slice(0, 500);
  if (input.itemDescription) body.item_description = input.itemDescription.slice(0, 500);
  const result = await request<any>('/orders', { method: 'POST', body: JSON.stringify(body) }, false);
  const data = unwrap<any>(result.data);
  if (!data?.consignment_id || typeof data.order_status !== 'string') throw new PathaoApiError('Pathao response has no consignment ID. Reconcile this order in Pathao before retrying.', 502, 'PATHAO_OUTCOME_UNKNOWN');
  return { consignmentId: String(data.consignment_id), merchantOrderId: String(data.merchant_order_id || input.merchantOrderId), status: String(data.order_status), deliveryFee: Number(data.delivery_fee || 0), response: { message: result.data?.message, code: result.status } };
}
export async function getPathaoOrderInfo(consignmentId: string) {
  if (!consignmentId || consignmentId.length > 120) throw new PathaoApiError('A valid consignment ID is required.', 400, 'VALIDATION_ERROR');
  const result = await request<any>('/orders/' + encodeURIComponent(consignmentId) + '/info', { method: 'GET' });
  return unwrap<{ consignment_id: string; merchant_order_id: string; order_status: string; order_status_slug: string; updated_at: string; invoice_id: string | null }>(result.data);
}
