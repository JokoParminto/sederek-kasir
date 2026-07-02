<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue?: string
  label: string
  placeholder?: string
  description?: string
  disabled?: boolean
  maxLength?: number
  rows?: number
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '',
  disabled: false,
  maxLength: 255,
  rows: 1
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const inputValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const characterCount = computed(() => inputValue.value.length)

const isTextarea = computed(() => props.rows && props.rows > 1)

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement
  inputValue.value = target.value
}
</script>

<template>
  <div class="text-field" :class="{ 'is-disabled': disabled }">
    <label v-if="label" class="text-field-label">{{ label }}</label>

    <textarea
      v-if="isTextarea"
      :value="inputValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :max-length="maxLength"
      :rows="rows"
      class="text-field-input text-field-textarea"
      @input="handleInput"
    ></textarea>

    <input
      v-else
      type="text"
      :value="inputValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :max-length="maxLength"
      class="text-field-input"
      @input="handleInput"
    />

    <div class="text-field-footer">
      <p v-if="description" class="text-field-description">{{ description }}</p>
      <p class="text-field-counter">{{ characterCount }}/{{ maxLength }}</p>
    </div>
  </div>
</template>

<style scoped>
.text-field {
  display: flex;
  flex-direction: column;
  min-height: 44px;
  padding: var(--spacing-2) 0;
  gap: var(--spacing-2);
}

.text-field.is-disabled {
  opacity: 0.6;
}

.text-field-label {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1.4;
}

.text-field-input {
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 0.95rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: white;
  color: var(--color-text-primary);
  font-family: 'Inter', sans-serif;
  transition: all 0.2s ease;
  min-height: 44px;
  display: flex;
  align-items: center;
}

.text-field-textarea {
  min-height: auto;
  resize: vertical;
  padding: 0.75rem 1rem;
}

.text-field-input::placeholder {
  color: var(--color-text-secondary);
}

.text-field-input:focus {
  outline: none;
  border-color: var(--color-primary, var(--brand-primary-darker));
  box-shadow: 0 0 0 3px rgba(75, 0, 130, 0.1);
}

.text-field-input:disabled {
  background: var(--color-background-secondary, #f3f4f6);
  cursor: not-allowed;
}

.text-field-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-2);
}

.text-field-description {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin: 0;
  flex: 1;
}

.text-field-counter {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin: 0;
  white-space: nowrap;
}
</style>
