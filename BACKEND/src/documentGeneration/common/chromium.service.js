const fs =
  require("fs");

const puppeteer =
  require("puppeteer");

/* =========================================================
   CACHE
========================================================= */

let cachedExecutablePath =
  null;

/* =========================================================
   EXISTS
========================================================= */

const executableExists =
  (
    executablePath
  ) => {
    if (
      !executablePath
    ) {
      return false;
    }

    try {
      return fs.existsSync(
        executablePath
      );
    } catch {
      return false;
    }
  };

/* =========================================================
   SYSTEM BROWSER CANDIDATES

   Local:
   - macOS Intel / Apple Silicon
   - Windows

   Production:
   - common Linux Chrome / Chromium locations
========================================================= */

const getSystemCandidates =
  () => {
    const platform =
      process.platform;

    if (
      platform ===
      "darwin"
    ) {
      return [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",

        "/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",

        "/Applications/Chromium.app/Contents/MacOS/Chromium",
      ];
    }

    if (
      platform ===
      "win32"
    ) {
      return [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",

        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",

        `${
          process.env.LOCALAPPDATA ||
          ""
        }\\Google\\Chrome\\Application\\chrome.exe`,
      ];
    }

    return [
      "/usr/bin/google-chrome",

      "/usr/bin/google-chrome-stable",

      "/usr/bin/chromium",

      "/usr/bin/chromium-browser",

      "/snap/bin/chromium",
    ];
  };

/* =========================================================
   ENVIRONMENT PATH

   Preferred in production.

   Example:

   CHROME_EXECUTABLE_PATH=/usr/bin/google-chrome
========================================================= */

const getEnvironmentExecutable =
  () => {
    const candidates = [
      process.env
        .CHROME_EXECUTABLE_PATH,

      process.env
        .PUPPETEER_EXECUTABLE_PATH,
    ];

    return candidates.find(
      executableExists
    );
  };

/* =========================================================
   SYSTEM CHROME
========================================================= */

const getSystemExecutable =
  () => {
    const candidates =
      getSystemCandidates();

    return candidates.find(
      executableExists
    );
  };

/* =========================================================
   PUPPETEER MANAGED BROWSER

   If Puppeteer successfully installed its pinned browser,
   executablePath() will point to it.

   IMPORTANT:
   Calling executablePath() can still return a path whose
   browser installation is incomplete, so we verify it.
========================================================= */

const getPuppeteerExecutable =
  () => {
    try {
      const executablePath =
        puppeteer
          .executablePath();

      if (
        executableExists(
          executablePath
        )
      ) {
        return executablePath;
      }
    } catch (
      error
    ) {
      console.warn(
        "[Chromium] Puppeteer browser unavailable:",
        error?.message
      );
    }

    return null;
  };

/* =========================================================
   ENSURE CHROMIUM

   Order:

   1. Cached resolved browser
   2. Explicit environment setting
   3. Existing operating-system Chrome
   4. Puppeteer managed Chrome

   We intentionally DO NOT download a browser during an
   employee's LOI request.

   Browser installation belongs to deployment/setup,
   not to request processing.
========================================================= */

const ensureChromium =
  async () => {
    /* =====================================================
       CACHED
    ===================================================== */

    if (
      executableExists(
        cachedExecutablePath
      )
    ) {
      return cachedExecutablePath;
    }

    /* =====================================================
       ENV
    ===================================================== */

    const environmentExecutable =
      getEnvironmentExecutable();

    if (
      environmentExecutable
    ) {
      cachedExecutablePath =
        environmentExecutable;

      console.log(
        "[Chromium] Using configured executable:",
        cachedExecutablePath
      );

      return cachedExecutablePath;
    }

    /* =====================================================
       SYSTEM
    ===================================================== */

    const systemExecutable =
      getSystemExecutable();

    if (
      systemExecutable
    ) {
      cachedExecutablePath =
        systemExecutable;

      console.log(
        "[Chromium] Using system Chrome:",
        cachedExecutablePath
      );

      return cachedExecutablePath;
    }

    /* =====================================================
       PUPPETEER CACHE
    ===================================================== */

    const puppeteerExecutable =
      getPuppeteerExecutable();

    if (
      puppeteerExecutable
    ) {
      cachedExecutablePath =
        puppeteerExecutable;

      console.log(
        "[Chromium] Using Puppeteer Chrome:",
        cachedExecutablePath
      );

      return cachedExecutablePath;
    }

    /* =====================================================
       NOT AVAILABLE
    ===================================================== */

    throw new Error(
      [
        "Chrome/Chromium is not available for PDF generation.",
        "",
        "Configure CHROME_EXECUTABLE_PATH or install the Puppeteer browser.",
        "",
        "Local macOS example:",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "",
        "Puppeteer installation command:",
        "npx puppeteer browsers install chrome",
      ].join(
        "\n"
      )
    );
  };

/* =========================================================
   EXPORT
========================================================= */

module.exports =
  ensureChromium;