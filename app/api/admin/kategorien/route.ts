import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/format";
import { checkAdminRequest } from "@/lib/admin-auth";

export async function GET() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  if (!checkAdminRequest(req)) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { name } = await req.json() as { name?: string };
  if (!name) return NextResponse.json({ error: "Name fehlt." }, { status: 400 });

  const slug = slugify(name);
  const category = await prisma.category.upsert({
    where: { slug },
    update: { name },
    create: { name, slug },
  });

  return NextResponse.json({ category }, { status: 201 });
}
