<script setup lang="ts">
import { computed } from 'vue'

type Variant = 'primary' | 'neutral'
type Size = 'sm' | 'md'

interface Props {
  variant?: Variant
  size?: Size
  closable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'neutral',
  size: 'md',
  closable: false
})

const emit = defineEmits<{
  close: []
}>()

const classes = computed(() => [
  'base-chip',
  `base-chip--${props.variant}`,
  `base-chip--${props.size}`
])

const onClose = () => emit('close')
</script>

<template>
  <span :class="classes">
    <slot />
    <button v-if="closable" class="base-chip__close" type="button" @click="onClose">x</button>
  </span>
</template>

<style scoped>
.base-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  border-radius: 999px;
  font-weight: 600;
  border: 1px solid transparent;
  white-space: nowrap;
  padding: 0.25rem 0.75rem;
}

.base-chip--sm {
  font-size: var(--font-size-xs);
  padding: 0.15rem 0.6rem;
}

.base-chip--md {
  font-size: var(--font-size-sm);
}

.base-chip--neutral {
  background: rgba(148, 163, 184, 0.2);
  color: #334155;
  border-color: rgba(148, 163, 184, 0.25);
}

.base-chip--primary {
  background: rgba(123, 47, 190, 0.15);
  color: var(--color-primary-700);
  border-color: rgba(123, 47, 190, 0.25);
}

.base-chip__close {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.8rem;
  color: inherit;
  padding: 0;
}
</style>
