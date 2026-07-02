<script setup lang="ts">
import { computed } from 'vue'
import { IconConfig, type ActionIconKey, getActionIcon, getActionLabel } from '@/utils/tableActionIcons'

interface Props {
  action: ActionIconKey
  variant?: 'default' | 'danger'
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  disabled: false,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const IconComponent = computed(() => getActionIcon(props.action))
const ariaLabel = computed(() => getActionLabel(props.action))

const buttonClass = computed(() => [
  'action-button',
  `action-button--${props.variant}`,
  { 'is-disabled': props.disabled }
])

const handleClick = (event: MouseEvent) => {
  if (!props.disabled) {
    emit('click', event)
  }
}
</script>

<template>
  <button
    :class="buttonClass"
    :disabled="disabled"
    :aria-label="ariaLabel"
    type="button"
    @click="handleClick"
  >
    <component
      :is="IconComponent"
      :stroke-width="IconConfig.strokeWidth"
      :size="IconConfig.size"
      aria-hidden="true"
    />
  </button>
</template>

<style scoped>
.action-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  color: var(--color-text-secondary, #6b7280);
  transition: all 0.2s ease-in-out;

  /* Remove any default button styles */
  outline: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;

  /* Accessibility focus */
  &:focus-visible {
    outline: 2px solid rgba(123, 47, 190, 0.4);
    outline-offset: 2px;
  }

  /* Hover state */
  &:hover:not(:disabled) {
    color: var(--color-primary-500, var(--brand-primary));
    background: rgba(123, 47, 190, 0.08);
    transform: scale(1.1);
  }

  /* Active state */
  &:active:not(:disabled) {
    transform: scale(1.05);
  }

  /* Disabled state */
  &:disabled,
  &.is-disabled {
    cursor: not-allowed;
    opacity: 0.5;
    color: var(--color-text-disabled, #d1d5db);
  }
}

/* Danger variant for delete actions */
.action-button--danger {
  &:hover:not(:disabled) {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.08);
    animation: shake 0.4s ease-in-out;
  }
}

/* Default variant - standard colors */
.action-button--default {
  &:hover:not(:disabled) {
    color: var(--color-primary-500, var(--brand-primary));
    background: rgba(123, 47, 190, 0.08);
    transform: scale(1.1) translateY(-1px);
  }
}

/* Shake animation for delete button */
@keyframes shake {
  0% {
    transform: scale(1.1) rotate(0deg);
  }
  25% {
    transform: scale(1.1) rotate(-3deg);
  }
  75% {
    transform: scale(1.1) rotate(3deg);
  }
  100% {
    transform: scale(1.1) rotate(0deg);
  }
}

/* Smooth transitions for all properties */
.action-button {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
