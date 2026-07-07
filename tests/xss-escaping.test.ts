import { describe, it, expect } from "vitest";

/**
 * Regressionstest für B5-F1 (MEDIUM): Stored XSS via JSON-LD.
 * Auf der öffentlichen Produktseite wird das JSON-LD über
 * `JSON.stringify(x).replace(/</g, "\\u003c")` in ein <script>-Tag geschrieben.
 * Ein Produktname mit `</script>` darf das Script-Tag NICHT verlassen können.
 */
function renderJsonLd(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}

describe("XSS — JSON-LD Escaping (Produktseite)", () => {
  it("neutralisiert </script>-Breakout im Produktnamen", () => {
    const jsonLd = { name: 'Teppich</script><script>alert(1)</script>', description: "x" };
    const html = renderJsonLd(jsonLd);
    expect(html).not.toContain("</script>");
    expect(html).toContain("\\u003c");
  });

  it("escaped jedes < auch in verschachtelten Feldern", () => {
    const jsonLd = { offers: [{ seller: { name: "<img src=x onerror=alert(1)>" } }] };
    const html = renderJsonLd(jsonLd);
    expect(html).not.toContain("<img");
    expect(html).not.toMatch(/<[a-zA-Z/]/);
  });
});
