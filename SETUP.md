# Hagi-Shop — Setup-Anleitung

## Voraussetzungen

- Node.js 18+
- PostgreSQL (oder Coolify-DB)
- Stripe-Account
- Resend-Account (für Bestätigungs-Mails)

---

## Schnellstart (lokal)

```bash
# 1. Ins Verzeichnis wechseln
cd ~/hagi-shop

# 2. Packages installieren
npm install

# 3. Umgebungsvariablen konfigurieren
cp .env.example .env
# → .env öffnen und ALLE Werte eintragen (DATABASE_URL, Stripe, Resend)

# 4. Datenbank initialisieren
npx prisma generate
npx prisma db push

# 5. Beispiel-Produkte laden (optional, für Tests)
npm run db:seed

# 6. Dev-Server starten
npm run dev
# → App läuft auf http://localhost:3000
```

---

## Stripe-Konfiguration

1. **Stripe-Konto** anlegen auf stripe.com
2. **Webhook registrieren**: `https://DEINE-DOMAIN.de/api/stripe/webhook`
   - Event: `checkout.session.completed`
3. **Keys** in `.env` eintragen:
   - `STRIPE_SECRET_KEY` = sk_live_...
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = pk_live_...
   - `STRIPE_WEBHOOK_SECRET` = whsec_...

---

## Produkte hinzufügen

### Option A: Admin-API (empfohlen)

```bash
curl -X POST https://DEINE-DOMAIN.de/api/admin/produkte \
  -H "Content-Type: application/json" \
  -H "x-admin-password: DEIN_ADMIN_PASSWORT" \
  -d '{
    "name": "Täbris Medaillon 240x170",
    "price": 129900,
    "categoryId": "CATEGORY_ID",
    "images": ["https://..."],
    "sizeWidth": 170,
    "sizeLength": 240,
    "origin": "Iran",
    "material": "Schurwolle",
    "inStock": true,
    "featured": true
  }'
```

### Option B: Prisma Studio

```bash
npm run db:studio
# → Öffnet Prisma Studio auf http://localhost:5555
# → Dort Produkte manuell anlegen
```

---

## Deploy auf Coolify (Hetzner) — mit Dockerfile

```bash
# Coolify Dashboard → New Application → Dockerfile-Modus

# ENV-Variablen (alle pflicht):
DATABASE_URL=postgresql://user:password@db:5432/hagi_shop
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=https://hagi-shop.de
RESEND_API_KEY=re_...
RESEND_FROM=Hagi Teppiche <bestellungen@hagi-shop.de>
ADMIN_PASSWORD=sicheres_passwort_hier_eintragen

# Nach dem ersten Deploy — DB-Schema anlegen:
npx prisma db push

# Optional: Beispiel-Daten laden
npm run db:seed
```

**Stripe-Webhook**: `https://hagi-shop.de/api/stripe/webhook` → Event: `checkout.session.completed`

---

## Was Code-seitig fertig ist ✅

- Alle Seiten gebaut und TypeScript-sauber (`npx tsc --noEmit`)
- `npm run build`: 0 Fehler, 28 Seiten generiert
- Shop-Flow: Homepage → Produkte + Suche + Filter → Produktseite → Warenkorb → Checkout → Stripe → Bestätigung
- Admin-Panel: Login, Dashboard, Produkte (Liste/Neu/Bearbeiten/Löschen), Bestellungen mit Status/Tracking/Notiz
- API: Products (CRUD), Categories, Checkout (mit Adress-Validierung), Webhook (idempotent), Health Endpoint
- SEO: sitemap.ts, robots.ts, OG-Metadata + JSON-LD auf allen wichtigen Seiten
- Security: CSP-Header, X-Frame-Options, X-Content-Type-Options in next.config.mjs
- Docker: Dockerfile + .dockerignore für Coolify-Deploy
- Shop-Config: `lib/shop-config.ts` — MwSt-Status, Versandkosten zentral konfigurierbar

## ⚠️  VOR LAUNCH: MwSt-Konfiguration

**Datei:** `lib/shop-config.ts` → `IS_VAT_REGISTERED`

- `true` (Standard) = Hagi ist umsatzsteuerpflichtig → zeigt "inkl. 19% MwSt."
- `false` = Hagi ist Kleinunternehmer § 19 UStG → zeigt korrekten Text ohne MwSt.

**Mit Hagi klären bevor Shop live geht!** Falsche MwSt-Anzeige ist rechtlich problematisch.

## Noch zu erledigen (vor Launch) — benötigt Hagi

- [ ] Hagis Firmendaten in `/impressum/page.tsx` eintragen (Name, Adresse, USt-IdNr.)
- [ ] Datenschutzerklärung (`/datenschutz`) mit echtem Firmennamen füllen
- [ ] AGB (`/agb`) — ggf. Anwalt prüfen lassen
- [ ] `/ueber-uns` mit Hagis Geschichte + Fotos füllen
- [ ] `/kontakt` mit echter Adresse + Telefonnummer
- [ ] Echte Produktbilder → Cloudinary hochladen, URLs in Admin eintragen
- [ ] Domain registrieren + DNS auf Server-IP setzen
- [ ] Resend: Domain `hagi-shop.de` verifizieren → E-Mail-Versand live
- [ ] ADMIN_PASSWORD sicher wählen + in Coolify hinterlegen
- [ ] MwSt-Status klären (Frage 8 unten)

---

## Klärungsfragen (vor Produktionsbeginn mit Hagi)

1. Welche Teppich-Kategorien? (Oriental/Modern/Kelim/Vintage — oder andere?)
2. Wie viele Produkte zum Launch? (10 sind gut für MVP)
3. Zahlungsarten: Kreditkarte (Stripe) + ggf. PayPal?
4. Domain-Name? (Hagis Firmenname oder neuer Brand?)
5. Lieferung: Selbstabholung Stuttgart + Versand per DHL/DPD?
6. Rückgabe: 14 Tage Standard oder andere Policy?
7. Bilder: Wann + in welchem Format liefert Hagi die Produktfotos?
8. MwSt: Ist Hagi umsatzsteuerpflichtig? (Wichtig für Preisanzeige)
9. Firmendaten für Impressum: Vollständiger Name, Adresse, USt-IdNr.?
