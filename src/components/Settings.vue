<template>
  <div class="settings">
    <h2 class="settings-title">导出设置</h2>

    <div class="setting-row">
      <label class="setting-label">图片格式</label>
      <div class="segmented-control">
        <button
          class="seg-btn"
          :class="{ active: format === 'png' }"
          @click="$emit('update:format', 'png')"
        >PNG</button>
        <button
          class="seg-btn"
          :class="{ active: format === 'jpeg' }"
          @click="$emit('update:format', 'jpeg')"
        >JPEG</button>
      </div>
    </div>

    <div class="setting-row">
      <label class="setting-label">分辨率</label>
      <div class="dpi-options">
        <button
          v-for="opt in dpiOptions"
          :key="opt.value"
          class="dpi-btn"
          :class="{ active: dpi === opt.value }"
          @click="$emit('update:dpi', opt.value)"
        >{{ opt.label }}</button>
      </div>
    </div>

    <div class="setting-row">
      <label class="setting-label">导出范围</label>
      <div class="segmented-control">
        <button
          class="seg-btn"
          :class="{ active: exportRange === 'all' }"
          @click="$emit('update:export-range', 'all')"
        >全部</button>
        <button
          class="seg-btn"
          :class="{ active: exportRange === 'current' }"
          @click="$emit('update:export-range', 'current')"
        >当前页</button>
      </div>
    </div>

    <div class="setting-divider"></div>

    <button class="export-btn" @click="$emit('export')" :disabled="disabled">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="export-btn-icon">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      导出图片
    </button>

    <button class="export-btn export-btn--secondary" @click="$emit('export-zip')" :disabled="disabled">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="export-btn-icon">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
        <line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
      批量下载 ZIP
    </button>
  </div>
</template>

<script setup>
defineProps({
  disabled: { type: Boolean, default: false },
  format: { type: String, default: 'png' },
  dpi: { type: Number, default: 300 },
  exportRange: { type: String, default: 'all' },
})
defineEmits(['update:format', 'update:dpi', 'update:export-range', 'export', 'export-zip'])

const dpiOptions = [
  { label: '72 DPI', value: 72 },
  { label: '150 DPI', value: 150 },
  { label: '300 DPI', value: 300 },
]
</script>
