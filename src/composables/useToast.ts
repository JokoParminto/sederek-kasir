import { ref } from 'vue'

/**
 * Toast notification type
 */
export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

/**
 * Global toast state
 */
const toasts = ref<Toast[]>([])

/**
 * useToast Composable
 * Provides toast notification management
 *
 * @example
 * const { showToast } = useToast()
 * showToast('Operation successful!', 'success')
 */
export const useToast = () => {
  /**
   * Show a toast notification
   * @param message - Notification message
   * @param type - Type of notification (success|error|warning|info)
   * @param duration - Auto-hide duration in milliseconds (0 = no auto-hide)
   * @returns Toast ID for manual removal
   */
  const showToast = (
    message: string,
    type: Toast['type'] = 'info',
    duration = 3000
  ): string => {
    const id = Date.now().toString() + Math.random()
    const toast: Toast = { id, message, type, duration }

    toasts.value.push(toast)

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }

    return id
  }

  /**
   * Remove a specific toast by ID
   * @param id - Toast ID to remove
   */
  const removeToast = (id: string) => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  /**
   * Clear all toasts
   */
  const clearAll = () => {
    toasts.value = []
  }

  /**
   * Show success toast (green, 3000ms)
   */
  const success = (message: string, duration = 3000) => {
    return showToast(message, 'success', duration)
  }

  /**
   * Show error toast (red, 5000ms)
   */
  const error = (message: string, duration = 5000) => {
    return showToast(message, 'error', duration)
  }

  /**
   * Show warning toast (orange, 4000ms)
   */
  const warning = (message: string, duration = 4000) => {
    return showToast(message, 'warning', duration)
  }

  /**
   * Show info toast (blue, 3000ms)
   */
  const info = (message: string, duration = 3000) => {
    return showToast(message, 'info', duration)
  }

  return {
    toasts,
    showToast,
    removeToast,
    clearAll,
    success,
    error,
    warning,
    info
  }
}
