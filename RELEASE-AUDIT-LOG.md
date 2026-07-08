# RELEASE-AUDIT-LOG — Hagi-Shop

> Autonomer, adversarialer Release-Sicherheits-Audit.
> Start: 2026-07-07. Lead: Claude (Fable 5).
> Regel: Jede Behauptung belegt (Datei:Zeile / Test-Ausgabe / Tool-Output). Keine Vermutungen.
> Grundlage: `HAGI-AUDIT-CONTEXT.md` (Stand 2026-06-22) — **wird gegengeprüft, nicht vertraut.**

---

## STATUS-ÜBERSICHT

| Block | Thema | Status |
|---|---|---|
| 0 | Bestandsaufnahme & Testbasis | ✅ ABGESCHLOSSEN |
| 1 | Auth & Zugriffskontrolle | ✅ VERIFIZIERT (sauber) — Test-Lücke offen |
| 2 | Geld & Zahlungsfluss | ✅ F1 gefixt · F2/F3 dokumentiert |
| 3 | Order-Lebenszyklus & Concurrency | ✅ F1(HIGH)+F2 gefixt · F3/F4 dok. |
| 4 | Token-Routen & Datenschutz/PII | ✅ F1-F4 gefixt (Trigger offen) |
| 5 | Input-Validierung & Injection | ✅ Fixes erledigt |
| 6 | UI-Flows E2E (Playwright) | ✅ ABGESCHLOSSEN — 16/16 grün, 17 Screenshots |
| 7 | PDF-Generierung | ⏳ OFFEN (nächste Session) |
| 8 | Rechtliche Vollständigkeit | ✅ GEPRÜFT (Freigabe/Platzhalter = Human-Task) |
| 9 | Infra, Secrets & Fehlerbehandlung | ✅ Header gehärtet · npm audit = Manual |
| 10 | Verifikation & Härtung | ✅ Lint+Docs erledigt · Playwright offen |

**Aktueller Block:** Blöcke 0–6 + 8/9/10 abgeschlossen.
**Nächster offener Schritt:** BLOCK 7 — tsx-Script schreibt Rechnung (B2C + B2B-Reverse-Charge) / Lieferschein / Widerruf-PDF nach `audit-artifacts/pdfs/` via `@react-pdf/renderer` (`lib/pdf/*`), auf §14-UStG-Vollständigkeit + Umlaute + Platzhalter prüfen.

## BLOCK 6 — UI-Flows E2E (Playwright) ✅ ABGESCHLOSSEN (2026-07-08)

**Playwright 1.61.1 installiert, Chromium-Browser bereit.**

### Specs (alle 16 Tests grün, 38s)
- `e2e/storefront.spec.ts` (6 Tests): Homepage, Produktliste, Produktdetail, Add-to-Cart, Warenkorb, Checkout-Seite
- `e2e/admin-auth.spec.ts` (5 Tests): Login-Seite, Falsches PW → Fehlermeldung, Korrektes Login → Dashboard (mit 2FA-Bypass wenn nicht eingerichtet), Account-Lockout nach 5 Fehlversuchen verifiziert, Redirect ohne Session
- `e2e/widerruf.spec.ts` (5 Tests): Belehrungs-Seite, Lookup-Formular sichtbar, Ungültige Bestellnr. → kein Crash, PDF-Endpunkt liefert 200, Tracking-Seite mit ungültigem Token

### Screenshots (17 Stk. in `audit-artifacts/screenshots/`)
01-homepage · 02-produktliste · 03-produktdetail · 04-nach-add-to-cart · 05-warenkorb · 06-checkout · 07-admin-login-leer · 08-admin-login-fehler · 09-admin-dashboard · 10-admin-lockout · 11-admin-lockout-bestaetigt · 12-admin-redirect-ohne-session · 13-widerruf-belehrung · 14-widerruf-antrag-leer · 15-widerruf-antrag-ungueltig · 16-widerrufsformular-pdf-ok · 17-tracking-ungueltig

