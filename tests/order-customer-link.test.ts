import { describe, it, expect, afterEach } from "vitest";
import { resolveLinkedCustomerId } from "@/lib/services/order-create";
import { makeCustomer, cleanupCustomer } from "./_helpers/factory";

/**
 * Konto-Verknüpfung beim Checkout. resolveLinkedCustomerId entscheidet, welchem
 * Konto eine neue Bestellung zugeordnet wird (siehe order-create.ts).
 */

const createdEmails = new Set<string>();

afterEach(async () => {
  for (const email of createdEmails) await cleanupCustomer(email);
  createdEmails.clear();
});

describe("resolveLinkedCustomerId", () => {
  it("ordnet verifiziertem Konto über die E-Mail zu", async () => {
    const { email, customer } = await makeCustomer({ verified: true });
    createdEmails.add(email);
    const id = await resolveLinkedCustomerId(email);
    expect(id).toBe(customer.id);
  });

  it("ordnet NICHT zu, wenn das Konto unverifiziert ist", async () => {
    const { email } = await makeCustomer({ verified: false });
    createdEmails.add(email);
    const id = await resolveLinkedCustomerId(email);
    expect(id).toBeNull();
  });

  it("gibt null zurück, wenn kein Konto existiert", async () => {
    const id = await resolveLinkedCustomerId("niemand-da@example.com");
    expect(id).toBeNull();
  });

  it("eingeloggter Kunde (explicit) hat Vorrang vor E-Mail-Match", async () => {
    const { email } = await makeCustomer({ verified: true });
    createdEmails.add(email);
    const id = await resolveLinkedCustomerId(email, "explicit-customer-id");
    expect(id).toBe("explicit-customer-id");
  });
});
