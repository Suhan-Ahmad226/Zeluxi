import {z} from "zod";
export const cartItemSchema=z.object({productId:z.string().min(1),variantId:z.string().min(1).optional(),quantity:z.number().int().min(1).max(99)});
export const checkoutSchema=z.object({
  items:z.array(cartItemSchema).min(1).max(100),
  addressId:z.string().min(1),
  paymentMethod:z.enum(["COD","ONLINE"]),
  couponCode:z.string().trim().max(50).optional(),
  shippingFee:z.number().finite().min(0).max(10000).optional(),
});
export type CheckoutInput=z.infer<typeof checkoutSchema>;