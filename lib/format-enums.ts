export function formatEnum(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
    .replace(/Ae/g, "Ä")
    .replace(/Oe/g, "Ö")
    .replace(/Ue/g, "Ü");
}

export const COUNTRY_LABEL: Record<string, string> = {
  IRAN: "Iran",
  PAKISTAN: "Pakistan",
  AFGHANISTAN: "Afghanistan",
  INDIEN: "Indien",
  NEPAL: "Nepal",
  CHINA: "China",
  MAROKKO: "Marokko",
  TUERKEI: "Türkei",
};

export const SHAPE_LABEL: Record<string, string> = {
  RECHTECKIG: "Rechteckig",
  QUADRATISCH: "Quadratisch",
  RUND: "Rund",
  OVAL: "Oval",
  LAEUFER: "Läufer",
};

export const MATERIAL_LABEL: Record<string, string> = {
  SCHURWOLLE: "Schurwolle",
  HOCHLANDWOLLE: "Hochlandwolle",
  SEIDE: "Seide",
  BAMBUSSEIDE: "Bambusseide",
  BAUMWOLLE: "Baumwolle",
  MIX_WOLLE_SEIDE: "Wolle + Seide",
  VISKOSE: "Viskose",
  SYNTHETIK: "Synthetik",
};

export const MANUFACTURING_LABEL: Record<string, string> = {
  HANDGEKNUEPFT: "Handgeknüpft",
  HANDGEWEBT: "Handgewebt",
  MASCHINELL: "Maschinell",
};

export const KNOT_LABEL: Record<string, string> = {
  SENNEH: "Senneh (persisch)",
  GHIORDES: "Ghiordes (türkisch)",
  BERBER: "Berber",
  KELIM_FLACHGEWEBE: "Kelim-Flachgewebe",
};

export const AGE_LABEL: Record<string, string> = {
  MODERN: "Modern (0-20 Jahre)",
  ALT: "Alt (20-50 Jahre)",
  SEMI_ANTIK: "Semi-Antik (50-100 Jahre)",
  ANTIK: "Antik (100+ Jahre)",
};

export const CONDITION_LABEL: Record<string, string> = {
  NEU: "Neu",
  WIE_NEU: "Wie neu",
  SEHR_GUT: "Sehr gut",
  GUT: "Gut",
  RESTAURIERT: "Restauriert",
};

export const STYLE_LABEL: Record<string, string> = {
  KLASSISCH: "Klassisch",
  MODERN: "Modern",
  KELIM: "Kelim",
  TRIBAL: "Tribal",
  VINTAGE: "Vintage",
  BERBER: "Berber",
};

export const COLOR_LABEL: Record<string, string> = {
  ROT: "Rot",
  BLAU: "Blau",
  BEIGE: "Beige",
  GRUEN: "Grün",
  ANTHRAZIT: "Anthrazit",
  CREME: "Creme",
  GOLD: "Gold",
  ROSTBRAUN: "Rostbraun",
  MULTICOLOR: "Multicolor",
};

export const ROOM_LABEL: Record<string, string> = {
  WOHNZIMMER: "Wohnzimmer",
  SCHLAFZIMMER: "Schlafzimmer",
  ESSZIMMER: "Esszimmer",
  KUECHE: "Küche",
  KINDERZIMMER: "Kinderzimmer",
  FLUR: "Flur",
  BUERO: "Büro",
};

export const PATTERN_LABEL: Record<string, string> = {
  MEDAILLON: "Medaillon",
  ALLOVER: "Allover",
  BOTEH: "Boteh",
  HERATI: "Herati",
  GEOMETRISCH: "Geometrisch",
  FIGURAL: "Figural",
  GUL: "Gül",
  HEXAGON: "Hexagon",
  RAUTEN: "Rauten",
};
