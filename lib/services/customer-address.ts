import prisma from "@/lib/prisma";
import { logAudit } from "./audit";

/**
 * Adressbuch-Service. ALLE Funktionen nehmen die `customerId` explizit und prüfen
 * Ownership (`address.customerId === customerId`) → wirft "FORBIDDEN" bei IDOR.
 * Die Server-Actions liefern die customerId aus requireCustomer().
 */

export interface AddressInput {
  label?: string | null;
  firstName: string;
  lastName: string;
  company?: string | null;
  street1: string;
  street2?: string | null;
  city: string;
  state?: string | null;
  postalCode: string;
  countryCode: string;
  phone?: string | null;
  isDefaultBilling?: boolean;
  isDefaultShipping?: boolean;
}

export async function listAddresses(customerId: string) {
  return prisma.customerAddress.findMany({
    where: { customerId },
    orderBy: [{ isDefaultShipping: "desc" }, { isDefaultBilling: "desc" }, { createdAt: "asc" }],
  });
}

/**
 * Stellt sicher, dass die Adresse dem Kunden gehört. Wirft sonst FORBIDDEN
 * (bzw. NOT_FOUND, wenn sie gar nicht existiert).
 */
async function assertOwnership(customerId: string, addressId: string) {
  const address = await prisma.customerAddress.findUnique({ where: { id: addressId } });
  if (!address) throw new Error("NOT_FOUND");
  if (address.customerId !== customerId) throw new Error("FORBIDDEN");
  return address;
}

export async function addAddress(customerId: string, input: AddressInput) {
  const created = await prisma.$transaction(async (tx) => {
    if (input.isDefaultBilling) {
      await tx.customerAddress.updateMany({
        where: { customerId, isDefaultBilling: true },
        data: { isDefaultBilling: false },
      });
    }
    if (input.isDefaultShipping) {
      await tx.customerAddress.updateMany({
        where: { customerId, isDefaultShipping: true },
        data: { isDefaultShipping: false },
      });
    }
    return tx.customerAddress.create({
      data: {
        customerId,
        label: input.label ?? null,
        firstName: input.firstName,
        lastName: input.lastName,
        company: input.company ?? null,
        street1: input.street1,
        street2: input.street2 ?? null,
        city: input.city,
        state: input.state ?? null,
        postalCode: input.postalCode,
        countryCode: input.countryCode,
        phone: input.phone ?? null,
        isDefaultBilling: input.isDefaultBilling ?? false,
        isDefaultShipping: input.isDefaultShipping ?? false,
      },
    });
  });
  await logAudit({
    actorType: "customer",
    actorId: customerId,
    action: "customer.address_added",
    entityType: "CustomerAddress",
    entityId: created.id,
  });
  return created;
}

export async function updateAddress(customerId: string, addressId: string, input: AddressInput) {
  await assertOwnership(customerId, addressId);
  const updated = await prisma.$transaction(async (tx) => {
    if (input.isDefaultBilling) {
      await tx.customerAddress.updateMany({
        where: { customerId, isDefaultBilling: true, id: { not: addressId } },
        data: { isDefaultBilling: false },
      });
    }
    if (input.isDefaultShipping) {
      await tx.customerAddress.updateMany({
        where: { customerId, isDefaultShipping: true, id: { not: addressId } },
        data: { isDefaultShipping: false },
      });
    }
    return tx.customerAddress.update({
      where: { id: addressId },
      data: {
        label: input.label ?? null,
        firstName: input.firstName,
        lastName: input.lastName,
        company: input.company ?? null,
        street1: input.street1,
        street2: input.street2 ?? null,
        city: input.city,
        state: input.state ?? null,
        postalCode: input.postalCode,
        countryCode: input.countryCode,
        phone: input.phone ?? null,
        isDefaultBilling: input.isDefaultBilling ?? false,
        isDefaultShipping: input.isDefaultShipping ?? false,
      },
    });
  });
  await logAudit({
    actorType: "customer",
    actorId: customerId,
    action: "customer.address_updated",
    entityType: "CustomerAddress",
    entityId: addressId,
  });
  return updated;
}

export async function deleteAddress(customerId: string, addressId: string) {
  await assertOwnership(customerId, addressId);
  await prisma.customerAddress.delete({ where: { id: addressId } });
  await logAudit({
    actorType: "customer",
    actorId: customerId,
    action: "customer.address_deleted",
    entityType: "CustomerAddress",
    entityId: addressId,
  });
}

export async function setDefaultBilling(customerId: string, addressId: string) {
  await assertOwnership(customerId, addressId);
  await prisma.$transaction([
    prisma.customerAddress.updateMany({
      where: { customerId, isDefaultBilling: true },
      data: { isDefaultBilling: false },
    }),
    prisma.customerAddress.update({ where: { id: addressId }, data: { isDefaultBilling: true } }),
  ]);
}

export async function setDefaultShipping(customerId: string, addressId: string) {
  await assertOwnership(customerId, addressId);
  await prisma.$transaction([
    prisma.customerAddress.updateMany({
      where: { customerId, isDefaultShipping: true },
      data: { isDefaultShipping: false },
    }),
    prisma.customerAddress.update({ where: { id: addressId }, data: { isDefaultShipping: true } }),
  ]);
}
