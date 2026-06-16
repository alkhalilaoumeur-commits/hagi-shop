"use client";

import { useState, useMemo } from "react";
import { ProductCard } from "./ProductCard";

interface Product {
  id: string;
  slug: string;
  name: string;
  price: number;
  comparePrice?: number | null;
  images: string[];
  origin?: string | null;
  originCountry?: string | null;
  sizeWidth?: number | null;
  sizeLength?: number | null;
  pileMaterial?: string | null;
  mainColor?: string | null;
  ageCategory?: string | null;
  shape?: string | null;
  inStock: boolean;
  category?: { slug: string; name: string } | null;
}

interface Category {
  slug: string;
  name: string;
}

interface ShopFilterProps {
  products: Product[];
  categories: Category[];
}

const CATEGORY_LABEL: Record<string, string> = {
  oriental: "Orientalisch",
  kelim: "Kelim",
  modern: "Modern",
  vintage: "Vintage",
};

const COUNTRY_LABEL: Record<string, string> = {
  IRAN: "Iran",
  PAKISTAN: "Pakistan",
  AFGHANISTAN: "Afghanistan",
  INDIEN: "Indien",
  NEPAL: "Nepal",
  TUERKEI: "Türkei",
  MAROKKO: "Marokko",
  CHINA: "China",
};

const MATERIAL_LABEL: Record<string, string> = {
  SCHURWOLLE: "Schurwolle",
  HOCHLANDWOLLE: "Hochlandwolle",
  SEIDE: "Seide",
  BAMBUSSEIDE: "Bambusseide",
  MIX_WOLLE_SEIDE: "Wolle + Seide",
  BAUMWOLLE: "Baumwolle",
};

const COLOR_SWATCH: Record<string, string> = {
  ROT: "#A33B2A",
  BLAU: "#2D3F66",
  BEIGE: "#C9B79B",
  GRUEN: "#5C6B3D",
  ANTHRAZIT: "#3A3A3A",
  CREME: "#EBE0CB",
  GOLD: "#B89968",
  ROSTBRAUN: "#8B4226",
  MULTICOLOR: "linear-gradient(135deg, #A33B2A 0%, #2D3F66 50%, #B89968 100%)",
};

