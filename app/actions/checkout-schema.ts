// Schema + Typen für den Checkout.
// BEWUSST KEINE "use server"-Direktive: In einer "use server"-Datei dürfen
// nur async Funktionen exportiert werden (jeder Export wird sonst zum
// Server-Endpunkt). Schema/Typen leben deshalb hier und werden von
// app/actions/checkout.ts importiert.

import { z } from "zod";

const cartItemSchema = z.object({
  productId: z.string().min(1).max(128),
  quantity: z.number().int().min(1).max(50),
});

const addressSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  company: z.string().max(120).optional().nullable(),
  street1: z.string().min(1).max(120),
  street2: z.string().max(120).optional().nullable(),
  city: z.string().min(1).max(80),
  state: z.string().max(80).optional().nullable(),
  postalCode: z.string().min(1).max(20),
  countryCode: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/),
  phone: z.string().max(40).optional().nullable(),
});

export const checkoutInputSchema = z.object({
  items: z.array(cartItemSchema).min(1).max(25),

  email: z.string().email().max(254),
  phone: z.string().max(40).optional().nullable(),

  isBusinessCustomer: z.boolean(),
  companyName: z.string().max(120).optional().nullable(),
  vatId: z.string().max(40).optional().nullable(),

  shipping: addressSchema,
  billingSameAsShipping: z.boolean(),
  billing: addressSchema.optional().nullable(),

  shippingRateId: z.string().max(64),
  deliveryType: z.enum(["SHIPPING", "PICKUP", "LOCAL_DELIVERY"]),

  discountCode: z.string().max(64).optional().nullable(),

  customerNote: z.string().max(2000).optional().nullable(),

  termsAccepted: z.literal(true),
  privacyAccepted: z.literal(true),
  withdrawalAccepted: z.literal(true),
  newsletterConsent: z.boolean().optional(),
});

export type CheckoutInput = z.infer<typeof checkoutInputSchema>;

export interface CheckoutSubmissionResult {
  ok: boolean;
  redirectUrl?: string;
  orderNumber?: string;
  errors?: { field: string; code: string }[];
}
