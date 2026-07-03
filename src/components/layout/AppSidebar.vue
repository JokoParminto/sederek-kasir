<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import SidebarNav from './SidebarNav.vue'
import SidebarNavItem from './SidebarNavItem.vue'
import { brand } from '@/config/brand'
import {
  LayoutDashboard,
  Coffee,
  Receipt,
  TrendingUp,
  User,
  Users,
  UserCog,
  CreditCard,
  Tag,
  Printer,
  LogOut,
  CircleUser,
  BadgeCheck,
} from 'lucide-vue-next'

interface Props {
  showDrawer?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showDrawer: false
})

const emit = defineEmits<{
  'update:showDrawer': [value: boolean]
}>()

const router = useRouter()
const authStore = useAuthStore()
const isLoggingOut = ref(false)

// Sync showDrawer from parent
const localShowDrawer = computed(() => props.showDrawer)

onMounted(() => {
  // ensure light mode — remove any previously saved dark mode class
  document.documentElement.classList.remove('dark-mode')
  localStorage.removeItem('app-dark-mode')
})

// All available navigation items with permission requirements
const allNavItems = [
  // MAIN section
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', route: '/dashboard', section: 'main', permission: 'dashboard' },
  { id: 'product', icon: Coffee, label: 'Menu', route: '/product', section: 'main', permission: 'produk' },
  { id: 'kasir', icon: Receipt, label: 'Kasir', route: '/kasir', section: 'main', permission: 'kasir' },
  { id: 'laporan', icon: TrendingUp, label: 'Transaksi', route: '/laporan', section: 'main', permission: 'laporan' },
  { id: 'customer', icon: Users, label: 'Customer', route: '/customer', section: 'main', permission: 'customer' },

  // SETTINGS section
  { id: 'user-management', icon: UserCog, label: 'User Management', route: '/user-management', section: 'settings', permission: 'setting' },
  { id: 'member-tier', icon: BadgeCheck, label: 'Member Tier', route: '/member-tier', section: 'settings', permission: 'setting' },
  { id: 'payment-methods', icon: CreditCard, label: 'Payment Methods', route: '/payment-methods', section: 'settings', permission: 'setting' },
  { id: 'promo-management', icon: Tag, label: 'Promo Management', route: '/promo-management', section: 'settings', permission: 'setting' },
  { id: 'print-layout', icon: Printer, label: 'Printer Management', route: '/print-layout', section: 'settings', permission: 'printer:read' },

  // ACCOUNT section
  { id: 'profile', icon: User, label: 'Profile', route: '/profile', section: 'account' },
  { id: 'logout', icon: LogOut, label: 'Log out', section: 'account' },
]

// Filter navigation items based on user permissions
const navItems = computed(() => {
  return allNavItems.filter((item) => {
    // Items without permission requirement are always visible
    if (!item.permission) return true

    // Check if user has required permission
    return authStore.hasPermission(item.permission)
  })
})

// Group items by section
const navSections = computed(() => {
  const grouped: Record<string, any[]> = {}
  navItems.value.forEach(item => {
    const section = item.section || 'main'
    if (!grouped[section]) {
      grouped[section] = []
    }
    grouped[section].push(item)
  })
  return grouped
})

// Get section titles based on role
const sectionTitles = computed(() => {
  const userRole = authStore.userRole
  if (userRole === 'kasir') {
    return { pos: 'POS', data: 'DATA', account: 'ACCOUNT' }
  }
  return { main: 'MAIN', settings: 'SETTINGS', account: 'ACCOUNT' }
})

// Handle navigation
const handleNavClick = async (item: any) => {
  if (item.id === 'logout') {
    if (isLoggingOut.value) return
    isLoggingOut.value = true
    try {
      await authStore.logout()
    } finally {
      isLoggingOut.value = false
      router.push({ name: 'Login' })
    }
  }
}

const handleDrawerOverlayClick = () => {
  emit('update:showDrawer', false)
}

