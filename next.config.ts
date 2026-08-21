import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Tell Next.js not to bundle these server-only native modules.
  // On Vercel (Turso env), better-sqlite3 is never called.
  // On local dev, it's loaded dynamically via require().
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
