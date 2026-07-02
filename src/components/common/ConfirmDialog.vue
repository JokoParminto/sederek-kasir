<script setup lang="ts">
import { useConfirm } from '@/composables/useConfirm'

const { showDialog, dialogOptions, handleConfirm, handleCancel } = useConfirm()
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="showDialog" class="confirm-overlay" @click.self="handleCancel">
        <div class="confirm-dialog" :class="`confirm-dialog--${dialogOptions.type}`">
          <div class="confirm-header">
            <h3 class="confirm-title">{{ dialogOptions.title }}</h3>
          </div>

          <div class="confirm-body">
            <p class="confirm-message">{{ dialogOptions.message }}</p>
          </div>

          <div class="confirm-footer">
            <button class="btn-confirm-cancel" @click="handleCancel">
              {{ dialogOptions.cancelText }}
            </button>
            <button class="btn-confirm-yes" @click="handleConfirm">
              {{ dialogOptions.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.confirm-dialog {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 420px;
  width: 100%;
  overflow: hidden;
  animation: dialogBounce 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.confirm-header {
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.confirm-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.confirm-dialog--danger .confirm-title::before {
  content: '⚠️';
  font-size: 1.3rem;
}

.confirm-dialog--warning .confirm-title::before {
  content: '⚠️';
  font-size: 1.3rem;
}

.confirm-dialog--info .confirm-title::before {
  content: 'ℹ️';
  font-size: 1.3rem;
}

.confirm-body {
  padding: 1.5rem;
}

.confirm-message {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.6;
  color: #4b5563;
}

.confirm-footer {
  padding: 1rem 1.5rem 1.5rem;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.btn-confirm-cancel,
.btn-confirm-yes {
  padding: 0.65rem 1.5rem;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  min-width: 100px;
}

.btn-confirm-cancel {
  background: rgba(0, 0, 0, 0.05);
  color: #6b7280;
  border: 1px solid rgba(0, 0, 0, 0.1);

  &:hover {
    background: rgba(0, 0, 0, 0.08);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
}

.btn-confirm-yes {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);

  &:hover {
    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
}

.confirm-dialog--info .btn-confirm-yes {
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  box-shadow: 0 4px 12px rgba(123, 47, 190, 0.3);

  &:hover {
    background: linear-gradient(135deg, var(--brand-primary-dark) 0%, var(--brand-primary-darker) 100%);
    box-shadow: 0 6px 16px rgba(123, 47, 190, 0.4);
  }
}

/* Dialog Transitions */
.dialog-enter-active {
  transition: opacity 0.2s ease;
}

.dialog-leave-active {
  transition: opacity 0.15s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-active .confirm-dialog {
  animation: dialogBounce 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.dialog-leave-active .confirm-dialog {
  animation: dialogSlideOut 0.15s ease-out;
}

@keyframes dialogBounce {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes dialogSlideOut {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  to {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
}

/* Responsive */
@media (max-width: 640px) {
  .confirm-dialog {
    max-width: 100%;
    margin: 0 1rem;
  }

  .confirm-header {
    padding: 1.25rem 1.25rem 0.75rem;
  }

  .confirm-title {
    font-size: 1rem;
  }

  .confirm-body {
    padding: 1.25rem;
  }

  .confirm-message {
    font-size: 0.9rem;
  }

  .confirm-footer {
    padding: 0.75rem 1.25rem 1.25rem;
    flex-direction: column-reverse;
  }

  .btn-confirm-cancel,
  .btn-confirm-yes {
    width: 100%;
    min-width: auto;
  }
}
</style>
