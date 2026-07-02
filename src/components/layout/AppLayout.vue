<script setup lang="ts">
import { onMounted, ref, computed, onBeforeUnmount } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useShiftStore } from '@/stores/shift'
import AppSidebar from './AppSidebar.vue'
import { useNetwork } from '@/composables/useNetwork'

const { isOnline, pendingCount, refreshPendingCount } = useNetwork()

const authStore = useAuthStore()
const shiftStore = useShiftStore()

const isCheckingShift = ref(true)
const showDrawer = ref(false)
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 960)

// Swipe detection
const touchStartX = ref(0)

// Calculate responsive swipe threshold based on device width
const getSwipeThreshold = () => {
  const width = windowWidth.value
  if (width < 480) return 30  // Mobile: easier threshold
  if (width < 768) return 35  // Mobile landscape
  if (width < 1024) return 40  // Tablet portrait
  return 50  // Desktop/larger tablet
}

const handleTouchStart = (e: TouchEvent) => {
  touchStartX.value = e.touches[0]?.clientX ?? 0
}

const handleTouchEnd = (e: TouchEvent) => {
  const touchEndX = e.changedTouches[0]?.clientX ?? 0
  const diff = touchEndX - touchStartX.value
  const threshold = getSwipeThreshold()
  const w = windowWidth.value

  if (w < 960) {
    // Mobile: swipe-right from left edge → open drawer
    if (diff > threshold && touchStartX.value < 40) showDrawer.value = true
    if (diff < -threshold && showDrawer.value) showDrawer.value = false
  } else if (w < 1280) {
    // Tablet: swipe-right from collapsed sidebar zone → expand; swipe-left when expanded → collapse
    const collapsedZone = 68 // collapsed sidebar (52px) + small buffer
    if (diff > threshold && touchStartX.value < collapsedZone && !authStore.sidebarExpanded) {
      authStore.toggleSidebar()
    }
    if (diff < -threshold && authStore.sidebarExpanded) {
      authStore.toggleSidebar()
    }
  }
}

// Handle window resize
const handleResize = () => {
  windowWidth.value = window.innerWidth
}

onMounted(async () => {
  try {
    const currentShift = await shiftStore.fetchCurrentShift()
    if (!currentShift) {
    } else {
    }
  } catch (error) {
  } finally {
    isCheckingShift.value = false
  }

  await refreshPendingCount()

  // Add event listeners
  window.addEventListener('resize', handleResize)
  window.addEventListener('touchstart', handleTouchStart, false)
  window.addEventListener('touchend', handleTouchEnd, false)
})

onBeforeUnmount(() => {
  // Clean up event listeners
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('touchstart', handleTouchStart)
  window.removeEventListener('touchend', handleTouchEnd)
})

// Calculate main content left margin based on sidebar state
const mainMarginLeft = computed(() => {
  const w = windowWidth.value
  if (w < 960) return '0'  // mobile: no sidebar
  if (w < 1280) {
    // tablet: collapsed sidebar = 52px (--spacing-sidebar-tablet)
    return authStore.sidebarExpanded ? 'var(--spacing-sidebar)' : 'var(--spacing-sidebar-tablet)'
  }
  // desktop
  return authStore.sidebarExpanded ? 'var(--spacing-sidebar)' : 'var(--spacing-sidebar-collapsed)'
})
</script>

<template>
  <div class="app-layout">
    <!-- Offline Banner -->
    <transition name="banner">
      <div v-if="!isOnline" class="offline-banner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="offline-icon">
          <line x1="1" y1="1" x2="23" y2="23"/>
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/>
        </svg>
        <span>
          Offline
          <template v-if="pendingCount > 0"> · {{ pendingCount }} transaksi menunggu sync</template>
        </span>
      </div>
    </transition>

    <!-- Sidebar (desktop ≥1280px only) -->
    <AppSidebar :show-drawer="showDrawer" @update:show-drawer="showDrawer = $event" />

    <!-- Main Content Area -->
    <main class="app-main">
      <router-view />
    </main>

  </div>
</template>

<style scoped>
.offline-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 16px;
  background: #dc2626;
  color: #fff;
  font-size: var(--font-size-sm);
  font-weight: 500;
  letter-spacing: 0.2px;
}
.offline-icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}
.banner-enter-active,
.banner-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.banner-enter-from,
.banner-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

.app-layout {
  display: flex;
  flex-direction: row;
  height: 100dvh;
  overflow: hidden;
  background: #f8fafb;
}

.app-main {
  flex: 1;
  overflow-y: auto;
  position: relative;
  transition: margin-left var(--transition-sidebar);
  margin-left: v-bind(mainMarginLeft);
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

/* Mobile + tablet portrait (<960px): column layout, no sidebar */
@media (max-width: 959px) {
  .app-layout {
    flex-direction: column;
  }

  .app-main {
    margin-left: 0 !important;
  }
}

/* Tablet landscape (960–1279px): sidebar visible (collapsed), row layout */
@media (min-width: 960px) and (max-width: 1279px) {
  .app-layout {
    flex-direction: row;
  }
}

/* MatePad SE 11" landscape — lebar desktop tapi tinggi tablet */
@media (min-width: 1280px) and (max-height: 850px) {
  .app-layout {
    flex-direction: row;
  }
}
</style>
