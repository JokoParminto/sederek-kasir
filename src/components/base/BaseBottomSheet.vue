<script setup lang="ts">
import { computed, watch, onBeforeUnmount } from 'vue'

type Size = 'auto' | 'compact' | 'medium' | 'large' | 'full'

interface Props {
  modelValue: boolean
  title?: string
  size?: Size
  closeOnOverlay?: boolean
  showClose?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  size: 'auto',
  closeOnOverlay: true,
  showClose: true
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
}>()

const classes = computed(() => ['base-sheet', `base-sheet--${props.size}`])

const close = () => {
  emit('update:modelValue', false)
  emit('close')
}

const onOverlayClick = () => {
  if (props.closeOnOverlay) {
    close()
  }
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.modelValue) {
    close()
  }
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      window.addEventListener('keydown', onKeydown)
    } else {
      window.removeEventListener('keydown', onKeydown)
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet-fade">
      <div v-if="modelValue" class="base-sheet__overlay" @click="onOverlayClick">
        <div :class="classes" @click.stop>
          <div class="base-sheet__handle" aria-hidden="true"></div>
          <header v-if="title || $slots.header || showClose" class="base-sheet__header">
            <div class="base-sheet__title">
              <slot name="header">
                <h3 v-if="title">{{ title }}</h3>
              </slot>
            </div>
            <button v-if="showClose" class="base-sheet__close" type="button" @click="close">
              <AppIcon name="x" :size="18" />
            </button>
          </header>
          <section class="base-sheet__body">
            <slot />
          </section>
          <footer v-if="$slots.footer" class="base-sheet__footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.base-sheet__overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
  z-index: 10000;
}

.base-sheet {
  width: 100%;
  max-width: 100%;
  background: var(--color-surface-0);
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  height: auto;
  max-height: 90dvh;
  min-height: 200px;
  overflow: hidden;
}

/* Size variants - now functional with dynamic heights */
.base-sheet--auto {
  height: auto;
  max-height: 90dvh;
  min-height: 200px;
}

.base-sheet--compact {
  max-height: 50dvh;
  min-height: 150px;
}

.base-sheet--medium {
  max-height: 70dvh;
  min-height: 200px;
}

.base-sheet--large {
  max-height: 90dvh;
  min-height: 250px;
}

.base-sheet--full {
  max-height: 95dvh;
  min-height: 300px;
}

.base-sheet__handle {
  width: 56px;
  height: 5px;
  border-radius: 999px;
  background: #d1d5db;
  margin: 12px auto 0;
}

.base-sheet__header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-4) var(--spacing-6);
  border-bottom: 1px solid var(--color-border-light);
}

.base-sheet__title h3 {
  margin: 0;
  font-size: var(--font-size-lg);
  color: var(--color-text-primary);
}

.base-sheet__close {
  border: none;
  background: transparent;
  font-size: 1.1rem;
  cursor: pointer;
  color: var(--color-text-secondary);
  padding: 0.25rem;
}

.base-sheet__close:hover {
  color: var(--color-text-primary);
}

.base-sheet__body {
  flex: 1;
  padding: var(--spacing-4) var(--spacing-6) var(--spacing-6);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  scrollbar-width: thin;
  scrollbar-color: var(--color-primary) transparent;
}

.base-sheet__body::-webkit-scrollbar {
  width: 8px;
}

.base-sheet__body::-webkit-scrollbar-track {
  background: transparent;
}

.base-sheet__body::-webkit-scrollbar-thumb {
  background-color: var(--color-primary);
  border-radius: 4px;
}

.base-sheet__body::-webkit-scrollbar-thumb:hover {
  background-color: var(--color-primary-dark, var(--color-primary));
}

.base-sheet__body > form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.base-sheet__footer {
  flex-shrink: 0;
  padding: var(--spacing-4) var(--spacing-6);
  border-top: 1px solid var(--color-border-light);
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-3);
  background: var(--color-surface-0);
}

.sheet-fade-enter-active,
.sheet-fade-leave-active {
  transition: opacity var(--transition-duration-medium) var(--transition-standard);
}

.sheet-fade-enter-from,
.sheet-fade-leave-to {
  opacity: 0;
}

.sheet-fade-enter-active .base-sheet,
.sheet-fade-leave-active .base-sheet {
  transition: transform var(--transition-duration-medium) var(--transition-standard);
}

.sheet-fade-enter-from .base-sheet,
.sheet-fade-leave-to .base-sheet {
  transform: translateY(18px);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .base-sheet {
    width: 100%;
    max-height: 85dvh;
    min-height: 150px;
  }

  .base-sheet__header,
  .base-sheet__body,
  .base-sheet__footer {
    padding-left: var(--spacing-4);
    padding-right: var(--spacing-4);
  }
}

@media (min-width: 769px) {
  .base-sheet {
    width: 100%;
    /* Use size variant or default (auto: 90dvh) */
  }
}
</style>
