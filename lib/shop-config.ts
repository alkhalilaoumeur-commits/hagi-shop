// ─── Hagi-Shop Konfiguration ───────────────────────────────────────────────
// Vor dem Launch: alle Werte mit Hagi klären und anpassen.

// MwSt-Status: true = umsatzsteuerpflichtig (19%), false = Kleinunternehmer § 19 UStG
// WICHTIG: Mit Steuerberater oder Hagi klären vor Live-Gang!
export const IS_VAT_REGISTERED = true;

// MwSt-Anzeige-Text (je nach Status)
export const VAT_NOTICE = IS_VAT_REGISTERED
  ? "Alle Preise inkl. 19% MwSt."
  : "Alle Preise zzgl. evtl. anfallender Steuern gemäß § 19 UStG.";

// Versandkosten in Cent
export const SHIPPING_COST_CENTS = 995; // 9,95 €

// Formatierter Versandkosten-String
export const SHIPPING_COST_DISPLAY = "9,95 €";

// Shop-Name
export const SHOP_NAME = "Hagi Teppiche";

// Kontakt-E-Mail (TODO: mit echter Domain ersetzen)
export const CONTACT_EMAIL = "kontakt@hagi-shop.de";