### Befund
Keine Crashes, keine unerwarteten 500-Fehler. Admin-Lockout nach 5 Versuchen bestätigt — Richtigpasswort nach Lock weiterhin abgewiesen. Redirect `/admin` → `/admin/login` ohne Session funktioniert.

---

## FINDING-REGISTER (Block 1–5, adversarial verifiziert durch 5 parallele Subagenten, alle Belege im echten Code)

### Bereits GEFIXT (Kontext war veraltet) — verifiziert
- Auth `checkAdminRequest` ohne await (CRITICAL) → alle Admin-API nutzen `await getCurrentAdmin()`.
- Client-Pages `produkte/neu` + `produkte/[id]` → jetzt Server-Components mit `requireAdmin()`.
- Rate-Limit nicht atomar → jetzt `INSERT … ON CONFLICT … RETURNING` (rate-limit.ts:45-51).
- 2FA/TOTP → jetzt aktiv im Login erzwungen (admin-auth.ts:107-135, totp.ts).
- `cancelOrder` ohne echten Refund → jetzt echter `stripe.refunds.create` VOR DB-Markierung.
- CSV-Injection → geschützt (csv-export.ts:18-24), Export auditiert.
- Env-Backups → git-ignored, nicht getrackt.

### OFFENE Findings (zu fixen)
| ID | Sev | Block | Finding | Ort |
|---|---|---|---|---|
| B3-F1 | 🔴 HIGH | 3 | **Unikat-Doppelverkauf**: inStock-Flip nirgends atomar (Webhook `updateMany` ohne `inStock:true`+count; Manual-Order read-then-write, Flip außerhalb TX; Online-Checkout reserviert nichts) | `webhook/route.ts:162`, `admin-manual-order.ts:49,147`, `order-create.ts`/`cart.ts:80` |
| B4-F1 | 🟠 HIGH | 4 | **Art. 17**: kein Anonymisierungs-/Lösch-Code; Schema-Felder ungenutzt; DS-Erklärung verspricht Löschung | `schema.prisma:232-233,392`, keine Impl |
| B4-F2 | 🟠 HIGH | 4 | **PaymentEvent.payload** speichert kompletten Stripe-Event inkl. `customer_details`, keine Retention/Minimierung | `webhook/route.ts:45`, `webhook-dedup.ts:63` |
| B2-F1 | 🟡 MED | 2 | **Rabatt-Ausschlüsse** `excludedProductIds/CategoryIds`/`stackable` nie ausgewertet (Admin-Config wirkungslos) | `discount.ts:43-190` |
| B3-F2 | 🟡 MED | 3 | **cancelOrder**: Stripe-Refund läuft VOR WHERE-Guard → bei Race verwaister Refund ohne DB-Beleg | `order-lifecycle.ts:230-286` |
| B5-F1 | 🟡 MED | 5 | **JSON-LD XSS**: `JSON.stringify` escapt `</script>` nicht → Produktname mit `</script>` bricht aus (public) | `produkte/[slug]/page.tsx:99` |
| B4-F3 | 🟡 MED | 4 | AuditLog.actorId = Klartext-Kundenemail; IP/UA ohne Retention | `widerruf/[token]/route.ts:70`, `withdrawal.ts:86` |
| B1-F1 | 🟡 MED | 1 | IP-Spoofing via `x-forwarded-for`-Fallback umgeht IP-Rate-Limit (Account-Lockout mitigiert) → Infra + Code | `rate-limit.ts:113-117` |
| B2-F2 | 🟡 L-M | 2 | `oncePerCustomer` nicht atomar (TOCTOU) + per Wegwerf-Email umgehbar | `discount.ts:145-155` |
| B5-F2 | 🔵 LOW | 5 | Kategorien-POST ohne Zod → 500 bei Nicht-String, `name` ohne Längenlimit | `kategorien/route.ts:20-23` |
| B5-F3 | 🔵 LOW | 5 | Produkt-Schemas ohne `.max()`; PATCH-`images` ohne `.url()` | `produkte/route.ts:9-18`, `[id]/route.ts:8-22` |
| B2-F3 | 🔵 LOW | 2 | Amount-Mismatch nur geloggt, Order trotzdem PAID; Unterzahlung ≤1€ ohne Log | `webhook/route.ts:129-158` |
| B4-F4 | 🔵 LOW | 4 | Token-Routen ohne `no-referrer`-Override; Status-Seite ohne explizites `no-store`/`X-Robots-Tag` | `next.config.mjs:22`, `status/[token]/page.tsx` |
| B3-F4 | 🔵 LOW | 3 | Kein Bestands-Release bei Storno/Widerruf (Umsatz-, kein Security-Bug) | lifecycle |
| B5-F4 | ℹ️ INFO | 5 | Roh-HTML-Mail interpoliert `customerEmail` ohne Escape (heute durch Zod `.email()` mitigiert) | `send.ts:168-171` |

