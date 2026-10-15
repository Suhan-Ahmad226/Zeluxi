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
 * Fail-closed adapter placeholder. Real API calls must be implemented server-side.
 */
export class PathaoCourierProvider implements ICourierProvider {
  readonly code = 'PATHAO' as const;
  readonly name = 'Pathao Express Logistics (Hermes / Aladdin API)';
  // Credentials and live API calls must be implemented in a trusted server environment.

  async createShipment(_request: ShipmentRequest): Promise<ShipmentResult> {
    return {
      success: false,
      courier: 'PATHAO',
      consignmentId: '',
      trackingCode: '',
      deliveryFee: 0,
      estimatedDelivery: '',
      hubLocation: '',
      errorMessage: 'Live Pathao booking is not implemented. Configure a secure server-side Pathao API integration before booking real shipments.',
    };
  }

  async cancelShipment(_consignmentId: string): Promise<{ success: boolean; message: string }> {
    return { success: false, message: 'Live Pathao cancellation is not configured. No cancellation was sent.' };
  }

  async getTracking(_trackingCode: string): Promise<{ status: string; currentLocation: string; events: TrackingEvent[] }> {
    throw new Error('Live Pathao tracking is not configured. No live tracking data is available.');
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
      errorMessage: 'Live Steadfast booking is not implemented. Configure a secure server-side Steadfast API integration before booking real shipments.',
    };
  }

  async cancelShipment(_consignmentId: string): Promise<{ success: boolean; message: string }> {
    return { success: false, message: 'Live Steadfast cancellation is not configured. No cancellation was sent.' };
  }

  async getTracking(_trackingCode: string): Promise<{ status: string; currentLocation: string; events: TrackingEvent[] }> {
    throw new Error('Live Steadfast tracking is not configured. No live tracking data is available.');
  }

}

/**
 * Courier Factory & Registry
 */
const pathaoService = new PathaoCourierProvider();
const steadfastService = new SteadfastCourierProvider();

const inHouseService: ICourierProvider = {
  code: 'IN_HOUSE',
  name: 'In-house delivery (not configured)',
  async createShipment(): Promise<ShipmentResult> {
    return {
      success: false, courier: 'IN_HOUSE', consignmentId: '', trackingCode: '',
      deliveryFee: 0, estimatedDelivery: '', hubLocation: '',
      errorMessage: 'In-house delivery is not configured. No shipment was created.',
    };
  },
  async cancelShipment(): Promise<{ success: boolean; message: string }> {
    return { success: false, message: 'In-house shipment cancellation is not configured.' };
  },
  async getTracking(): Promise<{ status: string; currentLocation: string; events: TrackingEvent[] }> {
    throw new Error('In-house tracking is not configured.');
  },
};

export const getCourierProvider = (provider: 'PATHAO' | 'STEADFAST' | 'IN_HOUSE'): ICourierProvider => {
  if (provider === 'STEADFAST') return steadfastService;
  if (provider === 'IN_HOUSE') return inHouseService;
  return pathaoService;
};
