const { connect } = require("puppeteer-real-browser");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const sekolah_tujuan_id = 235;
const jalur_pendaftaran = [
    {
        nama: "Domisili Reguler",
        id: "1"
    },
    {
        nama: "Domisili Khusus",
        id: "2"
    },
    {
        nama: "Prestasi",
        id: "3"
    },
    {
        nama: "Mutasi",
        id: "4"
    },
    {
        nama: "Afirmasi",
        id: "5"
    }
];

const key = ["no_pendaftaran", "nama_lengkap"];

const link = "https://spmb.jatengprov.go.id/jurnal";

(async () => {
    const isWindows = process.platform === "win32";
    const runHeadless = process.argv.includes('--headless');
    const chromePath = process.env.CHROME_PATH || (isWindows ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined);

    // Clean up any old leftover chrome-profile folders in the current directory on startup
    try {
        const files = fs.readdirSync(__dirname);
        for (const file of files) {
            if (file.startsWith('chrome-profile-') || file === 'chrome-profile-temp') {
                const fullPath = path.join(__dirname, file);
                try {
                    if (fs.statSync(fullPath).isDirectory()) {
                        fs.rmSync(fullPath, { recursive: true, force: true });
                        console.log(`Cleaned up old profile directory on startup: ${file}`);
                    }
                } catch (e) {
                    // Ignore if locked
                }
            }
        }
    } catch (err) {
        console.error("Error cleaning up old profiles on startup:", err.message);
    }

    // Generate a fresh unique temp profile directory for each run
    const profileDir = path.join(__dirname, `chrome-profile-${Date.now()}`);
    if (!fs.existsSync(profileDir)) {
        fs.mkdirSync(profileDir, { recursive: true });
    }
    
    let browser = null;
    
    const cleanup = () => {
        if (!fs.existsSync(profileDir)) return;
        
        // On Windows, Chrome processes might take a brief moment to fully release file locks.
        // We attempt to delete the folder up to 5 times with a small delay.
        for (let attempt = 1; attempt <= 5; attempt++) {
            try {
                fs.rmSync(profileDir, { recursive: true, force: true });
                console.log(`\nWiped temporary profile directory: ${profileDir}`);
                break;
            } catch (e) {
                if (attempt === 5) {
                    console.log(`Warning: Failed to clean up temp profile directory (files locked by Windows): ${profileDir}`);
                } else {
                    // Sync sleep for 500ms
                    const limit = Date.now() + 500;
                    while (Date.now() < limit) {}
                }
            }
        }
    };
    
    const gracefulExit = async (code = 0) => {
        console.log("\nGracefully shutting down...");
        if (browser) {
            try {
                await browser.close();
            } catch (e) {}
        }
        cleanup();
        process.exit(code);
    };
    
    process.on('exit', () => {
        // If exiting normally without SIGINT/SIGTERM, make sure to clean up.
        cleanup();
    });
    process.on('SIGINT', () => gracefulExit(2));
    process.on('SIGTERM', () => gracefulExit(15));
    process.on('uncaughtException', (err) => {
        console.error("Uncaught exception:", err);
        gracefulExit(1);
    });

    if (!isWindows && !runHeadless) {
        console.log("\n======================================================================");
        console.log("Tip: Running on Linux/headless server. Ensure 'xvfb' is installed");
        console.log("(e.g. 'sudo apt-get install xvfb') so that Cloudflare Turnstile can");
        console.log("be bypassed successfully in a virtual display environment.");
        console.log("======================================================================\n");
    }

    console.log(`Launching real browser (Headless: ${runHeadless ? "true" : "false (Xvfb on Linux)"})...`);
    const connection = await connect({
        headless: runHeadless ? "new" : false,
        turnstile: true,
        disableXvfb: runHeadless,
        customConfig: {
            chromePath: chromePath,
            userDataDir: profileDir
        },
        connectOption: {
            defaultViewport: null
        }
    });
    browser = connection.browser;
    const page = connection.page;
    
    // Log all network requests from the page to find CSRF token and analyze paths
    const requestHandler = request => {
        const url = request.url();
        const headers = request.headers();
        
        // Log all API requests
        if (url.includes('spmb.jatengprov.go.id')) {
            console.log(`[Request] ${request.method()} -> ${url}`);
            const csrfHeader = headers['csrf-token'] || headers['x-csrf-token'];
            if (csrfHeader && !csrfToken) {
                console.log(`FOUND CSRF HEADER: ${csrfHeader}`);
                csrfToken = csrfHeader;
            }
        }
    };
    page.on('request', requestHandler);

    // Log all network responses from the page to intercept the data
    page.on('response', async response => {
        const url = response.url();
        if (url.includes('api/csrf-token') && !csrfToken) {
            try {
                const data = await response.json();
                if (data && data.csrfToken) {
                    csrfToken = data.csrfToken;
                    console.log(`\nCAPTURED DYNAMIC CSRF TOKEN FROM RESPONSE: ${csrfToken}`);
                }
            } catch (e) {
                console.log(`Failed to parse CSRF response JSON: ${e.message}`);
            }
        }
        
        if (url.includes('perangkingan')) {
            console.log(`\n[Captured Network Response] URL: ${url}`);
            try {
                const result = await response.json();
                console.log(`Status: ${result.status}, Message: ${result.message}`);
                if (result.status === 1 && Array.isArray(result.data)) {
                    console.log(`Found ${result.data.length} records.`);
                    result.data.forEach((item, index) => {
                        const values = key.map(k => `${k}: ${item[k] || 'N/A'}`).join(', ');
                        console.log(`  [${index + 1}] ${values}`);
                    });
                } else {
                    console.log("Data is empty or invalid:", result);
                }
            } catch (e) {
                // Response might be preflight or non-json
            }
        }
    });

    let csrfToken = null;

    try {
        console.log(`Navigating to ${link}...`);
        await page.goto(link, { waitUntil: 'networkidle2' });
        
        console.log("Waiting automatically for Cloudflare bypass...");
        let verified = false;
        for (let i = 0; i < 300; i++) { // Up to 5 minutes
            const title = await page.title();
            console.log(`[${i}] Current Page Title: "${title}"`);
            if (title && (title.toUpperCase().includes("SPMB") || title.toUpperCase().includes("JATENG"))) {
                verified = true;
                break;
            }
            await new Promise(r => setTimeout(r, 1000));
        }
        if (!verified) {
            console.log("Warning: Verification timed out, but proceeding anyway...");
        }
        
        // Wait a few seconds for the page script to fully load and run initial requests
        await new Promise(r => setTimeout(r, 6000));
        
        // Wait for CSRF token to be captured by the response interceptor
        console.log("Waiting for CSRF token to be captured from response...");
        for (let i = 0; i < 15; i++) {
            if (csrfToken) break;
            await new Promise(r => setTimeout(r, 1000));
        }
        
        // Fallback checks if interceptor didn't catch it
        if (!csrfToken) {
            console.log("Interceptor did not capture CSRF token. Searching DOM...");
            csrfToken = await page.evaluate(() => {
                // Check if Nuxt / Vue state contains the csrfToken or headers
                if (window.__NUXT__?.state?.csrfToken) return window.__NUXT__.state.csrfToken;
                if (window.$nuxt?.$options?.context?.app?.$axios?.defaults?.headers?.common?.['csrf-token']) {
                    return window.$nuxt.$options.context.app.$axios.defaults.headers.common['csrf-token'];
                }
                
                // Check jQuery defaults if jQuery is loaded
                if (window.jQuery && window.jQuery.ajaxSettings && window.jQuery.ajaxSettings.headers) {
                    const jqueryCsrf = window.jQuery.ajaxSettings.headers['csrf-token'] || 
                                       window.jQuery.ajaxSettings.headers['x-csrf-token'];
                    if (jqueryCsrf) return jqueryCsrf;
                }
                
                // Inspect all elements on window for any potential csrf token values
                for (const key in window) {
                    try {
                        if (typeof window[key] === 'object' && window[key] !== null) {
                            const obj = window[key];
                            if (obj.csrfToken || obj.csrf_token || obj.csrf) {
                                return obj.csrfToken || obj.csrf_token || obj.csrf;
                            }
                        }
                    } catch (e) {}
                }
                
                let token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ||
                            document.querySelector('meta[name="csrf"]')?.getAttribute('content');
                if (!token) {
                    const cookies = document.cookie.split('; ');
                    const csrfCookie = cookies.find(row => row.startsWith('_csrf=') || row.startsWith('csrf='));
                    if (csrfCookie) {
                        token = decodeURIComponent(csrfCookie.split('=')[1]);
                    }
                }
                return token;
            });
        }
        
        if (!csrfToken) {
            csrfToken = "VUcevXM6-vOfetzPCIMchYkVnTThVVRoJ8yg";
            console.log("Warning: Could not dynamically extract CSRF token. Using fallback.");
        }
        
        console.log(`\nUsing CSRF Token: ${csrfToken}`);
        
        const results = [];

        // Try to fetch inside page context (bypasses TLS/Cloudflare signatures)
        for (const jalur of jalur_pendaftaran) {
            console.log(`\nFetching data inside page context for Jalur: ${jalur.nama} (ID: ${jalur.id})...`);
            
            const result = await page.evaluate(async (jalurId, sekolahId, csrf) => {
                try {
                    const response = await fetch("https://api.spmb.jatengprov.go.id/api/servis/perangkingan", {
                        method: "POST",
                        credentials: "include",
                        referrer: "https://spmb.jatengprov.go.id/",
                        headers: {
                            "accept": "application/json, text/plain, */*",
                            "content-type": "application/json",
                            "csrf-token": csrf,
                            "x-api-key": "e86087bd-d805-407e-8e1d-a56c96490545"
                        },
                        body: JSON.stringify({
                            "jalur_pendaftaran_id": jalurId,
                            "sekolah_tujuan_id": sekolahId
                        })
                    });
                    return await response.json();
                } catch (e) {
                    return { status: 0, message: e.message, data: [] };
                }
            }, jalur.id, sekolah_tujuan_id, csrfToken);
            
            console.log(`Status: ${result.status}, Message: ${result.message}`);
            
            const filteredData = [];
            if (result.status === 1 && Array.isArray(result.data)) {
                console.log(`Found ${result.data.length} records.`);
                result.data.forEach((item, index) => {
                    const entry = {};
                    key.forEach(k => {
                        entry[k] = item[k] || null;
                    });
                    filteredData.push(entry);
                    
                    if (!runHeadless) {
                        const values = key.map(k => `${k}: ${item[k] || 'N/A'}`).join(', ');
                        console.log(`  [${index + 1}] ${values}`);
                    }
                });
            } else {
                console.log("Failed to retrieve valid data or data is empty.", result);
            }
            
            results.push({
                jalur: jalur.nama,
                id: parseInt(jalur.id),
                data: filteredData
            });
        }
        
        // Save to json file
        const outputFile = path.join(__dirname, "spmb_results.json");
        fs.writeFileSync(outputFile, JSON.stringify(results, null, 2), "utf-8");
        console.log(`\nSUCCESS: Results saved to ${outputFile}`);
        
        // Remove the temporary request handler
        page.off('request', requestHandler);
        
        const shouldPause = !runHeadless && isWindows && !process.argv.includes('--no-pause');
        if (shouldPause) {
            // Pause for debugging before browser closes
            console.log("\n======================================================================");
            console.log("SUCCESS: Extraction complete. Browser is kept open for debugging/manual clicks.");
            console.log("Any manual dropdown changes in Chrome will also be intercepted and printed here!");
            console.log("Press [ENTER] in this terminal when you are done to close the browser...");
            console.log("======================================================================\n");
            
            const readline = require('readline');
            const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
            await new Promise(resolve => rl.question('', () => {
                resolve();
            }));
            rl.close();
        }
        
    } catch (error) {
        console.error("An error occurred:", error);
    } finally {
        if (browser) {
            try {
                await browser.close();
            } catch (e) {}
        }
        cleanup();
    }
})();