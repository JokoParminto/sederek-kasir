<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue?: boolean
  label: string
  description?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const isChecked = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const handleChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  isChecked.value = target.checked
}
</script>

<template>
  <div class="checkbox-field" :class="{ 'is-disabled': disabled }">
    <label class="checkbox-wrapper">
      <input
        type="checkbox"
        :checked="isChecked"
        :disabled="disabled"
        class="checkbox-input"
        @change="handleChange"
      />
      <span class="checkbox-custom"></span>
      <span class="checkbox-label">
        {{ label }}
        <span v-if="description" class="checkbox-description">{{ description }}</span>
      </span>
    </label>
  </div>
</template>

<style scoped>
.checkbox-field {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: var(--spacing-2) 0;
}

.checkbox-field.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  width: 100%;
  gap: var(--spacing-2);
}

.checkbox-wrapper:active {
  transform: scale(0.98);
}

.checkbox-input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  width: 0;
  height: 0;
}

.checkbox-custom {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  border-radius: 4px;
  background: white;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkbox-input:checked ~ .checkbox-custom {
  background: var(--color-primary, var(--brand-primary-darker));
  border-color: var(--color-primary, var(--brand-primary-darker));
}

.checkbox-input:checked ~ .checkbox-custom::after {
  content: '✓';
  color: white;
  font-weight: bold;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkbox-input:focus ~ .checkbox-custom {
  box-shadow: 0 0 0 3px rgba(75, 0, 130, 0.1);
}

.checkbox-input:disabled ~ .checkbox-custom {
  background: var(--color-background-secondary, #f3f4f6);
  cursor: not-allowed;
}

.checkbox-label {
  font-size: 0.95rem;
  color: var(--color-text-primary);
  font-weight: 500;
  line-height: 1.4;
}

.checkbox-description {
  display: block;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  font-weight: 400;
  margin-top: 2px;
}
</style>
