<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useGalleryStore } from '@/stores/gallery'
import { useUiStore } from '@/stores/ui'
import type { ImageRecord } from '@/types'

const gallery = useGalleryStore()
const ui = useUiStore()

const search = ref('')
const activeTags = ref<string[]>([])
const onlyFav = ref(false)
const sizeFilter = ref<'all' | 'square' | 'landscape' | 'portrait'>('all')
const showTrash = ref(false)
const filtersOpen = ref(false)

// 批量模式
const batchMode = ref(false)
const selected = ref<Set<string>>(new Set())

const searchEl = ref<HTMLInputElement>()
function focusSearch(event: KeyboardEvent) {
  if (event.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
    event.preventDefault()
    searchEl.value?.focus()
  }
}
onMounted(() => window.addEventListener('keydown', focusSearch))
onBeforeUnmount(() => window.removeEventListener('keydown', focusSearch))

const filtered = computed<ImageRecord[]>(() => {
  const source = showTrash.value ? gallery.trashed : gallery.alive
  const query = search.value.trim().toLowerCase()
  return source
    .filter(image => {
      if (query && !image.prompt.toLowerCase().includes(query)) return false
      if (onlyFav.value && !image.favorite) return false
      if (activeTags.value.length && !activeTags.value.every(tag => image.tags.includes(tag))) return false
      if (sizeFilter.value === 'square' && image.width !== image.height) return false
      if (sizeFilter.value === 'landscape' && image.width <= image.height) return false
      if (sizeFilter.value === 'portrait' && image.width >= image.height) return false
      return true
    })
    .sort((a, b) => b.createdAt - a.createdAt)
})

const stats = computed(() => ({
  total: gallery.alive.length,
  fav: gallery.alive.filter(image => image.favorite).length,
  trash: gallery.trashed.length,
}))

const activeFilterCount = computed(() =>
  activeTags.value.length + Number(onlyFav.value) + Number(sizeFilter.value !== 'all') + Number(Boolean(search.value.trim())),
)

function toggleTag(tag: string) {
  const index = activeTags.value.indexOf(tag)
  if (index >= 0) activeTags.value.splice(index, 1)
  else activeTags.value.push(tag)
}

function resetFilters() {
  search.value = ''
  activeTags.value = []
  onlyFav.value = false
  sizeFilter.value = 'all'
}

function clickImage(image: ImageRecord) {
  if (batchMode.value) {
    const next = new Set(selected.value)
    if (next.has(image.id)) next.delete(image.id)
    else next.add(image.id)
    selected.value = next
    return
  }
  ui.openViewer(image.id, filtered.value.map(item => item.id))
}

function favoriteWithPop(id: string, event: MouseEvent) {
  gallery.toggleFavorite(id)
  const element = event.currentTarget as HTMLElement
  element.classList.remove('heart-pop')
  void element.offsetWidth
  element.classList.add('heart-pop')
}

function startBatch() {
  batchMode.value = true
  selected.value = new Set()
  ui.dockOpen = false
}

function exitBatch() {
  batchMode.value = false
  selected.value = new Set()
}

function toggleTrash() {
  showTrash.value = !showTrash.value
  exitBatch()
  resetFilters()
}

function batchDelete() {
  const count = selected.value.size
  gallery.softDelete([...selected.value])
  ui.showToast(`已移入回收站 · ${count} 张`)
  exitBatch()
}

function batchRestore() {
  const count = selected.value.size
  gallery.restore([...selected.value])
  ui.showToast(`已恢复 ${count} 张`)
  exitBatch()
}

function batchPurge() {
  const count = selected.value.size
  gallery.purge([...selected.value])
  ui.showToast(`已永久删除 ${count} 张`)
  exitBatch()
}

function batchTag() {
  const tag = prompt('为选中图片添加标签：')
  if (tag?.trim()) {
    gallery.addTagToMany([...selected.value], tag.trim())
    ui.showToast(`已添加标签「${tag.trim()}」`)
  }
  exitBatch()
}

function batchDownload() {
  ui.showToast(`预览版：真实版本将打包下载 ${selected.value.size} 张原图`)
  exitBatch()
}

