import fs from "fs";
import path from "path";

// puppeteer-real-browser is CommonJS without types
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { connect } = require("puppeteer-real-browser");

export const SEKOLAH_TUJUAN_ID = 235;

export const JALUR_PENDAFTARAN = [
  { nama: "Domisili Reguler", id: "1" },
  { nama: "Domisili Khusus", id: "2" },
  { nama: "Prestasi", id: "3" },
  { nama: "Mutasi", id: "4" },
  { nama: "Afirmasi", id: "5" },
] as const;

const KEYS = ["no_pendaftaran", "nama_lengkap"] as const;
const LINK = "https://spmb.jatengprov.go.id/jurnal";
const API_KEY = "e86087bd-d805-407e-8e1d-a56c96490545";

export interface Pendaftar {
  no_pendaftaran: string | null;
  nama_lengkap: string | null;
}

export interface JalurResult {
  jalur: string;
  id: number;
  data: Pendaftar[];
}

type BrowserState =
  | { status: "idle" }
  | { status: "starting" }
  | { status: "ready"; csrfToken: string }
  | { status: "error"; message: string };

interface Singleton {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  browser: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any;
  csrfToken: string | null;
  state: BrowserState;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  startPromise: Promise<any> | null;
}

// Persist across hot reloads in dev
const globalForSpmb = globalThis as unknown as { __spmb?: Singleton };

function getSingleton(): Singleton {
  if (!globalForSpmb.__spmb) {
    globalForSpmb.__spmb = {
      browser: null,
      page: null,
      csrfToken: null,
      state: { status: "idle" },
      startPromise: null,
    };
  }
  return globalForSpmb.__spmb;
}

export function getStatus(): BrowserState {
  return getSingleton().state;
}

function log(...args: unknown[]) {
  console.log("[spmb-browser]", ...args);
}

/**
 * Launches the real browser once, navigates to the jurnal page, waits for the
 * Cloudflare bypass, and captures the CSRF token. Subsequent calls reuse the
 * same page. Safe to call repeatedly — concurrent callers share one start.
 */
export async function ensureBrowser(): Promise<void> {
  const s = getSingleton();

  if (s.state.status === "ready" && s.page) return;
  if (s.startPromise) {
    await s.startPromise;
    return;
  }

  s.state = { status: "starting" };
  s.startPromise = startBrowser(s).catch((err) => {
    s.state = { status: "error", message: err?.message ?? String(err) };
    s.startPromise = null;
    throw err;
  });

  await s.startPromise;
}

