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

  const body = await req.json() as {
    id?: string;
    status?: string;
    trackingNumber?: string;
    adminNote?: string;
  };
  const { id, status, trackingNumber, adminNote } = body;

  if (!id) {
    return NextResponse.json({ error: "id erforderlich." }, { status: 400 });
  }

  if (status) {
    const validStatuses = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Ungültiger Status." }, { status: 400 });
    }
  }

  const order = await prisma.order.update({
    where: { id },
    data: {
      ...(status ? { status: status as "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED" } : {}),
      ...(trackingNumber !== undefined ? { trackingNumber: trackingNumber || null } : {}),
      ...(adminNote !== undefined ? { adminNote: adminNote || null } : {}),
    },
  });

  return NextResponse.json({ order });
}
