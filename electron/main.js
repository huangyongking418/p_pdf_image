const { app, BrowserWindow } = require("electron");
const path = require("path");

const PORT = 3456;

app.whenReady().then(async () => {
  process.env.PPT2IMAGE_TMP_DIR = path.join(app.getPath("userData"), ".tmp");

  const serverApp = require("../server/index.js");
  await new Promise((resolve, reject) => {
    const srv = serverApp.listen(PORT, () => {
      console.log("[server] ready on http://localhost:" + PORT);
      resolve(srv);
    });
    srv.on("error", reject);
  });

  const isDev = process.argv.indexOf("--dev") >= 0;
  const url = isDev ? "http://localhost:5173" : "http://localhost:" + PORT;

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "PPT 转高清图片",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadURL(url);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
