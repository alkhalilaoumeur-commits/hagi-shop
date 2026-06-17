# Hagi-Shop — Claude Anweisungen

> Premium E-Commerce für orientalische Teppiche. Next.js 14 App Router + Prisma + PostgreSQL + Stripe + Resend + argon2-Admin-Auth.

> 🔴 **VOR ALLEM ANDEREN:** Lies `STATUS.md` im Repo-Root. Dort steht der aktuelle Live-Stand, was funktioniert, was fehlt, und wo wir weitermachen müssen. Pflege diese Datei nach jeder größeren Änderung.

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
