import { z } from 'zod';
import { formatCourierAddress, isValidAddressSelection } from '../address/bangladesh-locations';

export const bdPhoneRegex = /^(?:\+?88)?01[3-9]\d{8}$/;

export const shippingAddressSchema = z.object({
  fullName: z.string().min(2, 'Full Name must be at least 2 characters'),
  phone: z
    .string()
    .transform((val) => val.replace(/[\s-]/g, ''))
    .refine((val) => bdPhoneRegex.test(val), {
      message: 'Must be a valid 11-digit Bangladesh phone number (013-019)',
    }),
  email: z.string().email('Valid email address required').optional().or(z.literal('')),
  division: z.enum([
    'Dhaka',
    'Chattogram',
    'Sylhet',
    'Rajshahi',
    'Khulna',
    'Barishal',
    'Rangpur',
    'Mymensingh',
  ]),
  district: z.string().min(1, 'District is required'),
  upazila: z.string().trim().min(1, 'Upazila / Thana is required').max(100),
  addressDetails: z.string().min(5, 'Detailed delivery address is required'),
  postalCode: z.string().optional(),
  pathaoCityId: z.number().int().positive().optional(),
  pathaoCityName: z.string().trim().max(100).optional(),
  pathaoZoneId: z.number().int().positive().optional(),
  pathaoZoneName: z.string().trim().max(100).optional(),
  notes: z.string().max(300, 'Notes cannot exceed 300 characters').optional(),
}).superRefine((address, ctx) => {
  if ((address.pathaoCityId && !address.pathaoZoneId) || (!address.pathaoCityId && address.pathaoZoneId)) {
    ctx.addIssue({ code: 'custom', path: ['upazila'], message: 'A valid Pathao city and zone quote is required.' });
  }
  if (!isValidAddressSelection(address.division, address.district, address.upazila)) {
    ctx.addIssue({ code: 'custom', path: ['upazila'], message: 'Select a district and upazila / thana that belong to the selected division.' });
  }
  if (formatCourierAddress(address).length > 220) {
    ctx.addIssue({ code: 'custom', path: ['addressDetails'], message: 'Address is too long for courier dispatch. Shorten the house, road, or area details.' });
  }
});

export const paymentMethodSchema = z.enum([
  'COD',
  'BKASH',
  'NAGAD',
  'ROCKET',
  'SSLCOMMERZ',
]);

export const orderSubmissionSchema = z.object({
  customer: shippingAddressSchema,
  paymentMethod: paymentMethodSchema,
  courierChoice: z.enum(['PATHAO', 'STEADFAST', 'IN_HOUSE']),
  transactionId: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        variantId: z.string().optional(),
        quantity: z.number().int().positive(),
        price: z.number().positive(),
      })
    )
    .min(1, 'Cart must contain at least 1 item'),
  appliedCouponCode: z.string().optional(),
});

export const productReviewSchema = z.object({
  userName: z.string().min(2, 'Name is required'),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10, 'Review comment must be at least 10 characters'),
});

export const couponValidationSchema = z.object({
  code: z.string().min(3).max(20).toUpperCase(),
  cartSubtotal: z.number().nonnegative(),
});
