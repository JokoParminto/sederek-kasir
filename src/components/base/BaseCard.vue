<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  elevated?: boolean
  padded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  elevated: true,
  padded: true
})

const classes = computed(() => [
  'base-card',
  { 'is-elevated': props.elevated, 'is-padded': props.padded }
])
</script>

<template>
  <div :class="classes">
    <header v-if="$slots.header" class="base-card__header">
      <slot name="header" />
    </header>
    <section class="base-card__body">
      <slot />
    </section>
    <footer v-if="$slots.footer" class="base-card__footer">
      <slot name="footer" />
    </footer>
  </div>
</template>

<style scoped>
.base-card {
  background: var(--color-surface-0);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
  overflow: hidden;
}

.base-card.is-elevated {
  box-shadow: var(--shadow-2);
}

.base-card.is-padded .base-card__body {
  padding: var(--spacing-6);
}

.base-card__header {
  padding: var(--spacing-4) var(--spacing-6);
  border-bottom: 1px solid var(--color-border-light);
}

.base-card__footer {
  padding: var(--spacing-4) var(--spacing-6);
  border-top: 1px solid var(--color-border-light);
}

@media (max-width: 768px) {
  .base-card__header,
  .base-card__footer,
  .base-card.is-padded .base-card__body {
    padding-left: var(--spacing-4);
    padding-right: var(--spacing-4);
  }
}
</style>
