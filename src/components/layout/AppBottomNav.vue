<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  LayoutDashboard, Coffee, Receipt, TrendingUp, Users,
  UserCog, CreditCard, Tag, Printer, User, LogOut, MoreHorizontal,
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const showMore = ref(false)
const isLoggingOut = ref(false)

const allMainItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', route: '/dashboard', permission: 'dashboard' },
  { id: 'product',   icon: Coffee,          label: 'Menu',      route: '/product',   permission: 'produk' },
  { id: 'kasir',     icon: Receipt,         label: 'Kasir',     route: '/kasir',     permission: 'kasir' },
  { id: 'laporan',   icon: TrendingUp,      label: 'Laporan',   route: '/laporan',   permission: 'laporan' },
  { id: 'customer',  icon: Users,           label: 'Customer',  route: '/customer',  permission: 'customer' },
]

const allMoreItems = [
  { id: 'user-management',   icon: UserCog,   label: 'User Management',   route: '/user-management',   permission: 'setting' },
  { id: 'payment-methods',   icon: CreditCard, label: 'Payment Methods',  route: '/payment-methods',   permission: 'setting' },
  { id: 'promo-management',  icon: Tag,        label: 'Promo Management', route: '/promo-management',  permission: 'setting' },
  { id: 'print-layout',      icon: Printer,    label: 'Printer',          route: '/print-layout',      permission: 'printer:read' },
  { id: 'profile',           icon: User,       label: 'Profile',          route: '/profile' },
  { id: 'logout',            icon: LogOut,     label: 'Logout' },
]

const mainItems = computed(() =>
  allMainItems.filter(i => !i.permission || authStore.hasPermission(i.permission))
)

const moreItems = computed(() =>
  allMoreItems.filter(i => !i.permission || authStore.hasPermission(i.permission))
)

const isActive = (routePath?: string) => {
  if (!routePath) return false
  return route.path === routePath || route.path.startsWith(routePath + '/')
}

const hasActiveMore = computed(() =>
  moreItems.value.some(i => i.route && isActive(i.route))
)

const navigate = async (item: any) => {
  if (item.id === 'logout') {
    if (isLoggingOut.value) return
    isLoggingOut.value = true
    showMore.value = false
    try {
      await authStore.logout()
      router.push({ name: 'Login' })
    } finally {
      isLoggingOut.value = false
    }
    return
  }
  if (item.route) {
    router.push(item.route)
    showMore.value = false
  }
}
</script>

<template>
  <!-- Overlay -->
  <transition name="bn-fade">
    <div v-if="showMore" class="more-overlay" @click="showMore = false" />
  </transition>

  <!-- More sheet -->
  <transition name="bn-slide">
    <div v-if="showMore" class="more-sheet">
      <div class="more-handle" />
      <div class="more-items">
        <button
          v-for="item in moreItems"
          :key="item.id"
          class="more-item"
          :class="{
            'more-item--active': item.route && isActive(item.route),
            'more-item--danger': item.id === 'logout',
            'more-item--loading': item.id === 'logout' && isLoggingOut,
          }"
          :disabled="item.id === 'logout' && isLoggingOut"
          @click="navigate(item)"
        >
          <component :is="item.icon" :size="20" class="more-item-icon" />
          <span>{{ item.id === 'logout' && isLoggingOut ? 'Logging out...' : item.label }}</span>
        </button>
      </div>
    </div>
  </transition>

  <!-- Bottom Nav Bar -->
  <nav class="bottom-nav">
    <button
      v-for="item in mainItems"
      :key="item.id"
      class="bottom-nav-item"
      :class="{ 'bottom-nav-item--active': isActive(item.route) }"
      @click="navigate(item)"
    >
      <div class="nav-pill">
        <component :is="item.icon" :size="18" />
      </div>
      <span class="nav-label">{{ item.label }}</span>
    </button>

    <button
      class="bottom-nav-item"
      :class="{ 'bottom-nav-item--active': showMore || hasActiveMore }"
      @click="showMore = !showMore"
    >
      <div class="nav-pill">
        <MoreHorizontal :size="18" />
      </div>
      <span class="nav-label">More</span>
    </button>
  </nav>
</template>

<style scoped>
/* ── Only show at tablet landscape 960–1279px ── */
.bottom-nav,
.more-overlay,
.more-sheet {
  display: none;
}

@media (min-width: 960px) and (max-width: 1279px) {
  /* ── Bottom Nav Bar ── */
  .bottom-nav {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 52px;
    background: #ffffff;
    border-top: 1px solid rgba(123, 47, 190, 0.15);
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
    z-index: 200;
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  /* ── Nav Item ── */
  .bottom-nav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    color: #9ca3af;
    transition: color 0.15s ease;
    -webkit-tap-highlight-color: transparent;
    min-height: 52px;
  }

  .bottom-nav-item:active {
    background: rgba(123, 47, 190, 0.04);
  }

  /* ── Pill (icon container) ── */
  .nav-pill {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 26px;
    border-radius: 13px;
    transition: background 0.15s ease;
  }

  /* ── Label ── */
  .nav-label {
    font-size: 10px;
    font-weight: 500;
    line-height: 1;
    transition: color 0.15s ease;
    white-space: nowrap;
  }

  /* ── Active state ── */
  .bottom-nav-item--active {
    color: #7B2FBE;
  }

  .bottom-nav-item--active .nav-pill {
    background: rgba(123, 47, 190, 0.12);
  }

  .bottom-nav-item--active .nav-label {
    font-weight: 700;
  }

  /* ── More overlay ── */
  .more-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    z-index: 199;
  }

  /* ── More sheet ── */
  .more-sheet {
    display: flex;
    flex-direction: column;
    position: fixed;
    bottom: 52px;
    left: 0;
    right: 0;
    background: #ffffff;
    border-radius: 16px 16px 0 0;
    border-top: 1px solid rgba(123, 47, 190, 0.12);
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
    z-index: 200;
    padding-bottom: 4px;
  }

  .more-handle {
    width: 36px;
    height: 4px;
    background: #e5e7eb;
    border-radius: 2px;
    margin: 10px auto 8px;
    flex-shrink: 0;
  }

  .more-items {
    display: flex;
    flex-wrap: wrap;
    padding: 4px 8px;
    gap: 2px;
  }

  .more-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: calc(50% - 2px);
    padding: 10px 14px;
    border: none;
    background: transparent;
    border-radius: 10px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    color: #374151;
    text-align: left;
    transition: background 0.15s ease, color 0.15s ease;
    -webkit-tap-highlight-color: transparent;
  }

  .more-item:active,
  .more-item--active {
    background: rgba(123, 47, 190, 0.08);
    color: #7B2FBE;
  }

  .more-item--active .more-item-icon {
    color: #7B2FBE;
  }

  .more-item--danger {
    color: #dc2626;
  }

  .more-item--danger:active {
    background: rgba(220, 38, 38, 0.08);
    color: #dc2626;
  }

  .more-item--loading {
    opacity: 0.6;
  }
}

/* ── Transitions ── */
.bn-fade-enter-active,
.bn-fade-leave-active {
  transition: opacity 0.2s ease;
}
.bn-fade-enter-from,
.bn-fade-leave-to {
  opacity: 0;
}

.bn-slide-enter-active,
.bn-slide-leave-active {
  transition: transform 0.2s ease;
}
.bn-slide-enter-from,
.bn-slide-leave-to {
  transform: translateY(100%);
}
</style>
