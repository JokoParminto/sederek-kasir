<script setup lang="ts">
interface Props {
  type: 'receipt' | 'barista' | 'label' | 'a4' | 'network'
  size?: 'small' | 'medium' | 'large'
}

withDefaults(defineProps<Props>(), {
  size: 'medium'
})

const getIconName = (type: string) => {
  switch (type) {
    case 'receipt':  return 'receipt'
    case 'barista':  return 'coffee'
    case 'label':    return 'tag'
    case 'a4':       return 'file-text'
    case 'network':  return 'globe'
    default:         return 'printer'
  }
}

const getLabel = (type: string) => {
  switch (type) {
    case 'receipt':  return 'Receipt'
    case 'barista':  return 'Barista'
    case 'label':    return 'Label'
    case 'a4':       return 'A4'
    case 'network':  return 'Network'
    default:         return 'Printer'
  }
}

const sizeMap = {
  small: { px: 32, icon: 16 },
  medium: { px: 44, icon: 20 },
  large: { px: 56, icon: 26 },
}
</script>

<template>
  <div
    :class="['printer-type-icon', `icon-${size}`]"
    :title="getLabel(type)"
    :style="{ width: sizeMap[size].px + 'px', height: sizeMap[size].px + 'px' }"
  >
    <AppIcon :name="getIconName(type)" :size="sizeMap[size].icon" />
  </div>
</template>

<style scoped>
.printer-type-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(123, 47, 190, 0.1);
  border-radius: 8px;
  flex-shrink: 0;
  color: var(--brand-primary);
}
</style>
