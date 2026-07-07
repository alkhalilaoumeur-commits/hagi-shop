import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { slugify } from "@/lib/format";
import { getCurrentAdmin } from "@/lib/services/admin-auth";
import { logError } from "@/lib/services/error-log";

const UpdateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  price: z.number().int().positive().optional(),
  comparePrice: z.number().int().positive().nullable().optional(),
  images: z.array(z.string().url()).max(20).optional(),
  categoryId: z.string().min(1).max(128).optional(),
  sizeWidth: z.number().positive().nullable().optional(),
  sizeLength: z.number().positive().nullable().optional(),
  origin: z.string().max(120).nullable().optional(),
  material: z.string().max(120).nullable().optional(),
  pattern: z.string().max(120).nullable().optional(),
  inStock: z.boolean().optional(),
  featured: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!product) {
    return NextResponse.json({ error: "Produkt nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({ product });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const data = UpdateSchema.parse(body);

    const updateData: Record<string, unknown> = { ...data };
    if (data.name) {
      updateData.slug = slugify(data.name);
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ product });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ungültige Daten.", details: error.errors }, { status: 400 });
    }
    await logError({ source: "api/produkte", error, context: { op: "update", id } });
    return NextResponse.json({ error: "Fehler beim Aktualisieren." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { id } = await params;

  try {
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    await logError({ source: "api/produkte", error, context: { op: "delete", id } });
    return NextResponse.json({ error: "Fehler beim Löschen." }, { status: 500 });
  }
}
