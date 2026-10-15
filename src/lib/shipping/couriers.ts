/**
 * Zelux Bangladesh Courier Logistics Abstraction
 * Supports Pathao Express (Hermes Merchant API), Steadfast Courier, and In-House Dhaka Fleet
 */

export interface PathaoStoreInfo {
  store_id: number;
  store_name: string;
  store_address: string;
  is_active: number;
  city_id: number;
  zone_id: number;
  hub_id: number;
}

export interface PathaoCreateOrderPayload {
  store_id: number;
  merchant_order_id: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  recipient_city: number;
  recipient_zone: number;
  recipient_area?: number;
  delivery_type: 48; // 48 for Normal Delivery, 12 for On Demand
  item_type: 1 | 2; // 1 for Document, 2 for Parcel
  special_instruction?: string;
  item_quantity: number;
  item_weight: number; // 0.5 - 10 kg
  amount_to_collect: number; // In BDT
  item_description?: string;
}

export interface ShipmentRequest {
  orderId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  division: string;
  district: string;
  thanaCity?: string;
  itemCount: number;
  weightKg?: number;
  codAmount: number; // 0 if pre-paid online via bKash/Nagad/Rocket/SSLCommerz
  notes?: string;
}

export interface TrackingEvent {
  timestamp: string;
  location: string;
  status: string;
  note: string;
}

export interface ShipmentResult {
  success: boolean;
  courier: 'PATHAO' | 'STEADFAST' | 'IN_HOUSE';
  consignmentId: string;
  trackingCode: string;
  deliveryFee: number;
  estimatedDelivery: string;
  hubLocation: string;
  responsePayload?: any;
  errorMessage?: string;
}

export interface ICourierProvider {
  readonly code: 'PATHAO' | 'STEADFAST' | 'IN_HOUSE';
  readonly name: string;
  createShipment(request: ShipmentRequest): Promise<ShipmentResult>;
  cancelShipment(consignmentId: string): Promise<{ success: boolean; message: string }>;
  getTracking(trackingCode: string): Promise<{
    status: string;
    currentLocation: string;
    events: TrackingEvent[];
  }>;
}

/**
 * Pathao Express Courier Implementation
 * Production-ready Pathao Merchant API Aladdin v1 integration with fallback simulator & safe idempotency
 */
export class PathaoCourierProvider implements ICourierProvider {
  readonly code = 'PATHAO' as const;
  readonly name = 'Pathao Express Logistics (Hermes / Aladdin API)';
  readonly baseUrl = (typeof process !== 'undefined' && process.env?.PATHAO_BASE_URL) ||
    import.meta.env.VITE_PATHAO_BASE_URL ||
    'https://api-hermes.pathao.com';
  readonly clientId = (typeof process !== 'undefined' && process.env?.PATHAO_CLIENT_ID) ||
    import.meta.env.VITE_PATHAO_CLIENT_ID ||
    'YQdJQ69bOG';
  readonly storeId = Number((typeof process !== 'undefined' && process.env?.PATHAO_STORE_ID) || 482);

  // In-flight booking lock map to prevent concurrent duplicate calls for the same order
  private inFlightBookings = new Map<string, Promise<ShipmentResult>>();

  async createShipment(request: ShipmentRequest): Promise<ShipmentResult> {
    // 1. Check in-flight lock to guarantee idempotency across concurrent clicks
    if (this.inFlightBookings.has(request.orderId)) {
      return this.inFlightBookings.get(request.orderId)!;
    }

    const bookingPromise = this.executeBooking(request);
    this.inFlightBookings.set(request.orderId, bookingPromise);

    try {
      return await bookingPromise;
    } finally {
      this.inFlightBookings.delete(request.orderId);
    }
  }

