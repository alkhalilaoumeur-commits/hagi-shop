import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { slugify } from "@/lib/format";
import { getCurrentAdmin } from "@/lib/services/admin-auth";
import { logError } from "@/lib/services/error-log";

const ProductSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(5000).optional(),
  price: z.number().int().positive(),
  comparePrice: z.number().int().positive().optional(),
  images: z.array(z.string().url()).max(20).default([]),
  categoryId: z.string().min(1).max(128),
  sizeWidth: z.number().positive().optional(),
  sizeLength: z.number().positive().optional(),
  origin: z.string().max(120).optional(),
  material: z.string().max(120).optional(),
  pattern: z.string().max(120).optional(),
  inStock: z.boolean().default(true),
  featured: z.boolean().default(false),
});

export async function GET() {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = ProductSchema.parse(body);
    const slug = slugify(data.name);

    const product = await prisma.product.create({
      data: { ...data, slug },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ungültige Daten.", details: error.errors }, { status: 400 });
    }
    await logError({ source: "api/produkte", error, context: { op: "create" } });
    return NextResponse.json({ error: "Fehler beim Anlegen." }, { status: 500 });
  }
}