function dateLabel(timestamp: number) {
  const date = new Date(timestamp)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  const diff = Math.round((today.getTime() - target.getTime()) / 86_400_000)
  if (diff === 0) return '今天'
  if (diff === 1) return '昨天'
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`
}
</script>

<template>
  <div class="gallery-page">
    <header class="gallery-header">
      <div class="heading-row">
        <div>
          <p class="field-label">Visual archive</p>
          <div class="mt-1.5 flex items-end gap-3">
            <h1 class="display text-[29px] leading-none">{{ showTrash ? '回收站' : '图库' }}</h1>
            <span class="pb-0.5 font-mono text-[10.5px] text-dim">
              {{ filtered.length }} / {{ showTrash ? stats.trash : stats.total }}
            </span>
          </div>
          <p class="mt-2 text-[11.5px] text-fade">
            {{ showTrash ? '在这里恢复误删的作品，或永久清理。' : '所有生成结果自动归档，点击图片查看提示词与参数。' }}
          </p>
        </div>

        <div class="heading-actions">
          <button class="quiet-action" @click="toggleTrash">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
              <path v-if="!showTrash" d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5" />
              <path v-else d="m15 18-6-6 6-6" />
            </svg>
            {{ showTrash ? '返回图库' : `回收站 ${stats.trash}` }}
          </button>
          <button v-if="!showTrash" class="btn btn-primary" @click="ui.dockOpen = true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M12 3c.7 4.7 3.3 7.3 8 8-4.7.7-7.3 3.3-8 8-.7-4.7-3.3-7.3-8-8 4.7-.7 7.3-3.3 8-8Z" />
            </svg>
            开始创作
          </button>
        </div>
      </div>

      <div class="toolbar-row">
        <div class="search-box">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input ref="searchEl" v-model="search" placeholder="搜索提示词或画面描述…" />
          <kbd>/</kbd>
        </div>

        <button class="filter-button" :class="{ active: onlyFav }" :aria-pressed="onlyFav" @click="onlyFav = !onlyFav">
          <span>{{ onlyFav ? '♥' : '♡' }}</span>
          收藏 {{ stats.fav }}
        </button>

        <div class="seg ratio-filter" role="group" aria-label="图片方向">
          <button :class="{ on: sizeFilter === 'all' }" :aria-pressed="sizeFilter === 'all'" @click="sizeFilter = 'all'">全部</button>
          <button :class="{ on: sizeFilter === 'square' }" :aria-pressed="sizeFilter === 'square'" @click="sizeFilter = 'square'">方形</button>
          <button :class="{ on: sizeFilter === 'landscape' }" :aria-pressed="sizeFilter === 'landscape'" @click="sizeFilter = 'landscape'">横向</button>
          <button :class="{ on: sizeFilter === 'portrait' }" :aria-pressed="sizeFilter === 'portrait'" @click="sizeFilter = 'portrait'">竖向</button>
        </div>

        <button class="filter-button" :class="{ active: filtersOpen || activeTags.length }" aria-controls="gallery-tag-panel" :aria-expanded="filtersOpen" @click="filtersOpen = !filtersOpen">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 7h10m4 0h2M4 17h2m4 0h10M14 4v6M6 14v6" /></svg>
          标签
          <span v-if="activeTags.length" class="filter-count">{{ activeTags.length }}</span>
        </button>

        <button class="filter-button ml-auto" :class="{ active: batchMode }" :aria-pressed="batchMode" @click="batchMode ? exitBatch() : startBatch()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z" /></svg>
          {{ batchMode ? '退出批量' : '批量选择' }}
        </button>
      </div>

      <Transition name="filter-panel">
        <div v-if="filtersOpen && gallery.allTags.length" id="gallery-tag-panel" class="tag-panel">
          <span class="field-label mr-2">标签筛选</span>
          <button
            v-for="tag in gallery.allTags"
            :key="tag"
            class="tag-option"
            :class="{ active: activeTags.includes(tag) }"
            :aria-pressed="activeTags.includes(tag)"
            @click="toggleTag(tag)"
          >{{ tag }}</button>
          <button v-if="activeFilterCount" class="clear-filters" @click="resetFilters">清除筛选</button>
        </div>
      </Transition>

      <Transition name="filter-panel">
        <div v-if="batchMode" class="batch-bar">
          <div>
            <span class="font-medium">批量管理</span>
            <span class="ml-2 text-[11px] text-dim">{{ selected.size ? `已选择 ${selected.size} 张` : '点击作品进行选择' }}</span>
          </div>
          <div class="ml-auto flex flex-wrap gap-1.5">
            <template v-if="!showTrash">
              <button class="btn btn-ghost !py-1.5 text-[11px]" :disabled="!selected.size" @click="batchDownload">打包下载</button>
              <button class="btn btn-ghost !py-1.5 text-[11px]" :disabled="!selected.size" @click="batchTag">添加标签</button>
              <button class="btn btn-danger !py-1.5 text-[11px]" :disabled="!selected.size" @click="batchDelete">移入回收站</button>
            </template>
            <template v-else>
              <button class="btn btn-ghost !py-1.5 text-[11px]" :disabled="!selected.size" @click="batchRestore">恢复</button>
              <button class="btn btn-danger !py-1.5 text-[11px]" :disabled="!selected.size" @click="batchPurge">永久删除</button>
            </template>
            <button class="btn btn-ghost !py-1.5 text-[11px]" @click="exitBatch">完成</button>
          </div>
        </div>
      </Transition>
    </header>

    <main class="gallery-scroll">
      <template v-if="filtered.length">
        <div class="collection-meta">
          <span>{{ showTrash ? '已删除作品' : activeFilterCount ? '筛选结果' : '最近作品' }}</span>
          <div class="h-px flex-1 bg-line" />
          <span class="font-mono">{{ filtered.length }} 件</span>
          <button v-if="activeFilterCount" @click="resetFilters">重置</button>
        </div>

        <section class="gallery-wall" aria-label="作品图库">
          <article
            v-for="(image, index) in filtered"
            :key="image.id"
            class="gallery-tile rise-in group"
            :class="{ selected: selected.has(image.id), 'batch-muted': batchMode && !selected.has(image.id) }"
            :style="{ '--stagger': index % 12 }"
          >
            <button
              class="image-hit"
              :aria-label="batchMode ? `选择图片：${image.prompt}` : `查看图片：${image.prompt}`"
              :aria-pressed="batchMode ? selected.has(image.id) : undefined"
              @click="clickImage(image)"
            >
              <img
                :src="image.dataUrl"
                :alt="image.prompt"
                loading="lazy"
                draggable="false"
                :style="{ aspectRatio: `${image.width} / ${image.height}` }"
              />
            </button>

            <div class="tile-overlay">
              <div class="flex items-center gap-1.5 text-[9.5px] text-white/72">
                <span>{{ dateLabel(image.createdAt) }}</span>
                <span>·</span>
                <span>{{ image.width === image.height ? '方形' : image.width > image.height ? '横向' : '竖向' }}</span>
                <span v-if="image.kind === 'edit'" class="rounded-full bg-white/15 px-1.5 py-px">参考图编辑</span>
              </div>
              <p>{{ image.prompt }}</p>
              <div v-if="image.tags.length" class="mt-2 flex flex-wrap gap-1">
                <span v-for="tag in image.tags.slice(0, 3)" :key="tag">#{{ tag }}</span>
              </div>
            </div>

            <button
              v-if="!batchMode && !showTrash"
              class="favorite-button"
              :class="{ active: image.favorite }"
              :title="image.favorite ? '取消收藏' : '收藏'"
              :aria-label="image.favorite ? `取消收藏：${image.prompt}` : `收藏：${image.prompt}`"
              :aria-pressed="image.favorite"
              @click.stop="favoriteWithPop(image.id, $event)"
            >{{ image.favorite ? '♥' : '♡' }}</button>

            <div v-if="batchMode" class="selection-mark" :class="{ active: selected.has(image.id) }">✓</div>
          </article>
        </section>
      </template>

      <div v-else class="empty-state">
        <div class="empty-mark">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.45">
            <path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
            <path d="m6 16 4-5 3 3.5L16 12l3 4H6Z" />
          </svg>
        </div>
        <h2 class="display">{{ showTrash ? '回收站是空的' : '没有找到相符作品' }}</h2>
        <p>{{ showTrash ? '移入回收站的图片会显示在这里。' : '调整筛选条件，或在底部创作浮窗生成一张新图片。' }}</p>
        <button v-if="activeFilterCount" class="btn mt-4" @click="resetFilters">清除全部筛选</button>
        <button v-else-if="!showTrash" class="btn btn-primary mt-4" @click="ui.dockOpen = true">开始创作</button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.gallery-page { display: flex; height: 100%; flex-direction: column; background: transparent; }
.gallery-header {
  position: relative;
  z-index: 12;
  flex: none;
  border-bottom: 1px solid var(--color-line);
  background: color-mix(in srgb, var(--color-ink) 91%, transparent);
  padding: 22px 24px 13px;
  backdrop-filter: blur(18px);
}
.heading-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
.heading-actions { display: flex; align-items: center; gap: 7px; }
.quiet-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 11.5px;
  color: var(--color-fade);
  transition: background 0.16s, color 0.16s;
}
.quiet-action:hover { background: var(--color-panel2); color: var(--color-paper); }

.toolbar-row { display: flex; align-items: center; gap: 7px; margin-top: 17px; }
.search-box {
  display: flex;
  width: min(360px, 34vw);
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--color-line2);
  padding: 5px 2px 7px;
  color: var(--color-dim);
  transition: border-color 0.18s, color 0.18s;
}
.search-box:focus-within { border-color: var(--color-accent); color: var(--color-accenthi); }
.search-box input { min-width: 0; flex: 1; border: 0; background: transparent; font-size: 12px; color: var(--color-paper); outline: none; }
.search-box input::placeholder { color: var(--color-dim); }
.search-box kbd { border: 1px solid var(--color-line); border-radius: 5px; padding: 1px 5px; font-family: var(--font-mono); font-size: 9px; color: var(--color-dim); }

.filter-button {
  display: inline-flex;
  height: 32px;
  align-items: center;
  gap: 5px;
  border-radius: 999px;
  border: 1px solid transparent;
  padding: 0 10px;
  font-size: 11px;
  color: var(--color-fade);
  transition: background 0.16s, border-color 0.16s, color 0.16s, transform 0.16s;
}
.filter-button:hover { background: var(--color-panel2); color: var(--color-paper); transform: translateY(-1px); }
.filter-button.active { border-color: color-mix(in srgb, var(--color-accent) 36%, var(--color-line)); background: var(--color-accentsoft); color: var(--color-accenthi); }
.filter-count { display: flex; height: 16px; min-width: 16px; align-items: center; justify-content: center; border-radius: 999px; background: var(--color-accent); padding: 0 4px; font-family: var(--font-mono); font-size: 8.5px; color: white; }
.ratio-filter { width: 210px; }

.tag-panel {
  display: flex;
  align-items: center;
  gap: 5px;
  overflow-x: auto;
  margin-top: 11px;
  border-top: 1px solid var(--color-line);
  padding-top: 10px;
}
.tag-option { flex: none; border-radius: 999px; padding: 4px 8px; font-size: 10.5px; color: var(--color-fade); transition: background 0.16s, color 0.16s; }
.tag-option:hover { background: var(--color-panel2); color: var(--color-paper); }
.tag-option.active { background: var(--color-accentsoft); color: var(--color-accenthi); }
.clear-filters { flex: none; margin-left: auto; padding: 4px 2px; font-size: 10.5px; color: var(--color-accenthi); }

.batch-bar {
  display: flex;
  align-items: center;
  margin-top: 11px;
  border-top: 1px solid var(--color-line);
  padding-top: 10px;
  font-size: 12px;
}
.filter-panel-enter-active, .filter-panel-leave-active { transition: opacity 0.2s ease, transform 0.25s var(--ease-out-soft); }
.filter-panel-enter-from, .filter-panel-leave-to { opacity: 0; transform: translateY(-5px); }

.gallery-scroll { min-height: 0; flex: 1; overflow-y: auto; padding: 18px 24px 190px; }
.collection-meta { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; font-size: 10.5px; color: var(--color-dim); }
.collection-meta > button { color: var(--color-accenthi); }
.gallery-wall { columns: 5 220px; column-gap: 14px; }
.gallery-tile {
  position: relative;
  break-inside: avoid;
  margin-bottom: 14px;
  overflow: hidden;
  border-radius: 13px;
  background: var(--color-panel2);
  box-shadow: 0 1px 2px rgb(38 35 28 / 0.06), 0 7px 22px rgb(38 35 28 / 0.08);
  transition: transform 0.3s var(--ease-out-soft), box-shadow 0.3s, opacity 0.25s;
}
.gallery-tile:hover, .gallery-tile:focus-within { transform: translateY(-3px); box-shadow: var(--shadow-lift); }
.gallery-tile.selected { box-shadow: 0 0 0 3px var(--color-accent), var(--shadow-lift); }
.gallery-tile.batch-muted { opacity: 0.58; }
.image-hit { display: block; width: 100%; cursor: zoom-in; }
.image-hit img { display: block; width: 100%; object-fit: cover; transition: transform 0.55s var(--ease-out-soft), filter 0.35s; }
.gallery-tile:hover .image-hit img, .gallery-tile:focus-within .image-hit img { transform: scale(1.025); }
.batch-muted .image-hit img { filter: saturate(0.7); }

.tile-overlay {
  position: absolute;
  inset: auto 0 0;
  pointer-events: none;
  padding: 44px 12px 12px;
  background: linear-gradient(to top, rgb(20 21 18 / 0.86), rgb(20 21 18 / 0.3) 68%, transparent);
  color: white;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.26s, transform 0.3s var(--ease-out-soft);
}
.gallery-tile:hover .tile-overlay, .gallery-tile:focus-within .tile-overlay { opacity: 1; transform: none; }
.tile-overlay > p { display: -webkit-box; overflow: hidden; margin-top: 5px; -webkit-box-orient: vertical; -webkit-line-clamp: 2; font-size: 11.5px; line-height: 1.45; }
.tile-overlay > div:last-child span { font-size: 9.5px; color: rgb(255 255 255 / 0.72); }

.favorite-button {
  position: absolute;
  right: 9px;
  top: 9px;
  display: flex;
  height: 30px;
  width: 30px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgb(252 249 242 / 0.88);
  color: var(--color-fade);
  box-shadow: var(--shadow-card);
  opacity: 0;
  backdrop-filter: blur(8px);
  transition: opacity 0.2s, color 0.2s, transform 0.2s;
}
.gallery-tile:hover .favorite-button, .gallery-tile:focus-within .favorite-button, .favorite-button.active { opacity: 1; }
.favorite-button:hover, .favorite-button.active { color: var(--color-accenthi); transform: scale(1.06); }
.selection-mark {
  position: absolute;
  left: 9px;
  top: 9px;
  display: flex;
  height: 25px;
  width: 25px;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(255 255 255 / 0.7);
  border-radius: 50%;
  background: rgb(252 249 242 / 0.68);
  font-size: 11px;
  color: transparent;
  backdrop-filter: blur(7px);
}
.selection-mark.active { border-color: var(--color-accent); background: var(--color-accent); color: white; }

.empty-state { display: flex; min-height: 52vh; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.empty-mark { display: flex; height: 64px; width: 64px; align-items: center; justify-content: center; border: 1px solid var(--color-line2); border-radius: 50%; color: var(--color-dim); }
.empty-state h2 { margin-top: 16px; font-size: 22px; }
.empty-state p { margin-top: 7px; max-width: 360px; font-size: 12px; line-height: 1.6; color: var(--color-dim); }

@media (max-width: 1020px) {
  .gallery-header { padding-inline: 18px; }
  .gallery-scroll { padding-inline: 18px; }
  .search-box { width: min(310px, 35vw); }
  .ratio-filter { width: 180px; }
}

@media (max-width: 820px) {
  .heading-row { gap: 12px; }
  .heading-row > div:first-child p:last-child { display: none; }
  .toolbar-row { flex-wrap: wrap; }
  .search-box { width: 100%; }
  .ratio-filter { width: 210px; }
  .toolbar-row > .ml-auto { margin-left: 0; }
}

@media (max-width: 720px) {
  .gallery-header { padding: 16px 14px 11px; }
  .heading-row h1 { font-size: 25px; }
  .heading-actions .quiet-action { padding-inline: 7px; }
  .heading-actions .btn { padding-inline: 10px; }
  .gallery-scroll { padding: 14px 12px 175px; }
  .gallery-wall { columns: 2 145px; column-gap: 10px; }
  .gallery-tile { margin-bottom: 10px; border-radius: 10px; }
  .tile-overlay { display: none; }
  .favorite-button { height: 28px; width: 28px; opacity: 1; }
  .batch-bar { align-items: flex-start; gap: 8px; }
}

@media (max-width: 470px) {
  .heading-actions .quiet-action { font-size: 0; }
  .heading-actions .quiet-action svg { width: 17px; height: 17px; }
  .heading-actions .btn { font-size: 10.5px; }
  .ratio-filter { order: 4; width: 100%; }
  .filter-button.ml-auto { margin-left: auto; }
  .batch-bar { flex-direction: column; }
  .batch-bar > div:last-child { margin-left: 0; }
}
</style>
