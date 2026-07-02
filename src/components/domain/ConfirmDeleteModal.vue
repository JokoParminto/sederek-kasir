<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  isOpen: boolean
  title?: string
  message?: string
  itemName?: string
  isLoading?: boolean
}

interface Emits {
  confirm: []
  cancel: []
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Konfirmasi Hapus',
  message: 'Apakah Anda yakin ingin menghapus item berikut?',
  itemName: 'Item',
  isLoading: false
})

const emit = defineEmits<Emits>()

const isDeleting = ref(false)

// Reset state when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (!isOpen) {
    isDeleting.value = false
  }
})

// Handle confirm
const handleConfirm = () => {
  isDeleting.value = true
  emit('confirm')
}

// Handle cancel
const handleCancel = () => {
  emit('cancel')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-overlay" @click.self="handleCancel">
      <div class="confirm-dialog">
        <!-- Icon -->
        <div class="dialog-icon"><AppIcon name="trash" :size="32" /></div>

        <!-- Title -->
        <h2 class="dialog-title">{{ title }}</h2>

        <!-- Message -->
        <p class="dialog-message">
          {{ message }}
        </p>

        <!-- Item Name -->
        <div class="dialog-item-info">
          <span class="item-label">{{ itemName }}</span>
        </div>

        <!-- Footer Buttons -->
        <div class="dialog-footer">
          <button
            type="button"
            class="btn-cancel"
            @click="handleCancel"
            :disabled="isLoading || isDeleting"
          >
            Batal
          </button>
          <button
            type="button"
            class="btn-confirm"
            @click="handleConfirm"
            :disabled="isLoading || isDeleting"
          >
            <span v-if="isDeleting" class="spinner"></span>
            {{ isDeleting ? 'Menghapus...' : 'Hapus' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Modal Overlay */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1rem;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Confirm Dialog */
.confirm-dialog {
  background: white;
  border-radius: 16px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(123, 47, 190, 0.1);
  max-width: 360px;
  width: 100%;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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

/* Icon */
.dialog-icon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

/* Title */
.dialog-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text-primary);
  text-align: center;
}

/* Message */
.dialog-message {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  text-align: center;
  line-height: 1.5;
}

/* Item Info */
.dialog-item-info {
  padding: 0.75rem 1rem;
  background: rgba(123, 47, 190, 0.08);
  border: 1px solid rgba(123, 47, 190, 0.15);
  border-radius: 8px;
  width: 100%;
  text-align: center;
}

.item-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-primary);
  word-break: break-word;
}

/* Footer Buttons */
.dialog-footer {
  display: flex;
  gap: 0.75rem;
  width: 100%;
  margin-top: 0.5rem;
}

/* Cancel Button */
.btn-cancel {
  flex: 1;
  padding: 0.65rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.05);
  color: var(--color-text-secondary);
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 0.01em;

  &:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.08);
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

/* Confirm Button */
.btn-confirm {
  flex: 1;
  padding: 0.65rem;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: white;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 16px rgba(220, 38, 38, 0.3);
  letter-spacing: 0.01em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(220, 38, 38, 0.4);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
}

/* Loading Spinner */
.spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Responsive - Mobile */
@media (max-width: 767px) {
  .confirm-dialog {
    max-width: 100%;
    padding: 1.25rem;
  }

  .dialog-icon {
    font-size: 2rem;
  }

  .dialog-title {
    font-size: 1rem;
  }

  .dialog-message {
    font-size: 0.8rem;
  }

  .item-label {
    font-size: 0.8rem;
  }

  .btn-cancel,
  .btn-confirm {
    font-size: 0.75rem;
    padding: 0.6rem;
  }
}
</style>
