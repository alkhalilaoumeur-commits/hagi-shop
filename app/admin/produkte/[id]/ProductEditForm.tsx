"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/admin/ui/PageHeader";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface FormState {
  name: string;
  description: string;
  price: string;
  comparePrice: string;
  categoryId: string;
  sizeWidth: string;
  sizeLength: string;
  origin: string;
  material: string;
  pattern: string;
  images: string[];
  inStock: boolean;
  featured: boolean;
}

export function ProductEditForm({ id }: { id: string }) {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
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
    // Cookie-Session reicht (same-origin fetch sendet sie automatisch).
    const load = async () => {
      const [catRes, prodRes] = await Promise.all([
        fetch("/api/admin/kategorien"),
        fetch(`/api/admin/produkte/${id}`),
      ]);

      if (catRes.status === 401 || prodRes.status === 401) {
        router.push("/admin/login");
        return;
      }

      const catData = await catRes.json();
      setCategories(catData.categories ?? []);

      if (prodRes.ok) {
        const { product } = await prodRes.json();
        setForm({
          name: product.name,
          description: product.description ?? "",
          price: (product.price / 100).toFixed(2),
          comparePrice: product.comparePrice ? (product.comparePrice / 100).toFixed(2) : "",
          categoryId: product.categoryId,
          sizeWidth: product.sizeWidth?.toString() ?? "",
          sizeLength: product.sizeLength?.toString() ?? "",
          origin: product.origin ?? "",
          material: product.material ?? "",
          pattern: product.pattern ?? "",
          images: product.images.length > 0 ? product.images : [""],
          inStock: product.inStock,
          featured: product.featured,
        });
      } else {
        setError("Produkt nicht gefunden.");
      }
      setLoadingData(false);
    };

    load();
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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

    const res = await fetch(`/api/admin/produkte/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.status === 401) {
      router.push("/admin/login");
      return;
    }

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Fehler beim Speichern.");
      setLoading(false);
      return;
    }

    router.push("/admin/produkte");
    router.refresh();
  };

  const f = (field: keyof FormState, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  if (loadingData) {
    return <div className="flex items-center justify-center py-20 text-muted text-sm">Laden…</div>;
  }

  return (
    <div className="max-w-2xl">
      <PageHeader eyebrow="Sortiment" title="Produkt bearbeiten" />

      <form onSubmit={handleSubmit} className="space-y-5 bg-bg-card border border-border p-6">
        <div>
          <label className="text-sm text-muted block mb-1">Produktname *</label>
          <input type="text" required value={form.name} onChange={(e) => f("name", e.target.value)}
            className="w-full border border-border px-3 py-2.5 text-sm focus:border-gold outline-none" />
        </div>

        <div>
          <label className="text-sm text-muted block mb-1">Beschreibung</label>
          <textarea rows={3} value={form.description} onChange={(e) => f("description", e.target.value)}
            className="w-full border border-border px-3 py-2.5 text-sm focus:border-gold outline-none resize-none" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted block mb-1">Preis (€) *</label>
            <input type="number" required step="0.01" min="0" value={form.price}
              onChange={(e) => f("price", e.target.value)}
              className="w-full border border-border px-3 py-2.5 text-sm focus:border-gold outline-none" />
          </div>
          <div>
            <label className="text-sm text-muted block mb-1">Vergleichspreis (€)</label>
            <input type="number" step="0.01" min="0" value={form.comparePrice}
              onChange={(e) => f("comparePrice", e.target.value)}
              className="w-full border border-border px-3 py-2.5 text-sm focus:border-gold outline-none" />
          </div>
        </div>

        <div>
          <label className="text-sm text-muted block mb-1">Kategorie *</label>
          <select required value={form.categoryId} onChange={(e) => f("categoryId", e.target.value)}
            className="w-full border border-border px-3 py-2.5 text-sm focus:border-gold outline-none bg-bg-card">
            <option value="">Bitte wählen…</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted block mb-1">Breite (cm)</label>
            <input type="number" step="1" value={form.sizeWidth} onChange={(e) => f("sizeWidth", e.target.value)}
              className="w-full border border-border px-3 py-2.5 text-sm focus:border-gold outline-none" />
          </div>
          <div>
            <label className="text-sm text-muted block mb-1">Länge (cm)</label>
            <input type="number" step="1" value={form.sizeLength} onChange={(e) => f("sizeLength", e.target.value)}
              className="w-full border border-border px-3 py-2.5 text-sm focus:border-gold outline-none" />
          </div>
        </div>

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
                placeholder={idx === 0 ? "Hauptbild" : `Zusatzbild ${idx + 1}`}
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
          <p className="text-xs text-muted mt-1">Erstes Bild = Hauptbild</p>
        </div>

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
            className="bg-ink text-bone px-6 py-3 text-sm font-medium hover:bg-sienna disabled:opacity-50 transition-colors">
            {loading ? "Wird gespeichert…" : "Änderungen speichern"}
          </button>
          <Link href="/admin/produkte"
            className="border border-border text-muted px-6 py-3 text-sm hover:text-ink hover:border-ink transition-colors">
            Abbrechen
          </Link>
        </div>
      </form>
    </div>
  );
}
