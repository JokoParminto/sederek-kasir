<script setup lang="ts">
import { ref } from 'vue'
import type { AppIconName } from '@/utils/icons'

interface Props {
  title: string
  defaultExpanded?: boolean
  icon?: AppIconName | string
}

const props = withDefaults(defineProps<Props>(), {
  defaultExpanded: false
})

const isExpanded = ref(props.defaultExpanded)

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
}
</script>

<template>
  <div class="collapsible-section">
    <!-- Section Header -->
    <button
      class="section-header"
      :class="{ 'is-expanded': isExpanded }"
      @click="toggleExpanded"
    >
      <div class="header-content">
        <span v-if="icon" class="header-icon"><AppIcon :name="icon!" :size="18" /></span>
        <span class="header-title">{{ title }}</span>
      </div>
      <span class="header-toggle">
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          class="toggle-icon"
        >
          <path
            d="M7 8L10 11L13 8"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
    </button>

    <!-- Section Content -->
    <transition
      name="expand"
      @enter="onEnter"
      @leave="onLeave"
    >
      <div v-if="isExpanded" class="section-content">
        <div class="section-body">
          <slot />
        </div>
      </div>
    </transition>
  </div>
</template>

<script lang="ts">
export function onEnter(el: Element) {
  const element = el as HTMLElement
  element.style.height = '0'
  element.offsetHeight // Trigger reflow
  element.style.height = element.scrollHeight + 'px'
}

export function onLeave(el: Element) {
  const element = el as HTMLElement
  element.style.height = element.scrollHeight + 'px'
  element.offsetHeight // Trigger reflow
  element.style.height = '0'
}
</script>

<style scoped>
.collapsible-section {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  background: white;
  margin-bottom: var(--spacing-3);
}

.section-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-3) var(--spacing-4);
  background: var(--color-background-secondary, #f9fafb);
  border: none;
  border-bottom: 1px solid transparent;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: all 0.2s ease;
  min-height: 48px;
  font-family: 'Inter', sans-serif;
}

.section-header:hover {
  background: var(--color-background-secondary, #f3f4f6);
}

.section-header.is-expanded {
  border-bottom: 1px solid var(--color-border);
}

.header-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  text-align: left;
}

.header-icon {
  font-size: 1.25rem;
  display: flex;
  align-items: center;
}

.header-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: 0.5px;
}

.header-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  transition: transform 0.3s ease;
}

.section-header.is-expanded .toggle-icon {
  transform: rotate(180deg);
}

.section-content {
  overflow: hidden;
  background: white;
  transition: height 0.3s ease;
}

.section-body {
  padding: var(--spacing-4);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.expand-enter-active,
.expand-leave-active {
  overflow: hidden;
  transition: height 0.3s ease;
}

.expand-enter-from,
.expand-leave-to {
  height: 0 !important;
}
</style>
