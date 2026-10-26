const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const CANDIDATES = [
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
  "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
  path.join(process.env.LOCALAPPDATA || "", "Programs", "LibreOffice", "program", "soffice.exe"),
  path.join(process.env.PROGRAMFILES || "C:\\Program Files", "LibreOffice", "program", "soffice.exe"),
];
let _cachedPath = null;

function findLibreOffice() {
  if (_cachedPath) return _cachedPath;
  for (const p of CANDIDATES) {
    if (fs.existsSync(p)) { _cachedPath = p; return p; }
  }
  try {
    const r = execSync("where.exe soffice 2>nul", { encoding: "utf8", stdio: "pipe", shell: "cmd.exe" });
    const l = r.split("\n")[0]?.trim();
    if (l && fs.existsSync(l)) { _cachedPath = l; return l; }
  } catch {}
  return null;
}

function isAvailable() { return findLibreOffice() !== null; }

function convert(inputPath, outputDir, format, filterOpts) {
  return new Promise((resolve, reject) => {
    const soffice = findLibreOffice();
    if (!soffice) return reject(new Error("LibreOffice not found"));

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    try { execSync("taskkill /f /im soffice.exe 2>nul", { stdio: "ignore" }); } catch {}

    const loUser = path.join(outputDir, ".lo_" + Date.now());
    fs.mkdirSync(loUser, { recursive: true });

    let formatArg = format;
    if (filterOpts && Object.keys(filterOpts).length > 0) {
      formatArg = format + ":" + JSON.stringify(filterOpts);
    }

    const args = ["--headless", "--convert-to", formatArg, "--outdir", outputDir, inputPath];
    const env = { ...process.env, HOME: loUser, USERPROFILE: loUser };

    const child = spawn(soffice, args, { env, stdio: "ignore" });

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
      reject(new Error("LibreOffice timed out"));
    }, 120_000);

    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) return;

      if (code !== 0) {
        try { fs.rmSync(loUser, { recursive: true, force: true }); } catch {}
        return reject(new Error("LO failed with code " + code));
      }

      const fullBase = path.basename(inputPath);
      const nameNoExt = path.basename(inputPath, path.extname(inputPath));
      const outputExt = format;
      const maxWait = 30000;
      const pollInterval = 500;
      const startTime = Date.now();

      const poll = () => {
        let files;
        try {
          files = fs.readdirSync(outputDir)
            .filter(f => {
              if (!f.toLowerCase().endsWith("." + outputExt)) return false;
              if (f === fullBase + "." + outputExt) return true;
              if (f === nameNoExt + "." + outputExt) return true;
              if (f.startsWith(fullBase + "_") || f.startsWith(nameNoExt + "_")) return true;
              return false;
            })
            .map(f => path.join(outputDir, f)).sort();
        } catch { files = []; }

        if (files.length > 0 || Date.now() - startTime > maxWait) {
          try { fs.rmSync(loUser, { recursive: true, force: true }); } catch {}
          resolve(files);
        } else {
          setTimeout(poll, pollInterval);
        }
      };
      poll();
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      try { fs.rmSync(loUser, { recursive: true, force: true }); } catch {}
      reject(err);
    });
  });
}

function convertToPng(inputPath, outputDir) {
  return convert(inputPath, outputDir, "png");
}

function convertToPdf(inputPath, outputDir) {
  return convert(inputPath, outputDir, "pdf");
}

module.exports = { findLibreOffice, isAvailable, convertToPng, convertToPdf };
