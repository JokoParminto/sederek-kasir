// Re-export components and types from table components
export { default as TableActionButton } from './TableActionButton.vue'
export { default as TableActionButtons } from './TableActionButtons.vue'

// Export types
import type { default as TableActionButtonsComp } from './TableActionButtons.vue'

// Use Vue component's exposed types
export interface Action {
  id: string
  icon: string
  label: string
  variant?: 'default' | 'danger'
  disabled?: boolean
  onClick: () => void | Promise<void>
}
