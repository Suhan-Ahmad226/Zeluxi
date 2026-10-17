# Pathao Merchant API integration

## Environment setup

Configure these in local .env.local and Vercel server-side environment variables. Never use a NEXT_PUBLIC_ prefix.

- PATHAO_MODE=sandbox for testing; use production only after merchant approval and successful sandbox validation.
- PATHAO_BASE_URL must be https://courier-api-sandbox.pathao.com for sandbox or https://api-hermes.pathao.com for production. The app rejects mismatched hosts.
- PATHAO_CLIENT_ID, PATHAO_CLIENT_SECRET, PATHAO_USERNAME, PATHAO_PASSWORD are credentials for the selected environment.
- PATHAO_STORE_ID must be an approved active merchant store ID.
- PATHAO_TOKEN_ENCRYPTION_KEY is a random 32-byte key encoded as base64 or 64 hex characters. Generate with: node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"

OAuth access and refresh tokens are encrypted with AES-256-GCM in courier_tokens. Do not reuse the API client secret as the encryption key.

## Database

Apply supabase/migrations/20261018000000_pathao_courier.sql using the existing migration workflow. This adds tables and does not drop or reset commerce data.

## Admin API

All admin endpoints require a valid Supabase access token and trusted app_metadata.role=ADMIN.

- GET /api/admin/courier: configuration status and recent shipments.
- POST {"action":"test"}: issue/refresh token and verify access by reading merchant stores.
- POST {"action":"stores"} or {"action":"cities"}: fetch merchant stores or cities.
- POST {"action":"zones","cityId":1} and {"action":"areas","zoneId":298}: fetch locations.
- POST {"action":"price","cityId":1,"zoneId":298,"weightKg":0.5,"deliveryType":48}: price plan for configured pickup store.
- POST {"action":"book","orderId":"<store_orders UUID>","weightKg":0.5,"deliveryType":48}: create a single shipment.
- POST {"action":"sync","orderId":"<store_orders UUID>"}: fetch Pathao order short-info.

Bulk booking is deliberately disabled because the supplied bulk API returns only an accepted flag and no individual consignment IDs. Cancellation is not exposed because the supplied specification does not include a cancellation endpoint. Do not invent undocumented endpoints.

## Production safety

1. Validate sandbox credentials, store mapping, phone/address fields, price-plan responses and COD/non-COD handling.
2. Apply the migration and set the server-side Vercel environment variables.
3. Test in sandbox from Admin > Delivery & Tracking.
4. Switch the mode, URL and credentials together only after production merchant approval.
5. A timeout or ambiguous server error sets the shipment to UNKNOWN. Reconcile it in Pathao before retrying to prevent duplicate parcels.
6. The supplied docs only describe short order info, not signed webhook verification, tracking history, cancellation, pickup rescheduling or settlement endpoints. These are not claimed as implemented.
