import { CheckCircle } from "lucide-react";
import Link from "next/link";

export default function BestellungBestaetigtPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <div className="w-16 h-16 bg-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-8 h-8 text-green" />
      </div>
      <h1 className="font-serif text-3xl text-ink mb-3">Vielen Dank!</h1>
      <p className="text-muted mb-6 leading-relaxed">
        Ihre Bestellung ist eingegangen. Sie erhalten eine Bestätigungs-E-Mail mit
        allen Details. Wir bereiten Ihre Teppiche vor.
      </p>
      <p className="text-sm text-muted mb-8">
        Bei Fragen:{" "}
        <a href="mailto:kontakt@hagi-shop.de" className="text-gold hover:underline">
          kontakt@hagi-shop.de
        </a>
      </p>
      <Link
        href="/produkte"
        className="inline-block bg-green text-white px-8 py-3 text-sm font-medium hover:bg-green/90 transition-colors"
      >
        Weitere Teppiche entdecken
      </Link>
    </div>
  );
}
