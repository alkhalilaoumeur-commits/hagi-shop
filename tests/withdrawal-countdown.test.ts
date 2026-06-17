import { describe, it, expect } from "vitest";
import { withdrawalDaysRemaining } from "@/lib/services/withdrawal";

/**
 * Reine Funktion (keine DB) für den Live-Countdown der Widerrufsfrist auf der
 * Kunden-Status-Seite. Deterministisch über injizierten `now`.
 */

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-06-17T12:00:00Z");

describe("withdrawalDaysRemaining — Live-Countdown Widerrufsfrist", () => {
  it("nicht zugestellt (deliveredAt=null) → null (Frist startet erst mit Zustellung)", () => {
    expect(withdrawalDaysRemaining(null, true, NOW)).toBeNull();
  });

  it("heute zugestellt, Belehrung erfolgt → 14 Tage, Deadline = +14 Tage", () => {
    const r = withdrawalDaysRemaining(NOW, true, NOW);
    expect(r?.daysRemaining).toBe(14);
    expect(r?.deadline.getTime()).toBe(NOW.getTime() + 14 * DAY);
  });

  it("vor 13 Tagen zugestellt → noch 1 Tag", () => {
    const delivered = new Date(NOW.getTime() - 13 * DAY);
    expect(withdrawalDaysRemaining(delivered, true, NOW)?.daysRemaining).toBe(1);
  });

  it("exakt vor 14 Tagen zugestellt → 0 (letzter Moment der Frist)", () => {
    const delivered = new Date(NOW.getTime() - 14 * DAY);
    expect(withdrawalDaysRemaining(delivered, true, NOW)?.daysRemaining).toBe(0);
  });

  it("vor 20 Tagen zugestellt → negativ (Frist abgelaufen)", () => {
    const delivered = new Date(NOW.getTime() - 20 * DAY);
    const r = withdrawalDaysRemaining(delivered, true, NOW);
    expect(r?.daysRemaining).toBe(-6);
    expect(r!.daysRemaining).toBeLessThan(0);
  });

  it("ohne ordnungsgemäße Belehrung → verlängerte Frist (12 Monate + 14 Tage)", () => {
    const r = withdrawalDaysRemaining(NOW, false, NOW);
    expect(r?.daysRemaining).toBe(365 + 14);
  });
});
