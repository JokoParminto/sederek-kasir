<script setup lang="ts">
import { onMounted } from 'vue'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { useShiftStore } from '@/stores/shift'
import { useAuthStore } from '@/stores/auth'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import GlobalToastContainer from '@/components/common/GlobalToastContainer.vue'

const shiftStore = useShiftStore()
const authStore = useAuthStore()

// Unregister any existing SW (from previous installs) — native uses LOAD_NO_CACHE instead
const unregisterAllSW = async () => {
  if (!('serviceWorker' in navigator)) return
  const regs = await navigator.serviceWorker.getRegistrations()
  await Promise.all(regs.map(r => r.unregister()))
  if ('caches' in window) {
    const names = await caches.keys()
    await Promise.all(names.map(n => caches.delete(n)))
  }
}

// Web only: force SW update + reload when a new service worker is waiting
const applySWUpdate = () => {
  if (!('serviceWorker' in navigator)) return
  navigator.serviceWorker.getRegistration().then(reg => {
    if (!reg) return
    const applyWaiting = (sw: ServiceWorker) => {
      sw.postMessage({ type: 'SKIP_WAITING' })
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      }, { once: true })
    }
    if (reg.waiting) {
      applyWaiting(reg.waiting)
    } else {
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing
        if (!newSW) return
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            applyWaiting(newSW)
          }
        })
      })
      reg.update().catch(() => {})
    }
  })
}

onMounted(async () => {
  try {
    if (authStore.isAuthenticated) {
      await shiftStore.fetchCurrentShift()
    }
  } catch {}

  if (Capacitor.isNativePlatform()) {
    // Native: no SW, LOAD_NO_CACHE handles freshness.
    // Unregister leftover SW from previous APK versions.
    await unregisterAllSW()
    let backgroundedAt = 0
    const STALE_THRESHOLD_MS = 5 * 60 * 1000 // 5 menit
    CapApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        backgroundedAt = Date.now()
      } else if (backgroundedAt > 0 && Date.now() - backgroundedAt > STALE_THRESHOLD_MS) {
        window.location.reload()
      }
    })
  } else {
    applySWUpdate()
  }
})
</script>

<template>
  <router-view />
  <ConfirmDialog />
  <GlobalToastContainer />

  <!-- Session expired overlay -->
  <Transition name="session-fade">
    <div v-if="authStore.isSessionExpiring" class="session-expired-overlay">
      <div class="session-expired-box">
        <div class="session-spinner"></div>
        <p>Sesi habis, mengalihkan ke login...</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.session-expired-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}

.session-expired-box {
  background: #fff;
  border-radius: 16px;
  padding: 32px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.session-expired-box p {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  color: #333;
}

.session-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #e9d5ff;
  border-top-color: #7B2FBE;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.session-fade-enter-active,
.session-fade-leave-active {
  transition: opacity 0.25s ease;
}
.session-fade-enter-from,
.session-fade-leave-to {
  opacity: 0;
}
</style>
