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

## Deploy auf Coolify (Hetzner)

1. **Neuer Stack** in Coolify: GitHub-Repo verbinden
2. **PostgreSQL** Service hinzufügen
3. **ENV-Variablen** eintragen (aus .env.example)
4. **Build-Befehl**: `npm run build`
5. **Start-Befehl**: `npm start`
6. **Port**: 3000

---

## Noch zu erledigen (vor Launch)

- [ ] Hagis Firmendaten in `/impressum/page.tsx` eintragen
- [ ] Datenschutzerklärung (`/datenschutz`) mit echten Daten füllen
- [ ] AGB (`/agb`) schreiben (Lieferbedingungen, Zahlungsbedingungen)
- [ ] `/ueber-uns` mit Hagis Geschichte füllen
- [ ] `/kontakt` mit echter Adresse + Maps-Link
- [ ] Echte Produktbilder (Hagi liefert) → in /public/images/ hochladen oder Cloudinary
- [ ] Domain registrieren + DNS auf Hetzner-IP setzen
- [ ] Resend: Domain verifizieren → E-Mail-Versand live

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
