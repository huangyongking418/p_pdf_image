1、**便携式目录**（不是单个 exe，但等于是绿色版软件）

`dist_portable/` 目录结构：

```
dist_portable/
├── node/            # 内置 Node.js 运行环境 (72MB)
├── node_modules/    # 生产依赖 (express, sharp, multer, archiver)
├── server/          # 后端服务代码
├── dist/            # 前端页面
├── start.bat        # 启动器 ← 双击这个
└── stop.bat         # 停止服务
```

2、把 `dist_portable` 文件夹复制到目标电脑

**安装 LibreOffice**（必须，程序会检测）

双击 `start.bat`

浏览器自动打开到 `http://localhost:3456`

用完按 Ctrl+C 或双击 `stop.bat` 停止服务