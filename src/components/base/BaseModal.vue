<script setup lang="ts">
import { computed, watch, onBeforeUnmount } from 'vue'

type Size = 'sm' | 'md' | 'lg' | 'xl'

interface Props {
  modelValue: boolean
  title?: string
  size?: Size
  closeOnOverlay?: boolean
  showClose?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  size: 'md',
  closeOnOverlay: true,
  showClose: true
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
}>()

const classes = computed(() => ['base-modal', `base-modal--${props.size}`])

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
    <Transition name="modal-fade">
      <div v-if="modelValue" class="base-modal__overlay" @click="onOverlayClick">
        <div :class="classes" @click.stop>
          <header class="base-modal__header" v-if="title || $slots.header || showClose">
            <div class="base-modal__title">
              <slot name="header">
                <h3 v-if="title">{{ title }}</h3>
              </slot>
            </div>
            <button v-if="showClose" class="base-modal__close" type="button" @click="close">
              <AppIcon name="x" :size="18" />
            </button>
          </header>

          <section class="base-modal__body">
            <slot />
          </section>

          <footer v-if="$slots.footer" class="base-modal__footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.base-modal__overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-6);
  z-index: 10000;
}

.base-modal {
  width: 100%;
  max-height: 90dvh;
  overflow: hidden;
  background: var(--color-surface-0);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-12);
  display: flex;
  flex-direction: column;
}

.base-modal--sm {
  max-width: 420px;
}

.base-modal--md {
  max-width: 560px;
}

.base-modal--lg {
  max-width: 760px;
}

.base-modal--xl {
  max-width: 960px;
}

.base-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-3);
  padding: var(--spacing-6);
  border-bottom: 1px solid var(--color-border-light);
}

.base-modal__title h3 {
  margin: 0;
  font-size: var(--font-size-xl);
  color: var(--color-text-primary);
}

.base-modal__close {
  border: none;
  background: transparent;
  font-size: 1.1rem;
  cursor: pointer;
  color: var(--color-text-secondary);
  padding: 0.25rem;
}

.base-modal__close:hover {
  color: var(--color-text-primary);
}

.base-modal__body {
  padding: var(--spacing-6);
  overflow: auto;
}

.base-modal__footer {
  padding: var(--spacing-4) var(--spacing-6) var(--spacing-6);
  border-top: 1px solid var(--color-border-light);
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-3);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity var(--transition-duration-medium) var(--transition-standard);
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .base-modal,
.modal-fade-leave-active .base-modal {
  transition: transform var(--transition-duration-medium) var(--transition-standard);
}

.modal-fade-enter-from .base-modal,
.modal-fade-leave-to .base-modal {
  transform: translateY(12px) scale(0.98);
}

@media (max-width: 768px) {
  .base-modal__overlay {
    padding: var(--spacing-4);
  }

  .base-modal__header,
  .base-modal__body,
  .base-modal__footer {
    padding-left: var(--spacing-4);
    padding-right: var(--spacing-4);
  }
}
</style>
