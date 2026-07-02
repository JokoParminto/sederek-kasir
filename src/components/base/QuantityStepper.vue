<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue?: number
  min?: number
  max?: number
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 1,
  min: 1,
  max: 999,
  disabled: false
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const value = computed({
  get: () => props.modelValue ?? 1,
  set: (val) => emit('update:modelValue', val)
})

const clamp = (val: number) => Math.min(props.max, Math.max(props.min, val))

const decrease = () => {
  value.value = clamp(value.value - 1)
}

const increase = () => {
  value.value = clamp(value.value + 1)
}
</script>

<template>
  <div class="qty-stepper" :class="{ 'is-disabled': disabled }">
    <button type="button" class="qty-stepper__btn" :disabled="disabled || value <= min" @click="decrease">-</button>
    <span class="qty-stepper__value">{{ value }}</span>
    <button type="button" class="qty-stepper__btn" :disabled="disabled || value >= max" @click="increase">+</button>
  </div>
</template>

<style scoped>
.qty-stepper {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.4rem 0.6rem;
  background: var(--color-surface-0);
}

.qty-stepper__btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-light);
  background: var(--color-surface-1);
  font-weight: 700;
  cursor: pointer;
}

.qty-stepper__value {
  min-width: 28px;
  text-align: center;
  font-weight: 600;
  color: var(--color-text-primary);
}

.qty-stepper.is-disabled {
  opacity: 0.6;
}

.qty-stepper__btn:disabled {
  cursor: not-allowed;
}
</style>
