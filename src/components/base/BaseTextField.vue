<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue?: string | number
  label?: string
  placeholder?: string
  description?: string
  error?: string
  disabled?: boolean
  required?: boolean
  type?: string
  rows?: number
  id?: string
  name?: string
  maxlength?: number
  inputmode?: 'email' | 'text' | 'search' | 'tel' | 'url' | 'none' | 'numeric' | 'decimal'
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  label: '',
  placeholder: '',
  description: '',
  error: '',
  disabled: false,
  required: false,
  type: 'text',
  rows: 1,
  id: '',
  name: '',
  maxlength: undefined,
  inputmode: undefined
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const inputValue = computed({
  get: () => String(props.modelValue ?? ''),
  set: (value) => emit('update:modelValue', value)
})

const isTextarea = computed(() => props.rows && props.rows > 1)

const fieldId = computed(() => props.id || `field-${Math.random().toString(36).slice(2, 10)}`)

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement
  inputValue.value = target.value
}
</script>

<template>
  <div class="base-field" :class="{ 'has-error': !!error, 'is-disabled': disabled }">
    <label v-if="label" class="base-field__label" :for="fieldId">
      {{ label }}
      <span v-if="required" class="base-field__required">*</span>
    </label>

    <textarea
      v-if="isTextarea"
      :id="fieldId"
      :name="name"
      :rows="rows"
      :value="inputValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :maxlength="maxlength"
      class="base-field__input base-field__textarea"
      @input="onInput"
    ></textarea>

    <input
      v-else
      :id="fieldId"
      :name="name"
      :type="type"
      :value="inputValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :maxlength="maxlength"
      :inputmode="inputmode"
      class="base-field__input"
      @input="onInput"
    />

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

.base-field__input {
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

.base-field__textarea {
  resize: vertical;
  min-height: 120px;
}

.base-field__input:focus {
  outline: none;
  border-color: var(--color-primary-400);
  box-shadow: 0 0 0 3px rgba(123, 47, 190, 0.12);
}

.base-field.is-disabled {
  opacity: 0.6;
}

.base-field__input:disabled {
  background: var(--color-surface-2);
  cursor: not-allowed;
}

.base-field.has-error .base-field__input {
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
