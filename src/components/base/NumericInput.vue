<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue?: number
  min?: number
  max?: number
  step?: number
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 0,
  min: Number.NEGATIVE_INFINITY,
  max: Number.POSITIVE_INFINITY,
  step: 1,
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const value = computed({
  get: () => props.modelValue ?? 0,
  set: (val) => emit('update:modelValue', val)
})

const clamp = (val: number) => Math.min(props.max, Math.max(props.min, val))

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  const num = Number(target.value)
  if (!Number.isNaN(num)) {
    value.value = clamp(num)
  }
}

const stepBy = (delta: number) => {
  value.value = clamp(value.value + delta)
}
</script>

<template>
  <div class="numeric-input" :class="{ 'is-disabled': disabled }">
    <button type="button" class="numeric-input__btn" :disabled="disabled || value <= min" @click="stepBy(-step)">-</button>
    <input
      type="text"
      inputmode="numeric"
      class="numeric-input__field"
      :value="value"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      @input="onInput"
    />
    <button type="button" class="numeric-input__btn" :disabled="disabled || value >= max" @click="stepBy(step)">+</button>
  </div>
</template>

<style scoped>
.numeric-input {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.35rem 0.6rem;
  background: var(--color-surface-0);
}

.numeric-input__btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-light);
  background: var(--color-surface-1);
  font-weight: 700;
  cursor: pointer;
}

.numeric-input__field {
  width: 64px;
  text-align: center;
  border: none;
  outline: none;
  background: transparent;
  font-size: var(--font-size-base);
}

.numeric-input.is-disabled {
  opacity: 0.6;
}

.numeric-input__btn:disabled {
  cursor: not-allowed;
}
</style>
