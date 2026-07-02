<template>
  <div v-if="shiftStore.isShiftActive" class="shift-income">
    <div class="income-item">
      <span class="income-label">Pendapatan Shift:</span>
      <span class="income-value">{{ formatCurrency(shiftStore.shiftIncome) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useShiftStore } from '@/stores/shift'
import { formatCurrency } from '@/utils/formatters'

const shiftStore = useShiftStore()
</script>

<style scoped>
.shift-income {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.8rem;
  background: linear-gradient(135deg, rgba(123, 47, 190, 0.1) 0%, rgba(52, 211, 153, 0.1) 100%);
  border-radius: 6px;
  border: 1px solid rgba(123, 47, 190, 0.2);
  white-space: nowrap;
}

.income-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.income-label {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  letter-spacing: 0.005em;
}

.income-value {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--brand-primary);
}

@media (max-width: 768px) {
  .shift-income {
    padding: 0.35rem 0.6rem;
  }

  .income-label {
    font-size: 0.6rem;
  }

  .income-value {
    font-size: 0.75rem;
  }
}
</style>
