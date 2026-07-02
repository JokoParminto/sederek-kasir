<script setup lang="ts">
import { computed } from 'vue'

interface Option {
  label: string
  value: string | number
  disabled?: boolean
}

interface Props {
  modelValue?: string | number
  label?: string
  placeholder?: string
  description?: string
  error?: string
  disabled?: boolean
  required?: boolean
  options: Option[]
  id?: string
  name?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  label: '',
  placeholder: 'Pilih opsi',
  description: '',
  error: '',
  disabled: false,
  required: false,
  id: '',
  name: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const fieldId = computed(() => props.id || `select-${Math.random().toString(36).slice(2, 10)}`)

const onChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="base-field" :class="{ 'has-error': !!error, 'is-disabled': disabled }">
    <label v-if="label" class="base-field__label" :for="fieldId">
      {{ label }}
      <span v-if="required" class="base-field__required">*</span>
    </label>

    <select
      :id="fieldId"
      :name="name"
      :disabled="disabled"
      :value="modelValue"
      class="base-field__select"
      @change="onChange"
    >
      <option value="" disabled>{{ placeholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value" :disabled="option.disabled">
        {{ option.label }}
      </option>
    </select>

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

.base-field__select {
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface-0);
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
  transition: var(--transition-base);
  min-height: 44px;
}

.base-field__select:focus {
  outline: none;
  border-color: var(--color-primary-400);
  box-shadow: 0 0 0 3px rgba(123, 47, 190, 0.12);
}

.base-field.is-disabled {
  opacity: 0.6;
}

.base-field__select:disabled {
  background: var(--color-surface-2);
  cursor: not-allowed;
}

.base-field.has-error .base-field__select {
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
