import { describe, it, expect, afterEach } from "vitest";
import prisma from "@/lib/prisma";
import {
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultBilling,
  listAddresses,
  type AddressInput,
} from "@/lib/services/customer-address";
import { makeCustomer, cleanupCustomer } from "./_helpers/factory";

const createdEmails = new Set<string>();

afterEach(async () => {
  for (const email of createdEmails) await cleanupCustomer(email);
  createdEmails.clear();
});

function sampleAddress(overrides: Partial<AddressInput> = {}): AddressInput {
  return {
    firstName: "Anna",
    lastName: "Muster",
    street1: "Musterweg 1",
    city: "Stuttgart",
    postalCode: "70599",
    countryCode: "DE",
    ...overrides,
  };
}

describe("customer-address — CRUD", () => {
  it("legt eine Adresse an und listet sie (Happy)", async () => {
    const { email, customer } = await makeCustomer();
    createdEmails.add(email);

    const created = await addAddress(customer.id, sampleAddress({ label: "Zuhause" }));
    expect(created.customerId).toBe(customer.id);

    const list = await listAddresses(customer.id);
    expect(list).toHaveLength(1);
    expect(list[0].label).toBe("Zuhause");
  });

  it("aktualisiert und löscht eine eigene Adresse", async () => {
    const { email, customer } = await makeCustomer();
    createdEmails.add(email);
    const created = await addAddress(customer.id, sampleAddress());

    await updateAddress(customer.id, created.id, sampleAddress({ city: "Berlin" }));
    const afterUpdate = await prisma.customerAddress.findUnique({ where: { id: created.id } });
    expect(afterUpdate!.city).toBe("Berlin");

    await deleteAddress(customer.id, created.id);
    expect(await prisma.customerAddress.findUnique({ where: { id: created.id } })).toBeNull();
  });
});

describe("customer-address — IDOR-Schutz", () => {
  it("verhindert Update fremder Adressen (FORBIDDEN)", async () => {
    const a = await makeCustomer();
    const b = await makeCustomer();
    createdEmails.add(a.email);
    createdEmails.add(b.email);
    const addr = await addAddress(a.customer.id, sampleAddress());

    await expect(updateAddress(b.customer.id, addr.id, sampleAddress())).rejects.toThrow("FORBIDDEN");
  });

  it("verhindert Löschen fremder Adressen (FORBIDDEN)", async () => {
    const a = await makeCustomer();
    const b = await makeCustomer();
    createdEmails.add(a.email);
    createdEmails.add(b.email);
    const addr = await addAddress(a.customer.id, sampleAddress());

    await expect(deleteAddress(b.customer.id, addr.id)).rejects.toThrow("FORBIDDEN");
    // Adresse existiert weiterhin.
    expect(await prisma.customerAddress.findUnique({ where: { id: addr.id } })).not.toBeNull();
  });

  it("verhindert Default-Setzen fremder Adressen (FORBIDDEN)", async () => {
    const a = await makeCustomer();
    const b = await makeCustomer();
    createdEmails.add(a.email);
    createdEmails.add(b.email);
    const addr = await addAddress(a.customer.id, sampleAddress());

    await expect(setDefaultBilling(b.customer.id, addr.id)).rejects.toThrow("FORBIDDEN");
  });

  it("wirft NOT_FOUND bei nicht existierender Adresse", async () => {
    const { email, customer } = await makeCustomer();
    createdEmails.add(email);
    await expect(updateAddress(customer.id, "gibtsnicht", sampleAddress())).rejects.toThrow("NOT_FOUND");
  });
});

describe("customer-address — Default-Atomarität", () => {
  it("nur eine Adresse kann Standard-Rechnungsadresse sein", async () => {
    const { email, customer } = await makeCustomer();
    createdEmails.add(email);

    const first = await addAddress(customer.id, sampleAddress({ isDefaultBilling: true }));
    const second = await addAddress(customer.id, sampleAddress({ isDefaultBilling: true }));

    const refreshedFirst = await prisma.customerAddress.findUnique({ where: { id: first.id } });
    const refreshedSecond = await prisma.customerAddress.findUnique({ where: { id: second.id } });
    expect(refreshedFirst!.isDefaultBilling).toBe(false);
    expect(refreshedSecond!.isDefaultBilling).toBe(true);

    const defaults = await prisma.customerAddress.count({
      where: { customerId: customer.id, isDefaultBilling: true },
    });
    expect(defaults).toBe(1);
  });

  it("setDefaultBilling verschiebt den Default atomar", async () => {
    const { email, customer } = await makeCustomer();
    createdEmails.add(email);
    const a = await addAddress(customer.id, sampleAddress({ isDefaultBilling: true }));
    const b = await addAddress(customer.id, sampleAddress());

    await setDefaultBilling(customer.id, b.id);
    const refreshedA = await prisma.customerAddress.findUnique({ where: { id: a.id } });
    const refreshedB = await prisma.customerAddress.findUnique({ where: { id: b.id } });
    expect(refreshedA!.isDefaultBilling).toBe(false);
    expect(refreshedB!.isDefaultBilling).toBe(true);
  });
});
