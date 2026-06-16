# Security-Hinweise

> Pflicht-Lektüre für alle Code-Reviewer dieses Repos.

## Was DU als Reviewer prüfen sollst

### 🔴 Hard-Block (PR ablehnen)

1. **`.env` versehentlich committed** — `git log --all --full-history -- .env` darf keinen Treffer haben
2. **Hardcoded Secrets** in Code (`sk_live_`, `pk_live_`, `re_[a-zA-Z0-9]{20,}`, `whsec_`)
3. **`prisma.$queryRawUnsafe`** ohne Sanitization
4. **Client-Code akzeptiert Preise/Steuer aus Request-Body** (siehe `lib/services/cart.ts` als Referenz wie es korrekt geht)
5. **Order-Lookups via `id` statt `publicToken`** in URLs/Server-Actions
6. **DB-Migrationen ohne Review** (Schema-Änderungen brauchen ADR-Update)

### 🟡 Diskussions-Trigger

- Neue Dependency hinzugefügt? → Snyk-Score prüfen (`snyk.io/advisor/npm-package/[name]`), wenn < 80 in PR begründen
- Neuer externer Service? → ADR-Eintrag wenn fundamental, oder Mini-Begründung im PR
- Neue PII-Felder im Schema? → DSGVO-Snapshot-Pattern befolgen (siehe `Order` als Referenz)
- Neue Email-Templates? → React-Email + Resend, kein Inline-HTML mit Customer-Daten ohne Escape

### ✅ Code-Patterns die wir nutzen

| Was | Wo definiert | Wie nutzen |
|---|---|---|
| Token-Generation | `lib/security/tokens.ts` | `generateToken(32)` |
| Email-Normalisierung | `lib/security/email.ts` | `normalizeEmail()` vor JEDEM Vergleich |
| Cart-Validation | `lib/services/cart.ts` | `validateCart()` server-side, NIE Client-Preise trauen |
| Discount-Redeem | `lib/services/discount.ts` | `redeemDiscount()` in Transaktion, NICHT preview vor commit |
| Audit-Log | `lib/services/audit.ts` | `logAudit()` bei JEDER admin-Aktion |
| Webhook-Dedup | `lib/services/webhook-dedup.ts` | `recordReceive()` vor Verarbeitung |
| Consent | `lib/services/consent.ts` | `logConsent()` bei AGB-Akzeptanz |

## Vor jedem Push prüfen

```bash
# 1. Tests grün?
npx tsx scripts/test-stage-1.ts
npx tsx scripts/test-stage-1-security.ts

# 2. Keine Secrets im Code?
git diff --cached | grep -E "(sk_live_|pk_live_|whsec_[a-zA-Z0-9]{20,})" && echo "STOP" || echo "OK"

# 3. .env nicht versehentlich staged?
git diff --cached --name-only | grep "^\.env$" && echo "STOP" || echo "OK"

# 4. TypeScript build?
npx tsc --noEmit
```

## Wenn du einen Sicherheitsbug findest

1. **NICHT public öffnen** — kein GitHub-Issue mit Details
2. Email an Ilias direkt
3. Fix in privatem Branch
4. Erst nach Patch + Deploy ggf. public erwähnen

## Auditierte Stages

| Stage | Auditiert? | Ergebnis | Doc |
|---|---|---|---|
| Stage 1 (Foundation) | ✅ ja | 3 HIGH + 4 MEDIUM gefixt | [`docs/security-audit-stage-1.md`](docs/security-audit-stage-1.md) |
| Stage 2 (Checkout) | 🚧 geplant | — | TBD |

## Bekannte Risiken (nicht-Code)

Diese sind operativ, nicht code-fixbar. Aber wissen:

- **Stripe-Webhook-Ausfall** — Mitigation via daily Reconciliation-Cron
- **Email-Spam-Folder** — Mitigation via SPF/DKIM/DMARC bei Hagi-Domain
- **Showroom-Walk-in vs Online-Inventar** — Hagi muss manuell mittracken
- **Spedition für Großteppiche** — manueller Workflow, kein Auto-Tracking

Vollständige Risiko-Liste in [`docs/WORKFLOWS.md`](docs/WORKFLOWS.md).