const handleNavItemClick = () => {
  // Close drawer on mobile when navigating (< 768px)
  if (window.innerWidth < 768) {
    emit('update:showDrawer', false)
  }
}

// Auto-collapse sidebar at tablet landscape (768–1279px)
const autoCollapseTablet = () => {
  const w = window.innerWidth
  if (w >= 768 && w < 1280 && authStore.sidebarExpanded) {
    authStore.toggleSidebar()
  }
}

// Watch screen resize
const handleResize = () => {
  const w = window.innerWidth
  if (w >= 768) emit('update:showDrawer', false)
  autoCollapseTablet()
}

onMounted(() => {
  autoCollapseTablet()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="app-sidebar">
    <!-- Desktop/Tablet Sidebar -->
    <aside :class="['sidebar', { 'sidebar--collapsed': !authStore.sidebarExpanded }]">
       <!-- Header -->
       <div class="sidebar-header">
         <div class="sidebar-logo">
           <img :src="brand.logoSmPath" :alt="brand.name" class="logo-image" />
           <span v-if="authStore.sidebarExpanded" class="logo-text">{{ brand.name }}</span>
         </div>
         <div class="header-buttons">
           <!-- Collapse/Expand Button -->
           <button
             class="toggle-btn"
             @click="authStore.toggleSidebar"
             :title="authStore.sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'"
             aria-label="Toggle sidebar"
           >
             <span v-if="authStore.sidebarExpanded">−</span>
             <span v-else>☰</span>
           </button>
         </div>
       </div>

      <!-- Navigation -->
      <nav class="sidebar-nav-container">
        <!-- Dynamically render sections -->
        <template
          v-for="(sectionKey, index) in Object.keys(navSections)"
          :key="sectionKey"
        >
           <SidebarNav
             :title="sectionTitles[sectionKey as keyof typeof sectionTitles] || sectionKey.toUpperCase()"
             :isExpanded="authStore.sidebarExpanded"
           >
              <SidebarNavItem
                v-for="item in navSections[sectionKey]"
                :key="item.id"
                :icon="item.icon"
                :label="item.label"
                :route="item.route"
                :is-expanded="authStore.sidebarExpanded"
                :is-submenu="false"
                :loading="item.id === 'logout' && isLoggingOut"
                :disabled="item.id === 'logout' && isLoggingOut"
                @click="handleNavClick(item)"
              />
           </SidebarNav>
        </template>
      </nav>

       <!-- User Info at Bottom — auto-hide when collapsed, full when expanded -->
       <Transition name="footer-slide">
         <div v-if="authStore.sidebarExpanded" class="sidebar-footer">
           <div class="user-info" :title="authStore.user?.full_name || 'User'">
             <CircleUser class="user-icon" />
             <div class="user-details">
               <div class="user-name">{{ authStore.user?.full_name || 'User' }}</div>
               <div class="user-role">
                 {{ authStore.userRole === 'owner' ? 'Owner' : authStore.userRole === 'admin' ? 'Admin' : 'Kasir' }}
               </div>
             </div>
           </div>
         </div>
       </Transition>
    </aside>

    <!-- Mobile Drawer Overlay (visible on small screens) -->
    <transition name="drawer-fade">
      <div
        v-if="localShowDrawer"
        class="drawer-overlay"
        @click="handleDrawerOverlayClick"
      ></div>
    </transition>

    <!-- Mobile Drawer Sidebar (slides from left) -->
    <transition name="drawer-slide">
      <aside
        v-if="localShowDrawer"
        class="sidebar-drawer"
      >
        <!-- Header -->
        <div class="sidebar-header">
          <div class="sidebar-logo">
            <img :src="brand.logoSmPath" :alt="brand.name" class="logo-image" />
            <span class="logo-text">{{ brand.name }}</span>
          </div>
          <button
            class="close-btn"
            @click="emit('update:showDrawer', false)"
            aria-label="Close sidebar"
          >
            <AppIcon name="x" :size="18" />
          </button>
        </div>

        <!-- Navigation -->
        <nav class="sidebar-nav-container">
          <template
            v-for="(sectionKey, index) in Object.keys(navSections)"
            :key="sectionKey"
          >
             <SidebarNav
               :title="sectionTitles[sectionKey as keyof typeof sectionTitles] || sectionKey.toUpperCase()"
               :isExpanded="true"
             >
               <SidebarNavItem
                 v-for="item in navSections[sectionKey]"
                 :key="item.id"
                 :icon="item.icon"
                 :label="item.label"
                 :route="item.route"
                 :is-expanded="true"
                 :is-submenu="false"
                 :loading="item.id === 'logout' && isLoggingOut"
                 :disabled="item.id === 'logout' && isLoggingOut"
                 @click="handleNavItemClick(); handleNavClick(item)"
               />
             </SidebarNav>
           </template>
         </nav>

         <!-- User Info at Bottom -->
         <div class="sidebar-footer">
          <div class="user-info">
            <CircleUser class="user-icon" />
            <div class="user-details">
              <div class="user-name">{{ authStore.user?.full_name || 'User' }}</div>
               <div class="user-role">
                 {{ authStore.userRole === 'owner' ? 'Owner' : authStore.userRole === 'admin' ? 'Admin' : 'Kasir' }}
               </div>
            </div>
          </div>
        </div>
      </aside>
    </transition>
  </div>
</template>

<style scoped>
.app-sidebar {
  position: relative;
}

/* ========== DESKTOP/TABLET SIDEBAR ========== */
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  height: 100dvh;
  width: var(--spacing-sidebar);
  padding-top: env(safe-area-inset-top, 0px);
  background: #ffffff;
  border-right: 1px solid var(--brand-overlay-primary-15);
  display: flex;
  flex-direction: column;
  transition: width 0.2s ease;
  z-index: 100;
  overflow: hidden;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.06);

  /* Hide on mobile (< 768px) — drawer handles those */
  @media (max-width: 767px) {
    display: none;
  }
}

