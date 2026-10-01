import {Prisma} from "@prisma/client";
import type {CourierProvider} from "./contracts";
export const manualCourier:CourierProvider={name:"MANUAL",async calculatePrice({address}){return {provider:"MANUAL",fee:new Prisma.Decimal(address.district.trim().toLowerCase()==="dhaka"?80:130),currency:"BDT",etaDays:address.district.trim().toLowerCase()==="dhaka"?2:4}}};
