# Recherche: E-Commerce Order/Cart/Discount/Shipping Datenmodelle

**Datum:** 2026-06-13
**Ziel:** Vorlage für Hagi-Prisma-Schema fuer Order-Management, basierend auf den 4 fuehrenden E-Commerce-Systemen
**Quellen:** Medusa.js, Saleor, Shopify Admin API 2024-10, WooCommerce REST API v3
**Kontext:** Hagi Teppich-Shop, Next.js + Prisma + Postgres, Stripe-Payment, B2C primaer, B2B optional spaeter, DACH-Markt

---

## TL;DR (5 Saetze)

1. **Alle 4 Systeme trennen Order-Status / Payment-Status / Fulfillment-Status** in mindestens 3 unabhaengige Felder — eine einzige `status`-Spalte ist Anti-Pattern.
2. **Money wird in den Top-Systemen einheitlich als Integer (kleinste Waehrungseinheit) gespeichert**: Shopify, Stripe und Medusa folgen diesem Pattern, Saleor speichert als Decimal mit separatem `currency`-Feld. **Empfehlung fuer Hagi: Integer-Cents** wegen Stripe-Kompatibilitaet und Rundungs-Sicherheit.
3. **LineItem snapshotted IMMER**: `product_title`, `variant_title`, `sku`, `unit_price`, `tax_rate`, `image_url`, `weight_grams` — niemals nur per FK referenzieren, da Produkte sich aendern oder geloescht werden.
4. **Billing- und Shipping-Adresse sind getrennte Records** in allen 4 Systemen, niemals geteilt — wegen separat aenderbarer Empfaenger und DSGVO-Anonymisierung.
5. **DSGVO-Twist**: Order-Daten muessen 10 Jahre aufbewahrt werden (AO §147), Customer-Daten nicht. Daher braucht Hagi **Snapshot-Felder auf Order** (Email, Name, Adresse) plus `customer_id`-FK als nullable — bei Customer-Loeschung wird FK auf null gesetzt, Snapshots bleiben fuer Steuerrecht erhalten.

---

## A) Order — Felder-Vergleich der 4 Systeme

### A.1 Order-Identifikation

| Feld | Medusa | Saleor | Shopify | WooCommerce | Hagi-Empfehlung |
|---|---|---|---|---|---|
| Interne ID | `id` (UUID) | `id` (GraphQL-ID) | `id` (Int64) | `id` (Int) | `id` (cuid) |
| Order-Number (Anzeige) | `display_id` (Int) | `number` (String) | `name` / `order_number` | `number` (String) | `orderNumber` (String) |
| Token (Public-URL) | `token` | `token` | `token` | `order_key` | `publicToken` (cuid) |
| Confirmation-Code | — | — | `confirmation_number` | — | — (Order-Number reicht) |

**Lernung:** Alle 4 Systeme trennen interne ID, anzeigbare Bestellnummer und Public-Token (fuer Gast-Bestellungen).

### A.2 Customer-Info

| Feld | Medusa | Saleor | Shopify | WooCommerce |
|---|---|---|---|---|
| Customer-FK | `customer_id` | `user` (FK) | `customer` (Object) | `customer_id` (Int, 0 = Gast) |
| Email | `email` | `userEmail` | `email` | `billing.email` |
| Phone | (in Address) | (in Address) | `phone` | `billing.phone` |
| Locale | — | `languageCodeEnum` | `customer_locale` | (Site-Default) |
| Marketing-Consent | — | — | `buyer_accepts_marketing` | — |

**Lernung:** Email ist IMMER ein eigenes Feld auf Order (auch wenn in Address dupliziert), weil Bestellbestaetigung daran haengt.

### A.3 Billing vs Shipping Address — Sind getrennt!

Alle 4 Systeme trennen `billing_address` und `shipping_address` strikt. Beide sind eigene Records (nicht FK zu Customer-Addresses).

```sql
-- Shopify-Pattern (vereinfacht):
order.billing_address = { first_name, last_name, address1, address2,
                          city, province, country, zip, phone, ... }
order.shipping_address = { ... gleiche Struktur ... }
```

**Warum getrennt:**
1. Empfaenger der Lieferung kann von Rechnungsempfaenger abweichen (Geschenk, Buero-Lieferung)
2. Aenderung der Customer-Stamm-Adresse darf alte Orders nicht ueberschreiben
3. DSGVO: Anonymisierung der Customer-Daten ohne Order zu zerstoeren

### A.4 Money-Snapshots auf Order-Ebene

| Feld | Medusa | Saleor | Shopify | WooCommerce |
|---|---|---|---|---|
| Subtotal (vor Steuer + Versand) | `subtotal` | `subtotal.gross/net` | `subtotal_price` | (berechnet) |
| Total (final, inkl. alles) | `total` | `total.gross/net` | `total_price` | `total` |
| Steuer | `tax_total` | `total.tax` | `total_tax` | `total_tax` |
| Steuer-Modus | `tax_included` | `displayGrossPrices` | `taxes_included` | `prices_include_tax` |
| Versandkosten | `shipping_total` | `shippingPrice.gross` | `total_shipping_price_set` | (in shipping_lines) |
| Rabatt-Total | `discount_total` | `discount.amount` | `total_discounts` | `discount_total` |
| Vor-Rabatt-Total | — | `undiscountedTotal` | — | — |
| Bezahlt-Betrag | — | `totalCharged` | (in transactions) | — |
| Autorisiert | — | `totalAuthorized` | — | — |
| Refunded | — | — | (in refunds) | `total_tax` (-refund) |
| Currency | `currency_code` | (in Money-Type) | `currency` / `presentment_currency` | `currency` |

**Lernung:** Mindestens diese 7 Money-Snapshots gehoeren auf Order: `subtotal`, `tax`, `shipping`, `discount`, `total`, `paid`, `refunded`. Alle als Integer-Cents.

### A.5 Order-Status Lifecycle

**Saleor Status-Machine (am saubersten):**

```
DRAFT → UNCONFIRMED → UNFULFILLED → PARTIALLY_FULFILLED → FULFILLED
                  ↓                ↓                       ↓
              EXPIRED         CANCELED              RETURNED
```

Saleor-States im Detail:
- `DRAFT` — Admin erstellt Order manuell, Stock noch nicht alloziert
- `UNCONFIRMED` — Checkout abgeschlossen, aber unbezahlt
- `UNFULFILLED` — Bezahlt, wartet auf Versand
- `PARTIALLY_FULFILLED` — Teilversand erfolgt
- `FULFILLED` — Komplett versendet
- `CANCELED` — Storniert (Stock freigegeben)
- `EXPIRED` — Customer hat nicht innerhalb X Minuten gezahlt
- `RETURNED` — Vom Kunden retourniert