---

## FIX-PROTOKOLL

### ✅ B3-F1 (HIGH) — Unikat-Doppelverkauf behoben
- **Vorher (rot):** `webhook/route.ts` flippte `inStock` ohne `inStock:true`-Guard/count, NACH bedingungsloser PAID-Markierung; Manual-Order flippte außerhalb der Transaktion (read-then-write). Zwei bezahlte Orders auf denselben Teppich → beide bestätigt.
- **Fix:** Neuer gemeinsamer atomarer Claim `lib/services/stock.ts::claimUniqueStock` (findMany isUnique + per-id `updateMany` mit `inStock:true`-Guard, meldet `unavailable`).
  - Webhook (`app/api/stripe/webhook/route.ts`): Claim + PAID-Markierung jetzt in EINER `$transaction` (`confirmPaidOrder`). Bei Oversold → Rollback + `handleOversoldOrder`: echter Stripe-Refund (idempotent `oversold-refund-<id>`), Order `CANCELLED`, Audit `order.oversold` + ErrorLog (Admin-Sichtbarkeit). Idempotent gegen Webhook-Retries (PAID-Early-Return + Transaktions-Rollback).
  - Manual-Order (`app/actions/admin-manual-order.ts`): Claim in die bestehende `$transaction` gezogen, Post-TX-Flip entfernt, `PRODUCT_UNAVAILABLE` bei Konflikt.
- **Regressionstest:** `tests/stock-concurrency.test.ts` (4 Tests, u.a. 3 PARALLELE Claims → genau 1 gewinnt). Vorher gab es diesen Schutz nicht → wäre rot gewesen.
- **Verifikation:** `npx tsc --noEmit` sauber; volle Suite 20 Files / 200 Tests grün.
- **Rest-Enhancement (nicht Security):** Online-Checkout reserviert weiterhin nicht schon bei Session-Erstellung (nur Safety-Net beim Payment via Auto-Refund). Optionale Reservierung-bei-Checkout = UX-Verbesserung, in Block 10 als Enhancement notiert. Admin-Alert bei Oversold aktuell via ErrorLog/Audit; dedizierte E-Mail wäre nice-to-have.

### ✅ B3-F2 (MEDIUM) — Verwaister Refund bei cancelOrder-Race
- **Vorher:** Stripe-Refund läuft VOR dem WHERE-Guard-`updateMany`. Bei `count===0` (paralleler Versand zwischen Pre-Check und Update) wurde still `skipped` zurückgegeben → Geld erstattet, aber KEIN `Refund`-Record, Order-Status unverändert.
- **Fix** (`lib/services/order-lifecycle.ts`): Bei `count===0` UND bereits erfolgtem Refund (`refundCents>0`) wird jetzt ein `Refund`-Beleg (`reason: cancellation_orphaned`) angelegt + `logError` (Admin-Sicht) + Audit `order.refund_orphaned` — statt stillem Skip. Stripe-Idempotency-Key verhindert weiterhin Doppel-Refund.
- Verifikation: tsc sauber, 222 Tests grün. Deterministischer Race-Test = Enhancement (schwer reproduzierbar); Kern-Invariante „kein Refund ohne DB-Beleg" ist jetzt erfüllt.

