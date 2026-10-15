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
 * Client-side adapter only. Real booking must be performed by a trusted server integration.
 */
export class PathaoCourierProvider implements ICourierProvider {
  readonly code = 'PATHAO' as const;
  readonly name = 'Pathao Express Logistics (Hermes / Aladdin API)';
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

    // This frontend bundle must not contain courier credentials or claim a
    // shipment exists without a real response from the courier API.
    return {
      success: false,
      courier: 'PATHAO',
      consignmentId: '',
      trackingCode: '',
      deliveryFee: 0,
      estimatedDelivery: '',
      hubLocation: '',
      errorMessage: 'Pathao is not connected to a trusted server integration. No shipment was created.',
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
