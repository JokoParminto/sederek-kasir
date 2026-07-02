<script setup lang="ts">
import { computed } from 'vue'

type Variant = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

interface Props {
  status: string
  label?: string
  variant?: Variant
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  variant: 'neutral'
})

const labelText = computed(() => props.label || props.status)

const classes = computed(() => [
  'status-badge',
  `status-badge--${props.variant}`
])
</script>

<template>
  <span :class="classes">{{ labelText }}</span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  font-size: var(--font-size-xs);
  font-weight: 600;
  border: 1px solid transparent;
}

.status-badge--neutral {
  background: rgba(107, 114, 128, 0.12);
  color: #374151;
  border-color: rgba(107, 114, 128, 0.2);
}

.status-badge--success {
  background: rgba(34, 197, 94, 0.15);
  color: #166534;
  border-color: rgba(34, 197, 94, 0.25);
}

.status-badge--warning {
  background: rgba(245, 158, 11, 0.16);
  color: #92400e;
  border-color: rgba(245, 158, 11, 0.25);
}

.status-badge--danger {
  background: rgba(239, 68, 68, 0.15);
  color: #991b1b;
  border-color: rgba(239, 68, 68, 0.25);
}

.status-badge--info {
  background: rgba(59, 130, 246, 0.15);
  color: #1e40af;
  border-color: rgba(59, 130, 246, 0.25);
}
</style>