### ✅ Block 5 — Input-Validierung & Injection (Fixes)
- **B5-F1 (MEDIUM, public)** JSON-LD Stored XSS: `JSON.stringify(jsonLd).replace(/</g,"<")` in `app/produkte/[slug]/page.tsx` → `</script>`-Breakout unmöglich. Regressionstest `tests/xss-escaping.test.ts`.
- **B5-F2 (LOW)** Kategorien-POST: Zod-Schema (`name` trim/min1/max100) + try/catch um `req.json()` → kein 500 mehr bei Nicht-String (`app/api/admin/kategorien/route.ts`).
- **B5-F3 (LOW)** Produkt-Schemas: `.max()`-Limits auf description(5000)/origin/material/pattern/categoryId(120), `images: z.array(z.string().url()).max(20)` in BEIDEN Schemas (PATCH hatte kein `.url()`).
- **B5-F4 (INFO)** `escapeHtml()`-Helper in `lib/email/send.ts` auf `customerEmail`/`orderNumber` in Roh-HTML-Admin-Mail.
- Verifikation: tsc sauber, 21 Files / 202 Tests grün.
- SQL/Open-Redirect: bereits sauber (nur 1 parametrisierter `$queryRaw`, alle Redirect-Ziele aus ENV/relativ) — kein Fix nötig.

### ✅ Block 2 — Geld & Zahlungsfluss (Fixes/Bewertung)
- **B2-F1 (MEDIUM) Rabatt-Ausschlüsse behoben:** `discountableSubtotal()` in `lib/services/discount.ts` schließt Positionen mit ausgeschlossener Produkt-/Kategorie-ID aus der Rabattbasis aus. `ValidatedCartItem.categoryId` ergänzt (`cart.ts`), Items an `previewDiscount`/`redeemDiscount` durchgereicht (`cart.ts`, `order-create.ts`). Ohne Item-Liste = unverändert (Rückwärtskompatibilität). Regressionstest `tests/discount-exclusions.test.ts` (4 Tests). tsc sauber.
- **B2-F2 (L-M) oncePerCustomer** — dokumentiert als Rest-Risiko: TOCTOU bei exakt parallelen gleicher-Email-Checkouts + prinzipiell per Wegwerf-Email umgehbar (systembedingt, da KEIN Account-Zwang). Globales `usageLimit` ist atomar geschützt. Härtung (Redemption-Tabelle mit `@@unique(code,email)`) → als Enhancement notiert, kein akuter Exploit.
- **B2-F3 (LOW) Amount-Mismatch** — bewusst AKZEPTIERT: Der gezahlte Betrag entsteht aus der serverseitig gebauten Stripe-Session (Client kann Preis/Menge nicht manipulieren, verifiziert Block 2 Punkt 3). Ein echter Mismatch ist praktisch nur „Order nach Session verändert"; Blockieren würde legitime Orders riskieren. Bleibt als Audit-Log. Wird durch B3-F1-Fix (atomarer Claim) zusätzlich entschärft.
- **`stackable`** — toter Flag by design (Order hat nur ein `discountCode`-Feld, kein Stacking möglich). Kein Fix nötig.

