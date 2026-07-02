<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue?: boolean
  label: string
  description?: string
  disabled?: boolean
  id?: string
  name?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  description: '',
  disabled: false,
  id: '',
  name: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const fieldId = computed(() => props.id || `checkbox-${Math.random().toString(36).slice(2, 10)}`)

const isChecked = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const onChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  isChecked.value = target.checked
}
</script>

<template>
  <div class="base-check" :class="{ 'is-disabled': disabled }">
    <label class="base-check__wrapper" :for="fieldId">
      <input
        :id="fieldId"
        :name="name"
        type="checkbox"
        :checked="isChecked"
        :disabled="disabled"
        class="base-check__input"
        @change="onChange"
      />
      <span class="base-check__box"></span>
      <span class="base-check__label">
        {{ label }}
        <span v-if="description" class="base-check__description">{{ description }}</span>
      </span>
    </label>
  </div>
</template>

<style scoped>
.base-check {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: var(--spacing-2) 0;
}

.base-check.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.base-check__wrapper {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  cursor: pointer;
  user-select: none;
  width: 100%;
}

.base-check__input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.base-check__box {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-xs);
  background: var(--color-surface-0);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition-base);
}

.base-check__input:checked ~ .base-check__box {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.base-check__input:checked ~ .base-check__box::after {
  content: '✓';
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.base-check__input:focus-visible ~ .base-check__box {
  box-shadow: 0 0 0 3px rgba(123, 47, 190, 0.12);
}

.base-check__label {
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  font-weight: 500;
}

.base-check__description {
  display: block;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-weight: 400;
  margin-top: 2px;
}
</style>