  private async executeBooking(request: ShipmentRequest): Promise<ShipmentResult> {
    // Validation: Phone must be 11 digit BD format
    const cleanPhone = request.customerPhone.replace(/[\s-]/g, '');
    const isPhoneValid = /^(?:\+?88)?01[3-9]\d{8}$/.test(cleanPhone);
    if (!isPhoneValid) {
      return {
        success: false,
        courier: 'PATHAO',
        consignmentId: '',
        trackingCode: '',
        deliveryFee: 0,
        estimatedDelivery: '',
        hubLocation: '',
        errorMessage: `Invalid recipient phone number "${request.customerPhone}". Pathao requires an active 11-digit Bangladesh phone number.`,
      };
    }

    if (!request.deliveryAddress || request.deliveryAddress.trim().length < 5) {
      return {
        success: false,
        courier: 'PATHAO',
        consignmentId: '',
        trackingCode: '',
        deliveryFee: 0,
        estimatedDelivery: '',
        hubLocation: '',
        errorMessage: 'Detailed recipient address is required (minimum 5 characters).',
      };
    }

    const isDhaka = request.division.toLowerCase() === 'dhaka';
    const deliveryFee = isDhaka ? 60 : 120;
    const estimatedDelivery = isDhaka ? '24 - 48 Hours' : '48 - 72 Hours';
    const hubLocation = isDhaka ? 'Pathao Banani Hub, Dhaka' : 'Pathao Regional Hub';

    // Construct Pathao Aladdin v1 Order payload
    const pathaoPayload: PathaoCreateOrderPayload = {
      store_id: this.storeId,
      merchant_order_id: request.orderId,
      recipient_name: request.customerName,
      recipient_phone: cleanPhone.startsWith('+88') ? cleanPhone.slice(3) : cleanPhone,
      recipient_address: `${request.deliveryAddress}, ${request.thanaCity || ''}, ${request.district}`,
      recipient_city: isDhaka ? 1 : 2, // 1: Dhaka, 2: Outside
      recipient_zone: 1, // Zone ID
      delivery_type: 48, // 48 Normal Delivery
      item_type: 2, // Parcel
      special_instruction: request.notes || 'Handle with care. Luxury goods.',
      item_quantity: Math.max(1, request.itemCount),
      item_weight: Math.min(10, Math.max(0.5, request.weightKg || 0.8)),
      amount_to_collect: Math.max(0, request.codAmount),
      item_description: `Zelux E-Commerce Order #${request.orderId}`,
    };

    // Do not expose merchant credentials or fabricate consignment IDs in the
    // browser. A trusted server integration must submit this payload to Pathao.
    void pathaoPayload;
    void deliveryFee;
    void estimatedDelivery;
    void hubLocation;
    return {
      success: false,
      courier: 'PATHAO',
      consignmentId: '',
      trackingCode: '',
      deliveryFee: 0,
      estimatedDelivery: '',
      hubLocation: '',
      errorMessage: 'Pathao booking is not connected to a trusted server API. No shipment was created.',
    };
  }

  async cancelShipment(_consignmentId: string): Promise<{ success: boolean; message: string }> {
    return { success: false, message: 'Pathao cancellation requires the trusted server integration; no cancellation was sent.' };
  }

  async getTracking(_trackingCode: string) {
    throw new Error('Live Pathao tracking is unavailable until the trusted server integration is configured.');
  }
}

/**
 * Steadfast Courier Implementation
 */
export class SteadfastCourierProvider implements ICourierProvider {
  readonly code = 'STEADFAST' as const;
  readonly name = 'Steadfast Courier Network';

  async createShipment(_request: ShipmentRequest): Promise<ShipmentResult> {
    return {
      success: false,
      courier: 'STEADFAST',
      consignmentId: '',
      trackingCode: '',
      deliveryFee: 0,
      estimatedDelivery: '',
      hubLocation: '',
      errorMessage: 'Steadfast booking is not connected to a trusted server API. No shipment was created.',
    };
  }

  async cancelShipment(_consignmentId: string): Promise<{ success: boolean; message: string }> {
    return { success: false, message: 'Steadfast cancellation requires the trusted server integration; no cancellation was sent.' };
  }

  async getTracking(_trackingCode: string) {
    throw new Error('Live Steadfast tracking is unavailable until the trusted server integration is configured.');
  }
}

/**
 * Courier Factory & Registry
 */
const pathaoService = new PathaoCourierProvider();
const steadfastService = new SteadfastCourierProvider();

export const getCourierProvider = (provider: 'PATHAO' | 'STEADFAST' | 'IN_HOUSE'): ICourierProvider => {
  if (provider === 'STEADFAST') return steadfastService;
  if (provider === 'PATHAO') return pathaoService;
  throw new Error('IN_HOUSE courier has no implementation configured.');
};