### 🔄 Block 4 — Datenschutz/PII (Fixes, teilweise)
- **B4-F2 (HIGH) PaymentEvent-Payload minimiert:** `lib/services/stripe-redact.ts::redactStripeEvent` verwirft `customer_details`/E-Mail/Name/Adresse/Telefon VOR dem Persistieren; nur Debug-Felder (id/type/amount/payment_intent/metadata) bleiben. Webhook nutzt es (`route.ts`). Regressionstest `tests/stripe-redact.test.ts`.
- **B4-F4 (LOW) Security-/Token-Header** (`next.config.mjs`): global Permissions-Policy, CSP `frame-ancestors/base-uri/form-action`, HSTS (prod-only); Token-Seiten (`bestellung/status`, `widerruf-antrag`, `api/invoice`, `api/widerruf`) mit `no-store`/`noindex`/`no-referrer`.
- **B4-F1 (HIGH) Art. 17 Anonymisierung — Service gebaut:** `lib/services/gdpr.ts::anonymizeCustomer` nullt Konto-PII (Name/Phone/Email→Platzhalter/passwordHash/Tokens/IP/companyName/vatId), löscht Adressbuch, widerruft Sessions, nullt Consent-IP/UA, entkoppelt Orders vom Konto (Rechnungsdaten bleiben für §147 AO/§257 HGB — Art. 17 Abs. 3 lit. b), setzt `deletedAt`+`anonymizedAt`, Audit `customer.anonymized`. Idempotent. Regressionstest `tests/gdpr.test.ts` (3 Tests: keine PII, Idempotenz, unbekannter Kunde). **Offen (MANUELLE SCHRITTE):** Admin-UI-Button + Self-Service-Trigger im Kundenkonto; Retention-Cron für Orders JENSEITS der 10-Jahres-Frist. Service ist einsatzbereit, nur die Auslöser fehlen.
- **B4-F3 (MEDIUM) AuditLog actorId** — von Klartext-`customerEmail` auf `order.id` umgestellt (`widerruf/[token]/route.ts`, `withdrawal.ts`) → keine PII mehr im Audit-Actor.

### ✅ Test-Lücken Auth (Block 1) — GESCHLOSSEN
- Neuer Regressionstest `tests/admin-action-auth.test.ts` (11 Tests): beweist, dass alle mutierenden Server-Actions (`adminMarkShipped/Delivered/Cancel/ReturnReceived/RefundWithdrawal/UpdateInternalNote`, `createManualOrderAction`, `start/confirm/disableTotpAction`) + `GET /api/admin/export-orders` ohne gültige Session abbrechen (requireAdmin wirft, keine DB-Mutation, kein PII-CSV).
- Zusammen mit `admin-route-auth.test.ts` (API-Routen) + `admin-2fa.test.ts` sind damit ALLE Admin-Routen/Actions durch „ohne Session → abgewiesen"-Tests abgedeckt. Abbruchkriterium 1 erfüllt.

---

## WICHTIGSTE ERKENNTNIS vorab

Der `HAGI-AUDIT-CONTEXT.md` ist vom **2026-06-22** und in mehreren Kern-Findings **veraltet**. Zwischen dem Kontext-Stand und heute (2026-07-07) wurden zentrale Sicherheitslücken bereits behoben. Deshalb baue ich eine **frische Baseline** und jage keinen alten Funden hinterher, sondern verifiziere den IST-Zustand.

