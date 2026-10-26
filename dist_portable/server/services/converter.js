const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const archiver = require("archiver");
const libreoffice = require("./libreoffice");
const { pdfToPng } = require("./pdf2png");

const TMP_DIR = process.env.PPT2IMAGE_TMP_DIR || path.join(__dirname, "..", "..", ".tmp");
const jobs = new Map();

async function startConversion(fileId, inputPath, options) {
  const jobId = fileId;
  const workDir = path.join(TMP_DIR, "slides_" + jobId);

  if (fs.existsSync(workDir)) {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
  fs.mkdirSync(workDir, { recursive: true });

  const outputDir = path.join(workDir, "output");
  fs.mkdirSync(outputDir, { recursive: true });

  const job = {
    id: jobId,
    status: "converting",
    progress: 0,
    pages: [],
    workDir,
    outputDir,
    options,
    error: null,
  };
  jobs.set(jobId, job);

  _doConvert(job, inputPath).catch((err) => {
    job.status = "error";
    job.error = err.message;
  });

  return jobId;
}

async function _doConvert(job, inputPath) {
  const { format = "png", dpi = 300 } = job.options;
  const { outputDir, workDir } = job;

  // Step 1: PPT -> PDF (all slides) via LibreOffice
  job.progress = 10;
  const pdfFiles = await libreoffice.convertToPdf(inputPath, workDir);
  if (!pdfFiles || pdfFiles.length === 0) {
    throw new Error("PDF 转换失败");
  }
  const pdfPath = pdfFiles[0];

  // Step 2: PDF -> PNG (one per page) via pdftoppm (using short temp path)
  job.progress = 30;
  const pngFiles = await pdfToPng(pdfPath, workDir, dpi);
  if (!pngFiles || pngFiles.length === 0) {
    throw new Error("未生成任何幻灯片图片");
  }

  // Sort pages by page number
  pngFiles.sort((a, b) => {
    const numA = parseInt(path.basename(a).match(/page-(\d+)\.png/)?.[1] || "0", 10);
    const numB = parseInt(path.basename(b).match(/page-(\d+)\.png/)?.[1] || "0", 10);
    return numA - numB;
  });

  // Progress: pdftoppm done
  job.progress = 35;

  // Step 3: Post-process with Sharp
  job.progress = 50;
  const targetWidth = Math.round(dpi * 13.33);
  const imgExt = format === "jpeg" ? "jpg" : "png";

  const pages = [];
  for (let i = 0; i < pngFiles.length; i++) {
    const src = pngFiles[i];

    const outName = "slide_" + String(i + 1).padStart(3, "0") + "." + imgExt;
    const outPath = path.join(outputDir, outName);

    let pipeline = sharp(src);
    const meta = await pipeline.metadata();
    const srcWidth = meta.width || targetWidth;

    if (srcWidth < targetWidth) {
      pipeline = pipeline.resize(targetWidth, null, {
        kernel: "lanczos3",
        fit: "inside",
        withoutEnlargement: false,
      });
    }

    if (format === "jpeg") {
      pipeline = pipeline.jpeg({ quality: 95, mozjpeg: true });
    } else {
      pipeline = pipeline.png({ palette: false });
    }
    await pipeline.toFile(outPath);

    const thumbName = "thumb_" + String(i + 1).padStart(3, "0") + ".png";
    const thumbPath = path.join(outputDir, thumbName);
    await sharp(src).resize(240, 135, { fit: "cover" }).png().toFile(thumbPath);

    pages.push({ index: i, image: outPath, thumbnail: thumbPath });
    job.progress = 50 + Math.round(((i + 1) / pngFiles.length) * 45);
  }

  job.pages = pages;
  job.status = "done";
  job.progress = 100;

  // Cleanup
  try { fs.unlinkSync(pdfPath); } catch (e) {}
  for (const f of pngFiles) {
    try { fs.unlinkSync(f); } catch (e) {}
  }
}

function getJob(jobId) {
  return jobs.get(jobId) || null;
}

function createZip(jobId, pptName) {
  return new Promise((resolve, reject) => {
    const job = jobs.get(jobId);
    if (!job || job.status !== "done") {
      return reject(new Error("作业未完成或不存在"));
    }

    const baseName = (pptName || "slides").replace(/\.(ppt|pptx)$/i, "");
    const zipName = baseName + "_images.zip";
    const chunks = [];
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("data", (chunk) => chunks.push(chunk));
    archive.on("end", () => resolve({ buffer: Buffer.concat(chunks), name: zipName }));
    archive.on("error", reject);

    for (const page of job.pages) {
      const ext = path.extname(page.image);
      const name = "slide_" + String(page.index + 1).padStart(3, "0") + ext;
      archive.file(page.image, { name });
    }

    archive.finalize();
  });
}

function cleanupJob(jobId) {
  const job = jobs.get(jobId);
  if (job) {
    try { fs.rmSync(job.workDir, { recursive: true, force: true }); } catch (e) {}
    jobs.delete(jobId);
  }
}

module.exports = { startConversion, getJob, createZip, cleanupJob };

