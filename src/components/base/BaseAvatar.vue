<script setup lang="ts">
import { computed } from 'vue'

type Size = 'sm' | 'md' | 'lg'

interface Props {
  src?: string
  name?: string
  size?: Size
}

const props = withDefaults(defineProps<Props>(), {
  src: '',
  name: '',
  size: 'md'
})

const initials = computed(() => {
  if (!props.name) return ''
  const parts = props.name.trim().split(' ')
  const first = parts[0]?.charAt(0) || ''
  const last = parts.length > 1 ? parts[parts.length - 1]!.charAt(0) : ''
  return `${first}${last}`.toUpperCase()
})

const classes = computed(() => ['base-avatar', `base-avatar--${props.size}`])
</script>

<template>
  <div :class="classes">
    <img v-if="src" :src="src" :alt="name || 'Avatar'" />
    <span v-else class="base-avatar__initials">{{ initials || '?' }}</span>
  </div>
</template>

<style scoped>
.base-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(123, 47, 190, 0.12);
  color: var(--color-primary-700);
  border-radius: 50%;
  overflow: hidden;
  font-weight: 700;
}

.base-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.base-avatar--sm {
  width: 32px;
  height: 32px;
  font-size: var(--font-size-xs);
}

.base-avatar--md {
  width: 44px;
  height: 44px;
  font-size: var(--font-size-sm);
}

.base-avatar--lg {
  width: 64px;
  height: 64px;
  font-size: var(--font-size-lg);
}
</style>
