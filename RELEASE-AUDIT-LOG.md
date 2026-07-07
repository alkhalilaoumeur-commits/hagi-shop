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
| 2 | Geld & Zahlungsfluss | 🔄 Findings offen |
| 3 | Order-Lebenszyklus & Concurrency | 🔄 Findings offen (HIGH) |
| 4 | Token-Routen & Datenschutz/PII | 🔄 Findings offen (HIGH) |
| 5 | Input-Validierung & Injection | 🔄 Findings offen |
| 6 | UI-Flows E2E (Playwright) | ⏳ offen |
| 7 | PDF-Generierung | ⏳ offen |
| 8 | Rechtliche Vollständigkeit | ⏳ offen |
| 9 | Infra, Secrets & Fehlerbehandlung | ⏳ offen |
| 10 | Verifikation & Härtung | ⏳ offen |

**Aktueller Block:** Block 3-Fix in Arbeit (Unikat-Doppelverkauf) — parallele Verifikation Block 1-5 abgeschlossen.
**Nächster offener Schritt:** Doppelverkauf-Fix (atomarer inStock-Flip im Webhook + Manual-Order) implementieren + Concurrency-Regressionstest.

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

### Test-Lücken Auth (Block 1)
- Kein „ohne Session → abgewiesen"-Test für `export-orders` + mutierende Server-Actions (`adminMark*`, `adminCancel/Refund`, `createManualOrder`, `adminUpdateInternalNote`). → Regressionstest `admin-action-auth.test.ts` ergänzen.

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