const COLOR_LABEL: Record<string, string> = {
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

const AGE_LABEL: Record<string, string> = {
  MODERN: "Modern",
  ALT: "Alt",
  SEMI_ANTIK: "Semi-Antik",
  ANTIK: "Antik",
};

const SIZE_BUCKETS = [
  { key: "all", label: "Alle", min: 0, max: 9999 },
  { key: "small", label: "Klein (<140)", min: 0, max: 140 },
  { key: "medium", label: "Mittel (140-200)", min: 140, max: 200 },
  { key: "large", label: "Groß (200-280)", min: 200, max: 280 },
  { key: "xl", label: "XL (>280)", min: 280, max: 9999 },
];

export function ShopFilter({ products, categories }: ShopFilterProps) {
  const [category, setCategory] = useState("all");
  const [size, setSize] = useState("all");
  const [country, setCountry] = useState<string | null>(null);
  const [material, setMaterial] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [age, setAge] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "price-asc" | "price-desc">("newest");

  const sizeBucket = SIZE_BUCKETS.find((b) => b.key === size) ?? SIZE_BUCKETS[0];

  const filtered = useMemo(() => {
    let result = [...products];
    if (category !== "all") result = result.filter((p) => p.category?.slug === category);
    if (sizeBucket.key !== "all") {
      result = result.filter((p) => {
        const longest = Math.max(p.sizeWidth ?? 0, p.sizeLength ?? 0);
        return longest >= sizeBucket.min && longest < sizeBucket.max;
      });
    }
    if (country) result = result.filter((p) => p.originCountry === country);
    if (material) result = result.filter((p) => p.pileMaterial === material);
    if (color) result = result.filter((p) => p.mainColor === color);
    if (age) result = result.filter((p) => p.ageCategory === age);

    if (sortBy === "price-asc") result.sort((a, b) => a.price - b.price);
    if (sortBy === "price-desc") result.sort((a, b) => b.price - a.price);

    return result;
  }, [products, category, sizeBucket, country, material, color, age, sortBy]);

  const reset = () => {
    setCategory("all");
    setSize("all");
    setCountry(null);
    setMaterial(null);
    setColor(null);
    setAge(null);
  };

  const activeFiltersCount =
    (category !== "all" ? 1 : 0) +
    (size !== "all" ? 1 : 0) +
    (country ? 1 : 0) +
    (material ? 1 : 0) +
    (color ? 1 : 0) +
    (age ? 1 : 0);

  const present = {
    countries: Array.from(new Set(products.map((p) => p.originCountry).filter(Boolean))) as string[],
    materials: Array.from(new Set(products.map((p) => p.pileMaterial).filter(Boolean))) as string[],
    colors: Array.from(new Set(products.map((p) => p.mainColor).filter(Boolean))) as string[],
    ages: Array.from(new Set(products.map((p) => p.ageCategory).filter(Boolean))) as string[],
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-10">
      <aside className="space-y-8">
        <FilterBlock title="Kollektion">
          <PillRow
            options={[{ slug: "all", label: "Alle" }, ...categories.map((c) => ({ slug: c.slug, label: CATEGORY_LABEL[c.slug] ?? c.name }))]}
            active={category}
            onSelect={setCategory}
            getCount={(slug) => slug === "all" ? products.length : products.filter((p) => p.category?.slug === slug).length}
          />
        </FilterBlock>

        <FilterBlock title="Größe (Länge in cm)">
          <div className="flex flex-col gap-2">
            {SIZE_BUCKETS.map((b) => (
              <button
                key={b.key}
                onClick={() => setSize(b.key)}
                className="text-left text-sm py-1.5 transition-colors"
                style={{ color: size === b.key ? "#A33B2A" : "#0F0A06", fontWeight: size === b.key ? 600 : 400 }}
              >
                {b.label}
              </button>
            ))}
          </div>
        </FilterBlock>

        {present.countries.length > 0 && (
          <FilterBlock title="Herkunft">
            <div className="flex flex-col gap-2">
              {present.countries.map((c) => (
                <button
                  key={c}
                  onClick={() => setCountry(country === c ? null : c)}
                  className="text-left text-sm py-1.5 transition-colors flex items-center gap-2"
                  style={{ color: country === c ? "#A33B2A" : "#0F0A06", fontWeight: country === c ? 600 : 400 }}
                >
                  <span
                    className="w-3 h-3 border"
                    style={{
                      background: country === c ? "#A33B2A" : "transparent",
                      borderColor: country === c ? "#A33B2A" : "#D9CDB8",
                    }}
                  />
                  {COUNTRY_LABEL[c] ?? c}
                </button>
              ))}
            </div>
          </FilterBlock>
        )}

        {present.materials.length > 0 && (
          <FilterBlock title="Material">
            <div className="flex flex-col gap-2">
              {present.materials.map((m) => (
                <button
                  key={m}
                  onClick={() => setMaterial(material === m ? null : m)}
                  className="text-left text-sm py-1.5 transition-colors flex items-center gap-2"
                  style={{ color: material === m ? "#A33B2A" : "#0F0A06", fontWeight: material === m ? 600 : 400 }}
                >
                  <span
                    className="w-3 h-3 border"
                    style={{
                      background: material === m ? "#A33B2A" : "transparent",
                      borderColor: material === m ? "#A33B2A" : "#D9CDB8",
                    }}
                  />
                  {MATERIAL_LABEL[m] ?? m}
                </button>
              ))}
            </div>
          </FilterBlock>
        )}

        {present.colors.length > 0 && (
          <FilterBlock title="Farbe">
            <div className="flex flex-wrap gap-3">
              {present.colors.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(color === c ? null : c)}
                  className="w-9 h-9 transition-all"
                  title={COLOR_LABEL[c] ?? c}
                  style={{
                    background: COLOR_SWATCH[c] ?? "#999",
                    outline: color === c ? "2px solid #0F0A06" : "1px solid #D9CDB8",
                    outlineOffset: color === c ? "-2px" : "-1px",
                  }}
                />
              ))}
            </div>
          </FilterBlock>
        )}

        {present.ages.length > 1 && (
          <FilterBlock title="Alter">
            <div className="flex flex-col gap-2">
              {present.ages.map((a) => (
                <button
                  key={a}
                  onClick={() => setAge(age === a ? null : a)}
                  className="text-left text-sm py-1.5 transition-colors flex items-center gap-2"
                  style={{ color: age === a ? "#A33B2A" : "#0F0A06", fontWeight: age === a ? 600 : 400 }}
                >
                  <span
                    className="w-3 h-3 border"
                    style={{
                      background: age === a ? "#A33B2A" : "transparent",
                      borderColor: age === a ? "#A33B2A" : "#D9CDB8",
                    }}
                  />
                  {AGE_LABEL[a] ?? a}
                </button>
              ))}
            </div>
          </FilterBlock>
        )}

        {activeFiltersCount > 0 && (
          <button
            onClick={reset}
            className="text-[11px] uppercase tracking-[0.15em] font-semibold pb-1"
            style={{ color: "#A33B2A", borderBottom: "1px solid #A33B2A" }}
          >
            {activeFiltersCount} Filter zurücksetzen
          </button>
        )}
      </aside>

      <div>
        <div className="flex items-center justify-between mb-8 pb-4" style={{ borderBottom: "1px solid #E5DCC8" }}>
          <span className="text-[12px] uppercase tracking-[0.15em]" style={{ color: "#5A4A3A" }}>
            <strong style={{ color: "#0F0A06" }}>{filtered.length}</strong> {filtered.length === 1 ? "Teppich" : "Teppiche"}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-[11px] uppercase tracking-[0.15em]" style={{ color: "#8A7866" }}>Sortieren</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="text-sm border-0 bg-transparent focus:outline-none cursor-pointer font-medium"
              style={{ color: "#0F0A06" }}
            >
              <option value="newest">Neueste</option>
              <option value="price-asc">Preis aufsteigend</option>
              <option value="price-desc">Preis absteigend</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div
            className="py-24 text-center"
            style={{ border: "1px solid #E5DCC8", background: "#FFFFFF" }}
          >
            <p className="font-serif text-2xl mb-2" style={{ color: "#0F0A06" }}>
              Kein Teppich passt zu diesen Filtern
            </p>
            <p className="text-sm mb-6" style={{ color: "#8A7866" }}>
              Probieren Sie weniger Filter — oder lassen Sie uns einen passenden Teppich anfertigen.
            </p>
            <button
              onClick={reset}
              className="text-[11px] uppercase tracking-[0.15em] font-semibold pb-1"
              style={{ color: "#A33B2A", borderBottom: "1px solid #A33B2A" }}
            >
              Filter zurücksetzen →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {filtered.map((p) => (
              <ProductCard
                key={p.id}
                id={p.id}
                slug={p.slug}
                name={p.name}
                price={p.price}
                comparePrice={p.comparePrice}
                image={p.images[0] ?? ""}
                origin={p.origin}
                sizeWidth={p.sizeWidth}
                sizeLength={p.sizeLength}
                inStock={p.inStock}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pb-6" style={{ borderBottom: "1px solid #E5DCC8" }}>
      <p className="text-[11px] uppercase tracking-[0.18em] font-semibold mb-4" style={{ color: "#0F0A06" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function PillRow({
  options,
  active,
  onSelect,
  getCount,
}: {
  options: { slug: string; label: string }[];
  active: string;
  onSelect: (slug: string) => void;
  getCount?: (slug: string) => number;
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((o) => {
        const isActive = active === o.slug;
        const count = getCount?.(o.slug);
        return (
          <button
            key={o.slug}
            onClick={() => onSelect(o.slug)}
            className="flex items-center justify-between text-sm py-1.5 transition-colors text-left"
            style={{ color: isActive ? "#A33B2A" : "#0F0A06", fontWeight: isActive ? 600 : 400 }}
          >
            <span className="flex items-center gap-2">
              <span
                className="w-3 h-3 border"
                style={{
                  background: isActive ? "#A33B2A" : "transparent",
                  borderColor: isActive ? "#A33B2A" : "#D9CDB8",
                }}
              />
              {o.label}
            </span>
            {count !== undefined && (
              <span className="text-[11px] font-mono opacity-60">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
