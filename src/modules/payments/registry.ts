import type {PaymentProvider} from "./contracts";
import {ManualPaymentProvider} from "./manual";
import {SSLCommerzProvider} from "./sslcommerz";
const providers=new Map<string,PaymentProvider>([["MANUAL",new ManualPaymentProvider()],["SSLCOMMERZ",new SSLCommerzProvider()]]);
export function registerPaymentProvider(provider:PaymentProvider){providers.set(provider.name.toUpperCase(),provider);}
export function getPaymentProvider(name=process.env.DEFAULT_PAYMENT_PROVIDER||"MANUAL"){const provider=providers.get(name.toUpperCase());if(!provider)throw new Error(`Unknown payment provider: ${name}`);return provider;}
export function listPaymentProviders(){return [...providers.keys()];}