"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function NeuesProduktPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    comparePrice: "",
    categoryId: "",
    sizeWidth: "",
    sizeLength: "",
    origin: "",
    material: "",
    pattern: "",
    images: [""],
    inStock: true,
    featured: false,
  });

  useEffect(() => {
    fetch("/api/admin/kategorien")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const adminPw = sessionStorage.getItem("adminPw");
    if (!adminPw) { router.push("/admin/login"); return; }

    const payload = {
      name: form.name,
      description: form.description || undefined,
      price: Math.round(parseFloat(form.price) * 100),
      comparePrice: form.comparePrice ? Math.round(parseFloat(form.comparePrice) * 100) : undefined,
      categoryId: form.categoryId,
      sizeWidth: form.sizeWidth ? parseFloat(form.sizeWidth) : undefined,
      sizeLength: form.sizeLength ? parseFloat(form.sizeLength) : undefined,
      origin: form.origin || undefined,
      material: form.material || undefined,
      pattern: form.pattern || undefined,
      images: form.images.filter(Boolean),
      inStock: form.inStock,
      featured: form.featured,
    };

    const res = await fetch("/api/admin/produkte", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": adminPw,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Fehler beim Anlegen.");
      setLoading(false);
      return;
    }

    router.push("/admin/produkte");
  };

  const f = (field: keyof typeof form, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-ink text-bg px-6 py-4 flex items-center justify-between">
        <h1 className="font-serif text-lg">Hagi <span className="text-gold">Admin</span></h1>
        <nav className="flex gap-6 text-sm">
          <Link href="/admin" className="hover:text-gold">Dashboard</Link>
          <Link href="/admin/produkte" className="hover:text-gold">Produkte</Link>
        </nav>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <h2 className="font-serif text-2xl text-ink mb-6">Neues Produkt anlegen</h2>

        <form onSubmit={handleSubmit} className="space-y-5 bg-bg border border-border p-6">
          {/* Name */}
          <div>
            <label className="text-sm text-muted block mb-1">Produktname *</label>
            <input type="text" required value={form.name} onChange={(e) => f("name", e.target.value)}
              className="w-full border border-border px-3 py-2.5 text-sm focus:border-gold outline-none"
              placeholder="z.B. Täbris Medaillon 240×170" />
          </div>

          {/* Beschreibung */}
          <div>
            <label className="text-sm text-muted block mb-1">Beschreibung</label>
            <textarea rows={3} value={form.description} onChange={(e) => f("description", e.target.value)}
              className="w-full border border-border px-3 py-2.5 text-sm focus:border-gold outline-none resize-none"
              placeholder="Kurze Produktbeschreibung..." />
          </div>

          {/* Preise */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted block mb-1">Preis (€) *</label>
              <input type="number" required step="0.01" min="0" value={form.price}
                onChange={(e) => f("price", e.target.value)}
                className="w-full border border-border px-3 py-2.5 text-sm focus:border-gold outline-none"
                placeholder="599.00" />
            </div>
            <div>
              <label className="text-sm text-muted block mb-1">Vergleichspreis (€)</label>
              <input type="number" step="0.01" min="0" value={form.comparePrice}
                onChange={(e) => f("comparePrice", e.target.value)}
                className="w-full border border-border px-3 py-2.5 text-sm focus:border-gold outline-none"
                placeholder="899.00 (optional)" />
            </div>
          </div>

          {/* Kategorie */}
          <div>
            <label className="text-sm text-muted block mb-1">Kategorie *</label>
            <select required value={form.categoryId} onChange={(e) => f("categoryId", e.target.value)}
              className="w-full border border-border px-3 py-2.5 text-sm focus:border-gold outline-none bg-bg">
              <option value="">Bitte wählen...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Maße */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted block mb-1">Breite (cm)</label>
              <input type="number" step="1" value={form.sizeWidth} onChange={(e) => f("sizeWidth", e.target.value)}
                className="w-full border border-border px-3 py-2.5 text-sm focus:border-gold outline-none"
                placeholder="170" />
            </div>
            <div>
              <label className="text-sm text-muted block mb-1">Länge (cm)</label>
              <input type="number" step="1" value={form.sizeLength} onChange={(e) => f("sizeLength", e.target.value)}
                className="w-full border border-border px-3 py-2.5 text-sm focus:border-gold outline-none"
                placeholder="240" />
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { field: "origin" as const, label: "Herkunft", placeholder: "Iran" },
              { field: "material" as const, label: "Material", placeholder: "Schurwolle" },
              { field: "pattern" as const, label: "Muster", placeholder: "Medaillon" },
            ].map((item) => (
              <div key={item.field}>
                <label className="text-sm text-muted block mb-1">{item.label}</label>
                <input type="text" value={form[item.field] as string}
                  onChange={(e) => f(item.field, e.target.value)}
                  className="w-full border border-border px-3 py-2.5 text-sm focus:border-gold outline-none"
                  placeholder={item.placeholder} />
              </div>
            ))}
          </div>

          {/* Bild-URLs (mehrere) */}
          <div>
            <label className="text-sm text-muted block mb-1">Bild-URLs</label>
            {form.images.map((img, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input
                  type="url"
                  value={img}
                  onChange={(e) => {
                    const updated = [...form.images];
                    updated[idx] = e.target.value;
                    setForm((p) => ({ ...p, images: updated }));
                  }}
                  className="flex-1 border border-border px-3 py-2 text-sm focus:border-gold outline-none"
                  placeholder={idx === 0 ? "Hauptbild (https://res.cloudinary.com/...)" : `Zusatzbild ${idx + 1}`}
                />
                {form.images.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, images: p.images.filter((_, i) => i !== idx) }))}
                    className="px-2 py-1 text-sm text-signal hover:bg-signal/10 border border-border"
                    title="Entfernen"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {form.images.length < 5 && (
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, images: [...p.images, ""] }))}
                className="text-xs text-muted hover:text-gold border border-dashed border-border px-3 py-1.5 mt-1"
              >
                + Weiteres Bild hinzufügen
              </button>
            )}
            <p className="text-xs text-muted mt-1">Cloudinary-URLs oder direkte Links · Erstes Bild = Hauptbild</p>
          </div>

          {/* Checkboxen */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.inStock} onChange={(e) => f("inStock", e.target.checked)}
                className="w-4 h-4 accent-green" />
              <span>Verfügbar</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.featured} onChange={(e) => f("featured", e.target.checked)}
                className="w-4 h-4 accent-gold" />
              <span>Auf Startseite zeigen</span>
            </label>
          </div>

          {error && <p className="text-sm text-signal">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading}
              className="bg-green text-white px-6 py-3 text-sm font-medium hover:bg-green/90 disabled:opacity-50">
              {loading ? "Wird gespeichert..." : "Produkt anlegen"}
            </button>
            <Link href="/admin/produkte"
              className="border border-border text-muted px-6 py-3 text-sm hover:text-ink hover:border-ink transition-colors">
              Abbrechen
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
