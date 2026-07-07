# SECURITY-CHECKLIST — Hagi-Shop

> Wiederverwendbare Release-Sicherheits-Checkliste. Vor jedem Launch und bei jedem
> sicherheitsrelevanten Feature durchgehen. Ergebnisse/Details: `RELEASE-AUDIT-LOG.md`.
> Stand: 2026-07-07 (Audit durch Claude Fable 5).

## 1. Auth & Zugriffskontrolle
- [x] Jede `/admin`- und `/api/admin`-Route/Action ruft serverseitig `requireAdmin()`/`getCurrentAdmin()` VOR jeder Aktion.
- [x] Nur EIN Auth-System (`lib/services/admin-auth.ts`); Legacy `checkAdminRequest` entfernt.
- [x] Client-Pages haben Server-Guard (kein reiner `sessionStorage`-Schutz).
- [x] Session-Cookie httpOnly + secure(Prod) + sameSite=lax; serverseitige Invalidierung (`revokedAt`) bei Logout.
- [x] Login-Rate-Limit atomar (`ON CONFLICT … RETURNING`) + Account-Lockout (5/15min).
- [x] 2FA/TOTP im Login aktiv erzwungen.
- [x] Regressionstests „ohne Session → abgewiesen" für alle Routen + Actions (`admin-route-auth`, `admin-action-auth`, `admin-2fa`).
- [ ] ⚠️ IP hinter Proxy: `x-forwarded-for`-Spoofing → Hetzner-Firewall auf Cloudflare-Ranges beschränken (Infra, siehe MANUELLE SCHRITTE).

## 2. Geld & Zahlungsfluss
- [x] Webhook-Signatur über ROH-Body vor jeder Verarbeitung; Body-Size-Limit.
- [x] Idempotenz: `PaymentEvent.providerEventId @unique` (create-first) + Order-Ebene PAID-Early-Return.
- [x] Alle Beträge serverseitig aus DB berechnet; Client sendet nur `{productId, quantity}`.
- [x] Rabatt: `usageLimit` atomar; `excludedProductIds/CategoryIds` werden ausgewertet.
- [x] Stripe-Idempotency-Keys bei `checkout.sessions.create` + `refunds.create`.
- [~] Amount-Mismatch: geloggt (Order-Betrag serverseitig gebaut → kein Client-Exploit; akzeptiert).
- [~] `oncePerCustomer`: global limit atomar; per-Email-Bypass systembedingt (kein Account-Zwang).

## 3. Order-Lebenszyklus & Concurrency
- [x] Alle Übergänge = atomarer `updateMany` mit WHERE-Guard; verbotene Sprünge werfen.
- [x] Unikat-Doppelverkauf verhindert: `claimUniqueStock()` atomar in Status-Transaktion (Webhook + Manual-Order); Oversold → Auto-Refund.
- [x] `cancelOrder`-Race: verwaister Refund wird belegt + alarmiert statt still geskippt.

## 4. Token-Routen & Datenschutz/PII
- [x] Capability-Tokens 256-Bit CSPRNG; in DB nur SHA-256-Hash.
- [x] Token-Seiten: `no-store` + `noindex` + `no-referrer`.
- [x] `PaymentEvent.payload` PII-minimiert (`redactStripeEvent`).
- [x] `AuditLog.actorId` = Order-ID statt E-Mail.
- [x] CSV-Export: Formula-Injection-Schutz + Audit.
- [x] DSGVO Art. 17: `anonymizeCustomer()` (Konto-PII entfernen, Orders entkoppeln, §147 AO wahren).
- [ ] ⚠️ Anonymisierungs-Trigger (Admin-UI + Self-Service) + Retention-Cron für Alt-Orders — MANUELLE SCHRITTE.
- [ ] Capability-Token-Ablauf (LOW, Enhancement).

## 5. Input-Validierung & Injection
- [x] Jede öffentliche Route/Action mit Zod + Längenlimits.
- [x] Kein XSS: JSON-LD `</script>`-escaped; E-Mail/PDF via React-Escaping; Roh-HTML-Mail escaped.
- [x] SQL: Prisma parametrisiert; einziger `$queryRaw` als Tagged Template.
- [x] Kein Open-Redirect (Redirect-Ziele aus ENV/relativ).

## 6. UI-Flows (Playwright E2E)
- [ ] ⏳ OFFEN — Playwright noch nicht installiert. Siehe RELEASE-AUDIT-LOG „NÄCHSTER SCHRITT".

## 7. PDF-Generierung
- [ ] ⏳ OFFEN — Rechnungen/Lieferschein/Widerruf per Script generieren + §14-UStG-Vollständigkeit prüfen.

## 8. Rechtliche Vollständigkeit (RECHTLICHE FREIGABE NÖTIG)
- [ ] ❌ Impressum/Datenschutz/Widerruf/AGB enthalten Platzhalter → echte Firmendaten einsetzen.
- [ ] 🔴 Widerrufsbelehrung: Zurückbehaltungs- + Wertverlust-Klausel fehlen (Backend zieht Wertersatz!).
- [ ] ❌ Datenschutz: Resend, Hetzner-Hosting, Google Fonts, Newsletter ergänzen; Widerspruch zum Cookie-Banner klären.
- [ ] 🔴 Google Fonts lädt remote (`app/globals.css:5`) vor Einwilligung → self-hosten (`next/font`).
- [x] Button-Lösung §312j: „Zahlungspflichtig bestellen" korrekt.

## 9. Infra, Secrets & Fehlerbehandlung
- [x] Keine Secrets in Git (`.env*` ignored, nur `.env.example`).
- [x] Security-Header: HSTS(Prod), CSP+frame-ancestors, nosniff, Referrer-Policy, Permissions-Policy.
- [x] Fail-Fast bei fehlenden Prod-Env-Vars.
- [ ] ⚠️ `npm audit`: 4 high + 1 moderate in Next.js 14.2.35 (neueste 14.x) → nur via Major-Upgrade 15/16 lösbar. Mehrere Advisories treffen mangels i18n/CSP-Nonces nicht zu; DoS/Cache-Poisoning durch Proxy teilentschärft. MANUELLER Migrations-Schritt.

## 10. Verifikation
- [x] `npx tsc --noEmit` sauber.
- [x] `npm run lint` grün (inkl. `no-misused-promises`).
- [x] Vitest 25 Files / 222 Tests grün.
- [ ] ⏳ Playwright-Suite (Block 6).

Legende: `[x]` erfüllt · `[~]` bewusst akzeptiert/dokumentiert · `[ ]` offen.
