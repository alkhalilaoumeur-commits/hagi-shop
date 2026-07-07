# Hagi-Shop — Claude Anweisungen

> Premium E-Commerce für orientalische Teppiche. Next.js 14 App Router + Prisma + PostgreSQL + Stripe + Resend + argon2-Admin-Auth.

> 🔴 **VOR ALLEM ANDEREN:** Lies `STATUS.md` im Repo-Root. Dort steht der aktuelle Live-Stand, was funktioniert, was fehlt, und wo wir weitermachen müssen. Pflege diese Datei nach jeder größeren Änderung.

---

## 🔒 Verbindliche Security-Regeln (jedes neue Feature MUSS sie einhalten)

Abgeleitet aus dem Release-Audit (2026-07-07, siehe `RELEASE-AUDIT-LOG.md` + `SECURITY-CHECKLIST.md`):

1. **Jede Route/Action unter `/admin` oder `/api/admin`** ruft als ERSTE Amtshandlung `requireAdmin()` (bzw. `await getCurrentAdmin()`-Check) auf — VOR jedem DB-Zugriff. Regressionstest „ohne Session → abgewiesen" ist Pflicht.
2. **Async-Checks nie ohne `await`** in Bedingungen. Ein Promise ist immer truthy → der Guard wäre wirkungslos. Die ESLint-Regel `@typescript-eslint/no-misused-promises` (`.eslintrc.json`) erzwingt das — `npm run lint` muss grün sein.
3. **Beträge (Preis/Menge/Versand/Rabatt) NUR serverseitig** aus der DB berechnen. Client-Input für Preise wird nie vertraut (nur `{productId, quantity}` akzeptieren).
4. **Webhooks:** Signatur über den ROH-Body verifizieren BEVOR irgendetwas passiert; idempotent über `PaymentEvent.providerEventId @unique`. Payload vor Persistierung via `redactStripeEvent()` von PII befreien.
5. **Refunds:** DB-Status `REFUNDED`/`PARTIALLY_REFUNDED` NUR setzen, wenn ein echter Provider-Refund lief (oder DB-only bei fehlendem PaymentIntent klar gekennzeichnet). Nie „erstattet" ohne Geldbewegung.
6. **Unikat-Bestand (`isUnique`)** immer über `claimUniqueStock()` in DERSELBEN Transaktion wie die Statusänderung claimen (atomarer `updateMany` mit `inStock:true`-Guard) — nie read-then-write. Verhindert Doppelverkauf.
7. **Keine PII in Logs** (keine ganzen E-Mails/Adressen in `console.*`, `AuditLog.actorId`, `ErrorLog`). Bei DSGVO-Löschung `anonymizeCustomer()` nutzen; Rechnungsdaten bleiben (§147 AO).
8. **Jede öffentliche Route/Action:** Zod-Validierung mit Längenlimits (`.max()`) + Rate-Limit. User-Input nie ungescaped in HTML/JSON-LD rendern (`</script>` in JSON-LD escapen).
9. **Neue Env-Var:** `.env.example` + Fail-Fast in Prod (`lib/config.ts` bzw. Modul-Level-Throw).

---

## 🔴 TEST-PFLICHT (harte Regel)

**Jede neue Funktion, jeder neue Workflow, jeder neue Endpoint bekommt zeitgleich einen Test.** Kein Commit ohne Test, kein Push ohne grünes `npm test`.

**Was Test-pflichtig ist:**
- Neue Server-Action in `app/actions/*` → Test in `tests/actions/*.test.ts`
- Neue Service-Funktion in `lib/services/*` → Test in `tests/services/*.test.ts`
- Neue API-Route in `app/api/*` → Integration-Test in `tests/api/*.test.ts`
- Neue Page mit Datenfluss (kein purer Static-Content) → mindestens ein E2E-Test-Stub
- Neue Schema-Migration mit Logik (Trigger, Constraints) → Migrations-Test
- Neuer State-Übergang (Order/Payment/Fulfillment) → Lifecycle-Test mit **Idempotenz + invalid-transition-Block**

**Was nicht Test-pflichtig ist:**
- Reine UI-Komponenten ohne Logik (z.B. `<MarqueeBar />`)
- Static-Content-Pages (`/agb`, `/impressum`)
- Tailwind-Klassen-Änderungen

**Pflicht-Coverage pro Funktion:**
1. **Happy-Path** — was passiert wenn alles glatt läuft
2. **Mindestens ein Negative-Test** — was passiert bei Bad-Input
3. **Bei Geld/Auth/PII: Edge-Case** — Race-Condition, Replay, IDOR, Timing-Attacks

**Wie Tests laufen:**
```bash
npm test              # alle einmal (CI)
npm run test:watch    # während Entwicklung
npm run test:coverage # mit Coverage-Report
```

**Wenn Funktion noch nicht existiert aber Test schon geplant:**
- RED-Test schreiben (Test schlägt fehl mit klarem `expect(...).toBe("NOT_IMPLEMENTED")`)
- Funktion bauen → Test wird GREEN
- Kein `describe.skip` ohne TODO-Kommentar mit Datum + Verantwortlicher

**Lückenliste (was JETZT fehlt und nachzubauen ist):**
Siehe `docs/test-gaps.md`. Wird beim Schließen einer Lücke gestrichen, beim Entdecken einer neuen ergänzt.

---

## Stack-Schutz (von ServeFlow übernommen, angepasst)

- **Niemals** `.env` committen (steht in `.gitignore`)
- **Niemals** Stripe Live-Keys ins Repo — die kommen direkt in Coolify
- Bei `.env.example`-Änderung: gitleaks-Pre-Commit-Hook läuft automatisch

---

## Sync-Regel

Bei jeder Änderung:

| Änderung | Datei |
|---|---|
| Neue Server-Action | Test + ggf. `docs/security-audit-stage-X.md` |
| Neue Schema-Migration | `prisma/schema.prisma` + Test |
| Neue Funktion mit Geld/PII | Audit-Eintrag in `docs/` |
| Neue Env-Variable | `.env.example` + `lib/config.ts` (wenn kritisch) + Tabelle in CLAUDE.md unten |

---

## Aktive Env-Variablen (Quelle der Wahrheit)

| Variable | Pflicht | Dev-Verhalten | Prod-Verhalten |
|---|---|---|---|
| `DATABASE_URL` | ✅ | Throw bei fehlt | Throw |
| `NEXT_PUBLIC_APP_URL` | ✅ Prod | Dev-Fallback `http://localhost:3002` | Throw |
| `TAX_MODE` | ✅ Prod | Warning + Default `small_business` | Throw |
| `STRIPE_SECRET_KEY` | ✅ Prod | Lazy-Throw bei Checkout | Lazy-Throw |
| `STRIPE_WEBHOOK_SECRET` | ✅ Prod | Webhook gibt 400 | 400 |
| `RESEND_API_KEY` | ✅ Prod | Mock-Mode (Log statt Send) | Throw |
| `CRON_SECRET` | ⚠️ Coolify | 503 cron_disabled | 503 |
| `COMPANY_VAT_ID` / `COMPANY_TAX_NUMBER` | ✅ Prod | Default-Werte | Throw bei beiden leer |
| `COMPANY_IBAN` | ✅ Prod | Optional | Throw |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | ⚠️ einmalig | Nur für `scripts/create-admin.ts` | dito |

---

## Verwandte Docs

- `docs/security-audit-stage-4.md` — letzter Security-Audit
- `docs/test-gaps.md` — offene Test-Lücken
- `.env.example` — vollständige Vorlage
