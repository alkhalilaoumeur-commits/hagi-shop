import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/format";
import { getCurrentAdmin } from "@/lib/services/admin-auth";

const categorySchema = z.object({ name: z.string().trim().min(1).max(100) });

export async function GET() {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiger Request-Body." }, { status: 400 });
  }
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Name fehlt oder ungültig." }, { status: 400 });
  }
  const { name } = parsed.data;

  const slug = slugify(name);
  const category = await prisma.category.upsert({
    where: { slug },
    update: { name },
    create: { name, slug },
  });

  return NextResponse.json({ category }, { status: 201 });
}
