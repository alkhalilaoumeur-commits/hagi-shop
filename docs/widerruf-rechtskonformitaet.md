# Widerruf-Rechtskonformität — Hagi-Shop

**Stand:** 2026-06-17
**Gültiges Recht:** BGB §§ 312g, 312k, 355, 356, 357 + EGBGB Art. 246a

## Zusammenfassung

Hagi-Shop verkauft physische Waren (Teppiche) als B2C-Online-Shop. Damit gelten
das Widerrufsrecht im Fernabsatz (§ 312g BGB) und die Rückerstattungsfristen
nach § 357 BGB uneingeschränkt.

Status: **Implementiert + getestet.** 100/100 Tests grün, inkl. 14 Tests speziell
für die Refund-Frist-Überwachung.

## Pflicht-Anforderungen + Status

| Anforderung | Gesetz | Status | Wo umgesetzt |
|---|---|---|---|
| **Widerrufsbelehrung mit Mustertext** | EGBGB Art. 246a § 1 | 🟢 | `/widerruf` Page (vor diesem Sprint) |
| **Belehrung VOR Vertragsschluss** | § 312d BGB | 🟢 | Checkout-Seite mit `withdrawalShownAt` + `withdrawalVersion` snapshot |
| **Versions-Snapshot der Belehrung** | Beweispflicht Unternehmer | 🟢 | `Order.withdrawalVersion = "v1"` pro Order |
| **14-Tage-Widerrufsfrist ab Erhalt** | § 355 Abs. 2 BGB | 🟢 | `calcWithdrawalDeadline(deliveredAt, true)` = +14d |
| **Erweiterte Frist 12M+14d bei fehlender Belehrung** | § 356 Abs. 3 S. 2 BGB | 🟢 | `withdrawalNoticeGiven=false` → +(365+14)d |
| **Frist startet bei Erhalt, nicht bei Zahlung** | § 355 Abs. 2 S. 2 BGB | 🟢 | Frist-Rechnung nutzt `deliveredAt`, nicht `paidAt` |
| **Widerruf in beliebiger Form (Brief, Mail, Online-Formular)** | § 355 Abs. 1 BGB | 🟢 | `/widerruf-antrag` Form + Mail an `info@hagi-shop.de` |
| **Rückerstattung auf gleichem Zahlungsweg** | § 357 Abs. 3 BGB | 🟢 | Stripe-Refund auf Original-Karte (manuell im Stripe-Dashboard) |
| **Rückerstattung binnen 14 Tagen nach Widerruf** | § 357 Abs. 1 BGB | 🟢 | Cron-Reminder `refund-reminder` mit 3 Eskalationsstufen |
| **Rücksendekosten zahlt Käufer** | § 357 Abs. 6 BGB | 🟢 | Im Customer-UI explizit benannt + Belehrung |
| **Hin-Versand muss erstattet werden** | § 357 Abs. 2 S. 2 BGB | 🟢 | `calcWithdrawalRefund` inkludiert `shippingCents` bei Voll-Widerruf |
| **Verweigerungsrecht bis Ware zurück** | § 357 Abs. 4 BGB | 🟢 | `refundWithdrawnOrder` wirft `RETURN_NOT_RECEIVED` |
| **Wertersatz nur bei nicht-bestimmungsgemäßer Nutzung** | § 357 Abs. 7 BGB | 🟢 umgesetzt | Wertersatz-UI mit Pflicht-Begründung, dokumentiert auf Refund-Record + Kunden-Mail |
| **Widerrufsbeleg-Vorlage als Download** | EGBGB Art. 246a Anlage 2 | 🟢 | `/widerrufsformular?dl=1` PDF, verlinkt auf `/widerruf` |

🟢 = umgesetzt + getestet · 🟡 = teilweise / offen

## Die 4 Widerruf-Phasen + rechtliche Würdigung

### Phase 1: Bezahlt, nicht versandt

