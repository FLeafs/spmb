export async function register() {
  // Only run in the Node.js server runtime (not edge, not during build).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.SPMB_BOOT_BROWSER === "0") return;

  // Lazy import so puppeteer is never bundled into the edge/build graph.
  const { ensureBrowser } = await import("@/lib/spmb-browser");
  console.log("[spmb] Server starting — launching browser and warming up...");
  ensureBrowser().catch((err) => {
    console.error("[spmb] Failed to launch browser on boot:", err?.message ?? err);
  });
}
