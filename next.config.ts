import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // `ANALYZE=1 npm run build` emits client source maps for bundle inspection.
  productionBrowserSourceMaps: process.env.ANALYZE === "1",
  compress: true,
  // The PPT renderer reads its slide backgrounds with fs at runtime; make sure
  // they ship with the serverless function on Vercel.
  outputFileTracingIncludes: {
    "/api/dashboard/ppt": ["./lib/ppt-templates/bg/**"],
  },
  experimental: {
    // Import only the icons/primitives actually used instead of whole barrels.
    optimizePackageImports: ["@hugeicons/core-free-icons", "@hugeicons/react", "radix-ui"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