**Shopify-Approach:** EIN globaler Status existiert nicht, stattdessen 2 separate Felder:
- `financial_status`: `pending`, `authorized`, `partially_paid`, `paid`, `partially_refunded`, `refunded`, `voided`
- `fulfillment_status`: `null` (= unfulfilled), `partial`, `fulfilled`, `restocked`, `not_eligible`
- Plus: `cancelled_at` (Timestamp) + `cancel_reason` (`customer`, `fraud`, `inventory`, `declined`, `other`)

**WooCommerce:** EIN Status — schlechter Pattern!
- `pending`, `processing`, `on-hold`, `completed`, `cancelled`, `refunded`, `failed`, `trash`

**Empfehlung fuer Hagi:** Shopify-Style mit drei separaten Status-Feldern:
1. `orderStatus`: `pending` | `confirmed` | `cancelled` | `completed`
2. `paymentStatus`: `pending` | `authorized` | `paid` | `partially_refunded` | `refunded` | `failed`
3. `fulfillmentStatus`: `unfulfilled` | `partially_fulfilled` | `fulfilled` | `returned`

### A.6 Tracking-Felder (Fulfillment)

| Feld | Shopify | Medusa | Saleor | WooCommerce |
|---|---|---|---|---|
| Carrier | `tracking_company` | (in shipping_method.data) | (in Fulfillment) | (in shipping_lines.meta) |
| Tracking-Number | `tracking_number` | (in shipping_method.data) | `trackingNumber` | (meta) |
| Tracking-URL | `tracking_url` | — | — | (meta) |
| Estimated Delivery | — | — | — | — |
| Shipped-At | — | `shipped_at` (Fulfillment) | `created` (Fulfillment) | (meta) |

**Lernung:** Carrier + Tracking-Number + Tracking-URL sind in ALLEN Systemen Pflicht. Estimated Delivery ist seltener als eigenes Feld (meist berechnet aus Versand-Methode).

### A.7 Timestamps

Pflicht-Timestamps in allen 4 Systemen:

| Timestamp | Bedeutung |
|---|---|
| `created_at` | Order angelegt |
| `confirmed_at` / `processed_at` | Order bestaetigt |
| `paid_at` / `date_paid` | Zahlung eingegangen |
| `fulfilled_at` / `date_completed` | Versendet |
| `delivered_at` | Beim Kunden angekommen (selten getrackt) |
| `cancelled_at` | Storniert |
| `refunded_at` | Rueckerstattung erfolgt |
| `updated_at` | Letzte Aenderung |

### A.8 Fraud-Detection & Audit

| Feld | Shopify | WooCommerce | Saleor | Medusa |
|---|---|---|---|---|
| IP-Adresse | `browser_ip` | `customer_ip_address` | (in Metadata) | (Custom) |
| User-Agent | `client_details.user_agent` | `customer_user_agent` | — | — |
| Browser-Info | `client_details.*` | `client_details` | — | — |
| Cart-Hash | — | `cart_hash` | — | — |
| Risk-Score | `risks` (Array) | — | — | — |

**Lernung:** IP + User-Agent sind branchenueblich auf Order — fuer Betrugs-Pruefung und Streit-Faelle bei Chargebacks. **DSGVO-Aspekt:** IP gilt als personenbezogen, Anonymisierung nach 30 Tagen empfohlen.

### A.9 B2B-Felder

