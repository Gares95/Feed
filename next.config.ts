import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Turbopack needs eval at dev time for HMR; production runs without it.
const scriptSrc = isDev
  ? "'self' 'unsafe-inline' 'unsafe-eval'"
  : "'self' 'unsafe-inline'";

// Tailwind and shadcn components emit inline styles, so 'unsafe-inline' stays
// under style-src. Tightening to nonces would require middleware-per-request.
const cspDirectives = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  // Article images arrive via /api/image-proxy (same-origin) or as data:/blob:
  // for locally generated previews; no third-party hosts.
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
];

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspDirectives.join("; ") },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  // same-origin keeps the full Referer within our app (so the image-proxy
  // Referer check still works) while sending nothing to third-party links.
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
