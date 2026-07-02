<script setup lang="ts">
import { computed } from 'vue'
import { PencilIcon, TrashIcon } from '@heroicons/vue/20/solid'

interface Props {
  itemId: string | number
  size?: 'sm' | 'md' | 'lg'
  layout?: 'horizontal' | 'vertical'
  showLabels?: boolean
  editEnabled?: boolean
  deleteEnabled?: boolean
  editVariant?: 'primary' | 'secondary'
  deleteVariant?: 'danger' | 'warning'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  layout: 'horizontal',
  showLabels: false,
  editEnabled: true,
  deleteEnabled: true,
  editVariant: 'primary',
  deleteVariant: 'danger'
})

const emit = defineEmits<{
  edit: [itemId: string | number]
  delete: [itemId: string | number]
}>()

const classes = computed(() => [
  'table-actions',
  `table-actions--${props.layout}`,
  `table-actions--${props.size}`
])

const getButtonClasses = (variant: string) => [
  'action-button',
  `action-button--${variant}`
]

const handleEdit = () => {
  emit('edit', props.itemId)
}

const handleDelete = () => {
  emit('delete', props.itemId)
}
</script>

<template>
  <div :class="classes">
    <!-- Edit Button -->
    <button
      v-if="editEnabled"
      type="button"
      :class="getButtonClasses(editVariant)"
      @click="handleEdit"
      title="Edit"
      aria-label="Edit item"
    >
      <PencilIcon class="action-icon" />
      <span v-if="showLabels" class="action-label">Edit</span>
    </button>

    <!-- Delete Button -->
    <button
      v-if="deleteEnabled"
      type="button"
      :class="getButtonClasses(deleteVariant)"
      @click="handleDelete"
      title="Delete"
      aria-label="Delete item"
    >
      <TrashIcon class="action-icon" />
      <span v-if="showLabels" class="action-label">Delete</span>
    </button>

    <!-- Slot for additional actions -->
    <slot />
  </div>
</template>

<style scoped>
.table-actions {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
}

.table-actions--vertical {
  flex-direction: column;
}

/* Size variants */
.table-actions--sm .action-button {
  width: 32px;
  height: 32px;
  padding: 0.4rem;
}

.table-actions--md .action-button {
  width: 40px;
  height: 40px;
  padding: 0.5rem;
}

.table-actions--lg .action-button {
  width: 48px;
  height: 48px;
  padding: 0.6rem;
}

/* Button base styles */
.action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: transparent;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.action-icon {
  width: 1.1em;
  height: 1.1em;
  flex-shrink: 0;
}

.action-label {
  font-size: 0.75rem;
  letter-spacing: 0.5px;
}

/* Primary variant (Edit) */
.action-button--primary {
  color: var(--color-primary-700);
  background: rgba(123, 47, 190, 0.1);
  border-color: rgba(123, 47, 190, 0.2);
}

.action-button--primary:hover:not(:disabled) {
  background: rgba(123, 47, 190, 0.15);
  border-color: rgba(123, 47, 190, 0.3);
  color: var(--color-primary-800);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(123, 47, 190, 0.15);
}

.action-button--primary:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(123, 47, 190, 0.1);
}

/* Secondary variant */
.action-button--secondary {
  color: var(--color-text-secondary);
  background: rgba(0, 0, 0, 0.05);
  border-color: rgba(0, 0, 0, 0.08);
}

.action-button--secondary:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.08);
  border-color: rgba(0, 0, 0, 0.12);
  color: var(--color-text-primary);
  transform: translateY(-1px);
}

.action-button--secondary:active:not(:disabled) {
  transform: translateY(0);
}

/* Danger variant (Delete) */
.action-button--danger {
  color: #991b1b;
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.2);
}

.action-button--danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
  color: #7f1d1d;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
}

.action-button--danger:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(239, 68, 68, 0.1);
}

/* Warning variant */
.action-button--warning {
  color: #92400e;
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.2);
}

.action-button--warning:hover:not(:disabled) {
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.3);
  color: #78350f;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.15);
}

.action-button--warning:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(245, 158, 11, 0.1);
}

/* Disabled state */
.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* Focus visible for accessibility */
.action-button:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

/* Responsive: Mobile */
@media (max-width: 767px) {
  .table-actions {
    gap: 0.3rem;
  }

  .table-actions--sm .action-button {
    width: 28px;
    height: 28px;
    padding: 0.35rem;
  }

  .table-actions--md .action-button {
    width: 36px;
    height: 36px;
    padding: 0.4rem;
  }

  .table-actions--lg .action-button {
    width: 44px;
    height: 44px;
    padding: 0.5rem;
  }
}
</style>
