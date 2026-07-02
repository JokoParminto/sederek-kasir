<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import TableActionButton from './TableActionButton.vue'
import type { ActionIconKey } from '@/utils/tableActionIcons'

// Track dropdown position for teleport rendering
const dropdownX = ref(0)
const dropdownY = ref(0)

export interface Action {
  id: string
  icon: ActionIconKey
  label: string
  variant?: 'default' | 'danger'
  disabled?: boolean
  onClick: () => void | Promise<void>
}

interface Props {
  actions: Action[]
  /** Breakpoint in pixels where buttons should switch to dropdown */
  dropdownBreakpoint?: number
  /** Enable auto-detect of available space */
  autoDetect?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  dropdownBreakpoint: 1024,
  autoDetect: true,
})

// State
const containerRef = ref<HTMLDivElement>()
const isDropdownMode = ref(false)
const showDropdown = ref(false)
const containerWidth = ref(0)

// Constants for space calculation
const BUTTON_WIDTH = 36         // Button width in pixels
const BUTTON_GAP = 8            // Gap between buttons
const PADDING = 16              // Container padding

/**
 * Calculate required width for inline buttons
 * Formula: (buttonCount * buttonWidth) + ((buttonCount - 1) * gap) + (2 * padding)
 */
const requiredWidth = computed(() => {
  if (props.actions.length === 0) return 0
  return (props.actions.length * BUTTON_WIDTH) + ((props.actions.length - 1) * BUTTON_GAP) + (2 * PADDING)
})

/**
 * Determine if dropdown mode should be active
 */
const shouldUseDropdown = computed(() => {
  // Special case: dropdownBreakpoint = 0 means force dropdown always
  if (props.dropdownBreakpoint === 0) return true

  if (props.autoDetect) {
    return containerWidth.value > 0 && containerWidth.value < requiredWidth.value
  }
  return window.innerWidth < props.dropdownBreakpoint
})

/**
 * Handle container resize
 */
const handleResize = () => {
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect()
    containerWidth.value = rect.width
    isDropdownMode.value = shouldUseDropdown.value
  }
}

/**
 * Toggle dropdown and calculate position fresh at click time
 */
const toggleDropdown = () => {
  if (!showDropdown.value && containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect()
    dropdownX.value = rect.right
    dropdownY.value = rect.bottom + 8
  }
  showDropdown.value = !showDropdown.value
}

/**
 * Handle action click
 */
const handleActionClick = async (action: Action) => {
  try {
    await action.onClick()
  } catch (error) {

  }
  showDropdown.value = false
}

/**
 * Close dropdown when clicking outside
 */
const handleClickOutside = (event: MouseEvent) => {
  if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
    showDropdown.value = false
  }
}

onMounted(() => {
  // Initial measurement
  handleResize()

  // Listen to resize events
  window.addEventListener('resize', handleResize)
  document.addEventListener('click', handleClickOutside)

  // Use ResizeObserver for more accurate detection
  if (window.ResizeObserver && containerRef.value) {
    const observer = new ResizeObserver(() => {
      handleResize()
    })
    observer.observe(containerRef.value)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div ref="containerRef" class="action-buttons-container">
    <!-- Inline mode: Show all buttons -->
    <template v-if="!isDropdownMode">
      <TableActionButton
        v-for="action in actions"
        :key="action.id"
        :action="action.icon"
        :variant="action.variant"
        :disabled="action.disabled"
        :aria-label="action.label"
        @click="handleActionClick(action)"
      />
    </template>

    <!-- Dropdown mode: Show dropdown menu -->
    <template v-else>
      <div class="dropdown-wrapper">
        <button
          class="dropdown-toggle"
          :aria-label="'More actions'"
          :aria-expanded="showDropdown"
          aria-haspopup="menu"
          @click.stop="toggleDropdown"
        >
          <svg
            class="dropdown-icon"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>

        <!-- Dropdown menu - teleported to body to avoid overflow clipping -->
        <Teleport to="body">
          <transition name="dropdown-fade">
            <div v-if="showDropdown" class="dropdown-menu" :style="{ position: 'fixed', top: dropdownY + 'px', right: 'auto', left: Math.max(0, dropdownX - 180) + 'px' }">
              <button
                v-for="action in actions"
                :key="action.id"
                class="dropdown-item"
                :disabled="action.disabled"
                @click="handleActionClick(action)"
              >
                <span class="dropdown-item__label">{{ action.label }}</span>
              </button>
            </div>
          </transition>
        </Teleport>
      </div>
    </template>
  </div>
</template>

<style scoped>
.action-buttons-container {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 4px;
}

/* Inline mode: buttons shown in a row */
.action-buttons-container {
  flex-wrap: wrap;
  row-gap: 4px;
}

/* Dropdown mode styles */
.dropdown-wrapper {
  position: relative;
}

.dropdown-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  color: var(--color-text-secondary, #6b7280);
  transition: all 0.2s ease-in-out;

  /* Remove default button styles */
  outline: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;

  &:hover {
    color: var(--color-primary-500, var(--brand-primary));
    background: rgba(123, 47, 190, 0.08);
    transform: scale(1.1);
  }

  &:active {
    transform: scale(1.05);
  }

  &:focus-visible {
    outline: 2px solid rgba(123, 47, 190, 0.4);
    outline-offset: 2px;
  }
}

.dropdown-icon {
  width: 20px;
  height: 20px;
  color: currentColor;
}

/* Dropdown menu */
.dropdown-menu {
  z-index: 1000;
  min-width: 180px;
  background: white;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  animation: dropdownAppear 0.15s ease-out;
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: transparent;
  color: var(--color-text-primary, #111827);
  text-align: left;
  font-size: var(--font-size-base);
  line-height: 1.5;
  cursor: pointer;
  transition: all 0.15s ease-in-out;

  /* Remove default button styles */
  outline: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;

  &:hover:not(:disabled) {
    background: rgba(123, 47, 190, 0.08);
    color: var(--color-primary-500, var(--brand-primary));
    padding-left: 20px;
  }

  &:active:not(:disabled) {
    background: rgba(123, 47, 190, 0.12);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid rgba(123, 47, 190, 0.4);
    outline-offset: -2px;
  }

  /* Danger variant styling for delete items */
  &.is-danger:hover:not(:disabled) {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.08);
  }
}

.dropdown-item__label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

/* Dropdown fade transition */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: all 0.15s ease-in-out;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.dropdown-fade-enter-to,
.dropdown-fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}

/* Animations */
@keyframes dropdownAppear {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive behavior */
@media (max-width: 768px) {
  .action-buttons-container {
    gap: 4px;
  }

  .dropdown-menu {
    min-width: 160px;
  }
}
</style>
