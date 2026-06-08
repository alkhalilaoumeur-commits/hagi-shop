import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendShippingNotification } from "@/lib/resend";

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

  const prevOrder = await prisma.order.findUnique({ where: { id } });

  const order = await prisma.order.update({
    where: { id },
    data: {
      ...(status ? { status: status as "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED" } : {}),
      ...(trackingNumber !== undefined ? { trackingNumber: trackingNumber || null } : {}),
      ...(adminNote !== undefined ? { adminNote: adminNote || null } : {}),
    },
  });

  // Versand-Email: senden wenn Status auf SHIPPED wechselt und Tracking-Nummer vorhanden
  const newTracking = trackingNumber || order.trackingNumber;
  const statusChangedToShipped = status === "SHIPPED" && prevOrder?.status !== "SHIPPED";
  if (statusChangedToShipped && newTracking && process.env.RESEND_API_KEY) {
    sendShippingNotification({
      customerEmail: order.customerEmail,
      customerName: order.customerName,
      trackingNumber: newTracking,
      orderId: order.id,
    }).catch((err) => console.error("[admin] Versand-Email Fehler:", err));
  }

  return NextResponse.json({ order });
}
