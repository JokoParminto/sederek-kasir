<script setup lang="ts">
import { computed } from 'vue'

type Size = 'sm' | 'md' | 'lg'
type Variant = 'primary' | 'neutral'

interface Props {
  size?: Size
  variant?: Variant
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  variant: 'neutral'
})

const classes = computed(() => [
  'icon-wrapper',
  `icon-wrapper--${props.size}`,
  `icon-wrapper--${props.variant}`
])
</script>

<template>
  <span :class="classes">
    <slot />
  </span>
</template>

<style scoped>
.icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  background: rgba(148, 163, 184, 0.2);
  color: var(--color-text-primary);
}

.icon-wrapper--primary {
  background: rgba(123, 47, 190, 0.12);
  color: var(--color-primary-700);
}

.icon-wrapper--sm {
  width: 32px;
  height: 32px;
  font-size: 0.95rem;
}

.icon-wrapper--md {
  width: 44px;
  height: 44px;
  font-size: 1.2rem;
}

.icon-wrapper--lg {
  width: 56px;
  height: 56px;
  font-size: 1.6rem;
}
</style>
