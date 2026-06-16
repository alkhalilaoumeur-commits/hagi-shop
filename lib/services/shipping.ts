import prisma from "@/lib/prisma";

export interface ShippingQuote {
  rateId: string;
  name: string;
  carrier: string | null;
  cents: number;
  minDays: number;
  maxDays: number;
  freeShippingApplied: boolean;
}

interface QuoteInput {
  countryCode: string;
  subtotalCents: number;
  weightGrams: number;
  deliveryType: "SHIPPING" | "PICKUP" | "LOCAL_DELIVERY";
}

const PICKUP_QUOTE: ShippingQuote = {
  rateId: "pickup",
  name: "Selbstabholung Showroom Stuttgart",
  carrier: null,
  cents: 0,
  minDays: 0,
  maxDays: 1,
  freeShippingApplied: false,
};

export async function quoteShipping(input: QuoteInput): Promise<ShippingQuote[]> {
  if (input.deliveryType === "PICKUP") {
    return [PICKUP_QUOTE];
  }

  const zones = await prisma.shippingZone.findMany({
    where: { active: true, countries: { has: input.countryCode } },
    include: { rates: { where: { active: true } } },
  });

  if (zones.length === 0) return [];

  const quotes: ShippingQuote[] = [];

  for (const zone of zones) {
    for (const rate of zone.rates) {
      let cents = 0;
      if (rate.type === "FLAT") {
        cents = rate.flatRateCents ?? 0;
      } else if (rate.type === "WEIGHT_BASED" && Array.isArray(rate.weightTiers)) {
        const tier = (rate.weightTiers as Array<{ maxKg: number; cents: number }>).find(
          (t) => input.weightGrams / 1000 <= t.maxKg,
        );
        cents = tier?.cents ?? 0;
      } else if (rate.type === "PRICE_BASED" && Array.isArray(rate.priceTiers)) {
        const tier = (rate.priceTiers as Array<{ maxCents: number; cents: number }>).find(
          (t) => input.subtotalCents <= t.maxCents,
        );
        cents = tier?.cents ?? 0;
      }

      let freeShippingApplied = false;
      if (
        rate.freeShippingThresholdCents !== null &&
        rate.freeShippingThresholdCents !== undefined &&
        input.subtotalCents >= rate.freeShippingThresholdCents
      ) {
        cents = 0;
        freeShippingApplied = true;
      }

      quotes.push({
        rateId: rate.id,
        name: rate.name,
        carrier: rate.carrier,
        cents,
        minDays: rate.minDeliveryDays,
        maxDays: rate.maxDeliveryDays,
        freeShippingApplied,
      });
    }
  }

  return quotes.sort((a, b) => a.cents - b.cents);
}
