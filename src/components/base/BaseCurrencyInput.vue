<script setup lang="ts">
import { ref, watch, computed } from 'vue'

interface Props {
  modelValue?: number
  label?: string
  placeholder?: string
  description?: string
  error?: string
  disabled?: boolean
  required?: boolean
  currencySymbol?: string
  id?: string
  name?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 0,
  label: '',
  placeholder: '0',
  description: '',
  error: '',
  disabled: false,
  required: false,
  currencySymbol: 'Rp',
  id: '',
  name: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const fieldId = computed(() => props.id || `currency-${Math.random().toString(36).slice(2, 10)}`)

const displayValue = ref('')

const formatValue = (value: number) => {
  if (!value) return ''
  return value.toLocaleString('id-ID')
}

watch(
  () => props.modelValue,
  (value) => {
    displayValue.value = formatValue(value || 0)
  },
  { immediate: true }
)

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const raw = target.value.replace(/\./g, '').replace(/[^0-9]/g, '')
  const numValue = Number(raw || 0)
  emit('update:modelValue', numValue)
  displayValue.value = formatValue(numValue)
}
</script>

<template>
  <div class="base-field" :class="{ 'has-error': !!error, 'is-disabled': disabled }">
    <label v-if="label" class="base-field__label" :for="fieldId">
      {{ label }}
      <span v-if="required" class="base-field__required">*</span>
    </label>

    <div class="base-field__currency" :class="{ 'is-disabled': disabled }">
      <span class="base-field__symbol">{{ currencySymbol }}</span>
      <input
        :id="fieldId"
        :name="name"
        type="text"
        inputmode="numeric"
        :placeholder="placeholder"
        :disabled="disabled"
        :value="displayValue"
        class="base-field__input"
        @input="onInput"
      />
    </div>

    <div class="base-field__meta">
      <p v-if="error" class="base-field__error">{{ error }}</p>
      <p v-else-if="description" class="base-field__description">{{ description }}</p>
    </div>
  </div>
</template>

<style scoped>
.base-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  padding: var(--spacing-2) 0;
}

.base-field__label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.base-field__required {
  color: var(--color-danger);
  margin-left: 0.2rem;
}

.base-field__currency {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.6rem 0.9rem;
  background: var(--color-surface-0);
}

.base-field__symbol {
  font-weight: 600;
  color: var(--color-text-secondary);
}

.base-field__input {
  border: none;
  outline: none;
  flex: 1;
  font-size: var(--font-size-base);
  background: transparent;
  color: var(--color-text-primary);
}

.base-field__currency:focus-within {
  border-color: var(--color-primary-400);
  box-shadow: 0 0 0 3px rgba(123, 47, 190, 0.12);
}

.base-field.is-disabled {
  opacity: 0.6;
}

.base-field__currency.is-disabled {
  background: var(--color-surface-2);
}

.base-field.has-error .base-field__currency {
  border-color: var(--color-danger);
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.12);
}

.base-field__meta {
  min-height: 16px;
}

.base-field__description {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin: 0;
}

.base-field__error {
  font-size: var(--font-size-xs);
  color: var(--color-danger);
  margin: 0;
}
</style>
