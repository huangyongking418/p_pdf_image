const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { spawn } = require("child_process");

const PDFTOPPM = "C:\\Users\\HUAWEI\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\native\\poppler\\Library\\bin\\pdftoppm.exe";

function pdfToPng(pdfPath, outputDir, dpi) {
  return new Promise((resolve, reject) => {
    // Copy PDF to short temp path (avoid spaces in path)
    const safeDir = path.join(os.tmpdir(), "p2p_" + crypto.randomBytes(8).toString("hex"));
    fs.mkdirSync(safeDir, { recursive: true });
    const safePdfPath = path.join(safeDir, "input.pdf");
    fs.copyFileSync(pdfPath, safePdfPath);

    const prefix = path.join(safeDir, "page");
    const args = ["-png", "-r", "150", safePdfPath, prefix];

    const child = spawn(PDFTOPPM, args, {
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 180000,
    });

    let stderr = "";
    child.stderr.on("data", (d) => { stderr += d.toString(); });

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
      try { fs.rmSync(safeDir, { recursive: true, force: true }); } catch (e) {}
      reject(new Error("PDF转PNG超时"));
    }, 180000);

    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) return;

      if (code !== 0) {
        try { fs.rmSync(safeDir, { recursive: true, force: true }); } catch (e) {}
        return reject(new Error("PDF转PNG失败: " + (stderr || "exit code " + code)));
      }

      let files;
      try {
        files = fs.readdirSync(safeDir)
          .filter((f) => f.startsWith("page-") && f.endsWith(".png"))
          .map((f) => path.join(safeDir, f))
          .sort();
      } catch {
        files = [];
      }

      if (files.length === 0) {
        try { fs.rmSync(safeDir, { recursive: true, force: true }); } catch (e) {}
        return reject(new Error("pdftoppm 未生成任何图片"));
      }

      // Move files to outputDir
      const result = [];
      for (const f of files) {
        const name = path.basename(f);
        const dest = path.join(outputDir, name);
        try { fs.copyFileSync(f, dest); result.push(dest); } catch (e) {}
      }

      try { fs.rmSync(safeDir, { recursive: true, force: true }); } catch (e) {}

      resolve(result);
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      try { fs.rmSync(safeDir, { recursive: true, force: true }); } catch (e) {}
      reject(new Error("PDF转PNG启动失败: " + err.message));
    });
  });
}

module.exports = { pdfToPng };
