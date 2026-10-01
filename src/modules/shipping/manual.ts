import {Prisma} from "@prisma/client";
import type {CourierProvider} from "./contracts";
export const manualCourier:CourierProvider={
  name:"MANUAL",
  async calculatePrice({address}){return {provider:"MANUAL",fee:new Prisma.Decimal(address.district.trim().toLowerCase()==="dhaka"?80:130),currency:"BDT",etaDays:address.district.trim().toLowerCase()==="dhaka"?2:4}},
  async createShipment({merchantOrderId}){return {trackingId:`MAN-${merchantOrderId.replace(/[^A-Za-z0-9-]/g,"-")}`}},
  async getTracking(trackingId){return {trackingId,status:"manual"}},
};