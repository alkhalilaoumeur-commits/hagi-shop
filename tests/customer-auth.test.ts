import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import prisma from "@/lib/prisma";
import { hashToken } from "@/lib/security/tokens";
import { makeCustomer, cleanupCustomer, makeOrder, cleanupOrder } from "./_helpers/factory";

/**
 * Customer-Auth-Suite. Ruft den Service direkt auf, daher müssen `next/headers`
 * (cookies/headers) und der E-Mail-Versand gemockt werden. Das Cookie-Jar und die
 * Mail-Mocks werden über vi.hoisted geteilt (gleiches Muster wie der Stripe-Mock
 * in withdrawal-refund-stripe.test.ts).
 */

const { cookieJar, sendVerifyMock, sendResetMock } = vi.hoisted(() => ({
  cookieJar: new Map<string, string>(),
  sendVerifyMock: vi.fn(async () => ({ mocked: true })),
  sendResetMock: vi.fn(async () => ({ mocked: true })),
}));

vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({ "user-agent": "vitest", "x-forwarded-for": "10.20.30.40" }),
  cookies: async () => ({
    get: (name: string) => {
      const v = cookieJar.get(name);
      return v ? { value: v } : undefined;
    },
    set: (name: string, value: string) => {
      cookieJar.set(name, value);
    },
    delete: (name: string) => {
      cookieJar.delete(name);
    },
  }),
}));

vi.mock("@/lib/email/send", () => ({
  sendEmailVerification: sendVerifyMock,
  sendPasswordReset: sendResetMock,
}));

import {
  registerCustomer,
  verifyEmail,
  loginCustomer,
  getCurrentCustomer,
  logoutCustomer,
  requestPasswordReset,
  resetPassword,
  CUSTOMER_SESSION_COOKIE,
} from "@/lib/services/customer-auth";

const createdEmails = new Set<string>();
const createdOrderIds = new Set<string>();

