import { ref, computed, onMounted } from 'vue'

// Dark mode state - default: false (light mode)
const isDarkModeEnabled = ref(false)

/**
 * Composable untuk manage dark mode preference
 * - Simpan ke localStorage
 * - Apply class ke html element
 * - Default light mode
 */
export function useDarkMode() {
  /**
   * Initialize dark mode dari localStorage
   * Harus di-call di onMounted atau di-call dari main.ts early
   */
  const initDarkMode = () => {
    const savedPreference = localStorage.getItem('app-dark-mode')
    
    // Jika ada saved preference, gunakan itu
    if (savedPreference !== null) {
      isDarkModeEnabled.value = savedPreference === 'true'
    } else {
      // Default: light mode (false)
      isDarkModeEnabled.value = false
    }
    
    // Apply class ke html
    applyDarkModeClass()
  }

  /**
   * Apply dark-mode class ke html element
   */
  const applyDarkModeClass = () => {
    const htmlElement = document.documentElement
    
    if (isDarkModeEnabled.value) {
      htmlElement.classList.add('dark-mode')
    } else {
      htmlElement.classList.remove('dark-mode')
    }
  }

  /**
   * Toggle dark mode on/off
   */
  const toggleDarkMode = () => {
    isDarkModeEnabled.value = !isDarkModeEnabled.value
    
    // Save preference ke localStorage
    localStorage.setItem('app-dark-mode', isDarkModeEnabled.value ? 'true' : 'false')
    
    // Apply class immediately
    applyDarkModeClass()
  }

  /**
   * Check if dark mode is enabled
   */
  const isDarkMode = computed(() => isDarkModeEnabled.value)

  return {
    initDarkMode,
    toggleDarkMode,
    isDarkMode,
  }
}