Shopify Plus B2B (Stand 2026, Winter '26 Edition) — eigene Entity `Company`:

```typescript
Company {
  id, name, externalId
  locations: CompanyLocation[]    // Multi-Location: HQ, Warehouse, Branch
  contacts: CompanyContact[]      // Multi-User: Einkaeufer, AP, ...
  paymentTerms: 'NET_7' | 'NET_30' | 'NET_60' | 'NET_90' | 'CUSTOM'
  taxExempt: boolean
  taxRegistrationId: string       // = USt-ID / VAT-ID
  catalogId: string               // Custom Price-List
}

Order {
  ...
  companyLocationId: string?      // B2B-Order, ansonsten null
  poNumber: string?               // Purchase-Order-Nummer vom Kunden
  taxExempt: boolean              // Reverse-Charge bei EU-B2B
}
```

Saleor B2B: einfacher, ueber `Channel` + `customerGroups` (Permission-basiert).

**Empfehlung fuer Hagi:** B2B-Felder vorsehen, aber als nullable optional. Pflicht-Felder fuer V1:
- `Order.companyName` (String?)
- `Order.vatId` (String?, validiert)
- `Order.isReverseCharge` (Boolean, default false)
- `Order.purchaseOrderNumber` (String?)

### A.10 DSGVO-Felder

Keines der 4 Systeme hat das in der Default-API explizit, aber alle Open-Source-Stores ergaenzen:

| Feld | Zweck |
|---|---|
| `agbAcceptedAt` | Zeitpunkt der AGB-Zustimmung |
| `agbVersion` | Versions-String der AGB |
| `dsgvoAcceptedAt` | Zeitpunkt Datenschutz-Zustimmung |
| `dsgvoVersion` | Version |
| `widerrufBelehrungShownAt` | Widerrufsbelehrung angezeigt |
| `widerrufBelehrungVersion` | Version |
| `marketingConsent` | Newsletter-Opt-In separat |
| `anonymizedAt` | Wenn DSGVO-Loeschung erfolgte (Snapshots bleiben, FK null) |

### A.11 Metadata & Notes

Alle 4 Systeme haben:
- **Customer-Note** (vom Kunden im Checkout eingegeben, kunden-sichtbar)
- **Internal-Note / Tags** (nur Admin)
- **Metadata (JSON)** fuer Custom-Felder (Saleor: `metadata` public + `privateMetadata` private)

---

## B) LineItem / OrderItem — Felder-Vergleich

### B.1 Was wird gesnapshottet?

**Shopify LineItem-Snapshot-Felder:**
- `title`, `variant_title`, `sku`, `vendor`, `product_id`, `variant_id`
- `quantity`
- `price` (Einzelpreis zum Bestellzeitpunkt)
- `total_discount` (auf diesen Item)
- `tax_lines: [{ title, rate, price }]`
- `grams` (Gewicht)
- `requires_shipping`
- `taxable`
- `fulfillment_service`, `fulfillment_status`, `fulfillable_quantity`

**Saleor OrderLine-Snapshot-Felder:**
- `productName`, `variantName`, `productSku`, `productVariantId`
- `quantity`, `quantityFulfilled`
- `unitPrice` (TaxedMoney = net + gross + tax)
- `undiscountedUnitPrice` (vor Rabatt-Allocation)
- `totalPrice`, `undiscountedTotalPrice`
- `unitDiscount`, `unitDiscountReason`, `unitDiscountType`
- `taxRate`, `taxClass` (denormalisiert!), `taxClassName`
- `thumbnail` (Image-URL)
- `translatedProductName`, `translatedVariantName`
- `isShippingRequired`, `isGift`
- `voucherCode`, `allocations`, `discounts`, `metadata`

**WooCommerce LineItem:**
- `name`, `product_id`, `variation_id`, `sku`
- `quantity`, `tax_class`
- `subtotal`, `subtotal_tax`, `total`, `total_tax`
- `taxes[]`, `meta_data[]`

**Lernung — diese Felder MUESSEN gesnapshottet werden:**

| Feld | Begruendung |
|---|---|
| `productTitle` | Produkt kann umbenannt/geloescht werden |
| `productSku` | Steuerrechtlich: Was wurde verkauft? |
| `variantTitle` (z.B. "200 × 300 cm, Rot") | Variante kann sich aendern |
| `productImageUrl` | Bilder werden ausgetauscht |
| `unitPriceCents` | Preis aendert sich staendig |
| `unitWeightGrams` | Versand-Berechnung fixieren |
| `taxRatePercent` | Steuersatz kann sich aendern (z.B. UStG-Reform) |
| `taxClass` | "Standard" / "Ermaessigt" / "Befreit" |

**Was NICHT gesnapshottet werden muss (FK reicht):**
- `productId`, `variantId` — fuer Re-Order-Funktion und Rueckverlinkung

### B.2 Partial-Fulfillment

**Wie modellieren die Systeme teilweisen Versand?**

**Shopify-Ansatz:** Separate `Fulfillment`-Entity, viele zu einer Order:

```
Order
  ├─ Fulfillment #1 (3 Items, tracking_number "DHL-123")
  ├─ Fulfillment #2 (2 Items, tracking_number "DHL-456")
  └─ unfulfilled_items: 1
```

Jedes LineItem hat:
- `fulfillable_quantity` (was noch zu versenden ist)
- `fulfillment_status`: `null` | `partial` | `fulfilled`

**Saleor-Ansatz:** Eigene `Fulfillment` + `FulfillmentLine`:

```
Order
  └─ fulfillments: [
       { id, status: 'FULFILLED', trackingNumber, lines: [
           { orderLineId: 'X', quantity: 3 }
       ]}
     ]
```

**Medusa-Ansatz:** Sehr aehnlich (Fulfillment-Modul separat).

**Empfehlung fuer Hagi V1:** Da wir Teppiche verkaufen (meist 1-2 Items pro Order, keine teilweisen Versendungen), reicht ein einfaches Modell:
- `OrderItem.fulfilledQuantity` (Int)
- `Fulfillment` als separates Modell mit `trackingNumber`, `carrier`, `shippedAt`
- 1 Order = 0..n Fulfillments

### B.3 Partial-Refund

**Shopify-Ansatz:** Separate `Refund`-Entity:

```
Order
  └─ refunds: [
       { id, created_at, note, restock,
         refund_line_items: [{ line_item_id, quantity, subtotal, total_tax }],
         transactions: [{ amount, gateway, status }]
       }
     ]
```

**Saleor-Ansatz:** `TransactionItem` mit `chargePendingAmount`, `refundPendingAmount`, `refundedAmount`.

**WooCommerce-Ansatz:** Separate `Refund`-Objekte, jeder mit `line_items[]` und eigenem Total.

**Empfehlung fuer Hagi V1:** Eigene `Refund`-Entity:

```prisma
model Refund {
  id            String   @id @default(cuid())
  orderId       String
  amountCents   Int
  reason        String?
  refundedAt    DateTime @default(now())
  stripeRefundId String? @unique
  items         RefundItem[]  // welche Items, wie viele
}
```

---

## C) Address — Felder-Vergleich

Alle 4 Systeme haben praktisch identische Adress-Struktur:

| Feld | Shopify | Saleor | Medusa | WooCommerce | Hagi |
|---|---|---|---|---|---|
| First Name | `first_name` | `firstName` | `first_name` | `first_name` | `firstName` |
| Last Name | `last_name` | `lastName` | `last_name` | `last_name` | `lastName` |
| Company | `company` | `companyName` | `company` | `company` | `company` |
| Street 1 | `address1` | `streetAddress1` | `address_1` | `address_1` | `street1` |
| Street 2 | `address2` | `streetAddress2` | `address_2` | `address_2` | `street2` |
| City | `city` | `city` | `city` | `city` | `city` |
| Province/State | `province` | `countryArea` | `province` | `state` | `state` |
| Postcode | `zip` | `postalCode` | `postal_code` | `postcode` | `postalCode` |
| Country (ISO-2) | `country_code` | `country` | `country_code` | `country` | `countryCode` |
| Phone (E.164) | `phone` | `phone` | `phone` | `phone` | `phone` |

**Validation-Rules (branchenueblich):**
- `countryCode`: ISO-3166-1 alpha-2 ("DE", "AT", "CH")
- `phone`: E.164 ("+49301234567")
- `postalCode`: laenderspezifisch (DE = `^\d{5}$`, CH = `^\d{4}$`, AT = `^\d{4}$`)
- `street1`: max 100 chars (DHL-Limit)

---

## D) Discount / Promotion / Coupon

### D.1 Saleor `Voucher`-Modell (am vollstaendigsten)

```typescript
Voucher {
  id, name, code, codes (Array, Multi-Code)
  type: 'ENTIRE_ORDER' | 'SHIPPING' | 'SPECIFIC_PRODUCT'
  discountValueType: 'FIXED' | 'PERCENTAGE'
  discountValue: Decimal

  // Limits
  minSpent: Money?
  minCheckoutItemsQuantity: Int?
  usageLimit: Int?
  used: Int                       // count
  applyOncePerOrder: Boolean
  applyOncePerCustomer: Boolean
  singleUse: Boolean

  // Validity
  startDate: DateTime
  endDate: DateTime?
  onlyForStaff: Boolean

  // Scope
  products: [Product]             // Limit auf bestimmte Produkte
  collections: [Collection]
  categories: [Category]
  variants: [ProductVariant]
  countries: [String]             // nur DE/AT/CH z.B.

  // Channel-specific
  channelListings: [{ channel, discountValue, minSpent }]
}
```

### D.2 Shopify `PriceRule` + `DiscountCode`

```typescript
PriceRule {
  value_type: 'percentage' | 'fixed_amount'
  value: Decimal                  // Negativ! "-15.00"
  target_type: 'line_item' | 'shipping_line'
  target_selection: 'all' | 'entitled'
  allocation_method: 'across' | 'each'
  customer_selection: 'all' | 'prerequisite'

  // Limits
  usage_limit: Int?
  once_per_customer: Boolean
  prerequisite_quantity_range: { greater_than_or_equal_to: Int }
  prerequisite_subtotal_range: { greater_than_or_equal_to: Decimal }

  // Validity
  starts_at: DateTime
  ends_at: DateTime?
}

DiscountCode {
  code: String
  price_rule_id: PriceRule
  usage_count: Int
}
```

### D.3 WooCommerce `Coupon`

Aehnlich Shopify, aber zusaetzlich:
- `individual_use`: nicht stackbar
- `exclude_sale_items`: kein Rabatt auf bereits reduzierte Ware
- `email_restrictions`: nur fuer bestimmte Email-Adressen

### D.4 Empfehlung fuer Hagi

```prisma
model Discount {
  id              String   @id @default(cuid())
  code            String   @unique  // "TEPPICH10"

  // Type
  type            DiscountType  // PERCENTAGE | FIXED | FREE_SHIPPING
  value           Int           // Cents oder Prozent*100

  // Limits
  minOrderCents   Int?          // Mindestbestellwert
  maxDiscountCents Int?         // Cap (z.B. max 100€ Rabatt)
  usageLimit      Int?          // Total-Limit
  usedCount       Int      @default(0)
  oncePerCustomer Boolean  @default(false)

  // Validity
  validFrom       DateTime
  validUntil      DateTime?

  // Scope
  excludedProductIds String[]   // Postgres-Array
  excludedCategoryIds String[]
  stackable       Boolean  @default(false)

  // Metadata
  description     String?
  createdAt       DateTime @default(now())
}

enum DiscountType {
  PERCENTAGE
  FIXED_AMOUNT
  FREE_SHIPPING
}
```

---

## E) Shipping (Zone / Rate / Method)

### E.1 Shopify

```typescript
ShippingZone {
  name: String
  countries: [{ code, provinces: [{ code }] }]
  price_based_shipping_rates: [{
    name, min_order_subtotal, max_order_subtotal, price
  }]
  weight_based_shipping_rates: [{
    name, weight_low, weight_high, price
  }]
  carrier_shipping_rate_providers: [...]   // DHL, UPS Live-Rates
}
```

### E.2 Saleor

```typescript
ShippingZone {
  countries: [CountryDisplay]
  defaultZone: Boolean
  channels: [Channel]
  shippingMethods: [ShippingMethodType]
}

ShippingMethodType {
  name, description
  type: 'PRICE' | 'WEIGHT'
  minimumOrderPrice / maximumOrderPrice
  minimumOrderWeight / maximumOrderWeight
  minimumDeliveryDays, maximumDeliveryDays   // Range!
  taxClass, channelListings (Price pro Channel)
}
```

**Lernung — Delivery-Days als Range** (`min` + `max`) statt einzelnem Wert ist branchenueblich (z.B. "3–5 Werktage").

### E.3 Empfehlung fuer Hagi

```prisma
model ShippingZone {
  id              String   @id @default(cuid())
  name            String          // "DACH", "EU", "Welt"
  countries       String[]        // ["DE", "AT", "CH"]
  rates           ShippingRate[]
}

model ShippingRate {
  id              String   @id @default(cuid())
  zoneId          String
  name            String          // "DHL Standard", "DHL Premium"
  carrier         String?         // "dhl", "ups", "dpd"

  // Berechnung
  type            ShippingType    // FLAT, WEIGHT_BASED, PRICE_BASED
  flatRateCents   Int?            // bei FLAT
  weightTiers     Json?           // bei WEIGHT_BASED: [{ maxKg, cents }]
  priceTiers      Json?           // bei PRICE_BASED: [{ minCents, cents }]

  freeShippingThresholdCents Int? // ab welchem Order-Wert kostenlos

  // Delivery-Days als Range
  minDeliveryDays Int
  maxDeliveryDays Int

  // Tax
  taxClass        String?         // "standard" / "reduced"

  active          Boolean  @default(true)
  zone            ShippingZone @relation(fields: [zoneId], references: [id])
}

enum ShippingType {
  FLAT
  WEIGHT_BASED
  PRICE_BASED
}
```

---

## F) Customer / User

### F.1 Pflicht-Felder aus den 4 Systemen

| Feld | Shopify | Saleor | Medusa | WooCommerce |
|---|---|---|---|---|
| Email (unique) | ✓ | ✓ | ✓ | ✓ |
| Password-Hash | (Shopify-managed) | ✓ | ✓ | (WP-managed) |
| First/Last Name | ✓ | ✓ | ✓ | ✓ |
| Phone | ✓ | — | ✓ | (in Address) |
| Locale | ✓ | ✓ | — | — |
| Marketing-Consent | ✓ | — | ✓ | — |
| Default Addresses | ✓ | ✓ | ✓ | ✓ |
| Tags / Groups | ✓ | ✓ (groups) | ✓ | ✓ |
| Notes (intern) | ✓ | — | — | — |
| Tax-Exempt | ✓ | ✓ | ✓ | — |
| VAT-ID | ✓ (Plus) | ✓ | ✓ (Metadata) | ✓ |

### F.2 Security-Felder (aus Best-Practices ergaenzt)

| Feld | Zweck |
|---|---|
| `passwordHash` | bcrypt/argon2 |
| `passwordResetToken` | Single-use |
| `passwordResetExpiresAt` | TTL |
| `emailVerifiedAt` | Double-Opt-In |
| `emailVerificationToken` | |
| `failedLoginAttempts` | Account-Lockout nach 5–10 |
| `lockedUntil` | Bei zu vielen Fehlversuchen |
| `lastLoginAt` | Audit |
| `lastLoginIp` | Audit + Fraud |
| `twoFactorSecret` | Optional |
| `deletedAt` | Soft-Delete fuer DSGVO |
| `anonymizedAt` | Wenn alle PII-Felder genullt |

### F.3 Empfehlung fuer Hagi Customer

```prisma
model Customer {
  id                  String   @id @default(cuid())
  email               String   @unique
  emailVerifiedAt     DateTime?
  emailVerifyToken    String?
  passwordHash        String?           // Optional fuer Gast-Bestellungen
  passwordResetToken  String?
  passwordResetExpiresAt DateTime?

  firstName           String?
  lastName            String?
  phone               String?           // E.164
  locale              String   @default("de-DE")

  // Marketing
  newsletterConsent   Boolean  @default(false)
  newsletterConsentAt DateTime?

  // Security
  failedLoginAttempts Int      @default(0)
  lockedUntil         DateTime?
  lastLoginAt         DateTime?
  lastLoginIp         String?

  // B2B
  isBusinessCustomer  Boolean  @default(false)
  companyName         String?
  vatId               String?           // USt-ID validiert via VIES

  // Admin
  tags                String[]
  internalNotes       String?
  customerGroup       String?           // "vip" | "wholesale" | null

  // DSGVO
  deletedAt           DateTime?
  anonymizedAt        DateTime?

  // Relations
  orders              Order[]
  addresses           CustomerAddress[]

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

---

## G) PaymentEvent / WebhookEvent

### G.1 Branchenstandard

Alle 4 Systeme haben separate Tabellen fuer Webhook-Events (fuer Idempotency und Audit):

```typescript
WebhookEvent {
  id: UUID
  provider: 'stripe' | 'paypal' | 'klarna'
  providerEventId: String       // Stripe: evt_xxx — UNIQUE INDEX
  eventType: String             // "payment_intent.succeeded"
  payload: JSON                 // Full event body
  signature: String             // verifiziert?
  receivedAt: DateTime
  processedAt: DateTime?        // null = nicht verarbeitet
  retryCount: Int @default(0)
  lastError: String?
  relatedOrderId: String?
}
```

### G.2 Empfehlung fuer Hagi

```prisma
model PaymentEvent {
  id              String   @id @default(cuid())
  provider        String          // "stripe"
  providerEventId String   @unique  // stripe evt_xxx — Dedup-Key!
  eventType       String          // "payment_intent.succeeded"
  payload         Json
  signature       String?

  // Processing
  receivedAt      DateTime @default(now())
  processedAt     DateTime?
  retryCount      Int      @default(0)
  lastError       String?

  // Relations
  orderId         String?
  order           Order?   @relation(fields: [orderId], references: [id])

  @@index([provider, providerEventId])
  @@index([processedAt])
}
```

**KRITISCH:** `providerEventId` als UNIQUE INDEX. Stripe sendet Webhooks 1-30x bei Failures. Ohne Dedup verarbeitest du Zahlungen mehrfach.

---

## H) AuditLog

```prisma
model AuditLog {
  id          String   @id @default(cuid())
  actorType   String          // "user" | "admin" | "system" | "webhook"
  actorId     String?         // userId oder null bei system
  action      String          // "order.created", "order.refunded", "customer.deleted"
  entityType  String          // "Order", "Customer", "Product"
  entityId    String
  beforeData  Json?           // bei Updates
  afterData   Json?
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())

  @@index([entityType, entityId])
  @@index([actorId])
  @@index([createdAt])
}
```

---

## I) ConsentLog (DSGVO-spezifisch)

Branchenuebliche Consent-Typen:

| Typ | Pflicht? | Wann erforderlich |
|---|---|---|
| `terms` | Pflicht | AGB-Zustimmung im Checkout |
| `privacy` | Pflicht | Datenschutzerklaerung |
| `withdrawal` | Pflicht | Widerrufsbelehrung (Fernabsatz) |
| `newsletter` | Opt-In | Marketing-Mails |
| `cookies_analytics` | Opt-In | Plausible/GA |
| `cookies_marketing` | Opt-In | Retargeting |

```prisma
model ConsentLog {
  id              String   @id @default(cuid())
  customerId      String?           // null bei Gast-Bestellungen
  orderId         String?           // wenn im Order-Kontext

  consentType     ConsentType
  consentVersion  String           // "1.0", "2.1" — Versionierung wichtig!
  granted         Boolean
  text            String?          // Wortlaut zum Zeitpunkt
  ipAddress       String?
  userAgent       String?

  grantedAt       DateTime @default(now())
  withdrawnAt     DateTime?         // wenn zurueckgezogen

  @@index([customerId])
  @@index([orderId])
}

