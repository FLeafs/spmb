import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep puppeteer & its native/runtime deps out of the bundle; load them
  // from node_modules at runtime instead.
  serverExternalPackages: [
    "puppeteer-real-browser",
    "puppeteer-core",
    "puppeteer-extra",
    "puppeteer-extra-plugin-stealth",
    "rebrowser-puppeteer-core",
  ],
};

export default nextConfig;
