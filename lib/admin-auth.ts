import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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