.sidebar--collapsed {
  width: var(--spacing-sidebar-collapsed);
}

/* Collapsed header: hide logo, center toggle button, reduce padding */
.sidebar--collapsed .sidebar-header {
  justify-content: center;
  padding: var(--spacing-3);
}
.sidebar--collapsed .sidebar-logo {
  display: none;
}

/* ========== SIDEBAR HEADER ========== */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-4);
  background: var(--brand-primary-pale);
  border-bottom: 1px solid rgba(123, 47, 190, 0.15);
  gap: var(--spacing-3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  border-radius: 0 0 12px 12px;
  position: relative;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  min-width: 0;
  flex: 1;
}

.logo-image {
  height: 32px;
  width: 32px;
  object-fit: contain;
  flex-shrink: 0;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: high-quality;
}

.logo-text {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--color-primary-700);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-buttons {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  flex-shrink: 0;
}

.toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  border: 1px solid rgba(123, 47, 190, 0.2);
  background: linear-gradient(135deg, rgba(123, 47, 190, 0.1) 0%, rgba(123, 47, 190, 0.03) 100%);
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
  font-size: 1rem;
  flex-shrink: 0;
  color: var(--color-primary-700);
  font-weight: 600;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.toggle-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(123, 47, 190, 0.2);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.toggle-btn:active::before {
  width: 100%;
  height: 100%;
}

@media (hover: hover) {
  .toggle-btn:hover {
    background: linear-gradient(135deg, rgba(123, 47, 190, 0.15) 0%, rgba(123, 47, 190, 0.08) 100%);
    box-shadow: 0 8px 16px rgba(123, 47, 190, 0.2);
    transform: scale(1.05);
    border-color: rgba(123, 47, 190, 0.3);
  }
}

/* ========== SIDEBAR NAVIGATION ========== */
.sidebar-nav-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--spacing-2) var(--spacing-2);
  touch-action: pan-y;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

