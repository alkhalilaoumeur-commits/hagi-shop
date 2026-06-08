import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // Docker-optimiertes Build
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" }, // Placeholder-Bilder in Dev
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://js.stripe.com",
              "frame-src https://js.stripe.com",
              "img-src 'self' data: https://res.cloudinary.com https://images.unsplash.com",
              "style-src 'self' 'unsafe-inline'",
              "connect-src 'self' https://api.stripe.com",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
