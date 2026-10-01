import {Prisma} from "@prisma/client";
export type ShippingAddress={division:string;district:string;area?:string|null;addressLine:string};
export type ShippingQuote={provider:string;fee:Prisma.Decimal;currency:"BDT";etaDays?:number};
export interface CourierProvider{readonly name:string;calculatePrice(input:{address:ShippingAddress;weightGrams?:number}):Promise<ShippingQuote>;createShipment?(input:unknown):Promise<{trackingId:string}>;getTracking?(trackingId:string):Promise<unknown>;cancelShipment?(trackingId:string):Promise<void>}
