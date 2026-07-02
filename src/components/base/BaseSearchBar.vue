<script setup lang="ts">
import BaseSearchInput from './BaseSearchInput.vue'

interface Props {
  modelValue: string
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '🔍 Cari...'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'clear': []
}>()

const handleInput = (value: string) => {
  emit('update:modelValue', value)
}

const handleClear = () => {
  emit('update:modelValue', '')
  emit('clear')
}
</script>

<template>
  <div class="base-search-bar">
    <BaseSearchInput
      :model-value="modelValue"
      :placeholder="placeholder"
      @update:model-value="handleInput"
      @clear="handleClear"
    />
    <div class="search-bar-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.base-search-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3);
  border-bottom: 1px solid rgba(123, 47, 190, 0.1);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(240, 253, 244, 0.5) 100%);
  position: sticky;
  top: 0;
  z-index: 20;
  flex-shrink: 0;
  width: 100%;
  box-sizing: border-box;
}

.search-bar-actions {
  display: flex;
  gap: var(--spacing-2);
  flex-shrink: 0;
  align-items: center;
}

/* Responsive */
@media (max-width: 640px) {
  .base-search-bar {
    flex-wrap: wrap;
    gap: var(--spacing-2);
    padding: var(--spacing-2);
  }

  .search-bar-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