| Schritt | Wer | Rechts-Bezug |
|---|---|---|
| Customer reicht Widerruf ein | `/widerruf-antrag` | § 355 Abs. 1 BGB |
| Antrag in DB: `withdrawalRequestedAt` | System | Beweispflicht |
| Refund-Frist: 14d ab jetzt | § 357 Abs. 1 BGB | startet sofort |
| Admin klickt "Widerruf erstatten" | direkt OK | § 357 Abs. 4: Verweigerungsrecht greift nicht (Ware war nie raus) |
| Stripe-Refund manuell | Admin im Dashboard | § 357 Abs. 3 |

**Risiko:** Wenn Admin die 14d verpasst → Verzugszinsen nach § 288 BGB (5% über Basiszinssatz).
**Schutz:** Cron-Reminder ab Tag 9 → Tag 12 → Tag 14+ Alarm.

### Phase 2: Bezahlt, versandt, Ware unterwegs

| Schritt | Wer | Rechts-Bezug |
|---|---|---|
| Customer reicht Widerruf ein | `/widerruf-antrag` | § 355 Abs. 1 BGB |
| Frist für Customer: startet noch nicht | `calcWithdrawalDeadline` returnt `null` wenn `deliveredAt=null` | § 355 Abs. 2 BGB |
| Refund-Frist FÜR ADMIN: 14d ab Widerrufseingang | trotzdem | § 357 Abs. 1 BGB |
| Verkäufer wartet auf Rücksendung oder Nachweis | OK | § 357 Abs. 4 BGB |
| Bei Wareneingang: Admin klickt "Ware retourniert" | `markReturnReceived` | Beweispflicht |
| Admin klickt "Widerruf erstatten" | Refund läuft | § 357 Abs. 3 |

**Spannungsfeld:** Refund-Frist läuft schon, aber Ware ist noch unterwegs. Praktisch:
- Wenn der Customer ein Tracking als Nachweis schickt → § 357 Abs. 4 greift nicht mehr → Refund SOFORT fällig
- Aktuell: das Tracking-Feld ist da (`returnTrackingNumber`), muss aber vom Admin manuell eingetragen werden

### Phase 3: Bezahlt, geliefert, innerhalb 14 Tagen

Standard-Fall. Analog Phase 2, nur ist die Refund-Frist relevanter weil sie schneller läuft.

### Phase 4: Geliefert, ≤12M+14d, Widerrufsbelehrung fehlte

Tritt bei Hagi praktisch nicht ein — wir zeigen die Belehrung im Checkout + speichern Snapshot.
Aber: Falls jemals ein Order ohne `withdrawalShownAt`-Snapshot ankommt, ist das Flag manuell
über `Order.withdrawalNoticeGiven = false` setzbar.

## Drei Sicherheits-Gates gegen Refund-Betrug

Verhindert das Szenario "Customer behauptet Rückgabe, Admin sieht nichts":

1. **ActorType-Guard:** `markReturnReceived` und `refundWithdrawnOrder` werfen `FORBIDDEN_ACTOR`
   wenn `actor.actorType === "customer"`. Customer kann den State nie selbst manipulieren.

2. **Sequence-Guard:** Refund wirft `NO_WITHDRAWAL` ohne vorherigen `withdrawalRequestedAt`.

3. **Return-Guard:** Refund wirft `RETURN_NOT_RECEIVED` wenn `fulfillmentStatus=FULFILLED` und
   `returnReceivedAt=null`. Phase 1 (UNFULFILLED) erlaubt Direkt-Refund.

## Verzugs-Schutz (Cron-Reminder)

| Tag nach Widerruf | Stage | Mail an Admin |
|---|---|---|
| 9 | REMINDER | "5 Tage bis BGB-Frist" |
| 12 | URGENT | "2 Tage bis BGB-Frist" |
| 14+ | OVERDUE | "BGB-Frist gerissen — Verzugszinsen-Risiko" |

Cron-Aufruf täglich 08:00 Uhr via Coolify:
```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://hagi-shop.de/api/cron/refund-reminder
```

## Beweispflicht-Layer

Für jeden Widerruf-Vorgang führt das System mehrere unabhängige Beweisspuren:

