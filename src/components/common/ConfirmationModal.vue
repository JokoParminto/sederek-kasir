<script setup lang="ts">
import { ref, computed } from 'vue'
import { getModalIcon, type ModalIconKey, IconConfig } from '@/utils/tableActionIcons'

interface Props {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'warning' | 'danger' | 'info'
  iconType?: ModalIconKey
  isLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  variant: 'warning',
  iconType: 'warning',
  isLoading: false,
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const isConfirming = ref(false)

const IconComponent = computed(() => getModalIcon(props.iconType))

const handleConfirm = async () => {
  isConfirming.value = true
  try {
    emit('confirm')
  } finally {
    isConfirming.value = false
  }
}

const handleCancel = () => {
  emit('cancel')
}

// Prevent closing with backdrop click when loading
const handleBackdropClick = () => {
  if (!props.isLoading && !isConfirming.value) {
    handleCancel()
  }
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click="handleBackdropClick">
    <div class="modal-content" @click.stop>
      <!-- Icon -->
      <div :class="['modal-icon', `modal-icon--${variant}`]">
        <component
          :is="IconComponent"
          :stroke-width="IconConfig.strokeWidth"
          :size="32"
          aria-hidden="true"
        />
      </div>

      <!-- Title -->
      <h2 class="modal-title">{{ title }}</h2>

      <!-- Message -->
      <p class="modal-message">{{ message }}</p>

      <!-- Footer with buttons -->
      <div class="modal-footer">
        <button
          class="btn-modal btn-modal--secondary"
          type="button"
          @click="handleCancel"
          :disabled="isLoading || isConfirming"
        >
          {{ cancelText }}
        </button>
        <button
          :class="['btn-modal', variant === 'danger' ? 'btn-modal--danger' : 'btn-modal--primary']"
          type="button"
          @click="handleConfirm"
          :disabled="isLoading || isConfirming"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: fadeIn 0.2s ease-out;
}

.modal-content {
  background: white;
  border-radius: 16px;
  padding: 32px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  animation: slideUp 0.3s ease-out;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

/* Icon */
.modal-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.modal-icon--warning {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.modal-icon--danger {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.modal-icon--info {
  background: rgba(123, 47, 190, 0.1);
  color: var(--color-primary-500, var(--brand-primary));
}

/* Title */
.modal-title {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: 700;
  line-height: 1.4;
  color: var(--color-text-primary, #111827);
  margin-bottom: 12px;
}

/* Message */
.modal-message {
  margin: 0;
  font-size: var(--font-size-base);
  line-height: 1.6;
  color: var(--color-text-secondary, #6b7280);
  margin-bottom: 28px;
}

/* Footer */
.modal-footer {
  display: flex;
  gap: 12px;
  width: 100%;
  justify-content: center;
}

/* Modal buttons */
.btn-modal {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  font-size: var(--font-size-base);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  outline: none;
  min-height: 44px;

  &:focus-visible {
    outline: 2px solid rgba(123, 47, 190, 0.4);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.btn-modal--secondary {
  background: var(--color-surface-0, #f9fafb);
  color: var(--color-text-primary, #111827);
  border: 1px solid var(--color-border, #e5e7eb);

  &:hover:not(:disabled) {
    background: var(--color-surface-1, #f3f4f6);
    border-color: var(--color-primary-300, #a7f3d0);
  }
}

.btn-modal--primary {
  background: linear-gradient(135deg, var(--color-primary-500, var(--brand-primary)) 0%, var(--color-primary-700, var(--brand-primary-dark)) 100%);
  color: white;
  box-shadow: 0 6px 16px rgba(123, 47, 190, 0.24);

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 18px rgba(123, 47, 190, 0.32);
  }
}

.btn-modal--danger {
  background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
  color: white;
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.24);

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 18px rgba(239, 68, 68, 0.32);
  }
}

/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive */
@media (max-width: 640px) {
  .modal-content {
    padding: 24px;
    max-width: 90vw;
  }

  .modal-title {
    font-size: var(--font-size-lg);
  }

  .modal-message {
    font-size: var(--font-size-sm);
  }

  .modal-footer {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
