/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "d8j0ntlcm91z4.cloudfront.net" },
    ],
  },
  async headers() {
    const isDev = process.env.NODE_ENV !== "production";
    const scriptSrc = isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com"
      : "script-src 'self' 'unsafe-inline' https://js.stripe.com";
    const globalHeaders = [
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          scriptSrc,
          "frame-src https://js.stripe.com",
          "frame-ancestors 'self'",
          "base-uri 'self'",
          "form-action 'self'",
          "img-src 'self' data: https://res.cloudinary.com https://images.unsplash.com https://d8j0ntlcm91z4.cloudfront.net",
          "media-src 'self' https://d8j0ntlcm91z4.cloudfront.net",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com data:",
          "connect-src 'self' https://api.stripe.com" + (isDev ? " ws://localhost:* http://localhost:*" : ""),
        ].join("; "),
      },
    ];
    // HSTS nur in Produktion (auf localhost würde es HTTPS erzwingen und Dev brechen).
    if (!isDev) {
      globalHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }
    // Token-/Capability-Seiten: nicht cachen, nicht indexieren, keinen Referrer leaken.
    const tokenPageHeaders = [
      { key: "Cache-Control", value: "private, no-store, max-age=0" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
      { key: "Referrer-Policy", value: "no-referrer" },
    ];
    return [
      { source: "/(.*)", headers: globalHeaders },
      { source: "/bestellung/status/:token*", headers: tokenPageHeaders },
      { source: "/widerruf-antrag/:token*", headers: tokenPageHeaders },
      { source: "/api/invoice/:token*", headers: tokenPageHeaders },
      { source: "/api/widerruf/:token*", headers: tokenPageHeaders },
    ];
  },
};

export default nextConfig;
