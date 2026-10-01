import type {CourierProvider} from "./contracts";
import {manualCourier} from "./manual";
const providers=new Map<string,CourierProvider>([[manualCourier.name,manualCourier]]);
export function getCourierProvider(name=process.env.DEFAULT_COURIER_PROVIDER||"MANUAL"){return providers.get(name)||manualCourier;}
export function registerCourierProvider(provider:CourierProvider){providers.set(provider.name,provider);}
export function listCourierProviders(){return [...providers.keys()];}
