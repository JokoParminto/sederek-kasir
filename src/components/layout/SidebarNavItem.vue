<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Loader2 } from 'lucide-vue-next'
import type { Component } from 'vue'

interface Props {
  icon: Component
  label: string
  route?: string
  isExpanded: boolean
  isActive?: boolean
  isSubmenu?: boolean
  loading?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false,
  isSubmenu: false,
  loading: false,
  disabled: false,
})

const emit = defineEmits<{
  click: []
}>()

const currentRoute = useRoute()

// Check if this nav item is active
const active = computed(() => {
  if (props.isActive) return true
  if (props.route) {
    return currentRoute.path === props.route || currentRoute.path.startsWith(props.route + '/')
  }
  return false
})

const handleClick = () => {
  emit('click')
}
</script>

<template>
  <router-link v-if="props.route" :to="props.route" custom v-slot="{ navigate, isActive: isRouteActive }">
    <button
      :class="['nav-item', { 'nav-item--active': isRouteActive || active, 'nav-item--submenu': isSubmenu }]"
      @click="navigate"
      :title="label"
    >
      <component :is="icon" class="nav-item__icon" />
      <span v-if="isExpanded" class="nav-item__label">{{ label }}</span>
    </button>
  </router-link>
  <button
    v-else
    :class="['nav-item', { 'nav-item--active': active, 'nav-item--submenu': isSubmenu, 'nav-item--loading': loading }]"
    @click="handleClick"
    :disabled="disabled || loading"
    :title="label"
  >
    <Loader2 v-if="loading" class="nav-item__icon nav-item__icon--spin" />
    <component v-else :is="icon" class="nav-item__icon" />
    <span v-if="isExpanded" class="nav-item__label">{{ loading ? 'Logging out...' : label }}</span>
  </button>
</template>

<style scoped>
.nav-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  width: 100%;
  padding: var(--spacing-3) var(--spacing-4);
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
  text-decoration: none;
  border-radius: 8px;
  font-size: 0.875rem;
  text-align: left;
  white-space: nowrap;
  margin: 0 var(--spacing-2);
  width: calc(100% - var(--spacing-4));
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0);
  position: relative;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.nav-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: transparent;
  transition: background-color 0.2s ease;
  border-radius: 0 2px 2px 0;
}

@media (hover: hover) {
  .nav-item:hover {
    background: rgba(123, 47, 190, 0.1);
    color: var(--color-primary-700);
    border-color: rgba(123, 47, 190, 0.2);
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(123, 47, 190, 0.15);
  }

  .nav-item:hover::before {
    background: var(--color-primary-500);
  }
}

.nav-item--active {
  background: var(--brand-overlay-primary-15);
  color: var(--brand-primary-dark);
  font-weight: 600;
  border-color: var(--brand-overlay-primary-30);
}

.nav-item--active::before {
  background: var(--brand-primary);
}

.nav-item__icon {
  display: block;
  width: 1.1rem;
  height: 1.1rem;
  min-width: 1.1rem;
  flex-shrink: 0;
}

.nav-item__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-item__icon--spin {
  animation: nav-spin 0.8s linear infinite;
}

@keyframes nav-spin {
  to { transform: rotate(360deg); }
}

.nav-item--loading {
  opacity: 0.7;
  cursor: wait;
}

/* When collapsed, center the icon */
.nav-item:has(.nav-item__label:empty) {
  justify-content: center;
  padding: var(--spacing-3);
}

/* Submenu item styling */
.nav-item--submenu {
  padding-left: 2.75rem;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  border: 1px solid transparent;
  border-radius: 6px;
  background: rgba(123, 47, 190, 0.03);
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.nav-item--submenu::before {
  width: 2px;
  left: 0.75rem;
}

.nav-item--submenu .nav-item__icon {
  width: 1rem;
  height: 1rem;
  min-width: 1rem;
}

@media (hover: hover) {
  .nav-item--submenu:hover {
    background: rgba(123, 47, 190, 0.08);
    border-color: rgba(123, 47, 190, 0.2);
    color: var(--color-primary-700);
    transform: translateX(2px);
    box-shadow: 0 2px 6px rgba(123, 47, 190, 0.1);
  }

  .nav-item--submenu:hover::before {
    background: var(--color-primary-400);
  }
}

.nav-item--submenu.nav-item--active {
  border-color: var(--brand-overlay-primary-20);
  background: var(--brand-overlay-primary-10);
  color: var(--brand-primary-dark);
  font-weight: 600;
}

.nav-item--submenu.nav-item--active::before {
  background: var(--brand-primary);
}

/* ========== COLLAPSED STATE ========== */
:global(.sidebar--collapsed) .nav-item {
  width: 44px;
  height: 44px;
  padding: 0;
  margin: 0.2rem auto;
  gap: 0;
  justify-content: center;
  align-items: center;
  border-radius: 10px;
  background: transparent;
  border: 1px solid transparent;
  overflow: hidden;
  position: relative;
  color: var(--color-text-tertiary);
  transform: none;
}

:global(.sidebar--collapsed) .nav-item::before {
  display: none;
}

:global(.sidebar--collapsed) .nav-item__icon {
  width: 1.2rem;
  height: 1.2rem;
  min-width: 1.2rem;
}

:global(.sidebar--collapsed) .nav-item:hover {
  background: var(--brand-overlay-primary-10);
  border-color: var(--brand-overlay-primary-20);
  color: var(--brand-primary);
  transform: none;
  box-shadow: none;
}

:global(.sidebar--collapsed) .nav-item--active {
  background: var(--brand-overlay-primary-15);
  border-color: var(--brand-overlay-primary-30);
  color: var(--brand-primary);
}

:global(.sidebar--collapsed) .nav-item--submenu {
  width: 40px;
  height: 40px;
  padding: 0;
  margin: 0.15rem auto;
  background: transparent;
  border: 1px solid transparent;
  color: var(--color-text-tertiary);
}

:global(.sidebar--collapsed) .nav-item--submenu:hover {
  background: var(--brand-overlay-primary-10);
  border-color: var(--brand-overlay-primary-20);
  color: var(--brand-primary);
}

:global(.sidebar--collapsed) .nav-item--submenu.nav-item--active {
  background: var(--brand-overlay-primary-15);
  border-color: var(--brand-overlay-primary-30);
  color: var(--brand-primary);
}

/* ========== TABLET LANDSCAPE (960–1279px): smaller touch targets ========== */
@media (min-width: 960px) and (max-width: 1279px) {
  :global(.sidebar--collapsed) .nav-item {
    width: 32px;
    height: 32px;
    margin: 0.15rem auto;
    border-radius: 8px;
  }

  :global(.sidebar--collapsed) .nav-item__icon {
    width: 1.05rem;
    height: 1.05rem;
    min-width: 1.05rem;
  }

  :global(.sidebar--collapsed) .nav-item--submenu {
    width: 30px;
    height: 30px;
    margin: 0.1rem auto;
  }
}
</style>
