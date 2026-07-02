<script setup lang="ts">
import { useToast } from '@/composables/useToast'

/**
 * GlobalToastContainer
 * Renders all active toast notifications
 * Should be placed in App.vue root
 */
const { toasts, removeToast } = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="global-toast-container">
      <Transition
        v-for="toast in toasts"
        :key="toast.id"
        name="toast-fade"
      >
        <div
          :class="['toast', `toast-${toast.type}`]"
          role="alert"
          :aria-label="`${toast.type} notification: ${toast.message}`"
        >
          <div class="toast-content">
            <div class="toast-message">{{ toast.message }}</div>
          </div>
          <button
            class="toast-close"
            @click="removeToast(toast.id)"
            aria-label="Close notification"
            type="button"
          >
            <AppIcon name="x" :size="16" />
          </button>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<style scoped>
.global-toast-container {
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + 12px);
  right: 12px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 400px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 8px;
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: toastSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: all;
  border-left: 4px solid currentColor;
  min-width: 280px;
}

.toast-success {
  border-left-color: var(--brand-primary);
  background: #ecfdf5;
  color: #065f46;
}

.toast-error {
  border-left-color: #ef4444;
  background: #fef2f2;
  color: #7f1d1d;
}

.toast-warning {
  border-left-color: #f59e0b;
  background: #fffbeb;
  color: #78350f;
}

.toast-info {
  border-left-color: #3b82f6;
  background: #eff6ff;
  color: #1e3a8a;
}

.toast-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.toast-message {
  font-size: 0.95rem;
  font-weight: 500;
  line-height: 1.4;
}

.toast-close {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 4px 8px;
  margin-left: 12px;
  opacity: 0.6;
  transition: opacity 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  min-height: 32px;
  border-radius: 4px;
}

.toast-close:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.05);
}

.toast-close:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

/* Animation */
@keyframes toastSlideIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s ease;
}

.toast-fade-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* Mobile responsive */
@media (max-width: 640px) {
  .global-toast-container {
    left: 8px;
    right: 8px;
    max-width: none;
    top: calc(env(safe-area-inset-top, 0px) + 8px);
  }

  .toast {
    min-width: auto;
    font-size: 0.9rem;
    padding: 10px 14px;
  }

  .toast-close {
    min-width: 28px;
    min-height: 28px;
    margin-left: 8px;
    font-size: 1rem;
  }
}

/* Tablet */
@media (min-width: 768px) and (max-width: 1024px) {
  .global-toast-container {
    max-width: 350px;
  }

  .toast {
    min-width: 320px;
  }
}
</style>
