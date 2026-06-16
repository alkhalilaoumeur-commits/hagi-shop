import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Shop-Config Seed (Shipping + Discounts)...");

  const dach = await prisma.shippingZone.upsert({
    where: { id: "zone-dach" },
    update: { countries: ["DE", "AT", "CH"] },
    create: { id: "zone-dach", name: "DACH", countries: ["DE", "AT", "CH"] },
  });

  const eu = await prisma.shippingZone.upsert({
    where: { id: "zone-eu" },
    update: { countries: ["FR", "IT", "ES", "NL", "BE", "LU", "DK", "SE", "PL"] },
    create: {
      id: "zone-eu",
      name: "EU",
      countries: ["FR", "IT", "ES", "NL", "BE", "LU", "DK", "SE", "PL"],
    },
  });

  const rates = [
    {
      id: "rate-dach-standard",
      zoneId: dach.id,
      name: "DHL Standard",
      carrier: "dhl",
      type: "FLAT" as const,
      flatRateCents: 1490,
      freeShippingThresholdCents: 50000,
      minDeliveryDays: 2,
      maxDeliveryDays: 4,
    },
    {
      id: "rate-dach-spedition",
      zoneId: dach.id,
      name: "Spedition für Großteppiche",
      carrier: "spedition",
      type: "FLAT" as const,
      flatRateCents: 8900,
      freeShippingThresholdCents: 200000,
      minDeliveryDays: 4,
      maxDeliveryDays: 8,
    },
    {
      id: "rate-eu-standard",
      zoneId: eu.id,
      name: "DHL Europa",
      carrier: "dhl",
      type: "FLAT" as const,
      flatRateCents: 2990,
      freeShippingThresholdCents: 100000,
      minDeliveryDays: 4,
      maxDeliveryDays: 8,
    },
  ];

  for (const r of rates) {
    await prisma.shippingRate.upsert({
      where: { id: r.id },
      update: r,
      create: r,
    });
    console.log(`  ✓ Rate: ${r.name}`);
  }

  const discounts = [
    {
      code: "WILLKOMMEN10",
      description: "10 % auf die erste Bestellung",
      type: "PERCENTAGE" as const,
      value: 10,
      minOrderCents: 30000,
      maxDiscountCents: 30000,
      usageLimit: null,
      oncePerCustomer: true,
      validFrom: new Date(),
    },
    {
      code: "GRATISVERSAND",
      description: "Versand frei ab 200 €",
      type: "FREE_SHIPPING" as const,
      value: 0,
      minOrderCents: 20000,
      validFrom: new Date(),
    },
  ];

  for (const d of discounts) {
    await prisma.discount.upsert({
      where: { code: d.code },
      update: d,
      create: d,
    });
    console.log(`  ✓ Discount: ${d.code}`);
  }

  console.log("✅ Shop-Config Seed fertig.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
