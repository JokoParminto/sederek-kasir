/**
 * Table Action Icons Mapping
 * Using Lucide Vue Next icons with 1.5px stroke weight for elegant appearance
 */

import type { Component } from 'vue'
import {
  Pencil,
  Trash2,
  Eye,
  ToggleRight,
  ToggleLeft,
  MoreVertical,
  Plus,
  Settings,
  Archive,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-vue-next'

/**
 * Action button icons for table operations
 * Each icon is designed to be recognizable at small sizes (24-32px)
 */
export const ActionIcons = {
  edit: Pencil,           // Edit/Pencil for edit actions
  delete: Trash2,         // Trash bin for delete actions
  view: Eye,              // Eye for view/detail actions
  toggleActive: ToggleRight,   // Toggle switch right for active status
  toggleInactive: ToggleLeft,  // Toggle switch left for inactive status
  moreActions: MoreVertical,   // More vertical dots for dropdown menu
  add: Plus,              // Plus sign for add actions
  settings: Settings,     // Gear icon for settings
  archive: Archive,       // Archive box for archive actions
} as const

/**
 * Modal icons for confirmation dialogs and alerts
 * Used in ConfirmationModal component
 */
export const ModalIcons = {
  warning: AlertTriangle,   // Warning triangle for delete confirmations
  info: AlertCircle,        // Info circle for informational modals
  success: CheckCircle,     // Check circle for success messages
  error: XCircle,          // X circle for error messages
} as const

/**
 * Icon configuration
 * Lucide icons use strokeWidth to control thickness
 * Default is 2, we use 1.5 for a thinner, more elegant look
 */
export const IconConfig = {
  strokeWidth: 1.5,     // Thin stroke for elegant appearance
  size: 20,             // Default icon size in pixels
  sizeSmall: 18,        // Small icon size
  sizeLarge: 24,        // Large icon size
} as const

/**
 * Action button labels (for accessibility and tooltips)
 */
export const ActionLabels = {
  edit: 'Edit',
  delete: 'Delete',
  view: 'View Details',
  toggleActive: 'Toggle Status',
  toggleInactive: 'Toggle Status',
  moreActions: 'More Actions',
  add: 'Add New',
  settings: 'Settings',
  archive: 'Archive',
} as const

/**
 * Type-safe action icon keys
 */
export type ActionIconKey = keyof typeof ActionIcons

/**
 * Type-safe modal icon keys
 */
export type ModalIconKey = keyof typeof ModalIcons

/**
 * Get action icon component
 * @param key - The action icon key
 * @returns The icon component
 */
export function getActionIcon(key: ActionIconKey): Component {
  return ActionIcons[key]
}

/**
 * Get modal icon component
 * @param key - The modal icon key
 * @returns The icon component
 */
export function getModalIcon(key: ModalIconKey): Component {
  return ModalIcons[key]
}

/**
 * Get action label for accessibility
 * @param key - The action icon key
 * @returns The label for the action
 */
export function getActionLabel(key: ActionIconKey): string {
  return ActionLabels[key]
}