enum ConsentType {
  TERMS
  PRIVACY
  WITHDRAWAL
  NEWSLETTER
  COOKIES_ANALYTICS
  COOKIES_MARKETING
}
```

**Versionierung-Pattern:** Jede AGB-Aenderung erhoeht `version`. Bei Anzeige der Bestellung wird die Version dem Kunden referenziert ("AGB Version 1.2 vom 2026-03-15").

---

## J) Spezielle Fragen — Antworten

### J.1 Snapshot vs Reference

**Regel:** Alles was sich aendern KANN und steuerrechtlich/rechtlich fixiert sein MUSS, wird gesnapshottet.

| Wird gesnapshottet | Wird per FK referenziert |
|---|---|
| Produkt-Titel | productId |
| Variant-Beschreibung | variantId |
| Einzelpreis (cents) | Customer-Profil |
| Steuersatz (%) | Discount-Definition (nur Code + Wert kopieren) |
| Steuer-Klasse | Shipping-Rate-Definition |
| Bild-URL (Thumbnail) | |
| Gewicht (g) | |
| SKU | |
| Customer-Email | |
| Customer-Name + Adresse | |
| Versand-Methoden-Name + Preis | |
| AGB-Version | |

### J.2 Status-Machine

**Robustes 3-Felder-Modell (Hagi-Empfehlung):**

```
orderStatus:        pending → confirmed → completed
                        ↓         ↓
                    cancelled  cancelled

