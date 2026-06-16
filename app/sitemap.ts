import { MetadataRoute } from "next";
import prisma from "@/lib/prisma";
import { APP_URL } from "@/lib/config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = APP_URL;

  const staticPages: MetadataRoute.Sitemap = [
    { url: appUrl, priority: 1, changeFrequency: "weekly" },
    { url: `${appUrl}/produkte`, priority: 0.9, changeFrequency: "daily" },
    { url: `${appUrl}/ueber-uns`, priority: 0.6, changeFrequency: "monthly" },
    { url: `${appUrl}/kontakt`, priority: 0.6, changeFrequency: "monthly" },
  ];

  let productPages: MetadataRoute.Sitemap = [];
  try {
    const products = await prisma.product.findMany({
      where: { inStock: true },
      select: { slug: true, updatedAt: true },
    });
    productPages = products.map((p) => ({
      url: `${appUrl}/produkte/${p.slug}`,
      lastModified: p.updatedAt,
      priority: 0.8,
      changeFrequency: "weekly" as const,
    }));
  } catch {
    // DB nicht erreichbar beim Build → nur statische Seiten
  }

  return [...staticPages, ...productPages];
}
