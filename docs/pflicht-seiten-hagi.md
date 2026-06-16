# Pflicht-Seiten Hagi Teppich-Shop — Briefing für Verkaufsgespräch

> Diese Datei ist die Vorlage für das Gespräch mit dem Großhändler/Hagi.
> Sie zeigt, was rechtlich/operativ als Online-Shop in Deutschland zwingend nötig ist.
> **Status:** Dokumentiert, noch NICHT implementiert. Umsetzung erst nach Hagi-Gespräch.

## Was ich von Hagi brauche (Checkliste fürs Gespräch)

### 1. Firmen-Stammdaten (für Impressum)
- [ ] Vollständiger Firmenname (Inhaber/GmbH/UG)
- [ ] Vollständige Adresse Showroom Stuttgart
- [ ] Telefonnummer (geschäftlich)
- [ ] E-Mail-Adresse (geschäftlich)
- [ ] Umsatzsteuer-ID (USt-IdNr.) oder Steuernummer
- [ ] Falls GmbH/UG: Handelsregister-Nummer + Registergericht
- [ ] Falls vorhanden: Aufsichtsbehörde, Berufsbezeichnung
- [ ] Falls Kleinunternehmer § 19 UStG: Bestätigung

### 2. Geschäftsbedingungen (für AGB)
- [ ] Liefergebiete (DACH, EU, weltweit?)
- [ ] Versandkosten (Pauschale? Frei ab Wert?)
- [ ] Lieferzeit (Standard, Express)
- [ ] Zahlungsarten (Vorkasse, Rechnung, Kreditkarte, PayPal, Klarna?)
- [ ] Eigentumsvorbehalt (Standard: ja, bis vollständige Zahlung)
- [ ] Garantiezeit (gesetzlich 2 Jahre, optional länger)
- [ ] Verpackungsdienstleister / VerpackG-Registrierung

### 3. Rückgabe & Widerruf
- [ ] 14 Tage gesetzlich — wer trägt Rücksendekosten? (üblicherweise Kunde, kann Händler übernehmen)
- [ ] Ausnahmen: Sonderanfertigungen, Maßteppiche → kein Widerruf bei individuell gefertigten Stücken
- [ ] Rücknahmeadresse (Showroom oder externes Lager?)

### 4. Datenschutz
- [ ] Auftragsverarbeiter benennen: Stripe (Zahlung), Hosting-Provider, Versanddienstleister (DHL/UPS/Spedition für Teppiche?), Newsletter-Tool (falls geplant)
- [ ] Cookie-Tracking: Analytics gewünscht? (Plausible empfohlen, DSGVO-leicht)
- [ ] Newsletter-Plan: Double-Opt-In Pflicht
- [ ] DSGVO-Verantwortlicher: dieselbe Person wie Impressum-Inhaber

### 5. Kontakt + Service
- [ ] Servicezeiten (Mo-Fr 10-18 Uhr?)
- [ ] Beratung per Telefon/Video möglich? (USP für Premium-Teppiche)
- [ ] Showroom-Öffnungszeiten + Adresse
- [ ] Lieferung/Aufbau-Service (Premium-Teppiche oft mit Lieferung & Verlegung)

---

## Pflicht-Seiten (technisch umzusetzen)

### Im Footer sichtbar (alle Unterseiten erreichbar)

| Seite | Pflicht? | Inhalt | Quelle |
|---|---|---|---|
| Impressum | JA (§ 5 TMG) | Stammdaten + Vertretungsberechtigter | Hagi |
| Datenschutzerklärung | JA (DSGVO Art. 13) | Verarbeitungen, Auftragsverarbeiter, Rechte | Generator + anpassen |
| AGB | JA für B2C | Vertragsbedingungen, Lieferung, Zahlung | Generator + anpassen |
| Widerrufsbelehrung | JA (BGB § 312g) | Standardtext nach Anlage 1 | Standardtext |
| Widerrufsformular | JA (Anlage 2) | PDF-Download + Online-Formular | Standardvorlage |
| Versand & Zahlung | empfohlen | Tabelle Versandkosten + Zahlungsarten | Hagi |
| Kontakt | empfohlen | Formular + Adresse + Telefon + Karte | Hagi |
| FAQ | empfohlen | Teppich-spezifisch (Reinigung, Pflege, Echtheit) | Eigene Recherche |
| Über uns | JA als Trust-Element | Geschichte, Showroom, Direkt-Import-Story | Hagi |

### Im Checkout-Flow Pflicht

- **"Zahlungspflichtig bestellen"-Button** (BGB § 312j, "Button-Lösung")
- Direkt vor dem Button: Produkt, Menge, Preis, Versand, Gesamt, MwSt-Hinweis
- Pflicht-Checkboxen:
  - [ ] AGB akzeptiert
  - [ ] Widerrufsbelehrung gelesen
  - [ ] Datenschutzerklärung gelesen
- Kein Pre-Checking der Checkboxen erlaubt

### Externe Pflichten

- **EU-Online-Streitbeilegung**: Footer-Link zu `https://ec.europa.eu/consumers/odr` (Verordnung 524/2013)
- **Verpackungsregister LUCID**: Registrierung bei `verpackungsregister.org` Pflicht ab erstem Paket
- **Streitbeilegung-Hinweis im Impressum**: "Wir sind nicht bereit oder verpflichtet, an einem Streitbeilegungsverfahren teilzunehmen" (Standardformel für Kleinunternehmer)

---

## Was Hagi noch braucht (operatives)

1. **Versanddienstleister für Teppiche** — Standard-DHL geht nur bis ~120cm. Für große Teppiche: Spedition nötig (DHL Sperrgut, GLS, oder direkte Spedition). Preise einholen.
2. **Stripe-Konto** (Aktivierung für gewerbliches Konto, USt-IdNr. erforderlich)
3. **Geschäftliches E-Mail-Postfach** (`info@hagi-teppiche.de` oder ähnlich)
4. **Domain registrieren** (falls noch nicht vorhanden)
5. **Bilder & Maße der Teppiche** (Foto-Shooting im Showroom)
6. **Echtheits-Zertifikate** (falls vorhanden für Original-Perser) → Trust-Element
7. **Bewertungs-Strategie** — Google-Reviews einsammeln, Trusted Shops anbieten?

---

## Reihenfolge der Umsetzung (nach Hagi-Gespräch)

1. Stammdaten einsammeln → Impressum + Datenschutz + AGB generieren
2. Widerrufsbelehrung + Widerrufsformular einbauen
3. Checkout-Flow auf BGB § 312j prüfen
4. Footer-Links + EU-OS-Link
5. LUCID-Registrierung initiieren
6. Cookie-Banner (vor Stripe-Iframe-Lade)
7. Trust-Elemente (Bewertungen, Showroom-Bild, Echtheits-Zertifikate)
