process.on("uncaughtException", (err) => {
  console.error("[crash] Unhandled error:", err.message);
});
process.on("unhandledRejection", (err) => {
  console.error("[crash] Unhandled rejection:", err.message);
});

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { isAvailable: libreAvailable } = require("./services/libreoffice");
const {
  startConversion,
  getJob,
  createZip,
  cleanupJob,
} = require("./services/converter");

const app = express();
const PORT = 3456;

const TMP_DIR = process.env.PPT2IMAGE_TMP_DIR || path.join(__dirname, "..", ".tmp");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const upload = multer({ dest: TMP_DIR });

app.use(express.json());

// CORS
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1"))) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Range");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Status
app.get("/api/status", (_req, res) => {
  res.json({ ok: true, libreoffice: libreAvailable() });
});

// Upload
app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "请选择一个文件" });
  }
  const ext = path.extname(req.file.originalname).toLowerCase();
  if (![".ppt", ".pptx"].includes(ext)) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: "仅支持 .ppt 和 .pptx 文件" });
  }
  const fileId = path.basename(req.file.filename);
  const inputPath = req.file.path + ext;
  fs.renameSync(req.file.path, inputPath);
  startConversion(fileId, inputPath, {
    format: req.body.format || "png",
    dpi: parseInt(req.body.dpi) || 300,
    range: req.body.range || "all",
    pptName: req.file.originalname,
  }).catch(() => {});
  res.json({
    ok: true,
    file: { id: fileId, name: req.file.originalname, size: req.file.size, ext },
  });
});

// Conversion status
app.get("/api/convert/:id", (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: "转换作业不存在" });
  const fmt = job.options?.format || "png";
  const imgExt = fmt === "jpeg" ? "jpg" : "png";
  res.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    error: job.error,
    pageCount: job.pages.length,
    pages: job.pages.map((p) => ({
      index: p.index,
      thumbnail: "/api/image/" + job.id + "/thumb_" + String(p.index + 1).padStart(3, "0") + ".png",
      image: "/api/image/" + job.id + "/slide_" + String(p.index + 1).padStart(3, "0") + "." + imgExt,
    })),
  });
});

// Serve images
app.get("/api/image/:jobId/:filename", (req, res) => {
  const filePath = path.join(TMP_DIR, "slides_" + req.params.jobId, "output", req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "文件不存在" });
  res.sendFile(filePath);
});

// Download single image
app.get("/api/download/:jobId/:filename", (req, res) => {
  const filePath = path.join(TMP_DIR, "slides_" + req.params.jobId, "output", req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "file not found" });
  res.download(filePath, req.params.filename);
});

// Export ZIP
app.get("/api/export/:id", async (req, res) => {
  try {
    const job = getJob(req.params.id);
    if (!job) return res.status(404).json({ error: "作业不存在" });
    const pptName = job.options?.pptName || "slides";
    const { buffer, name } = await createZip(req.params.id, pptName);
    res.set("Content-Type", "application/zip");
    const safeName = "presentation_images.zip";
    res.set("Content-Disposition", "attachment; filename=\"" + safeName + "\"");
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Static files (production)
const distPath = path.join(__dirname, "..", "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Start
if (require.main === module) {
  app.listen(PORT, () => {
    console.log("[server] running on http://localhost:" + PORT);
  });
}

module.exports = app;

