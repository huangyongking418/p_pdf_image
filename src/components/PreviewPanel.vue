<template>
  <div class="preview-panel">
    <!-- 缩略图列表 -->
    <div class="thumb-list">
      <button
        v-for="page in pages"
        :key="page.index"
        class="thumb-item"
        :class="{ 'thumb-item--active': page.index === current }"
        @click="$emit('select', page.index)"
      >
        <img v-if="page.thumbnail" :src="page.thumbnail" class="thumb-img" :alt="'幻灯片 ' + (page.index + 1)" />
        <div v-else class="thumb-placeholder">
          <span>{{ page.index + 1 }}</span>
        </div>
      </button>
    </div>

    <!-- 主预览区 -->
    <div class="preview-main">
      <div class="preview-canvas">
        <img v-if="currentPage?.image && !loading" :src="currentPage.image" class="preview-img" :alt="'幻灯片 ' + (current + 1)" />
        <div v-else class="preview-placeholder">
          <div class="spinner"></div>
          <p>转换中…</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  pages: { type: Array, required: true },
  current: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
})
defineEmits(['select'])

const currentPage = computed(() => props.pages[props.current])
</script>