/* ========== SIDEBAR FOOTER ========== */
.sidebar-footer {
  border-top: 1px solid rgba(123, 47, 190, 0.2);
  padding: var(--spacing-4);
  background: rgba(123, 47, 190, 0.03);
  border-radius: 12px 12px 0 0;
  position: relative;
}

.user-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3);
  background: linear-gradient(135deg, rgba(123, 47, 190, 0.1) 0%, rgba(123, 47, 190, 0.03) 100%);
  border-radius: 10px;
  border: 1px solid rgba(123, 47, 190, 0.25);
  box-shadow: 0 2px 8px rgba(123, 47, 190, 0.1);
  transition: background-color 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  cursor: default;
}

@media (hover: hover) {
  .user-info:hover {
    background: linear-gradient(135deg, rgba(123, 47, 190, 0.12) 0%, rgba(123, 47, 190, 0.06) 100%);
    box-shadow: 0 4px 12px rgba(123, 47, 190, 0.15);
    border-color: rgba(123, 47, 190, 0.35);
  }
}

.user-icon {
  width: 1.4rem;
  height: 1.4rem;
  min-width: 1.4rem;
  flex-shrink: 0;
  color: var(--brand-primary);
}

.user-details {
  min-width: 0;
  flex: 1;
}

.user-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-primary-700);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-role {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.user-info-collapsed {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ========== MOBILE DRAWER ========== */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 99;
}

.sidebar-drawer {
  position: fixed;
  left: 0;
  top: 0;
  height: 100dvh;
  width: min(80vw, 300px);
  background: #ffffff;
  border-right: 1px solid rgba(123, 47, 190, 0.12);
  display: flex;
  flex-direction: column;
  z-index: 101;
  box-shadow: 4px 0 16px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;

  /* Show only on screens < 768px (mobile) */
  @media (min-width: 768px) {
    display: none;
  }

  /* Safe area on notched devices */
  @supports (padding: max(0px)) {
    padding-top: max(0px, env(safe-area-inset-top));
  }
}

/* ========== TRANSITIONS ========== */
.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity var(--transition-duration-medium) var(--transition-standard);
  will-change: opacity;
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform var(--transition-duration-medium) var(--transition-standard);
  will-change: transform;
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(-100%);
}

/* ========== SCROLLBAR STYLING ========== */
.sidebar-nav-container::-webkit-scrollbar,
.sidebar-drawer .sidebar-nav-container::-webkit-scrollbar {
  width: 6px;
}

.sidebar-nav-container::-webkit-scrollbar-track,
.sidebar-drawer .sidebar-nav-container::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-nav-container::-webkit-scrollbar-thumb,
.sidebar-drawer .sidebar-nav-container::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}

.sidebar-nav-container::-webkit-scrollbar-thumb:hover,
.sidebar-drawer .sidebar-nav-container::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-secondary);
}

/* ========== TABLET LANDSCAPE (768–1279px): compact icon-only sidebar ========== */
@media (min-width: 768px) and (max-width: 1279px) {
  .sidebar--collapsed {
    width: var(--spacing-sidebar-tablet);
  }

  .sidebar--collapsed .sidebar-header {
    padding: 0.4rem 0.3rem;
    gap: 0.3rem;
  }

  .sidebar--collapsed .logo-image {
    width: 22px;
    height: 22px;
  }

  .sidebar--collapsed .toggle-btn {
    width: 22px;
    height: 22px;
    font-size: 0.7rem;
  }

  .sidebar--collapsed .sidebar-nav-container {
    padding: 0.15rem 0;
  }

}

/* ========== COLLAPSED STATE CSS ========== */

/* Main sidebar collapsed */
.sidebar--collapsed {
  box-shadow: 1px 0 4px rgba(0, 0, 0, 0.06);
  border-right: 1px solid rgba(123, 47, 190, 0.08);
}

