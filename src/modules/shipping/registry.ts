import type {CourierProvider} from "./contracts";
import {manualCourier} from "./manual";
const providers=new Map<string,CourierProvider>([[manualCourier.name,manualCourier]]);
export function getCourierProvider(name=process.env.DEFAULT_COURIER_PROVIDER||"MANUAL"){const provider=providers.get(name);if(!provider) throw new Error(`Courier provider "${name}" is not configured.`);return provider;}
export function registerCourierProvider(provider:CourierProvider){providers.set(provider.name,provider);}
export function listCourierProviders(){return [...providers.keys()];}
