"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useRef } from "react";

export function SearchInput({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const suche = inputRef.current?.value.trim() ?? "";
    const params = new URLSearchParams(searchParams.toString());
    if (suche) {
      params.set("suche", suche);
    } else {
      params.delete("suche");
    }
    router.push(`/produkte?${params.toString()}`);
  };

  const handleClear = () => {
    if (inputRef.current) inputRef.current.value = "";
    const params = new URLSearchParams(searchParams.toString());
    params.delete("suche");
    router.push(`/produkte?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center border border-border focus-within:border-gold transition-colors">
      <Search className="w-4 h-4 text-muted ml-3 flex-shrink-0" />
      <input
        ref={inputRef}
        type="search"
        name="suche"
        defaultValue={defaultValue}
        placeholder="Name, Herkunft, Material…"
        className="flex-1 px-3 py-2 text-sm outline-none bg-transparent min-w-[200px]"
      />
      {defaultValue && (
        <button
          type="button"
          onClick={handleClear}
          className="px-2 py-1 text-xs text-muted hover:text-signal mr-1"
          title="Suche zurücksetzen"
        >
          ×
        </button>
      )}
      <button
        type="submit"
        className="px-3 py-2 text-sm text-muted hover:text-gold border-l border-border transition-colors"
      >
        Suchen
      </button>
    </form>
  );
}
