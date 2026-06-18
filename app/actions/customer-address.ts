"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireCustomer } from "@/lib/services/customer-auth";
import {
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultBilling,
  setDefaultShipping,
} from "@/lib/services/customer-address";

export type AddressResult = { ok: true } | { ok: false; error: string };

const addressSchema = z.object({
  label: z.string().max(60).optional().nullable(),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  company: z.string().max(120).optional().nullable(),
  street1: z.string().min(1).max(120),
  street2: z.string().max(120).optional().nullable(),
  city: z.string().min(1).max(80),
  state: z.string().max(80).optional().nullable(),
  postalCode: z.string().min(1).max(20),
  countryCode: z.string().length(2).regex(/^[A-Z]{2}$/),
  phone: z.string().max(40).optional().nullable(),
  isDefaultBilling: z.boolean().optional(),
  isDefaultShipping: z.boolean().optional(),
});

const idSchema = z.object({ addressId: z.string().min(1).max(64) });

function mapError(err: unknown): AddressResult {
  const code = err instanceof Error ? err.message : "INTERNAL_ERROR";
  if (code === "FORBIDDEN" || code === "NOT_FOUND") return { ok: false, error: code };
  return { ok: false, error: "INTERNAL_ERROR" };
}

export async function addAddressAction(rawInput: unknown): Promise<AddressResult> {
  const parsed = addressSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const customer = await requireCustomer();
  try {
    await addAddress(customer.id, parsed.data);
    revalidatePath("/konto/adressen");
    return { ok: true };
  } catch (err) {
    return mapError(err);
  }
}

export async function updateAddressAction(rawInput: unknown): Promise<AddressResult> {
  const parsed = addressSchema.merge(idSchema).safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const { addressId, ...data } = parsed.data;
  const customer = await requireCustomer();
  try {
    await updateAddress(customer.id, addressId, data);
    revalidatePath("/konto/adressen");
    return { ok: true };
  } catch (err) {
    return mapError(err);
  }
}

export async function deleteAddressAction(rawInput: unknown): Promise<AddressResult> {
  const parsed = idSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const customer = await requireCustomer();
  try {
    await deleteAddress(customer.id, parsed.data.addressId);
    revalidatePath("/konto/adressen");
    return { ok: true };
  } catch (err) {
    return mapError(err);
  }
}

export async function setDefaultBillingAction(rawInput: unknown): Promise<AddressResult> {
  const parsed = idSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const customer = await requireCustomer();
  try {
    await setDefaultBilling(customer.id, parsed.data.addressId);
    revalidatePath("/konto/adressen");
    return { ok: true };
  } catch (err) {
    return mapError(err);
  }
}

export async function setDefaultShippingAction(rawInput: unknown): Promise<AddressResult> {
  const parsed = idSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "INVALID_INPUT" };
  const customer = await requireCustomer();
  try {
    await setDefaultShipping(customer.id, parsed.data.addressId);
    revalidatePath("/konto/adressen");
    return { ok: true };
  } catch (err) {
    return mapError(err);
  }
}
