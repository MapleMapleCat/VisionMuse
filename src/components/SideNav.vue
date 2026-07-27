<script setup lang="ts">
import { computed, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useTaskStore } from '@/stores/tasks'
import { useUiStore } from '@/stores/ui'

const route = useRoute()
const tasks = useTaskStore()
const ui = useUiStore()

const items = computed(() => [
  {
    path: '/gallery',
    label: '图库',
    icon: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm2 11 4-5 3 3.5L16 12l3 4H6Z',
    badge: tasks.activeCount,
  },
  {
    path: '/prompts',
    label: '模板',
    icon: 'M7 8h10M7 12h6m-6 4h8M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z',
  },
  {
    path: '/settings',
    label: '设置',
    icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3c0-.4 0-.8-.1-1.2l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.4 7.4 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.4 7.4 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.06-.4.1-.8.1-1.2Z',
  },
])

function openComposer() {
  ui.dockOpen = true
  nextTick(() => {
    const textarea = document.querySelector<HTMLTextAreaElement>('[aria-label="图片生成提示词"]')
    textarea?.focus()
  })
}
</script>

<template>
  <nav class="side-nav" aria-label="主导航">
    <router-link to="/gallery" class="brand" title="显影台首页" aria-label="显影台首页">
      <span class="brand-mark">显</span>
      <span class="brand-name">Atelier</span>
    </router-link>

    <button class="compose-action" title="打开创作浮窗" aria-label="打开创作浮窗" aria-controls="atelier-create-panel" @click="openComposer">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
        <path d="M12 3c.7 4.7 3.3 7.3 8 8-4.7.7-7.3 3.3-8 8-.7-4.7-3.3-7.3-8-8 4.7-.7 7.3-3.3 8-8Z" />
      </svg>
      <span>创作</span>
    </button>

    <div class="nav-items">
      <router-link
        v-for="item in items"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ active: route.path === item.path }"
        :aria-label="item.label"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">
          <path :d="item.icon" />
        </svg>
        <span>{{ item.label }}</span>
        <span v-if="item.badge" class="task-badge">{{ item.badge }}</span>
      </router-link>
    </div>

    <div class="nav-foot">
      <span class="online-dot" />
      <span>本地预览</span>
    </div>
  </nav>
</template>

<style scoped>
.side-nav {
  position: relative;
  z-index: 35;
  display: flex;
  width: 82px;
  flex: none;
  flex-direction: column;
  align-items: center;
  border-right: 1px solid var(--color-line);
  background: color-mix(in srgb, var(--color-well) 82%, var(--color-ink));
  padding: 15px 8px 13px;
}

.brand { display: flex; flex-direction: column; align-items: center; gap: 5px; color: var(--color-paper); }
.brand-mark {
  display: flex;
  height: 38px;
  width: 38px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-paper);
  border-radius: 50%;
  font-family: var(--font-serif);
  font-size: 17px;
  transition: background 0.25s, color 0.25s, transform 0.3s var(--ease-out-soft);
}
.brand:hover .brand-mark { background: var(--color-paper); color: var(--color-well); transform: rotate(-7deg); }
.brand-name { font-family: var(--font-serif); font-size: 9px; letter-spacing: 0.11em; text-transform: uppercase; }

.compose-action {
  display: flex;
  width: 62px;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  margin-top: 20px;
  border-radius: 14px;
  background: var(--color-paper);
  padding: 9px 4px 8px;
  color: var(--color-well);
  box-shadow: 0 6px 18px rgb(38 35 28 / 0.2);
  font-size: 10.5px;
  transition: transform 0.2s var(--ease-out-soft), box-shadow 0.2s, background 0.2s;
}
.compose-action:hover { background: #39352c; transform: translateY(-2px); box-shadow: 0 9px 24px rgb(38 35 28 / 0.25); }

.nav-items { display: flex; width: 100%; flex-direction: column; gap: 4px; margin-top: 16px; }
.nav-item {
  position: relative;
  display: flex;
  min-height: 55px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border-radius: 14px;
  font-size: 10.5px;
  color: var(--color-dim);
  transition: background 0.2s, color 0.2s, transform 0.2s var(--ease-out-soft);
}
.nav-item::before {
  content: '';
  position: absolute;
  left: -8px;
  top: 50%;
  height: 20px;
  width: 3px;
  border-radius: 0 4px 4px 0;
  background: var(--color-accent);
  opacity: 0;
  transform: translateY(-50%) scaleY(0.4);
  transition: opacity 0.2s, transform 0.25s var(--ease-out-soft);
}
.nav-item:hover { background: var(--color-panel2); color: var(--color-fade); transform: translateY(-1px); }
.nav-item.active { background: var(--color-accentsoft); color: var(--color-accenthi); }
.nav-item.active::before { opacity: 1; transform: translateY(-50%) scaleY(1); }
.task-badge {
  position: absolute;
  right: 7px;
  top: 7px;
  display: flex;
  min-width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--color-accent);
  padding-inline: 4px;
  font-family: var(--font-mono);
  font-size: 9px;
  color: white;
}

.nav-foot { display: flex; flex-direction: column; align-items: center; gap: 5px; margin-top: auto; font-family: var(--font-mono); font-size: 8.5px; color: var(--color-dim); }
.online-dot { height: 5px; width: 5px; border-radius: 50%; background: var(--color-accent); box-shadow: 0 0 0 4px var(--color-accentsoft); }

@media (max-width: 720px) {
  .side-nav {
    position: fixed;
    inset: 0 0 auto;
    width: auto;
    height: 60px;
    flex-direction: row;
    border-right: 0;
    border-bottom: 1px solid var(--color-line);
    padding: 7px 10px;
    backdrop-filter: blur(18px);
  }
  .brand { flex-direction: row; gap: 7px; margin-right: 9px; }
  .brand-mark { height: 34px; width: 34px; font-size: 15px; }
  .brand-name { display: none; }
  .compose-action { width: 50px; height: 42px; flex-direction: row; justify-content: center; margin: 0 8px 0 0; padding: 0; }
  .compose-action span { display: none; }
  .nav-items { flex: 1; flex-direction: row; justify-content: flex-end; gap: 2px; margin-top: 0; }
  .nav-item { min-height: 42px; width: 54px; flex-direction: row; gap: 0; }
  .nav-item > span:not(.task-badge) { display: none; }
  .nav-item::before { inset: auto auto -7px 50%; width: 18px; height: 3px; transform: translateX(-50%) scaleX(0.4); }
  .nav-item.active::before { transform: translateX(-50%) scaleX(1); }
  .task-badge { right: 6px; top: 3px; }
  .nav-foot { display: none; }
}
</style>