Bereits behoben (im echten Code verifiziert, siehe Block 0/1):
- 🔴→✅ **CRITICAL `checkAdminRequest` ohne `await`** (Context-Finding #1): Legacy-Funktion entfernt, alle Admin-API-Routen nutzen jetzt `await getCurrentAdmin()`.
- 🔵→✅ **`GET /api/admin/kategorien` ohne Check** (Context-Finding #6): hat jetzt `await getCurrentAdmin()`.
- 🟠→✅ **Secret-Leak Env-Backups** (Context-Finding #7): `.gitignore` `.env*` Catch-all greift, nur `.env.example` getrackt — keine Secrets in Git.

---

## BLOCK 0 — Bestandsaufnahme & Testbasis ✅

### Umgebung (verifiziert)
- Projekt: `hagi-shop` (package.json `name: "hagi-shop"`). **NICHT** compliflow — Session war im falschen Ordner gestartet, Ziel auf `/Users/ilias/Projekte/hagi-shop` korrigiert.
- Stack: Next.js 14.2.5 App Router, Prisma 5 + PostgreSQL, Stripe, argon2, @react-pdf/renderer, Vitest 4.
- Git: Branch `main`, Working Tree praktisch sauber (nur autogenerierte `next-env.d.ts`).

### Test-Baseline (belegt durch `npm test`)
- **19 Test-Dateien, 196 Tests — ALLE GRÜN** (Duration 13,35s).
- Neue Suiten seit Kontext-Stand: `admin-route-auth.test.ts` (9 Tests — Regressionstest für die Admin-API-Auth-Lücke!), `cancel-refund-stripe.test.ts`, `rate-limit.test.ts`, `admin-2fa.test.ts`.
- `prisma:error`-Zeilen im Output sind **gewollt** (Race-Safe-Dedup-Test provoziert Unique-Constraint absichtlich; error-log-Test schreibt Riesen-String für Truncation-Check).
- Test-DB: lokale Postgres `hagi_shop` (kein separater Test-DB-Name — Tests laufen `fileParallelism:false` serialisiert).

### Playwright
- **NICHT installiert** (`@playwright/test` fehlt in devDependencies). → Installation in Block 6.

### MANUELLE SCHRITTE (Notiz für später)
- Lokale Env-Backups aufräumen: `.env.cpgz`, `.env.new`, `.env.pre-stage4.bak` enthalten lokal echte Secrets (nicht in Git, aber unnötiges Risiko auf der Maschine). Löschen empfohlen.

---

## BLOCK 8 — Rechtliche Vollständigkeit ✅ GEPRÜFT (Freigabe = Human-Task)

Verifiziert durch Subagent (read-only, alle Belege mit Datei:Zeile). Struktur sauber gebaut, aber **nicht launchfähig** wegen Platzhaltern.

- **Button-Lösung §312j BGB:** ✅ korrekt — `components/checkout/CheckoutForm.tsx:559` „Zahlungspflichtig bestellen"; Pflicht-Checkboxen AGB/DS/Widerruf erzwungen.
- **Impressum §5 DDG:** ⚠️ nur Platzhalter (`app/impressum/page.tsx:11-13,21,26,30`), veraltete Normzitate (TMG→DDG, RStV→MStV).
- **Widerrufsbelehrung:** 🔴 Zurückbehaltungs- + Wertverlust-Klausel FEHLEN (`app/widerruf/page.tsx`) — brisant, da Backend Wertersatz abzieht (§357a BGB). E-Mail-Inkonsistenz kontakt@ vs info@.
- **Datenschutz:** ❌ Resend, Hetzner-Hosting, Google Fonts, Newsletter fehlen; Widerspruch zum Cookie-Banner (behauptet „kein Tracking", Banner bietet Plausible/Marketing).
- **Google Fonts:** 🔴 `app/globals.css:5` lädt remote vor Einwilligung → Besucher-IP an Google (abmahnfähig, LG München I). Fix: self-hosten via `next/font`.
- **Cookie-Banner:** ✅ vorhanden, Ablehnen gleichwertig; Plausible/Marketing-Kategorien aktuell Attrappen (kein Tracking eingebaut).

## BLOCK 9 — Infra, Secrets & Fehlerbehandlung ✅ (Header gehärtet)

- **Secrets:** ✅ Keine in Git (`git ls-files` → nur `.env.example`; `.env*`-Catch-all greift).
- **Security-Header** (`next.config.mjs`): ✅ ergänzt — HSTS(Prod), Permissions-Policy, CSP `frame-ancestors`/`base-uri`/`form-action`; Token-Seiten `no-store`/`noindex`/`no-referrer`. X-Frame-Options/nosniff/Referrer-Policy waren bereits da.
- **Fail-Fast:** ✅ Prod wirft bei fehlenden kritischen Env-Vars (`lib/config.ts` + dezentrale Modul-Checks).
- **Catch-Blöcke:** verschluckende Catches sind bewusst (Enumeration-Schutz, optionaler Body, verify→false); Geld-/Auth-Pfade loggen/werfen konsequent.
- **npm audit:** ⚠️ 4 high + 1 moderate, ALLE in Next.js 14.2.35 (= neueste 14.2.x). Nur via Major-Upgrade auf Next 15/16 lösbar (breaking) → MANUELLER Schritt. Config-Relevanz: kein i18n/CSP-Nonces/beforeInteractive → mehrere Advisories treffen NICHT zu; DoS/Cache-Poisoning durch Traefik/Cloudflare-Proxy teilentschärft.

## BLOCK 10 — Verifikation & Härtung ✅ (Playwright offen)

- **Lint-Prävention:** ✅ `.eslintrc.json` mit `@typescript-eslint/no-misused-promises` (checksConditionals) — verhindert dauerhaft die ursprüngliche CRITICAL-Bugklasse (async-Check ohne await). Adversarial verifiziert: Regel feuert bei Probe-Bug. `npm run lint` grün.
- **Doku:** ✅ `SECURITY-CHECKLIST.md` (wiederverwendbar) + verbindliche Security-Regeln in `CLAUDE.md`.
- **Test-Suite:** ✅ 25 Files / 222 Tests grün; `npx tsc --noEmit` sauber.
- **Playwright-Red-Team + Coverage-Report:** ⏳ offen (Block 6).

---

## MANUELLE SCHRITTE (nicht autonom erledigbar)

1. **Next.js-Upgrade** auf 15/16 planen + testen + redeployen (behebt die npm-audit-Highs; breaking, braucht volle App- + Build-Verifikation).
2. **Anonymisierungs-Trigger bauen:** Admin-UI-Button + Kunden-Self-Service, die `anonymizeCustomer()` aufrufen; Retention-Cron für Orders jenseits der 10-Jahres-Frist.
3. **Live-Stripe-Test:** echte Test-Order end-to-end (Checkout → Webhook → PAID → Mail) mit Stripe-CLI/Test-Keys; Oversold-Auto-Refund einmal real durchspielen.
4. **Coolify-ENV:** alle Prod-Env-Vars setzen (`STRIPE_*`, `RESEND_API_KEY`, `CRON_SECRET`, `COMPANY_*` inkl. `COMPANY_PHONE`/`COMPANY_IBAN`, `NEXT_PUBLIC_APP_URL`, `TAX_MODE`), sonst Fail-Fast/Dummy-Werte in PDFs.
5. **Infra:** Hetzner-Firewall auf Cloudflare-IP-Ranges beschränken (schließt `x-forwarded-for`-Spoofing des IP-Rate-Limits, B1-F1).
6. **Lokale Env-Backups löschen:** `.env.cpgz`, `.env.new`, `.env.pre-stage4.bak` (nicht in Git, aber unnötiges lokales Secret-Risiko).
7. **Google Fonts self-hosten** (`app/globals.css:5` → `next/font`) — DSGVO.

## RECHTLICHE FREIGABE NÖTIG (Mensch mit IT-Recht)

1. **Alle 4 Rechtstexte** (Impressum, Datenschutz, Widerruf, AGB) — Platzhalter durch echte Firmendaten ersetzen (Fundstellen siehe Block 8).
2. **Widerrufsbelehrung** gegen amtliches Muster (Anlage 1/2 Art. 246a EGBGB): Zurückbehaltungs- + Wertverlust-Klausel ergänzen (sonst Wertersatz-Abzug rechtswidrig).
3. **Datenschutzerklärung** neu: Resend, Hetzner, Google Fonts, Newsletter, Art. 77/21-Rechte; Widerspruch zum Cookie-Banner auflösen.
4. **USt-Status** (Regelbesteuerung vs. §19 UStG) mit Steuerberater klären (`lib/shop-config.ts`).
