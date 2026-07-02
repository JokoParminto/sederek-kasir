<script setup lang="ts">
import { computed } from 'vue'
import { AppIcons, IconConfig } from '@/utils/icons'
import type { AppIconName } from '@/utils/icons'

const props = withDefaults(defineProps<{
  name: AppIconName
  size?: number | string
  strokeWidth?: number
  color?: string
  spin?: boolean
}>(), {
  size: IconConfig.size,
  strokeWidth: IconConfig.strokeWidth,
  color: 'currentColor',
  spin: false,
})

const iconComponent = computed(() => AppIcons[props.name])
</script>

<template>
  <component
    :is="iconComponent"
    :size="Number(size)"
    :stroke-width="strokeWidth"
    :color="color"
    :class="{ 'app-icon--spin': spin }"
    class="app-icon"
    aria-hidden="true"
  />
</template>

<style>
.app-icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}

@keyframes app-icon-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.app-icon--spin {
  animation: app-icon-spin 1s linear infinite;
}
</style>
