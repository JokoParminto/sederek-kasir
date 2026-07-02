<script setup lang="ts">
import { computed } from 'vue'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'warning' | 'success'
type Size = 'sm' | 'md' | 'lg'

interface Props {
  variant?: Variant
  size?: Size
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  type?: 'button' | 'submit' | 'reset'
}

defineOptions({
  inheritAttrs: false
})

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  loading: false,
  disabled: false,
  fullWidth: false,
  type: 'button'
})

const emit = defineEmits<{
  click: [event: MouseEvent]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
  mousedown: [event: MouseEvent]
  mouseup: [event: MouseEvent]
  keydown: [event: KeyboardEvent]
  keyup: [event: KeyboardEvent]
}>()

const isDisabled = computed(() => props.disabled || props.loading)

const classes = computed(() => [
  'base-button',
  `base-button--${props.variant}`,
  `base-button--${props.size}`,
  { 'is-loading': props.loading, 'is-full': props.fullWidth }
])
</script>

<template>
  <button
    :type="type"
    :class="classes"
    :disabled="isDisabled"
    @click="emit('click', $event)"
    @focus="emit('focus', $event)"
    @blur="emit('blur', $event)"
    @mousedown="emit('mousedown', $event)"
    @mouseup="emit('mouseup', $event)"
    @keydown="emit('keydown', $event)"
    @keyup="emit('keyup', $event)"
    v-bind="$attrs"
  >
    <span v-if="$slots.prefix" class="base-button__icon base-button__icon--prefix">
      <slot name="prefix" />
    </span>
    <span class="base-button__label">
      <slot />
    </span>
    <span v-if="$slots.suffix" class="base-button__icon base-button__icon--suffix">
      <slot name="suffix" />
    </span>
    <span v-if="loading" class="base-button__spinner" aria-hidden="true"></span>
  </button>
</template>

<style scoped>
.base-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: var(--font-size-base);
  line-height: var(--line-height-normal);
  min-height: 44px;
  padding: 0.75rem 1.6rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--color-text-primary);
  background: var(--color-surface-0);
  letter-spacing: 0.3px;
}

.base-button.is-full {
  width: 100%;
}

.base-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.base-button:focus-visible {
  outline: 2px solid rgba(123, 47, 190, 0.5);
  outline-offset: 3px;
}

.base-button__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.base-button__label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.base-button__spinner {
  position: absolute;
  right: 12px;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.base-button--sm {
  padding: 0.5rem 1rem;
  font-size: var(--font-size-sm);
  min-height: 36px;
}

.base-button--lg {
  padding: 0.85rem 1.8rem;
  font-size: var(--font-size-lg);
  min-height: 52px;
}

.base-button--primary {
  color: white;
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  box-shadow: 0 4px 14px rgba(123, 47, 190, 0.3);
  font-weight: 700;
  letter-spacing: 0.4px;
}

.base-button--primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(123, 47, 190, 0.4);
  background: linear-gradient(135deg, var(--brand-primary-dark) 0%, var(--brand-primary-darker) 100%);
}

.base-button--primary:active:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(123, 47, 190, 0.3);
}

.base-button--secondary {
  background: rgba(255, 255, 255, 0.8);
  border: 1.5px solid rgba(123, 47, 190, 0.2);
  color: var(--color-text-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.base-button--secondary:hover:not(:disabled) {
  border-color: rgba(123, 47, 190, 0.4);
  box-shadow: 0 4px 12px rgba(123, 47, 190, 0.12);
  background: rgba(255, 255, 255, 0.95);
  transform: translateY(-1px);
}

.base-button--ghost {
  background: transparent;
  color: var(--color-text-primary);
}

.base-button--ghost:hover:not(:disabled) {
  background: rgba(123, 47, 190, 0.08);
}

.base-button--danger {
  color: #fff;
  background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.24);
}

.base-button--warning {
  color: #78350f;
  background: linear-gradient(135deg, #fde68a 0%, #f59e0b 100%);
}

.base-button--success {
  color: #064e3b;
  background: linear-gradient(135deg, #d1fae5 0%, #a78bfa 100%);
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
