import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function checkAdminAuth(req: NextRequest): boolean {
  const pw = req.headers.get("x-admin-password");
  return pw === process.env.ADMIN_PASSWORD;
}

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    include: { items: { include: { product: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ orders });
}

export async function PATCH(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const { id, status } = await req.json() as { id?: string; status?: string };
  if (!id || !status) {
    return NextResponse.json({ error: "id und status erforderlich." }, { status: 400 });
  }

  const validStatuses = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Ungültiger Status." }, { status: 400 });
  }

  const order = await prisma.order.update({
    where: { id },
    data: { status: status as "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED" },
  });

  return NextResponse.json({ order });
}
