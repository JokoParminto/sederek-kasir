<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { toasts, removeToast } = useToast()

const getToastIconName = (type: string) => {
  switch (type) {
    case 'success': return 'check-circle'
    case 'error':   return 'x-circle'
    case 'warning': return 'warning'
    case 'info':    return 'info'
    default:        return 'bell'
  }
}

const getToastClass = (type: string) => {
  return `toast-${type}`
}
</script>

<template>
  <Teleport to="body">
    <div class="toast-container">
      <Transition-group name="toast" tag="div">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="['toast', getToastClass(toast.type)]"
          @click="removeToast(toast.id)"
        >
          <div class="toast-content">
            <AppIcon :name="getToastIconName(toast.type)" :size="18" class="toast-icon" />
            <span class="toast-message">{{ toast.message }}</span>
          </div>
          <button class="toast-close" @click.stop="removeToast(toast.id)"><AppIcon name="x" :size="16" /></button>
        </div>
      </Transition-group>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s ease;
  pointer-events: auto;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 300px;
  max-width: 400px;
}

.toast:hover {
  transform: translateX(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.toast-icon {
  flex-shrink: 0;
}

.toast-message {
  word-break: break-word;
  line-height: 1.4;
}

.toast-close {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 1rem;
  padding: 0;
  flex-shrink: 0;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.toast-close:hover {
  opacity: 1;
}

/* Success Toast */
.toast-success {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #065f46;
  border: 1px solid var(--brand-primary-light);
}

.toast-success .toast-close {
  color: var(--brand-primary-dark);
}

/* Error Toast */
.toast-error {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #7f1d1d;
  border: 1px solid #fca5a5;
}

.toast-error .toast-close {
  color: #dc2626;
}

/* Warning Toast */
.toast-warning {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #78350f;
  border: 1px solid #fcd34d;
}

.toast-warning .toast-close {
  color: #f59e0b;
}

/* Info Toast */
.toast-info {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #0c2340;
  border: 1px solid #93c5fd;
}

.toast-info .toast-close {
  color: #3b82f6;
}

/* Animations */
@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  transform: translateX(400px);
  opacity: 0;
}

.toast-leave-to {
  transform: translateX(400px);
  opacity: 0;
}

/* Responsive */
@media (max-width: 640px) {
  .toast-container {
    top: 12px;
    right: 12px;
    left: 12px;
  }

  .toast {
    min-width: auto;
    max-width: none;
  }
}
</style>
