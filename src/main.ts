import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from '@/router'
import VCalendar from 'v-calendar'
import 'v-calendar/style.css'
import AppIcon from '@/components/base/AppIcon.vue'

// Styles
import '@/assets/styles/main.css'
import '@/assets/styles/print-layout.css'
import '@/styles/buttons.css'

// Self-hosted fonts (eliminates CDN flash/FOUT on APK cold start)
import '@fontsource/bebas-neue/400.css'
import '@fontsource/great-vibes/400.css'
import '@fontsource/poppins/300.css'
import '@fontsource/poppins/400.css'
import '@fontsource/poppins/500.css'
import '@fontsource/poppins/600.css'
import '@fontsource/poppins/700.css'
import '@fontsource/poppins/800.css'

// ===== EARLY DARK MODE INITIALIZATION =====
// This must run BEFORE app renders to prevent flash
// Check localStorage for dark mode preference and apply class immediately
;(() => {
  const savedPreference = localStorage.getItem('app-dark-mode')
  const isDarkMode = savedPreference === 'true'
  
  if (isDarkMode) {
    document.documentElement.classList.add('dark-mode')
  } else {
    document.documentElement.classList.remove('dark-mode')
  }
})()
// ==========================================

// PWA Service Worker — skip on native Capacitor (WebView uses LOAD_NO_CACHE, no SW needed)
import { Capacitor } from '@capacitor/core'
import { registerSW } from 'virtual:pwa-register'

if (!Capacitor.isNativePlatform()) {
  registerSW({
    onNeedRefresh() {
      if (confirm('Versi baru tersedia. Refresh sekarang?')) {
        location.reload()
      }
    },
    onOfflineReady() {},
  })
}

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(VCalendar, {})
app.component('AppIcon', AppIcon)

app.mount('#app')

// Wait for router to resolve before hiding native splash
// Prevents blank flash between splash exit and lazy-loaded route render
router.isReady().then(() => {
  import('@capacitor/core').then(({ Capacitor }) => {
    if (!Capacitor.isNativePlatform()) return
    import('@/services/capacitor.service').then(({ statusBar, localNotif }) => {
      statusBar.hide()
      localNotif.requestPermission()
    })
    import('@capacitor/splash-screen').then(({ SplashScreen }) => {
      SplashScreen.hide({ fadeOutDuration: 400 })
    }).catch(() => {})
  })
})