1. **`Order.withdrawalRequestedAt`** + **`Order.withdrawalReason`** in DB
2. **`Order.withdrawalShownAt`** + **`Order.withdrawalVersion`** (Belehrungs-Snapshot zur Bestellzeit)
3. **`AuditLog`** mit getrenntem `actorType`:
   - `order.withdrawal_received` (customer)
   - `order.return_received` (admin)
   - `order.withdrawal_refunded` (admin/system)
   - `order.withdrawal_rejected` (bei Rate-Limit / Frist-Ende)
4. **Mail-Log via Resend Tags** (`order.withdrawal`)

Bei Streit mit Aufsichtsbehörde oder Kunden: drei unabhängige Quellen die zueinander konsistent sein müssen.

## Was NICHT umgesetzt ist (bewusste Abwägung)

### 1. Automatischer Stripe-Refund
Service setzt nur DB-State + Mail. Admin muss Stripe-Refund manuell auslösen.
**Grund:** Sicherheit vor Automatik. Hagi-Bestellungen sind €600-5000 — kein Risiko durch Auto-Aktionen.
**Risiko:** Admin vergisst es. → Cron-Reminder gleicht das aus.

### 2. Widerrufsbeleg-PDF zum Download
Aktuell nur Online-Formular. Pflicht ist Belehrung + Online-Formular oder Download.
**Empfehlung:** Static-PDF mit dem Muster-Widerrufsformular nach EGBGB Anlage 2 unter
`public/widerrufsformular.pdf` ablegen + auf `/widerruf` verlinken. 5-Minuten-Task.

### 3. Wertersatz-Berechnung bei Gebrauchsspuren — 🟢 UMGESETZT
§ 357 Abs. 7 BGB erlaubt Abzug vom Refund wenn der Käufer den Teppich nicht nur prüft
sondern in Benutzung hatte.
**Umsetzung:** Im Refund-Form (`WithdrawalRefundForm`) gibt es einen Wertersatz-Toggle.
Bei Aktivierung: Wertersatz-Betrag + Pflicht-Begründung, Live-Aufschlüsselung
"Kaufpreis − Wertersatz = Erstattung". Backend (`refundWithdrawnOrder`) erzwingt die
Begründung (`VALUE_COMPENSATION_REASON_REQUIRED`), erstattet via Stripe nur den Netto-
Betrag, dokumentiert `valueCompensationCents` + Begründung auf dem Refund-Record und im
Audit-Log, und teilt den Abzug dem Kunden transparent in der Storno-Mail mit.
Abgesichert durch 6 Tests in `tests/withdrawal-wertersatz.test.ts`.

## Test-Abdeckung

| Bereich | Tests |
|---|---|
| `calcWithdrawalDeadline` (3 Cases) | 3 |
| `isWithdrawalEligible` (8 Cases) | 8 |
| `calcWithdrawalRefund` (3 Cases) | 3 |
| Customer-Endpoint `/api/widerruf/[token]` | 9 |
| Backend `registerWithdrawal` | 5 |
| Security G1-G8 (Customer kann keine Admin-Aktionen) | 12 |
| Refund-Reminder-Service + Cron | 14 |
| **Summe** | **54** |

Plus 46 Tests aus anderen Bereichen (Order-State, Discount, Payment, Auth) = **100 Tests grün**.

## Pflicht-Tasks vor Live-Gang

- [ ] `CRON_SECRET` in Coolify setzen + täglicher Cron-Aufruf konfigurieren
- [ ] `ADMIN_NOTIFY_EMAIL` in Coolify setzen (sonst Default `COMPANY_EMAIL`)
- [x] Muster-Widerrufsformular — dynamisches PDF via `/widerrufsformular`-Route (`?dl=1` für Download)
- [ ] Erste echte Bestellung manuell durchgespielt: Widerruf → Return → Refund-Klick →
      Stripe-Dashboard-Refund
- [ ] Externes Rechts-Review durch Anwalt (empfohlen vor erstem €1000+ Verkauf)

## Disclaimer

Dieses Dokument ist eine technische Übersicht. Es ersetzt keine Rechtsberatung.
Bei Unsicherheit: Fachanwalt für IT-Recht oder Verbraucherschutz konsultieren.
