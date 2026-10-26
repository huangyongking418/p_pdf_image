<template>
  <div class="app">
    <header class="app-header">
      <div class="header-title">
        <svg class="header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
        <h1>PPT 转高清图片</h1>
      </div>
      <span class="header-subtitle" v-if="state.file">幻灯片 · {{ state.pageCount }} 页</span>
      <div class="header-actions" v-if="state.file">
        <button class="btn-new" @click="reset">+ 新文件</button>
      </div>
    </header>

    <main class="app-main">
      <div v-if="!state.file" class="empty-state">
        <div v-if="state.libreoffice === false" class="libre-warning">
          <p>未检测到 LibreOffice</p>
          <span>请先安装 LibreOffice（免费），然后重启本工具。</span>
          <a href="https://zh-cn.libreoffice.org/download/" target="_blank">前往下载 →</a>
        </div>
        <Uploader @file-selected="handleFile" />
        <p class="hint">支持 .ppt 和 .pptx 格式，文件将仅在本地处理</p>
      </div>

      <div v-else class="workspace">
        <PreviewPanel
          :pages="state.pages"
          :current="state.currentPage"
          :loading="state.loading"
          @select="state.currentPage = $event"
        />
        <aside class="sidebar">
          <div v-if="state.loading" class="loading-sidebar">
            <div class="spinner"></div>
            <p>{{ state.progress }}%</p>
            <p class="loading-msg">{{ state.loadingMessage }}</p>
          </div>
          <Settings
            v-else
            :disabled="state.status !== 'done'"
            :format="state.format"
            :dpi="state.dpi"
            :export-range="state.exportRange"
            @update:format="state.format = $event"
            @update:dpi="state.dpi = $event"
            @update:export-range="state.exportRange = $event"
            @export="handleExport"
            @export-zip="handleExportZip"
          />
        </aside>
      </div>
    </main>
  </div>
</template>

<script setup>
import { reactive, onMounted } from 'vue'
import Uploader from './components/Uploader.vue'
import PreviewPanel from './components/PreviewPanel.vue'
import Settings from './components/Settings.vue'
import { uploadFile, getStatus, pollConversion, getImageUrl, getExportUrl } from './utils/api.js'

const state = reactive({
  file: null,
  fileId: null,
  loading: false,
  loadingMessage: '',
  progress: 0,
  status: 'idle',
  pages: [],
  pageCount: 0,
  currentPage: 0,
  format: 'png',
  dpi: 300,
  exportRange: 'all',
  libreoffice: false,
})

onMounted(async () => {
  try {
    const s = await getStatus()
    state.libreoffice = s.libreoffice
  } catch { /* offline */ }
})

async function handleFile(file) {
  state.file = file
  state.pages = []
  state.pageCount = 0
  state.currentPage = 0
  state.loading = true
  state.loadingMessage = '正在上传...'
  state.progress = 0
  state.status = 'uploading'

  try {
    const fileInfo = await uploadFile(file)
    state.fileId = fileInfo.id
    state.loadingMessage = '正在转换幻灯片...'

    const result = await pollConversion(fileInfo.id, (data) => {
      state.progress = data.progress || 0
      state.status = data.status
      if (data.progress < 10) {
        state.loadingMessage = "正在上传文件..."
      } else if (data.progress < 30) {
        state.loadingMessage = "正在通过 LibreOffice 转换幻灯片..."
      } else if (data.progress < 35) {
        state.loadingMessage = "正在渲染各页图像..."
      } else if (data.progress < 50) {
        state.loadingMessage = "正在后处理图片..."
      } else {
        state.loadingMessage = "正在生成预览..."
      }
    })

    state.pages = result.pages.map(p => ({
      ...p,
      thumbnail: getImageUrl(fileInfo.id, p.thumbnail),
      image: getImageUrl(fileInfo.id, p.image),
    }))
    state.pageCount = result.pageCount
    state.status = 'done'
  } catch (err) {
    alert('处理失败：' + err.message)
    reset()
  } finally {
    state.loading = false
  }
}

function triggerDownload(url, filename) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

async function handleExport() {
  if (state.pages.length === 0 || state.status !== 'done') return

  if (state.exportRange === 'all') {
    handleExportZip()
    return
  }

  const page = state.pages[state.currentPage]
  if (!page || typeof page.image !== 'string') return
  const dlUrl = page.image.replace('/api/image/', '/api/download/')
  const filename = 'slide_' + String(state.currentPage + 1).padStart(3, '0') + '.' + state.format
  triggerDownload(dlUrl, filename)
}

function handleExportZip() {
  if (!state.fileId || state.status !== 'done') return
  const baseName = (state.file.name || 'slides').replace(/\.(ppt|pptx)$/i, '')
  const zipName = baseName + '_images.zip'
  triggerDownload(getExportUrl(state.fileId), zipName)
}

function reset() {
  state.file = null
  state.fileId = null
  state.pages = []
  state.pageCount = 0
  state.currentPage = 0
  state.status = 'idle'
  state.loading = false
  state.progress = 0
  state.loadingMessage = ''
}
</script>