paymentStatus:      pending → authorized → paid
                        ↓         ↓          ↓
                     failed   cancelled  partially_refunded → refunded

fulfillmentStatus:  unfulfilled → partially_fulfilled → fulfilled
                                                        ↓
                                                    returned
```

**Vorteil:** Status-Felder sind orthogonal. Ein Order kann gleichzeitig `confirmed` + `paid` + `unfulfilled` sein — das ist der Normalfall vor Versand.

### J.3 Partial-Fulfillment

**Empfehlung:** Eigene `Fulfillment`-Entity, 1:n von Order:

```prisma
model Fulfillment {
  id              String   @id @default(cuid())
  orderId         String
  trackingNumber  String?
  carrier         String?         // "dhl" | "dpd" | "ups"
  trackingUrl     String?
  shippedAt       DateTime?
  deliveredAt     DateTime?
  notes           String?
  items           FulfillmentItem[]  // welche OrderItems mit welcher Menge
  order           Order @relation(fields: [orderId], references: [id])
}

model FulfillmentItem {
  id              String @id @default(cuid())
  fulfillmentId   String
  orderItemId     String
  quantity        Int
  fulfillment     Fulfillment @relation(fields: [fulfillmentId], references: [id])
  orderItem       OrderItem @relation(fields: [orderItemId], references: [id])
}
```

### J.4 Partial-Refund

Eigene `Refund`-Entity, 1:n von Order:

```prisma
model Refund {
  id              String   @id @default(cuid())
  orderId         String
  amountCents     Int
  reason          String?         // "customer_request" | "damaged" | "wrong_item"
  notes           String?
  stripeRefundId  String?  @unique
  refundedAt      DateTime @default(now())
  items           RefundItem[]
  order           Order @relation(fields: [orderId], references: [id])
}

