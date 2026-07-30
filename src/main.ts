import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import './style.css'

import GalleryPage from './pages/GalleryPage.vue'
import PromptsPage from './pages/PromptsPage.vue'
import SettingsPage from './pages/SettingsPage.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/gallery' },
    { path: '/gallery', component: GalleryPage },
    { path: '/prompt-modules', component: PromptsPage, props: { activeView: 'modules' } },
    { path: '/prompts', component: PromptsPage, props: { activeView: 'templates' } },
    { path: '/settings', component: SettingsPage },
    { path: '/generate', redirect: '/gallery' },
  ],
})

createApp(App).use(createPinia()).use(router).mount('#app')
