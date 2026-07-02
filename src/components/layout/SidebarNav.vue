<script setup lang="ts">
interface Props {
  title: string
  isExpanded: boolean
}

defineProps<Props>()
</script>

<template>
  <nav class="sidebar-nav">
    <!-- Expanded: Show title -->
    <div v-if="isExpanded" class="nav-section-title">{{ title }}</div>
    <!-- Collapsed: Show simple divider only -->
    <div v-else class="nav-section-divider-simple"></div>
    <slot />
  </nav>
</template>

<style scoped>
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  padding: var(--spacing-2) 0;
}

.nav-section-title {
  padding: var(--spacing-3) var(--spacing-4) var(--spacing-2) var(--spacing-4);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--brand-primary);
  user-select: none;
  background: var(--brand-overlay-primary-10);
  margin: var(--spacing-2) var(--spacing-2) 0 var(--spacing-2);
  border-left: 2px solid var(--brand-primary);
  padding-left: calc(var(--spacing-4) - 2px);
  border-radius: 0 6px 6px 0;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.nav-section-divider {
  height: 2px;
  background: linear-gradient(90deg, var(--color-primary-200) 0%, transparent 100%);
  margin: var(--spacing-2) var(--spacing-3) var(--spacing-2) var(--spacing-3);
  border-radius: 1px;
  box-shadow: 0 1px 2px rgba(123, 47, 190, 0.1);
}

/* Simple divider for collapsed state */
.nav-section-divider-simple {
  height: 1px;
  background: rgba(123, 47, 190, 0.1);
  margin: var(--spacing-2) var(--spacing-2) var(--spacing-2) var(--spacing-2);
  border-radius: 0;
}
</style>