async function startBrowser(s: Singleton): Promise<void> {
  const isWindows = process.platform === "win32";
  const runHeadless = process.env.SPMB_HEADLESS === "1";
  const chromePath =
    process.env.CHROME_PATH ||
    (isWindows
      ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
      : undefined);

  // Clean up any old leftover chrome-profile folders in the current directory on startup
  try {
    const cwd = process.cwd();
    const files = fs.readdirSync(cwd);
    for (const file of files) {
      if (file.startsWith("chrome-profile-") || file === "chrome-profile-temp") {
        const fullPath = path.join(cwd, file);
        try {
          if (fs.statSync(fullPath).isDirectory()) {
            fs.rmSync(fullPath, { recursive: true, force: true });
            log(`Cleaned up old profile directory on startup: ${file}`);
          }
        } catch {
          // Ignore if locked
        }
      }
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log("Error cleaning up old profiles on startup:", errMsg);
  }

  const profileDir = path.join(process.cwd(), `chrome-profile-${Date.now()}`);
  fs.mkdirSync(profileDir, { recursive: true });

  const cleanup = () => {
    if (!fs.existsSync(profileDir)) return;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        fs.rmSync(profileDir, { recursive: true, force: true });
        log(`Wiped temporary profile directory: ${profileDir}`);
        break;
      } catch {
        if (attempt === 5) {
          log(`Warning: Failed to clean up temp profile directory: ${profileDir}`);
        } else {
          // Sync sleep for 500ms
          const limit = Date.now() + 500;
          while (Date.now() < limit) {}
        }
      }
    }
  };

  const gracefulExit = async (code = 0) => {
    log("Gracefully shutting down browser and cleaning up...");
    if (s.browser) {
      try {
        await s.browser.close();
      } catch {}
    }
    cleanup();
    process.exit(code);
  };

  process.on("exit", () => {
    cleanup();
  });

  process.once("SIGINT", () => {
    gracefulExit(2);
  });

  process.once("SIGTERM", () => {
    gracefulExit(15);
  });

  log(`Launching real browser (headless: ${runHeadless})...`);
  const connection = await connect({
    headless: runHeadless ? "new" : false,
    turnstile: true,
    disableXvfb: runHeadless,
    customConfig: {
      chromePath,
      userDataDir: profileDir,
    },
    connectOption: { defaultViewport: null },
  });

  s.browser = connection.browser;
  s.page = connection.page;
  const page = s.page;

  // Capture CSRF token from the csrf-token API response
  page.on("response", async (response: { url: () => string; json: () => Promise<{ csrfToken?: string }> }) => {
    const url = response.url();
    if (url.includes("api/csrf-token") && !s.csrfToken) {
      try {
        const data = await response.json();
        if (data?.csrfToken) {
          s.csrfToken = data.csrfToken;
          log(`Captured CSRF token from response.`);
        }
      } catch {
        // non-json / preflight
      }
    }
  });

  log(`Navigating to ${LINK}...`);
  await page.goto(LINK, { waitUntil: "networkidle2" });

  log("Waiting for Cloudflare bypass...");
  for (let i = 0; i < 300; i++) {
    const title: string = await page.title();
    if (
      title &&
      (title.toUpperCase().includes("SPMB") ||
        title.toUpperCase().includes("JATENG"))
    ) {
      log(`Page verified: "${title}"`);
      break;
    }
    await sleep(1000);
  }

  // Let initial page scripts fire their requests
  await sleep(6000);

  log("Waiting for CSRF token capture...");
  for (let i = 0; i < 15; i++) {
    if (s.csrfToken) break;
    await sleep(1000);
  }

  if (!s.csrfToken) {
    log("Interceptor missed CSRF token, searching DOM...");
    s.csrfToken = await page.evaluate(() => {
      // @ts-expect-error window globals from the target page
      if (window.__NUXT__?.state?.csrfToken) return window.__NUXT__.state.csrfToken;
      const meta =
        document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") ||
        document.querySelector('meta[name="csrf"]')?.getAttribute("content");
      if (meta) return meta;
      const cookies = document.cookie.split("; ");
      const csrfCookie = cookies.find(
        (row) => row.startsWith("_csrf=") || row.startsWith("csrf=")
      );
      if (csrfCookie) return decodeURIComponent(csrfCookie.split("=")[1]);
      return null;
    });
  }

  if (!s.csrfToken) {
    s.csrfToken = "VUcevXM6-vOfetzPCIMchYkVnTThVVRoJ8yg";
    log("Warning: using fallback CSRF token.");
  }

  s.state = { status: "ready", csrfToken: s.csrfToken };
  s.startPromise = null;
  log(`Browser ready. CSRF: ${s.csrfToken}`);
}

/**
 * Fetches perangkingan data for every jalur using the already-open page so the
 * request carries the browser's Cloudflare/TLS fingerprint.
 */
export async function fetchAllJalur(): Promise<JalurResult[]> {
  await ensureBrowser();
  const s = getSingleton();
  const page = s.page;
  const csrf = s.csrfToken!;

  const results: JalurResult[] = [];

  for (const jalur of JALUR_PENDAFTARAN) {
    log(`Fetching jalur ${jalur.nama} (id ${jalur.id})...`);

    const result = await page.evaluate(
      async (jalurId: string, sekolahId: number, csrfToken: string, apiKey: string) => {
        try {
          const response = await fetch(
            "https://api.spmb.jatengprov.go.id/api/servis/perangkingan",
            {
              method: "POST",
              credentials: "include",
              referrer: "https://spmb.jatengprov.go.id/",
              headers: {
                accept: "application/json, text/plain, */*",
                "content-type": "application/json",
                "csrf-token": csrfToken,
                "x-api-key": apiKey,
              },
              body: JSON.stringify({
                jalur_pendaftaran_id: jalurId,
                sekolah_tujuan_id: sekolahId,
              }),
            }
          );
          return await response.json();
        } catch (e) {
          return { status: 0, message: (e as Error).message, data: [] };
        }
      },
      jalur.id,
      SEKOLAH_TUJUAN_ID,
      csrf,
      API_KEY
    );

    const data: Pendaftar[] = [];
    if (result?.status === 1 && Array.isArray(result.data)) {
      log(`  found ${result.data.length} records`);
      for (const item of result.data) {
        data.push({
          no_pendaftaran: item[KEYS[0]] ?? null,
          nama_lengkap: item[KEYS[1]] ?? null,
        });
      }
    } else {
      log(`  no valid data: ${result?.message ?? "unknown"}`);
    }

    results.push({ jalur: jalur.nama, id: parseInt(jalur.id), data });
  }

  // Persist a snapshot alongside the original file
  try {
    fs.writeFileSync(
      path.join(process.cwd(), "spmb_results.json"),
      JSON.stringify(results, null, 2),
      "utf-8"
    );
  } catch {
    // non-fatal
  }

  return results;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
