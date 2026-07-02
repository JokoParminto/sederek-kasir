<script setup lang="ts">
import { computed } from 'vue'

type Variant = 'primary' | 'neutral' | 'success' | 'warning' | 'danger' | 'info'
type Size = 'sm' | 'md'

interface Props {
  variant?: Variant
  size?: Size
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'neutral',
  size: 'md'
})

const classes = computed(() => [
  'base-badge',
  `base-badge--${props.variant}`,
  `base-badge--${props.size}`
])
</script>

<template>
  <span :class="classes">
    <slot />
  </span>
</template>

<style scoped>
.base-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  border-radius: 999px;
  font-weight: 600;
  border: 1px solid transparent;
  white-space: nowrap;
}

.base-badge--sm {
  font-size: var(--font-size-xs);
  padding: 0.15rem 0.55rem;
}

.base-badge--md {
  font-size: var(--font-size-sm);
  padding: 0.25rem 0.7rem;
}

.base-badge--neutral {
  background: rgba(107, 114, 128, 0.12);
  color: #374151;
  border-color: rgba(107, 114, 128, 0.2);
}

.base-badge--primary {
  background: rgba(123, 47, 190, 0.15);
  color: var(--color-primary-700);
  border-color: rgba(123, 47, 190, 0.25);
}

.base-badge--success {
  background: rgba(34, 197, 94, 0.15);
  color: #166534;
  border-color: rgba(34, 197, 94, 0.25);
}

.base-badge--warning {
  background: rgba(245, 158, 11, 0.16);
  color: #92400e;
  border-color: rgba(245, 158, 11, 0.25);
}

.base-badge--danger {
  background: rgba(239, 68, 68, 0.15);
  color: #991b1b;
  border-color: rgba(239, 68, 68, 0.25);
}

.base-badge--info {
  background: rgba(59, 130, 246, 0.15);
  color: #1e40af;
  border-color: rgba(59, 130, 246, 0.25);
}
</style>
