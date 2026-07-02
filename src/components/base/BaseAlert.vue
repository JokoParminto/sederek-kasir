<script setup lang="ts">
import { computed } from 'vue'
import type { AppIconName } from '@/utils/icons'

type AlertType = 'success' | 'error' | 'warning' | 'info'

interface Props {
  type?: AlertType
  title?: string
  description?: string
  icon?: AppIconName
  closable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  title: '',
  description: '',
  closable: true
})

const emit = defineEmits<{
  close: []
}>()

const classes = computed(() => [
  'base-alert',
  `base-alert--${props.type}`
])

const defaultIconMap: Record<AlertType, AppIconName> = {
  success: 'check-circle',
  error: 'warning',
  warning: 'warning',
  info: 'info',
}

const displayIcon = computed((): AppIconName => props.icon ?? defaultIconMap[props.type])
</script>

<template>
  <div :class="classes" role="alert" :aria-label="`${type} alert: ${title || description}`">
    <!-- Icon -->
    <div class="base-alert__icon" aria-hidden="true">
      <AppIcon :name="displayIcon" :size="18" />
    </div>

    <!-- Content -->
    <div class="base-alert__content">
      <h3 v-if="title" class="base-alert__title">{{ title }}</h3>
      <p v-if="description" class="base-alert__description">{{ description }}</p>
      <slot />
    </div>

    <!-- Close Button -->
    <button
      v-if="closable"
      type="button"
      class="base-alert__close"
      aria-label="Close alert"
      @click="emit('close')"
    >
      <AppIcon name="x" :size="16" />
    </button>
  </div>
</template>

<style scoped>
.base-alert {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  border-radius: var(--radius-md);
  border-left: 4px solid;
  animation: slideDown 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
}

.base-alert__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
}

.base-alert__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.base-alert__title {
  font-size: 0.9rem;
  font-weight: 700;
  margin: 0;
  line-height: 1.4;
}

.base-alert__description {
  font-size: 0.85rem;
  font-weight: 500;
  margin: 0;
  line-height: 1.4;
  opacity: 0.9;
}

.base-alert__close {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0;
  opacity: 0.6;
  transition: opacity 0.2s ease;
  min-width: 24px;
  min-height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  flex-shrink: 0;
  margin-left: auto;
}

.base-alert__close:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.08);
}

.base-alert__close:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

/* Variants */
.base-alert--success {
  background: #ecfdf5;
  border-left-color: var(--brand-primary);
  color: #065f46;
}

.base-alert--error {
  background: #fef2f2;
  border-left-color: #ef4444;
  color: #7f1d1d;
}

.base-alert--warning {
  background: #fffbeb;
  border-left-color: #f59e0b;
  color: #78350f;
}

.base-alert--info {
  background: #eff6ff;
  border-left-color: #3b82f6;
  color: #1e3a8a;
}

/* Animations */
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive */
@media (max-width: 640px) {
  .base-alert {
    padding: 0.875rem;
    gap: 0.875rem;
  }

  .base-alert__title {
    font-size: 0.85rem;
  }

  .base-alert__description {
    font-size: 0.8rem;
  }

  .base-alert__icon {
    font-size: 1.1rem;
  }

  .base-alert__close {
    font-size: 1rem;
    min-width: 20px;
    min-height: 20px;
  }
}
</style>
