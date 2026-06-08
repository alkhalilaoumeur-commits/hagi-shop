"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/admin");
    } else {
      setError("Falsches Passwort.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-2xl text-ink text-center mb-8">
          Hagi-Shop <span className="text-gold">Admin</span>
        </h1>

        <form onSubmit={handleSubmit} className="bg-bg border border-border p-6 space-y-4">
          <div>
            <label className="text-sm text-muted block mb-1">Admin-Passwort</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-border px-3 py-2.5 text-sm bg-bg focus:border-gold outline-none"
              required
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm text-signal">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green text-white py-3 text-sm font-medium hover:bg-green/90 disabled:opacity-50"
          >
            {loading ? "..." : "Anmelden"}
          </button>
        </form>
      </div>
    </div>
  );
}
