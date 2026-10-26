# PPT 转高清图片

一个面向 Windows 的本地 PPT/PPTX 转图片工具。上传演示文稿后，可以逐页预览，并按指定格式和分辨率导出单页图片或下载 ZIP 压缩包。

文件通过本机服务完成转换，不需要上传到第三方服务。

GitHub 仓库：<https://github.com/huangyongking418/p_pdf_image>

## 功能

- 支持 `.ppt` 和 `.pptx` 文件，可点击选择或拖拽上传
- 自动将幻灯片转换为图片，并显示逐页缩略图和主预览
- 支持 PNG、JPEG 两种图片格式
- 支持 72、150、300 DPI 三档输出分辨率
- 支持导出当前页，或批量下载全部页面 ZIP
- 提供 Web 开发模式和 Electron 桌面端构建配置
- 附带 Windows 便携版启动脚本和本地构建配置

## 转换流程

```text
PPT / PPTX
    │
    ▼
LibreOffice ──► PDF
    │
    ▼
pdftoppm ──► 页面 PNG
    │
    ▼
Sharp ──► 后处理、JPEG/PNG 输出、缩略图
    │
    ▼
页面预览 / 单页下载 / ZIP 批量下载
```

## 环境要求

当前项目主要在 Windows 环境下开发和验证，运行或打包前需要准备：

- [Node.js](https://nodejs.org/)（建议 18 或更高版本）
- [LibreOffice](https://zh-cn.libreoffice.org/download/)（必需，用于 PPT/PPTX 转 PDF）
- Poppler for Windows，确保系统中可以使用 `pdftoppm.exe`

> 注意：当前源码中的 `server/services/pdf2png.js` 使用了一个固定的 `pdftoppm.exe` 路径。克隆项目后，请根据自己的 Poppler 安装位置修改 `PDFTOPPM` 常量；后续可将其改为环境变量或自动探测。

## 本地运行

1. 安装依赖：

```powershell
npm install
```

2. 启动 Vue 前端和本地转换服务：

```powershell
npm run dev
```

3. 浏览器访问：

```text
http://localhost:5173
```

也可以单独启动服务：

```powershell
npm run dev:vue
npm run dev:server
```

生产模式构建后，Express 会从 `dist/` 提供前端页面，默认服务地址为 `http://localhost:3456`。

## 使用方法

1. 打开应用，确认页面没有提示“未检测到 LibreOffice”。
2. 选择或拖入 `.ppt` / `.pptx` 文件。
3. 等待转换完成，在左侧缩略图中切换幻灯片。
4. 设置图片格式、分辨率和导出范围。
5. 导出当前页，或点击“批量下载 ZIP”获取 ZIP 压缩包。

## 打包

构建 Web 静态资源：

```powershell
npm run build
```

构建 Windows Electron 便携版：

```powershell
npm run build:electron
```

Electron 构建结果输出到 `dist_electron/`。

### Windows 便携版

本项目的完整开发目录中包含已经整理好的 `dist_portable/` 便携版，但不是单个 EXE。GitHub 仓库只保留其中的启动脚本和项目文件；以下生成内容未提交：

- `dist_portable/node/node.exe`：约 87 MB 的 Node.js 运行环境
- `dist_portable/node_modules/`：本地安装的生产依赖
- `dist_portable/dist/`：Vue 构建产物

因此，从 GitHub 直接下载源码后，不能仅依赖 `start.bat` 运行便携版，需要先构建前端并准备本地依赖。目录结构如下：

```text
dist_portable/
├── node/            # 内置 Node.js 运行环境
├── node_modules/    # 生产依赖（express、sharp、multer、archiver）
├── server/          # 后端服务代码
├── dist/            # 前端页面
├── start.bat        # 启动服务并打开浏览器
└── stop.bat         # 停止本地服务
```

使用方法：

在完整的本地便携版中：

1. 将整个 `dist_portable/` 文件夹复制到目标电脑。
2. 在目标电脑安装 LibreOffice。
3. 确保 `pdftoppm.exe` 可用，且服务端配置的路径有效。
4. 双击 `start.bat`，浏览器将打开 `http://localhost:3456`。
5. 使用结束后双击 `stop.bat` 停止服务。

> `stop.bat` 会终止系统中的所有 `node.exe` 进程。运行前请确认没有其他重要 Node.js 服务正在使用。

## 目录结构

```text
.
├── electron/
│   ├── main.js              # Electron 主进程，启动本地服务并创建窗口
│   └── preload.js           # 向页面暴露本地 API 地址
├── server/
│   ├── index.js             # Express 上传、预览、下载接口
│   └── services/
│       ├── converter.js     # 转换任务与 ZIP 打包
│       ├── libreoffice.js   # 调用 LibreOffice
│       └── pdf2png.js       # 调用 pdftoppm 渲染 PDF
├── src/
│   ├── components/
│   │   ├── Uploader.vue
│   │   ├── PreviewPanel.vue
│   │   └── Settings.vue
│   └── utils/api.js         # 前端与本地服务通信
├── dist_portable/           # Windows 便携版脚本与项目文件
├── package.json
└── vite.config.js
```

运行过程中产生的临时文件默认保存在项目根目录的 `.tmp/`。Electron 运行时则使用应用数据目录下的 `.tmp/`。

## 本地 API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/status` | 检查服务状态及 LibreOffice 是否可用 |
| `POST` | `/api/upload` | 上传 `.ppt` 或 `.pptx` 文件并开始转换 |
| `GET` | `/api/convert/:id` | 查询转换状态、进度和页面列表 |
| `GET` | `/api/image/:jobId/:filename` | 获取预览图 |
| `GET` | `/api/download/:jobId/:filename` | 下载单张图片 |
| `GET` | `/api/export/:id` | 下载全部图片的 ZIP 压缩包 |

服务默认监听端口为 `3456`，仅适合本机使用。

## 常见问题

### 页面提示未检测到 LibreOffice

安装 LibreOffice 后重新启动应用。程序会优先在常见的 Windows 安装目录中查找 `soffice.exe`。

### 转换失败并提示 `PDF转PNG启动失败`

通常是 `pdftoppm.exe` 路径不正确，或 Poppler 未安装。请修改 `server/services/pdf2png.js` 中的 `PDFTOPPM` 路径，确保该文件存在并且可以执行。

### 本地服务无法启动

检查 `3456` 端口是否被占用。如果已经有旧服务在运行，请先关闭旧进程；确认没有其他业务依赖该端口后再停止服务。

### 为什么建议使用本地服务

LibreOffice、Poppler 和图片处理需要直接操作本机文件与进程，放在本地服务中比纯浏览器方案更稳定，也能避免演示文稿被上传到互联网。

## 已知限制

- 当前主要在 Windows 上开发和验证。
- `server/services/pdf2png.js` 仍使用固定的 `pdftoppm.exe` 路径，跨设备使用前需要调整。
- GitHub 仓库不包含大型 Node.js 运行环境、`node_modules/` 和前端构建产物。
- 项目尚未添加 `LICENSE`；在明确授权方式前，请勿默认本项目可以用于商业分发。
- 如果后续提供 GitHub Releases，可以将完整的便携版压缩包或 Electron 安装包作为发布资源上传。
