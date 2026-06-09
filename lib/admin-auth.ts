import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

export async function requireAdminAuth() {
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("admin-session")?.value === process.env.ADMIN_PASSWORD;
  if (!isAdmin) {
    redirect("/admin/login");
  }
}

export function checkAdminPassword(password: string): boolean {
  return password === process.env.ADMIN_PASSWORD;
}

// API-Route Auth: prüft x-admin-password Header ODER admin-session Cookie
export function checkAdminRequest(req: NextRequest): boolean {
  const headerPw = req.headers.get("x-admin-password");
  if (headerPw && headerPw === process.env.ADMIN_PASSWORD) return true;
  const cookiePw = req.cookies.get("admin-session")?.value;
  return cookiePw === process.env.ADMIN_PASSWORD;
}