function uniqueEmail() {
  const email = `auth-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  createdEmails.add(email);
  return email;
}

function lastVerifyToken(): string {
  const call = sendVerifyMock.mock.calls.at(-1) as unknown as [string, { verifyUrl: string }];
  return call[1].verifyUrl.split("/").pop()!;
}

function lastResetToken(): string {
  const call = sendResetMock.mock.calls.at(-1) as unknown as [string, { resetUrl: string }];
  return call[1].resetUrl.split("/").pop()!;
}

beforeEach(async () => {
  cookieJar.clear();
  sendVerifyMock.mockClear();
  sendResetMock.mockClear();
  // Rate-Limit-Zähler (auditLog action="rate.hit") leeren, sonst akkumulieren
  // die Aufrufe derselben Test-IP über mehrere Tests hinweg.
  await prisma.auditLog.deleteMany({ where: { action: "rate.hit" } });
});

afterEach(async () => {
  for (const id of createdOrderIds) await cleanupOrder(id);
  createdOrderIds.clear();
  for (const email of createdEmails) await cleanupCustomer(email);
  createdEmails.clear();
});

describe("registerCustomer", () => {
  it("legt unverifizierten Customer an und verschickt Verify-Mail (Happy)", async () => {
    const email = uniqueEmail();
    const res = await registerCustomer(email, "Sehr-Sicher-123", "Max", "Muster");
    expect(res.ok).toBe(true);

    const customer = await prisma.customer.findUnique({ where: { email } });
    expect(customer).not.toBeNull();
    expect(customer!.emailVerifiedAt).toBeNull();
    expect(customer!.passwordHash).toBeTruthy();
    expect(customer!.emailVerifyTokenHash).toBeTruthy();
    expect(sendVerifyMock).toHaveBeenCalledOnce();
  });

  it("lehnt schwaches Passwort ab", async () => {
    const email = uniqueEmail();
    const res = await registerCustomer(email, "kurz");
    expect(res).toEqual({ ok: false, error: "WEAK_PASSWORD" });
    expect(await prisma.customer.findUnique({ where: { email } })).toBeNull();
  });

  it("lehnt ungültige E-Mail ab", async () => {
    const res = await registerCustomer("keine-email", "Sehr-Sicher-123");
    expect(res).toEqual({ ok: false, error: "INVALID_EMAIL" });
  });

  it("verrät keine bestehenden verifizierten Accounts (keine Enumeration)", async () => {
    const { email } = await makeCustomer({ verified: true });
    createdEmails.add(email);
    const res = await registerCustomer(email, "Anderes-Passwort-9");
    expect(res).toEqual({ ok: true });
    // Keine neue Verify-Mail, kein überschriebenes Passwort.
    expect(sendVerifyMock).not.toHaveBeenCalled();
  });
});

describe("verifyEmail", () => {
  it("verifiziert die E-Mail und ordnet Gast-Bestellungen zu (Backfill)", async () => {
    const email = uniqueEmail();
    await registerCustomer(email, "Sehr-Sicher-123");
    const token = lastVerifyToken();

    // Gast-Bestellung mit derselben E-Mail, noch ohne customerId.
    const { order } = await makeOrder({ customerEmail: email });
    createdOrderIds.add(order.id);
    expect(order.customerId).toBeNull();

    const res = await verifyEmail(token);
    expect(res.ok).toBe(true);

    const customer = await prisma.customer.findUnique({ where: { email } });
    expect(customer!.emailVerifiedAt).not.toBeNull();
    expect(customer!.emailVerifyTokenHash).toBeNull();

    const linked = await prisma.order.findUnique({ where: { id: order.id } });
    expect(linked!.customerId).toBe(customer!.id);
  });

  it("lehnt ungültigen Token ab", async () => {
    const res = await verifyEmail("a".repeat(43));
    expect(res).toEqual({ ok: false, error: "INVALID_TOKEN" });
  });

  it("lehnt abgelaufenen Token ab", async () => {
    const email = uniqueEmail();
    await registerCustomer(email, "Sehr-Sicher-123");
    const token = lastVerifyToken();
    await prisma.customer.update({
      where: { email },
      data: { emailVerifyExpiresAt: new Date(Date.now() - 1000) },
    });
    const res = await verifyEmail(token);
    expect(res).toEqual({ ok: false, error: "TOKEN_EXPIRED" });
  });
});

describe("loginCustomer", () => {
  it("loggt verifizierten Kunden ein, erzeugt Session + Cookie (Happy)", async () => {
    const { email, password, customer } = await makeCustomer({ verified: true });
    createdEmails.add(email);

    const res = await loginCustomer(email, password);
    expect(res.ok).toBe(true);

    expect(cookieJar.get(CUSTOMER_SESSION_COOKIE)).toBeTruthy();
    const sessions = await prisma.customerSession.findMany({ where: { customerId: customer.id } });
    expect(sessions).toHaveLength(1);
    const fresh = await prisma.customer.findUnique({ where: { id: customer.id } });
    expect(fresh!.lastLoginAt).not.toBeNull();
    expect(fresh!.failedLoginAttempts).toBe(0);
  });

  it("lehnt falsches Passwort ab und zählt Fehlversuch hoch", async () => {
    const { email, customer } = await makeCustomer({ verified: true });
    createdEmails.add(email);

    const res = await loginCustomer(email, "Falsch-Passwort-1");
    expect(res).toMatchObject({ ok: false, error: "INVALID_CREDENTIALS" });
    const fresh = await prisma.customer.findUnique({ where: { id: customer.id } });
    expect(fresh!.failedLoginAttempts).toBe(1);
  });

  it("lehnt unbekannte E-Mail generisch ab", async () => {
    const res = await loginCustomer("gibtsnicht@example.com", "Egal-Passwort-1");
    expect(res).toMatchObject({ ok: false, error: "INVALID_CREDENTIALS" });
  });

  it("blockiert Login bei nicht verifizierter E-Mail (trotz korrektem Passwort)", async () => {
    const { email, password } = await makeCustomer({ verified: false });
    createdEmails.add(email);

    const res = await loginCustomer(email, password);
    expect(res).toEqual({ ok: false, error: "EMAIL_NOT_VERIFIED" });
    expect(cookieJar.get(CUSTOMER_SESSION_COOKIE)).toBeUndefined();
  });

  it("sperrt Account nach 5 Fehlversuchen", async () => {
    const { email, customer } = await makeCustomer({ verified: true });
    createdEmails.add(email);

    let last;
    for (let i = 0; i < 5; i++) {
      last = await loginCustomer(email, "Falsch-Passwort-X");
    }
    expect(last).toMatchObject({ ok: false, error: "ACCOUNT_LOCKED" });
    const fresh = await prisma.customer.findUnique({ where: { id: customer.id } });
    expect(fresh!.lockedUntil).not.toBeNull();
    expect(fresh!.lockedUntil!.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("password reset", () => {
  it("verschickt Reset-Link für verifizierten Account", async () => {
    const { email, customer } = await makeCustomer({ verified: true });
    createdEmails.add(email);

    const res = await requestPasswordReset(email);
    expect(res).toEqual({ ok: true });
    expect(sendResetMock).toHaveBeenCalledOnce();
    const fresh = await prisma.customer.findUnique({ where: { id: customer.id } });
    expect(fresh!.passwordResetTokenHash).toBeTruthy();
  });

  it("gibt bei unbekannter E-Mail generisch ok zurück (keine Enumeration)", async () => {
    const res = await requestPasswordReset("niemand@example.com");
    expect(res).toEqual({ ok: true });
    expect(sendResetMock).not.toHaveBeenCalled();
  });

  it("setzt Passwort neu, widerruft alle Sessions, Login mit neuem PW klappt", async () => {
    const { email, password, customer } = await makeCustomer({ verified: true });
    createdEmails.add(email);

    // Bestehende Session, die durch den Reset widerrufen werden muss.
    await loginCustomer(email, password);
    const before = await prisma.customerSession.findMany({ where: { customerId: customer.id } });
    expect(before).toHaveLength(1);

    await requestPasswordReset(email);
    const token = lastResetToken();
    const res = await resetPassword(token, "Ganz-Neues-PW-9");
    expect(res).toEqual({ ok: true });

    // Alte Session widerrufen.
    const after = await prisma.customerSession.findFirst({ where: { id: before[0].id } });
    expect(after!.revokedAt).not.toBeNull();

    // Login mit neuem Passwort.
    const login = await loginCustomer(email, "Ganz-Neues-PW-9");
    expect(login.ok).toBe(true);
  });

  it("lehnt abgelaufenen Reset-Token ab", async () => {
    const { email } = await makeCustomer({ verified: true });
    createdEmails.add(email);
    await requestPasswordReset(email);
    const token = lastResetToken();
    await prisma.customer.update({
      where: { email },
      data: { passwordResetExpiresAt: new Date(Date.now() - 1000) },
    });
    const res = await resetPassword(token, "Ganz-Neues-PW-9");
    expect(res).toEqual({ ok: false, error: "TOKEN_EXPIRED" });
  });

  it("lehnt schwaches neues Passwort ab", async () => {
    const { email } = await makeCustomer({ verified: true });
    createdEmails.add(email);
    await requestPasswordReset(email);
    const token = lastResetToken();
    const res = await resetPassword(token, "kurz");
    expect(res).toEqual({ ok: false, error: "WEAK_PASSWORD" });
  });
});

describe("session lifecycle", () => {
  it("getCurrentCustomer liefert eingeloggten Kunden", async () => {
    const { email, password, customer } = await makeCustomer({ verified: true });
    createdEmails.add(email);
    await loginCustomer(email, password);

    const current = await getCurrentCustomer();
    expect(current!.id).toBe(customer.id);
    expect(current!.email).toBe(email);
  });

  it("abgelaufene Session gilt nicht (null)", async () => {
    const { email, password, customer } = await makeCustomer({ verified: true });
    createdEmails.add(email);
    await loginCustomer(email, password);
    const token = cookieJar.get(CUSTOMER_SESSION_COOKIE)!;
    await prisma.customerSession.updateMany({
      where: { customerId: customer.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(hashToken(token)).toBeTruthy();
    expect(await getCurrentCustomer()).toBeNull();
  });

  it("widerrufene Session gilt nicht (null)", async () => {
    const { email, password, customer } = await makeCustomer({ verified: true });
    createdEmails.add(email);
    await loginCustomer(email, password);
    await prisma.customerSession.updateMany({
      where: { customerId: customer.id },
      data: { revokedAt: new Date() },
    });
    expect(await getCurrentCustomer()).toBeNull();
  });

  it("logout widerruft Session und löscht Cookie", async () => {
    const { email, password, customer } = await makeCustomer({ verified: true });
    createdEmails.add(email);
    await loginCustomer(email, password);

    await logoutCustomer();
    expect(cookieJar.get(CUSTOMER_SESSION_COOKIE)).toBeUndefined();
    const session = await prisma.customerSession.findFirst({ where: { customerId: customer.id } });
    expect(session!.revokedAt).not.toBeNull();
  });
});
