"use client";

import Link from "next/link";
import { ShoppingCart, Menu, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/cart-store";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const count = useCart((s) => s.count());

  return (
    <header className="sticky top-0 z-50 bg-bg/95 backdrop-blur border-b border-border">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-serif text-xl text-ink font-semibold tracking-wide">
          Hagi <span className="text-gold">Teppiche</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted">
          <Link href="/produkte" className="hover:text-ink transition-colors">Kollektion</Link>
          <Link href="/produkte?kategorie=oriental" className="hover:text-ink transition-colors">Oriental</Link>
          <Link href="/produkte?kategorie=modern" className="hover:text-ink transition-colors">Modern</Link>
          <Link href="/produkte?kategorie=kelim" className="hover:text-ink transition-colors">Kelim</Link>
          <Link href="/ueber-uns" className="hover:text-ink transition-colors">Über uns</Link>
          <Link href="/kontakt" className="hover:text-ink transition-colors">Kontakt</Link>
        </nav>

        {/* Warenkorb + Mobile Menu */}
        <div className="flex items-center gap-3">
          <Link href="/warenkorb" className="relative p-2 hover:text-gold transition-colors">
            <ShoppingCart className="w-5 h-5" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-gold text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {count}
              </span>
            )}
          </Link>
          <button
            className="md:hidden p-2"
            onClick={() => setOpen(!open)}
            aria-label="Menü"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {open && (
        <div className="md:hidden border-t border-border bg-bg px-4 pb-4">
          <nav className="flex flex-col gap-1 text-sm">
            {[
              { href: "/produkte", label: "Kollektion" },
              { href: "/produkte?kategorie=oriental", label: "Oriental" },
              { href: "/produkte?kategorie=modern", label: "Modern" },
              { href: "/produkte?kategorie=kelim", label: "Kelim" },
              { href: "/ueber-uns", label: "Über uns" },
              { href: "/kontakt", label: "Kontakt" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="py-3 border-b border-border text-ink hover:text-gold transition-colors"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
