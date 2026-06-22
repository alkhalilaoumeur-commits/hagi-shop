import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "danger" | "ghost" | "outline";
type Size = "sm" | "md";

const BASE = "inline-flex items-center justify-center gap-2 font-medium uppercase tracking-[0.15em] transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-bone hover:bg-sienna",
  danger: "bg-sienna-dark text-bone hover:bg-sienna",
  ghost: "text-ink-muted hover:text-ink",
  outline: "border border-ink text-ink hover:bg-ink hover:text-bone",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-[10px]",
  md: "px-5 py-3 text-[11px]",
};

function classes(variant: Variant, size: Size, className: string) {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
}

/** Link-Variante (Navigation). Server- und Client-tauglich. */
export function AdminLink({
  href,
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...rest
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
} & Omit<ComponentProps<typeof Link>, "href" | "className">) {
  return (
    <Link href={href} className={classes(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}

/** Button-Variante (Aktionen/Submit). */
export function AdminButton({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...rest
}: {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
} & ComponentProps<"button">) {
  return (
    <button className={classes(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}
