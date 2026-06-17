# Test-Gap-Liste (Stand 2026-06-16)

Lebende Liste aller bekannten Test-Lücken + nicht implementierten Funktionen die per RED-Test gefordert sind.
Wird bei jeder Lücken-Schließung gepflegt.

## Status-Legende
- 🟢 GREEN — Test existiert + grün
- 🔴 RED — Test existiert + rot (Funktion fehlt)
- ⚪ FEHLT — Test noch nicht geschrieben

## Aktuelle Lücken

### Widerruf (BGB § 312g, § 355 — heute schon Pflicht für B2C-Online-Shops)

- 🔴 `calcWithdrawalDeadline(deliveredAt)` — 14 Tage ab Erhalt
- 🔴 `isWithdrawalEligible(order, now)` — rechnet Frist ab `deliveredAt`, NICHT `paidAt`
- 🔴 Erweiterte Frist 12 Mon + 14 Tage bei fehlender Widerrufsbelehrung (§ 356 Abs. 3 BGB)
- 🔴 `calcWithdrawalRefund(order)` — Original + Hin-Versand (Rück-Versand NICHT)
- 🔴 Teil-Widerruf: anteilige Rückerstattung ohne Hin-Versand
- 🔴 `POST /api/widerruf/[token]` — Customer-initiated Widerruf-Endpoint
- 🔴 Frist-abgelaufen-Reject mit Audit-Log
- 🟢 `registerWithdrawal` Backend-Service (existiert, getestet)
- 🟢 `WithdrawalReceivedEmail` Template

**Was zu bauen ist (Reihenfolge):**
1. `lib/services/withdrawal.ts` mit `calcWithdrawalDeadline`, `isWithdrawalEligible`, `calcWithdrawalRefund`
2. Field `withdrawalNoticeGiven: Boolean @default(true)` in `Order` (Migration)
3. `app/api/widerruf/[token]/route.ts` Customer-Endpoint
4. UI: `/widerruf` Page mit Token-Input + Begründungs-Feld

### Sicherheit

- 🟢 IDOR-Test publicToken (Token A liest NICHT Order B)
- 🟢 Login-Rate-Limit / Account-Lock Schema-Tests
- 🟢 Session-Expiry-Filter
- ⚪ CSRF-Test auf Server-Actions (Stage 4 nutzt Next.js Server Actions — eingebauter Schutz, aber expliziter Test fehlt)
- ⚪ Brute-Force-Test auf `/bestellung/status/[token]` mit verschiedenen IPs (Rate-Limit greift pro-IP, nicht global)

### Zahlung

- 🟢 Webhook-Dedup race-safe
- 🟢 Order-State bei payment_failed / expired
- 🟢 Amount-Mismatch Audit-Log
- ⚪ Live-Test gegen Stripe-CLI `stripe trigger` für jeden Event-Typ
- ⚪ Webhook bei nicht-existierender stripeSessionId (race: Webhook vor Order-Create)

### Order-State

- 🟢 Ship → FULFILLED + Idempotenz
- 🟢 Deliver → COMPLETED
- 🟢 Cancel + Refund → CANCELLED + REFUNDED + refundedCents
- 🟢 Concurrent Ship → nur ein Fulfillment
- 🟢 Audit-Log für Lifecycle-Übergänge
- 🟡 Invalid Transitions (Ship einer PENDING-Order) — Smoke-Test vorhanden, aber Service hat noch keinen expliziten Throw
- 🟢 **BUG GEFIXT 2026-06-17:** `markOrderDelivered` hat jetzt `fulfillmentStatus: "FULFILLED"` als WHERE-Guard in `updateMany`. Wirft `ORDER_NOT_SHIPPED` wenn versucht wird eine nicht-versandte Order auf COMPLETED zu setzen. State-Drift verhindert.

### Rabatt

- 🟢 PERCENTAGE / FIXED_AMOUNT / FREE_SHIPPING
- 🟢 redeem + release Lifecycle
- 🟢 Mindestbestellwert / Gültigkeitsfenster
- 🟢 NICHT-Rabattierung des Versands bei %-Codes
- ⚪ Combined-Discount-Prevention (zwei Codes gleichzeitig)
- ⚪ maxDiscountCents-Capping bei %-Codes
- ⚪ excludedProductIds / excludedCategoryIds

### Auth

- 🟢 argon2id Hash + verify (aus Stage 4 Smoke)
- 🟢 Account-Lock Schema
- 🟢 Session-Expiry Filter
- ⚪ E2E Login-Flow mit echtem Cookie-Round-Trip
- ⚪ Session-Hijacking (gleicher Cookie aus anderer IP)
- ⚪ Concurrent Login-Versuche

## Nicht test-pflichtig

- Static-Content-Pages (`/agb`, `/impressum`, `/datenschutz`, `/widerruf`-Belehrung-Page)
- Reine UI-Komponenten (`MarqueeBar`, `HeritageStory`, etc.)
- Email-Template-Styling (HTML wird vom React-Email-Linter validiert)

## Workflow zur Pflege

Bei neuem 🔴 oder ⚪:
1. Test schreiben (RED erlaubt mit `it.fails(...)` + klarem Throw)
2. Hier in Liste aufnehmen
3. Funktion bauen → Test wird 🟢
4. Hier umstellen
