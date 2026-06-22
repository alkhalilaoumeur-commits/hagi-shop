"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingCart, Menu, X, User } from "lucide-react";
import { useState, useEffect } from "react";
import { useCart } from "@/lib/cart-store";

const NAV_LINKS = [
  { href: "/produkte", label: "Kollektion" },
  { href: "/showroom", label: "Showroom" },
  { href: "/pflege", label: "Pflege" },
  { href: "/ueber-uns", label: "Über uns" },
];

const DARK_HERO_PATHS = ["/showroom", "/ueber-uns"];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const count = useCart((s) => s.count());

  // Warenkorb liegt im localStorage → auf dem Server unbekannt. Erst nach dem
  // ersten Client-Render (mounted) anzeigen, damit Server- und Browser-HTML
  // identisch sind und keine Hydration-Diskrepanz entsteht.
  useEffect(() => setMounted(true), []);

  const isDarkHero = DARK_HERO_PATHS.includes(pathname);
  const lightTheme = isDarkHero && !scrolled;

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
          background: lightTheme ? "transparent" : "rgba(250,250,247,0.96)",
          backdropFilter: lightTheme ? "none" : "blur(24px)",
          borderBottom: lightTheme ? "1px solid transparent" : "1px solid #E5DCC8",
          padding: scrolled ? "12px 0" : "20px 0",
        }}
      >
        <div className="max-w-page mx-auto px-6 md:px-12 flex items-center justify-between">
          <Link
            href="/"
            className="font-serif text-2xl font-semibold tracking-[0.18em]"
            style={{ color: lightTheme ? "#FAFAF7" : "#0F0A06" }}
          >
            HAGI<span style={{ color: "#A33B2A" }}>.</span>
          </Link>

          <nav className="hidden md:flex items-center gap-10">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[12px] uppercase tracking-[0.1em] transition-colors duration-200 hover:opacity-70"
                style={{ color: lightTheme ? "#D2C9B5" : "#5A4A3A" }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/konto"
              className="transition-colors hover:opacity-70"
              style={{ color: lightTheme ? "#D2C9B5" : "#5A4A3A" }}
              aria-label="Mein Konto"
            >
              <User className="w-5 h-5" />
            </Link>
            <Link
              href="/warenkorb"
              className="relative transition-colors hover:opacity-70"
              style={{ color: lightTheme ? "#D2C9B5" : "#5A4A3A" }}
            >
              <ShoppingCart className="w-5 h-5" />
              {mounted && count > 0 && (
                <span className="absolute -top-1 -right-1 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold" style={{ background: "#A33B2A" }}>
                  {count}
                </span>
              )}
            </Link>
            <button
              className="md:hidden transition-colors hover:opacity-70"
              style={{ color: lightTheme ? "#D2C9B5" : "#5A4A3A" }}
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
            style={{ background: "#FFFFFF", borderLeft: "1px solid #E5DCC8" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-10">
              <span className="font-serif text-xl tracking-[0.18em]" style={{ color: "#0F0A06" }}>
                HAGI<span style={{ color: "#A33B2A" }}>.</span>
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
                  className="py-3 text-sm uppercase tracking-[0.1em] hover:text-gold transition-colors border-b"
                  style={{ color: "#5A4A3A", borderColor: "#E5DCC8" }}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/konto"
                className="py-3 text-sm uppercase tracking-[0.1em] hover:text-gold transition-colors border-b flex items-center gap-2"
                style={{ color: "#5A4A3A", borderColor: "#E5DCC8" }}
                onClick={() => setOpen(false)}
              >
                <User className="w-4 h-4" /> Mein Konto
              </Link>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