model RefundItem {
  id              String @id @default(cuid())
  refundId        String
  orderItemId     String
  quantity        Int
  amountCents     Int             // anteilig
  refund          Refund @relation(fields: [refundId], references: [id])
  orderItem       OrderItem @relation(fields: [orderItemId], references: [id])
}
```

### J.5 Money-Storage

**Entscheidung fuer Hagi: Integer-Cents.**

Gruende:
1. **Stripe sendet alles in Cents** (`amount: 9999` = 99.99 €). Direkte Kompatibilitaet.
2. **Keine Float-Rundungsfehler** bei Steuer-Berechnung.
3. **Branchenstandard fuer E-Commerce** (Shopify, Stripe, Medusa).
4. **Trade-off:** Frontend muss formatieren (`/100`). Aber das ist eine einzige `formatPrice()`-Helper-Funktion.

```prisma
unitPriceCents      Int       // 9999 = 99.99 €
shippingCostCents   Int       // 0 oder positiv
totalCents          Int
```

**Multi-Currency-Strategie:**
- `Order.currency` als 3-Letter-ISO (`"EUR"`, `"CHF"`, `"USD"`)
- Cents-Format gilt fuer Waehrungen mit 2 Dezimalstellen (EUR, USD, CHF). Bei JPY waere `cents` = ganze Yen, da JPY 0 Dezimalstellen hat.
- Fuer Hagi V1: nur EUR. CHF kommt spaeter.

### J.6 B2B-Modellierung

**Empfehlung fuer Hagi V1 (minimal-invasiv):**

Statt eigene `Company`-Entity wie Shopify Plus, einfach Felder auf `Customer` + `Order`:

```prisma
model Customer {
  ...
  isBusinessCustomer  Boolean  @default(false)
  companyName         String?
  vatId               String?           // USt-ID
  taxExempt           Boolean  @default(false)  // Reverse-Charge EU-B2B
  paymentTerms        String?           // "NET_30" oder null
}

model Order {
  ...
  isB2B               Boolean  @default(false)
  companyNameSnapshot String?           // gesnapshottet
  vatIdSnapshot       String?
  isReverseCharge     Boolean  @default(false)
  purchaseOrderNumber String?           // Kunden-Bestellnummer
}
```

**Wenn spaeter Multi-Location/Multi-User-B2B noetig:** Eigene `Company`-Entity ergaenzen, Customer wird zu `CompanyContact`.

---

## K) Empfehlung — Vollstaendiges Hagi Prisma-Schema (Order-Bereich)

Das ist die Vorlage fuer die Migration. Alle Felder kommen aus den Best-Practices der 4 untersuchten Systeme.

```prisma
// =============================================================
// HAGI SHOP — ORDER DATAMODEL v1
// Quelle: Recherche von Medusa.js, Saleor, Shopify, WooCommerce
// =============================================================

// -------------------------------------------------------------
// CUSTOMER
// -------------------------------------------------------------

model Customer {
  id                     String    @id @default(cuid())
  email                  String    @unique
  emailVerifiedAt        DateTime?
  emailVerifyToken       String?
  passwordHash           String?
  passwordResetToken     String?
  passwordResetExpiresAt DateTime?

  firstName              String?
  lastName               String?
  phone                  String?
  locale                 String    @default("de-DE")

  newsletterConsent      Boolean   @default(false)
  newsletterConsentAt    DateTime?

  failedLoginAttempts    Int       @default(0)
  lockedUntil            DateTime?
  lastLoginAt            DateTime?
  lastLoginIp            String?

  isBusinessCustomer     Boolean   @default(false)
  companyName            String?
  vatId                  String?
  taxExempt              Boolean   @default(false)
  customerGroup          String?

  tags                   String[]
  internalNotes          String?

  deletedAt              DateTime?
  anonymizedAt           DateTime?

  orders                 Order[]
  addresses              CustomerAddress[]
  consentLogs            ConsentLog[]

  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt

  @@index([email])
  @@index([deletedAt])
}

