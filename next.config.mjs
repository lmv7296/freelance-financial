/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  // Opening the dev server through the LAN address (e.g. on a phone) needs this,
  // otherwise hot reload (/_next/hmr) is blocked. Update it if the IP changes.
  allowedDevOrigins: ["192.168.0.102"],
  experimental: {
    agentUpgrade: "security",
    // The app pages are client components behind a browser-side login check, so the
    // server can't render them for instant-navigation validation. Only validate
    // segments that opt in with `export const instant = true`.
    instantInsights: {
      validationLevel: "manual-warning",
    },
  },
  async rewrites() {
    const backendUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8085";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
      {
        source: "/healthz",
        destination: `${backendUrl}/healthz`,
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