/* Header collapsed */
.sidebar--collapsed .sidebar-header {
  padding: 0.5rem;
  flex-direction: column;
  gap: 0.4rem;
  border-radius: 0 0 8px 8px;
  justify-content: center;
  align-items: center;
}

.sidebar--collapsed .sidebar-logo {
  width: 100%;
  justify-content: center;
}

.sidebar--collapsed .logo-text {
  display: none;
}

.sidebar--collapsed .logo-image {
  width: 28px;
  height: 28px;
  border-radius: 50%;
}

.sidebar--collapsed .header-buttons {
  width: 100%;
  justify-content: center;
  gap: 0.3rem;
}

.sidebar--collapsed .toggle-btn {
  width: 28px;
  height: 28px;
  min-width: unset;
  flex-shrink: 0;
  font-size: 0.8rem;
}

/* Navigation container collapsed */
.sidebar--collapsed .sidebar-nav-container {
  padding: 0.25rem 0;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Footer transition */
.footer-slide-enter-active {
  transition: opacity 0.2s ease 0.1s, transform 0.2s ease 0.1s;
  will-change: opacity, transform;
}
.footer-slide-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
  will-change: opacity, transform;
}
.footer-slide-enter-from,
.footer-slide-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

/* Mobile drawer collapsed (same as sidebar) */
.sidebar-drawer.sidebar--collapsed {
  max-width: 70px;
  width: 70px;
}

.sidebar-drawer.sidebar--collapsed .sidebar-header {
  padding: 0.75rem;
  flex-direction: column;
  gap: 0.5rem;
}

.sidebar-drawer.sidebar--collapsed .sidebar-logo {
  width: 100%;
  justify-content: center;
}

.sidebar-drawer.sidebar--collapsed .logo-text {
  display: none;
}

.sidebar-drawer.sidebar--collapsed .toggle-btn {
  width: 100%;
}

/* ========== DARK MODE STYLING ========== */
html.dark-mode .sidebar {
  background: rgba(21, 0, 48, 0.98);
  border-right-color: var(--brand-overlay-primary-10);
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.3), 2px 0 8px rgba(0, 0, 0, 0.2);
}

html.dark-mode .sidebar-header {
  background: linear-gradient(135deg, var(--brand-bg-dark) 0%, rgba(26, 10, 46, 0.95) 100%);
  border-bottom-color: var(--brand-overlay-primary-15);
}

html.dark-mode .logo-text {
  color: var(--brand-primary-light);
}

html.dark-mode .toggle-btn {
  border-color: var(--brand-overlay-primary-15);
  background: var(--brand-overlay-primary-10);
  color: var(--brand-primary-light);
}

html.dark-mode .toggle-btn:hover {
  background: var(--brand-overlay-primary-20);
  box-shadow: var(--brand-shadow-primary);
  border-color: var(--brand-overlay-primary-30);
}

html.dark-mode .sidebar-nav-container {
  background: transparent;
}

html.dark-mode .sidebar-footer {
  border-top-color: var(--brand-overlay-primary-15);
  background: var(--brand-overlay-primary-10);
}

html.dark-mode .user-info {
  background: var(--brand-overlay-primary-10);
  border-color: var(--brand-overlay-primary-20);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

html.dark-mode .user-info:hover {
  background: var(--brand-overlay-primary-20);
  box-shadow: var(--brand-shadow-primary);
  border-color: var(--brand-overlay-primary-30);
}

html.dark-mode .user-name {
  color: var(--brand-primary-light);
}

html.dark-mode .sidebar-drawer {
  background: rgba(21, 0, 48, 0.98);
  border-right-color: var(--brand-overlay-primary-10);
  box-shadow: 8px 0 32px rgba(0, 0, 0, 0.4), 4px 0 16px rgba(0, 0, 0, 0.2);
}

html.dark-mode .sidebar--collapsed .user-info:hover {
  background: var(--brand-overlay-primary-15);
  border-color: var(--brand-overlay-primary-20);
}
</style>
