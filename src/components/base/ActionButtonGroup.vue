<script setup lang="ts">
import { computed } from 'vue'

interface Action {
  id?: string
  label: string
  icon: string
  variant?: 'primary' | 'danger' | 'warning' | 'ghost'
  disabled?: boolean
}

interface Props {
  actions: Action[]
  layout?: 'horizontal' | 'vertical'
  size?: 'sm' | 'md'
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  layout: 'horizontal',
  size: 'md',
  compact: false
})

const emit = defineEmits<{
  action: [actionId: string | number]
}>()

const classes = computed(() => [
  'action-group',
  `action-group--${props.layout}`,
  `action-group--${props.size}`,
  { 'is-compact': props.compact }
])

const handleAction = (action: Action) => {
  emit('action', action.id || action.label)
}

const getButtonClasses = (variant?: string) => [
  'action-btn',
  `action-btn--${variant || 'ghost'}`
]
</script>

<template>
  <div :class="classes">
    <button
      v-for="(action, idx) in actions"
      :key="action.id || idx"
      type="button"
      :class="getButtonClasses(action.variant)"
      :disabled="action.disabled"
      :title="action.label"
      @click="handleAction(action)"
    >
      <span class="action-btn__icon">{{ action.icon }}</span>
      <span v-if="!compact" class="action-btn__label">{{ action.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.action-group {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
}

.action-group--vertical {
  flex-direction: column;
}

.action-group.is-compact {
  gap: var(--spacing-1);
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-1);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: transparent;
  cursor: pointer;
  transition: var(--transition-base);
  font-weight: 600;
  white-space: nowrap;
}

.action-group--sm .action-btn {
  padding: 0.4rem 0.7rem;
  font-size: var(--font-size-xs);
  min-height: 32px;
}

.action-group--md .action-btn {
  padding: 0.5rem 0.9rem;
  font-size: var(--font-size-sm);
  min-height: 40px;
}

.action-group.is-compact .action-btn {
  padding: 0.3rem 0.5rem;
  min-height: 28px;
}

.action-btn__icon {
  display: inline-flex;
  font-size: 1.1em;
}

.action-btn--ghost {
  color: var(--color-text-secondary);
}

.action-btn--ghost:hover:not(:disabled) {
  background: rgba(123, 47, 190, 0.08);
  color: var(--color-primary-700);
}

.action-btn--primary {
  color: var(--color-primary-700);
  background: rgba(123, 47, 190, 0.1);
  border-color: rgba(123, 47, 190, 0.2);
}

.action-btn--primary:hover:not(:disabled) {
  background: rgba(123, 47, 190, 0.15);
  border-color: rgba(123, 47, 190, 0.3);
}

.action-btn--danger {
  color: #991b1b;
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.2);
}

.action-btn--danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
}

.action-btn--warning {
  color: #92400e;
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.2);
}

.action-btn--warning:hover:not(:disabled) {
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.3);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-btn:focus-visible {
  outline: 2px solid rgba(123, 47, 190, 0.4);
  outline-offset: 1px;
}
</style>
