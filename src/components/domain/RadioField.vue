<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue?: string
  label: string
  value: string
  description?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const isChecked = computed({
  get: () => props.modelValue === props.value,
  set: (checked) => {
    if (checked) {
      emit('update:modelValue', props.value)
    }
  }
})

const handleChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.checked) {
    emit('update:modelValue', props.value)
  }
}
</script>

<template>
  <div class="radio-field" :class="{ 'is-disabled': disabled }">
    <label class="radio-wrapper">
      <input
        type="radio"
        :checked="isChecked"
        :value="value"
        :disabled="disabled"
        class="radio-input"
        @change="handleChange"
      />
      <span class="radio-custom"></span>
      <span class="radio-label">
        {{ label }}
        <span v-if="description" class="radio-description">{{ description }}</span>
      </span>
    </label>
  </div>
</template>

<style scoped>
.radio-field {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: var(--spacing-2) 0;
}

.radio-field.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.radio-wrapper {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  width: 100%;
  gap: var(--spacing-2);
}

.radio-wrapper:active {
  transform: scale(0.98);
}

.radio-input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  width: 0;
  height: 0;
}

.radio-custom {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  border-radius: 50%;
  background: white;
  transition: all 0.2s ease;
  position: relative;
}

.radio-input:checked ~ .radio-custom {
  border-color: var(--color-primary, var(--brand-primary-darker));
  background: white;
}

.radio-input:checked ~ .radio-custom::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary, var(--brand-primary-darker));
}

.radio-input:focus ~ .radio-custom {
  box-shadow: 0 0 0 3px rgba(75, 0, 130, 0.1);
}

.radio-input:disabled ~ .radio-custom {
  background: var(--color-background-secondary, #f3f4f6);
  cursor: not-allowed;
}

.radio-label {
  font-size: 0.95rem;
  color: var(--color-text-primary);
  font-weight: 500;
  line-height: 1.4;
}

.radio-description {
  display: block;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  font-weight: 400;
  margin-top: 2px;
}
</style>
