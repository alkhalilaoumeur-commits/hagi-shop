import { MetadataRoute } from "next";
import { APP_URL } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  const appUrl = APP_URL;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/checkout", "/warenkorb"],
      },
    ],
    sitemap: `${appUrl}/sitemap.xml`,
  };
}
