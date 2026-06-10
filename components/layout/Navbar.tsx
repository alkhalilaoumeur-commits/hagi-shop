"use client";

import Link from "next/link";
import { ShoppingCart, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useCart } from "@/lib/cart-store";

const NAV_LINKS = [
  { href: "/produkte", label: "Kollektion" },
  { href: "/produkte?kategorie=oriental", label: "Oriental" },
  { href: "/produkte?kategorie=modern", label: "Modern" },
  { href: "/produkte?kategorie=kelim", label: "Kelim" },
  { href: "/ueber-uns", label: "Über uns" },
  { href: "/kontakt", label: "Kontakt" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const count = useCart((s) => s.count());

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(11,9,5,0.93)" : "transparent",
          backdropFilter: scrolled ? "blur(18px)" : "none",
          borderBottom: scrolled ? "1px solid #28211A" : "1px solid transparent",
          padding: scrolled ? "14px 0" : "22px 0",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <Link
            href="/"
            className="font-serif text-2xl font-semibold tracking-[0.18em] text-cream"
          >
            HAGI<span className="text-gold">.</span>
          </Link>

          <nav className="hidden md:flex items-center gap-10">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[12px] uppercase tracking-[0.1em] text-cream-muted hover:text-gold transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/warenkorb"
              className="relative text-cream-muted hover:text-gold transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 bg-gold text-bg text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {count}
                </span>
              )}
            </Link>
            <button
              className="md:hidden text-cream-muted hover:text-gold transition-colors"
              onClick={() => setOpen(!open)}
              aria-label="Menü"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="absolute top-0 right-0 bottom-0 w-72 flex flex-col p-8"
            style={{ background: "#141009", borderLeft: "1px solid #28211A" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-10">
              <span className="font-serif text-xl tracking-[0.18em] text-cream">
                HAGI<span className="text-gold">.</span>
              </span>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-gold">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="py-3 text-sm uppercase tracking-[0.1em] text-cream-muted hover:text-gold transition-colors border-b"
                  style={{ borderColor: "#28211A" }}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