model CustomerAddress {
  id           String   @id @default(cuid())
  customerId   String
  label        String?         // "Zuhause", "Buero"
  isDefaultBilling  Boolean @default(false)
  isDefaultShipping Boolean @default(false)

  firstName    String
  lastName     String
  company      String?
  street1      String
  street2      String?
  city         String
  state        String?
  postalCode   String
  countryCode  String          // ISO-3166-1 alpha-2
  phone        String?

  customer     Customer @relation(fields: [customerId], references: [id])

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

// -------------------------------------------------------------
// ORDER
// -------------------------------------------------------------

model Order {
  id                  String   @id @default(cuid())
  orderNumber         String   @unique           // "HAG-2026-000123"
  publicToken         String   @unique @default(cuid())  // fuer Gast-URL

  // Customer (nullable nach Anonymisierung)
  customerId          String?
  customerEmail       String                     // SNAPSHOT — bleibt nach Loeschung
  customerPhone       String?

  // Billing & Shipping (Snapshots als JSON, da Address eigene Entity)
  billingFirstName    String
  billingLastName     String
  billingCompany      String?
  billingStreet1      String
  billingStreet2      String?
  billingCity         String
  billingState        String?
  billingPostalCode   String
  billingCountryCode  String
  billingPhone        String?

  shippingFirstName   String
  shippingLastName    String
  shippingCompany     String?
  shippingStreet1     String
  shippingStreet2     String?
  shippingCity        String
  shippingState       String?
  shippingPostalCode  String
  shippingCountryCode String
  shippingPhone       String?

  // Money (alle in Cents)
  currency            String   @default("EUR")
  subtotalCents       Int                       // vor Versand + Rabatt
  shippingCents       Int      @default(0)
  taxCents            Int                       // berechnete Steuer
  discountCents       Int      @default(0)
  totalCents          Int                       // final
  paidCents           Int      @default(0)
  refundedCents       Int      @default(0)
  taxIncluded         Boolean  @default(true)   // Brutto-Preise Pflicht in DE/B2C

  // Status (3 orthogonale Status-Felder)
  orderStatus         OrderStatus       @default(PENDING)
  paymentStatus       PaymentStatus     @default(PENDING)
  fulfillmentStatus   FulfillmentStatus @default(UNFULFILLED)

  // Cancellation / Refund Reason
  cancelReason        String?           // "customer" | "fraud" | "inventory" | "other"
  cancelledAt         DateTime?

  // Discounts
  discountCode        String?
  discountSnapshot    Json?             // kompletter Discount-Snapshot zum Bestellzeitpunkt

  // Shipping
  shippingMethodName  String?           // SNAPSHOT
  shippingMethodId    String?           // FK auf ShippingRate (nullable)
  estimatedDeliveryMinDays Int?
  estimatedDeliveryMaxDays Int?

  // Stripe / Payment
  paymentProvider     String?           // "stripe" | "paypal"
  stripeSessionId     String?  @unique
  stripePaymentIntentId String? @unique
  paymentMethodType   String?           // "card" | "sepa" | "klarna"
  paymentMethodLast4  String?

  // B2B
  isB2B               Boolean  @default(false)
  vatIdSnapshot       String?
  isReverseCharge     Boolean  @default(false)
  purchaseOrderNumber String?

  // Fraud / Audit
  browserIp           String?
  userAgent           String?
  referrer            String?

  // DSGVO Consent (Snapshots)
  termsAcceptedAt     DateTime
  termsVersion        String
  privacyAcceptedAt   DateTime
  privacyVersion      String
  withdrawalShownAt   DateTime
  withdrawalVersion   String

  // Notes
  customerNote        String?           // vom Kunden
  internalNote        String?           // Admin-only
  tags                String[]

  // Timestamps
  createdAt           DateTime @default(now())
  confirmedAt         DateTime?
  paidAt              DateTime?
  fulfilledAt         DateTime?
  deliveredAt         DateTime?
  refundedAt          DateTime?
  updatedAt           DateTime @updatedAt

  // Anonymisierung
  anonymizedAt        DateTime?

  // Relations
  customer            Customer?       @relation(fields: [customerId], references: [id])
  items               OrderItem[]
  fulfillments        Fulfillment[]
  refunds             Refund[]
  paymentEvents       PaymentEvent[]
  consentLogs         ConsentLog[]

  @@index([customerId])
  @@index([orderStatus])
  @@index([paymentStatus])
  @@index([fulfillmentStatus])
  @@index([createdAt])
  @@index([stripePaymentIntentId])
}

enum OrderStatus {
  PENDING
  CONFIRMED
  COMPLETED
  CANCELLED
}

enum PaymentStatus {
  PENDING
  AUTHORIZED
  PAID
  PARTIALLY_REFUNDED
  REFUNDED
  FAILED
  EXPIRED
}

enum FulfillmentStatus {
  UNFULFILLED
  PARTIALLY_FULFILLED
  FULFILLED
  RETURNED
}

// -------------------------------------------------------------
// ORDER ITEM (mit Snapshots!)
// -------------------------------------------------------------

model OrderItem {
  id                String   @id @default(cuid())
  orderId           String

  // FK fuer Re-Order / Verlinkung
  productId         String?
  variantId         String?

  // SNAPSHOTS — eingefroren zum Bestellzeitpunkt
  productTitle      String
  productSlug       String?
  variantTitle      String?           // "200 × 300 cm, Rot"
  productSku        String
  productImageUrl   String?
  productCategory   String?

  quantity          Int
  unitPriceCents    Int               // Einzelpreis brutto zum Bestellzeitpunkt
  unitWeightGrams   Int?              // fuer Versand-Rekonstruktion

  // Steuer-Snapshot
  taxRatePercent    Decimal  @db.Decimal(5, 2)  // z.B. 19.00
  taxClass          String?           // "standard" | "reduced"
  taxCents          Int               // berechnete Steuer auf diesen Item

  // Rabatt-Allokation auf diesen Item
  discountCents     Int      @default(0)

  // Totals
  subtotalCents     Int               // unitPrice × quantity
  totalCents        Int               // subtotal - discount

  // Fulfillment-Status pro Item (fuer Partial-Versand)
  fulfilledQuantity Int      @default(0)
  refundedQuantity  Int      @default(0)
  refundedCents     Int      @default(0)

  // Metadata
  metadata          Json?

  order             Order @relation(fields: [orderId], references: [id], onDelete: Cascade)
  fulfillmentItems  FulfillmentItem[]
  refundItems       RefundItem[]

  @@index([orderId])
  @@index([productId])
}

// -------------------------------------------------------------
// FULFILLMENT (fuer Partial-Versand)
// -------------------------------------------------------------

model Fulfillment {
  id              String   @id @default(cuid())
  orderId         String
  trackingNumber  String?
  carrier         String?           // "dhl" | "dpd" | "ups" | "spedition"
  trackingUrl     String?
  shippedAt       DateTime?
  deliveredAt     DateTime?
  notes           String?

  order           Order @relation(fields: [orderId], references: [id], onDelete: Cascade)
  items           FulfillmentItem[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([orderId])
}

model FulfillmentItem {
  id              String @id @default(cuid())
  fulfillmentId   String
  orderItemId     String
  quantity        Int

  fulfillment     Fulfillment @relation(fields: [fulfillmentId], references: [id], onDelete: Cascade)
  orderItem       OrderItem   @relation(fields: [orderItemId], references: [id])
}

// -------------------------------------------------------------
// REFUND (fuer Partial-Refund)
// -------------------------------------------------------------

model Refund {
  id              String   @id @default(cuid())
  orderId         String
  amountCents     Int
  reason          String?           // "customer_request" | "damaged" | "wrong_item" | "other"
  notes           String?
  stripeRefundId  String?  @unique
  refundedAt      DateTime @default(now())

  order           Order @relation(fields: [orderId], references: [id], onDelete: Cascade)
  items           RefundItem[]

  @@index([orderId])
  @@index([stripeRefundId])
}

model RefundItem {
  id              String @id @default(cuid())
  refundId        String
  orderItemId     String
  quantity        Int
  amountCents     Int

  refund          Refund @relation(fields: [refundId], references: [id], onDelete: Cascade)
  orderItem       OrderItem @relation(fields: [orderItemId], references: [id])
}

// -------------------------------------------------------------
// DISCOUNT / COUPON
// -------------------------------------------------------------

model Discount {
  id                 String   @id @default(cuid())
  code               String   @unique          // "TEPPICH10"
  description        String?

  type               DiscountType
  value              Int                        // bei PERCENTAGE: 10 = 10%, bei FIXED: cents

  // Limits
  minOrderCents      Int?
  maxDiscountCents   Int?                       // Cap
  usageLimit         Int?
  usedCount          Int      @default(0)
  oncePerCustomer    Boolean  @default(false)

  // Validity
  validFrom          DateTime
  validUntil         DateTime?

  // Scope
  excludedProductIds String[]
  excludedCategoryIds String[]
  stackable          Boolean  @default(false)

  active             Boolean  @default(true)

  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@index([code])
  @@index([active])
}

enum DiscountType {
  PERCENTAGE
  FIXED_AMOUNT
  FREE_SHIPPING
}

// -------------------------------------------------------------
// SHIPPING ZONE / RATE
// -------------------------------------------------------------

model ShippingZone {
  id           String   @id @default(cuid())
  name         String                    // "DACH", "EU", "Welt"
  countries    String[]                  // ["DE", "AT", "CH"]
  active       Boolean  @default(true)

  rates        ShippingRate[]

  createdAt    DateTime @default(now())
}

model ShippingRate {
  id                          String   @id @default(cuid())
  zoneId                      String
  name                        String          // "DHL Standard"
  carrier                     String?         // "dhl" | "dpd" | "spedition"

  type                        ShippingType
  flatRateCents               Int?
  weightTiers                 Json?           // [{ maxKg: 5, cents: 990 }]
  priceTiers                  Json?

  freeShippingThresholdCents  Int?

  minDeliveryDays             Int
  maxDeliveryDays             Int

  taxClass                    String?

  active                      Boolean  @default(true)

  zone                        ShippingZone @relation(fields: [zoneId], references: [id])

  createdAt                   DateTime @default(now())
  updatedAt                   DateTime @updatedAt
}

enum ShippingType {
  FLAT
  WEIGHT_BASED
  PRICE_BASED
}

// -------------------------------------------------------------
// PAYMENT EVENTS (Webhook-Dedup)
// -------------------------------------------------------------

model PaymentEvent {
  id              String   @id @default(cuid())
  provider        String                    // "stripe"
  providerEventId String   @unique          // Dedup-Key!
  eventType       String
  payload         Json
  signature       String?

  receivedAt      DateTime @default(now())
  processedAt     DateTime?
  retryCount      Int      @default(0)
  lastError       String?

  orderId         String?
  order           Order? @relation(fields: [orderId], references: [id])

  @@index([provider, providerEventId])
  @@index([processedAt])
}

// -------------------------------------------------------------
// AUDIT LOG
// -------------------------------------------------------------

model AuditLog {
  id          String   @id @default(cuid())
  actorType   String                    // "customer" | "admin" | "system" | "webhook"
  actorId     String?
  action      String                    // "order.created" | "order.refunded" | ...
  entityType  String
  entityId    String
  beforeData  Json?
  afterData   Json?
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())

  @@index([entityType, entityId])
  @@index([actorId])
  @@index([createdAt])
}

// -------------------------------------------------------------
// CONSENT LOG (DSGVO)
// -------------------------------------------------------------

model ConsentLog {
  id              String   @id @default(cuid())
  customerId      String?
  orderId         String?

  consentType     ConsentType
  consentVersion  String                   // "1.0"
  granted         Boolean
  text            String?                  // Wortlaut zum Zeitpunkt
  ipAddress       String?
  userAgent       String?

  grantedAt       DateTime @default(now())
  withdrawnAt     DateTime?

  customer        Customer? @relation(fields: [customerId], references: [id])
  order           Order?    @relation(fields: [orderId], references: [id])

  @@index([customerId])
  @@index([orderId])
}

enum ConsentType {
  TERMS
  PRIVACY
  WITHDRAWAL
  NEWSLETTER
  COOKIES_ANALYTICS
  COOKIES_MARKETING
}
```

---

## L) Wichtigste 10 Lernungen — Zusammenfassung

1. **Money = Integer-Cents** (wegen Stripe + keine Floats).
2. **Drei separate Status-Felder** (Order/Payment/Fulfillment) statt einem.
3. **Billing & Shipping immer getrennt** (auch wenn gleich).
4. **LineItem snapshotted alles** was sich aendern kann (Title, Preis, Steuer, Bild, Gewicht).
5. **Eigene Fulfillment- und Refund-Entities** (nicht als Felder auf Order) — wegen Partial-Cases.
6. **`providerEventId UNIQUE`** auf PaymentEvent — sonst Doppel-Zahlungen bei Webhook-Retries.
7. **DSGVO-Snapshots auf Order** (Email, Adresse) + `customer_id` nullable — fuer Anonymisierung.
8. **AGB-/Datenschutz-Version** auf Order snapshotten — fuer rechtliche Beweisfuehrung.
9. **Delivery-Days als Range** (`min` + `max`) — Branchenstandard.
10. **B2B-Felder als Optional auf Customer/Order** in V1 — Multi-Location/Multi-User-Company-Modell erst spaeter.

---

## M) Quellen

- [Medusa.js Order Module](https://docs.medusajs.com/resources/commerce-modules/order)
- [Medusa.js Order Concepts](https://docs.medusajs.com/resources/commerce-modules/order/concepts)
- [Saleor Order Object](https://docs.saleor.io/api-reference/orders/objects/order)
- [Saleor Order Line](https://docs.saleor.io/api-reference/orders/objects/order-line)
- [Saleor Order Status Lifecycle](https://docs.saleor.io/developer/checkout/order-status)
- [Saleor Order Expiration](https://docs.saleor.io/developer/checkout/order-expiration)
- [Saleor Order Fulfillment](https://docs.saleor.io/developer/order/order-fulfillment)
- [Shopify Admin REST API — Order](https://shopify.dev/docs/api/admin-rest/2024-10/resources/order)
- [WooCommerce REST API — Orders](https://woocommerce.github.io/woocommerce-rest-api-docs/#orders)
- [Shopify B2B Companies + Net Terms 2026](https://www.shopify.com/enterprise/blog/shopify-winter-26-edition-b2b-roundup)
- [Shopify B2B Net Terms Guide 2026](https://resolvepay.com/blog/b2b-shopify-store-net-terms)
- [Modern Treasury — Floats Don't Work For Cents](https://www.moderntreasury.com/journal/floats-dont-work-for-cents)
- [Currency Storage Best Practices 2026](https://oneuptime.com/blog/post/2026-03-31-mysql-store-currency-values/view)
- [DSGVO Aufbewahrungsfristen 47 Fristen](https://caralegal.eu/blog/gesetzliche-aufbewahrungsfristen-nach-dsgvo/)
- [DSGVO Loeschfristen E-Commerce](https://blog.paperless-solutions.de/gesetzliche-loschfristen/)
- [DSGVO Anonymisierung statt Loeschung](https://www.datenschutz-notizen.de/loeschen-von-personenbezogenen-daten-5228413/)

---

**Naechster Schritt:**
Migration anlegen unter `prisma/migrations/<timestamp>_order_management/`, das Schema aus Abschnitt K in `prisma/schema.prisma` einfuegen, `npx prisma migrate dev` laufen lassen.
