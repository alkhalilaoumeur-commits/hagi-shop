import Link from "next/link";

/**
 * Gemeinsame Hülle für die öffentlichen Konto-Formulare (Login, Register,
 * Passwort). Storefront-Palette, zentrierte Karte.
 */
export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main style={{ background: "#FAFAF7", minHeight: "70vh" }} className="flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-[10px] uppercase tracking-[0.25em] mb-3" style={{ color: "#B89968" }}>
            ✦ {eyebrow}
          </p>
          <h1 className="font-serif text-3xl" style={{ color: "#0F0A06" }}>
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm mt-3 leading-relaxed" style={{ color: "#5A4A3A" }}>
              {subtitle}
            </p>
          )}
        </div>
        <div className="p-8" style={{ background: "#FFFFFF", border: "1px solid #E5DCC8" }}>
          {children}
        </div>
        {footer && (
          <div className="text-center mt-6 text-sm" style={{ color: "#5A4A3A" }}>
            {footer}
          </div>
        )}
      </div>
    </main>
  );
}

export function AuthError({ message, retryAfter }: { message: string; retryAfter?: number | null }) {
  return (
    <div className="p-3 text-sm" style={{ background: "#F7EBE6", border: "1px solid #A33B2A", color: "#7E2A1D" }}>
      {message}
      {retryAfter && retryAfter > 0 ? (
        <div className="text-[11px] mt-1 opacity-70">Bitte warten Sie {retryAfter} Sekunden.</div>
      ) : null}
    </div>
  );
}

export function AuthSuccess({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-3 text-sm" style={{ background: "#EAF3EA", border: "1px solid #5A8A5A", color: "#2F5A2F" }}>
      {children}
    </div>
  );
}

export function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.18em] block mb-2" style={{ color: "#5A4A3A" }}>
        {label}
      </label>
      <input
        className="w-full px-3 py-2.5 text-sm bg-transparent focus:outline-none"
        style={{ border: "1px solid #D9CDB8", color: "#0F0A06" }}
        {...props}
      />
    </div>
  );
}

export function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-3.5 text-[11px] font-bold uppercase tracking-[0.18em] disabled:opacity-50"
      style={{ background: "#0F0A06", color: "#FAFAF7" }}
    >
      {pending ? "Bitte warten…" : label}
    </button>
  );
}

export function AuthLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="underline" style={{ color: "#A33B2A" }}>
      {children}
    </Link>
  );
}
