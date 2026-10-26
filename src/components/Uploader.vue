<template>
  <div
    class="uploader"
    :class="{ 'uploader--dragover': dragover }"
    @dragover.prevent="dragover = true"
    @dragleave.prevent="dragover = false"
    @drop.prevent="onDrop"
    @click="triggerInput"
  >
    <input
      ref="inputRef"
      type="file"
      accept=".ppt,.pptx"
      hidden
      @change="onInput"
    />
    <div class="uploader-content">
      <svg class="uploader-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M24 32V12" stroke-linecap="round"/>
        <path d="M16 20l8-8 8 8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M8 36v4a4 4 0 0 0 4 4h24a4 4 0 0 0 4-4v-4" stroke-linecap="round"/>
      </svg>
      <p class="uploader-label">拖拽 PPT 文件到此</p>
      <p class="uploader-action">或点击选择文件</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['file-selected'])
const dragover = ref(false)
const inputRef = ref(null)

function triggerInput() {
  inputRef.value?.click()
}

function onInput(e) {
  const file = e.target.files?.[0]
  if (file) emit('file-selected', file)
  e.target.value = ''
}

function onDrop(e) {
  dragover.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) {
    const ext = file.name.split('.').pop().toLowerCase()
    if (['ppt', 'pptx'].includes(ext)) {
      emit('file-selected', file)
    } else {
      alert('仅支持 .ppt 和 .pptx 文件')
    }
  }
}
</script>
