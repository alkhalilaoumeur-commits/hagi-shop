import Link from "next/link";
import { VAT_NOTICE } from "@/lib/shop-config";

export function Footer() {
  return (
    <footer style={{ background: "#F0EAD8", borderTop: "1px solid #E5DCC8" }}>
      <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-3 gap-10">
        <div>
          <p className="font-serif text-xl font-semibold tracking-[0.18em] text-cream mb-3">
            HAGI<span className="text-gold">.</span>
          </p>
          <p className="text-sm text-muted leading-relaxed">
            Ihr Teppich-Spezialist in Stuttgart.<br />
            Orientalisch · Modern · Kelim
          </p>
        </div>

        <div>
          <h3 className="text-[11px] font-semibold text-cream uppercase tracking-[0.12em] mb-4">
            Kollektion
          </h3>
          <nav className="flex flex-col gap-2.5 text-sm text-muted">
            <Link href="/produkte?kategorie=oriental" className="hover:text-gold transition-colors">Oriental</Link>
            <Link href="/produkte?kategorie=modern" className="hover:text-gold transition-colors">Modern</Link>
            <Link href="/produkte?kategorie=kelim" className="hover:text-gold transition-colors">Kelim</Link>
            <Link href="/produkte" className="hover:text-gold transition-colors">Alle Produkte</Link>
          </nav>
        </div>

        <div>
          <h3 className="text-[11px] font-semibold text-cream uppercase tracking-[0.12em] mb-4">
            Rechtliches
          </h3>
          <nav className="flex flex-col gap-2.5 text-sm text-muted">
            <Link href="/impressum" className="hover:text-gold transition-colors">Impressum</Link>
            <Link href="/datenschutz" className="hover:text-gold transition-colors">Datenschutz</Link>
            <Link href="/agb" className="hover:text-gold transition-colors">AGB</Link>
            <Link href="/widerruf" className="hover:text-gold transition-colors">Widerruf</Link>
            <Link href="/kontakt" className="hover:text-gold transition-colors">Kontakt</Link>
          </nav>
        </div>
      </div>

      <div style={{ borderTop: "1px solid #E5DCC8" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-muted">
          <span>© {new Date().getFullYear()} Hagi Teppiche · Stuttgart</span>
          <span>{VAT_NOTICE} · Versand oder Selbstabholung</span>
        </div>
      </div>
    </footer>
  );
}
