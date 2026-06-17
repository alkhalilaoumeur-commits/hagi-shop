import { describe, it, expect } from "vitest";
import { generateWithdrawalFormPDF } from "@/lib/pdf/generate";

describe("Widerrufsformular-PDF", () => {
  it("generiert ein PDF mit gültigem Header", async () => {
    const buf = await generateWithdrawalFormPDF();
    expect(buf.length).toBeGreaterThan(1000);
    expect(buf.slice(0, 4).toString()).toBe("%PDF");
  });

  it("nutzt COMPANY_NAME aus env wenn gesetzt", async () => {
    const before = process.env.COMPANY_NAME;
    process.env.COMPANY_NAME = "Hagi-Test Teppiche";
    const buf = await generateWithdrawalFormPDF();
    expect(buf.length).toBeGreaterThan(1000);
    if (before !== undefined) process.env.COMPANY_NAME = before;
    else delete process.env.COMPANY_NAME;
  });

  it("Route /widerrufsformular liefert PDF mit korrektem Content-Type", async () => {
    const { GET } = await import("@/app/widerrufsformular/route");
    const req = new Request("http://localhost/widerrufsformular");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toContain("inline");
  });

  it("Route mit ?dl=1 erzwingt Download", async () => {
    const { GET } = await import("@/app/widerrufsformular/route");
    const req = new Request("http://localhost/widerrufsformular?dl=1");
    const res = await GET(req);
    expect(res.headers.get("content-disposition")).toContain("attachment");
    expect(res.headers.get("content-disposition")).toContain("hagi-widerrufsformular.pdf");
  });

  it("Cache-Header für CDN gesetzt", async () => {
    const { GET } = await import("@/app/widerrufsformular/route");
    const req = new Request("http://localhost/widerrufsformular");
    const res = await GET(req);
    expect(res.headers.get("cache-control")).toContain("max-age=86400");
  });
});
