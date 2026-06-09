import { NextRequest, NextResponse } from "next/server";
import { checkAdminPassword } from "@/lib/admin-auth";

const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

function isLoginBlocked(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry) return false;
  if (now < entry.lockedUntil) return true;
  if (now > entry.lockedUntil && entry.lockedUntil > 0) loginAttempts.delete(ip);
  return false;
}

function recordFailedLogin(ip: string): void {
  const now = Date.now();
  const entry = loginAttempts.get(ip) ?? { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= 5) entry.lockedUntil = now + 15 * 60 * 1000; // 15 Min Sperre nach 5 Fehlversuchen
  loginAttempts.set(ip, entry);
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (isLoginBlocked(ip)) {
    return NextResponse.json({ error: "Zu viele Fehlversuche. Bitte 15 Minuten warten." }, { status: 429 });
  }

  const { password } = await req.json() as { password?: string };

  if (!password || !checkAdminPassword(password)) {
    recordFailedLogin(ip);
    return NextResponse.json({ error: "Falsches Passwort." }, { status: 401 });
  }

  loginAttempts.delete(ip);

  if (!password || !checkAdminPassword(password)) {
    return NextResponse.json({ error: "Falsches Passwort." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin-session", password, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7 Tage
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("admin-session");
  return res;
}
