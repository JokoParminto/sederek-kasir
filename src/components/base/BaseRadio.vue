<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue?: string | number
  value: string | number
  label: string
  description?: string
  disabled?: boolean
  id?: string
  name?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  description: '',
  disabled: false,
  id: '',
  name: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const fieldId = computed(() => props.id || `radio-${Math.random().toString(36).slice(2, 10)}`)

const isChecked = computed({
  get: () => props.modelValue === props.value,
  set: (checked) => {
    if (checked) {
      emit('update:modelValue', props.value)
    }
  }
})

const onChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.checked) {
    emit('update:modelValue', props.value)
  }
}
</script>

<template>
  <div class="base-radio" :class="{ 'is-disabled': disabled }">
    <label class="base-radio__wrapper" :for="fieldId">
      <input
        :id="fieldId"
        :name="name"
        type="radio"
        :value="value"
        :checked="isChecked"
        :disabled="disabled"
        class="base-radio__input"
        @change="onChange"
      />
      <span class="base-radio__dot"></span>
      <span class="base-radio__label">
        {{ label }}
        <span v-if="description" class="base-radio__description">{{ description }}</span>
      </span>
    </label>
  </div>
</template>

<style scoped>
.base-radio {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: var(--spacing-2) 0;
}

.base-radio.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.base-radio__wrapper {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  cursor: pointer;
  user-select: none;
  width: 100%;
}

.base-radio__input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.base-radio__dot {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  border-radius: 50%;
  background: var(--color-surface-0);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition-base);
}

.base-radio__input:checked ~ .base-radio__dot {
  border-color: var(--color-primary);
}

.base-radio__input:checked ~ .base-radio__dot::after {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
}

.base-radio__input:focus-visible ~ .base-radio__dot {
  box-shadow: 0 0 0 3px rgba(123, 47, 190, 0.12);
}

.base-radio__label {
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  font-weight: 500;
}

.base-radio__description {
  display: block;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-weight: 400;
  margin-top: 2px;
}
</style>
