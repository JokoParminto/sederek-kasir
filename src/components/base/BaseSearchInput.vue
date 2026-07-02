<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue?: string
  placeholder?: string
  disabled?: boolean
  id?: string
  name?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: 'Cari',
  disabled: false,
  id: '',
  name: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'clear': []
}>()

const fieldId = computed(() => props.id || `search-${Math.random().toString(36).slice(2, 10)}`)

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

const onClear = () => {
  emit('update:modelValue', '')
  emit('clear')
}
</script>

<template>
  <div class="search-input" :class="{ 'is-disabled': disabled }">
    <span class="search-input__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
    </span>
    <input
      :id="fieldId"
      :name="name"
      type="text"
      :placeholder="placeholder"
      :disabled="disabled"
      :value="modelValue"
      class="search-input__field"
      @input="onInput"
    />
    <button
      v-if="modelValue"
      type="button"
      class="search-input__clear"
      aria-label="Clear search"
      @click="onClear"
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.search-input {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  background: rgba(255, 255, 255, 0.8);
  border: 1.5px solid rgba(123, 47, 190, 0.15);
  border-radius: 10px;
  padding: 0.75rem 1rem;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 44px;
  flex: 1;
  box-shadow: 0 2px 8px rgba(123, 47, 190, 0.06);
}

.search-input:focus-within {
  border-color: var(--color-primary-500);
  box-shadow: 0 4px 12px rgba(123, 47, 190, 0.15);
  background: rgba(255, 255, 255, 0.95);
}

.search-input__icon {
  color: var(--color-primary-400);
  display: inline-flex;
  flex-shrink: 0;
}

.search-input__field {
  border: none;
  outline: none;
  background: transparent;
  flex: 1;
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  font-weight: 500;
}

.search-input__field::placeholder {
  color: var(--color-text-secondary);
  font-weight: 400;
}

.search-input.is-disabled {
  opacity: 0.6;
  background: rgba(240, 253, 244, 0.3);
  cursor: not-allowed;
}

.search-input__field:disabled {
  cursor: not-allowed;
}

.search-input__clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
  flex-shrink: 0;
  border-radius: 4px;
}

.search-input__clear:hover {
  color: var(--color-primary-500);
  background: rgba(123, 47, 190, 0.08);
}

.search-input__clear:active {
  transform: scale(0.95);
}
</style>
