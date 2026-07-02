<template>
  <div class="shift-control-panel">
    <!-- Shift Income -->
    <div v-if="shiftStore.isShiftActive" class="shift-info">
      <div class="income-display">
        <div class="income-item">
          <span class="income-label">Pendapatan</span>
          <span class="income-value">{{ formatCurrency(pendapatanShift) }}</span>
        </div>
        <div class="income-divider"></div>
        <div class="income-item">
          <span class="income-label">Total Kas</span>
          <span class="income-value kas-value">{{ formatCurrency(totalKas) }}</span>
        </div>
      </div>
    </div>

    <!-- Shift Actions -->
    <div v-if="shiftStore.isShiftActive" class="shift-actions">
      <button
        class="action-btn belanja-btn"
        @click="emit('openExpenseModal')"
        title="Menu Belanja"
      >
        <AppIcon name="cart" :size="14" /> Belanja
      </button>
      <button
        class="action-btn close-btn"
        @click="emit('openCloseModal')"
        title="Tutup Shift"
      >
        <AppIcon name="lock" :size="14" /> Tutup Shift
      </button>
    </div>

    <!-- No Shift Message + Open Button -->
    <div v-else class="no-shift-message">
      <span>Shift belum dibuka</span>
      <button
        class="action-btn open-btn"
        @click="emit('openShiftModal')"
        title="Buka Shift"
      >
        <AppIcon name="unlock" :size="14" /> Buka Shift
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useShiftStore } from '@/stores/shift'
import { shiftApi } from '@/services/api/shift.api'
import { formatCurrency } from '@/utils/formatters'

const shiftStore = useShiftStore()
const pendapatanShift = ref(0)
const totalKas = ref(0)

const emit = defineEmits<{
  openExpenseModal: []
  openCloseModal: []
  openShiftModal: []
}>()

// Refresh pendapatan shift (called on-demand, NOT with interval)
const refreshPendapatanShift = async () => {
  if (!shiftStore.currentShift) {
    pendapatanShift.value = 0
    return
  }

  try {
    const income = await shiftApi.getShiftIncome(shiftStore.currentShift.id)
    pendapatanShift.value = income.pendapatan_shift
    totalKas.value = income.total_kas ?? (shiftStore.currentShift.modal_awal + income.pendapatan_shift)
  } catch (error) {

  }
}

// Watch for shift changes - only refresh once when shift becomes active
watch(
  () => shiftStore.isShiftActive,
  (isActive) => {
    if (isActive && shiftStore.currentShift) {
      // Initial load when shift becomes active
      refreshPendapatanShift()
    } else {
      // Reset when shift closes
      pendapatanShift.value = 0
      totalKas.value = 0
    }
  }
)

onMounted(() => {
  if (shiftStore.isShiftActive) {
    refreshPendapatanShift()
  }
})

// Expose refresh method for parent to call after checkout
defineExpose({
  refreshPendapatanShift
})
</script>

<style scoped>
.shift-control-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.4rem 0.8rem;
  margin: 0.5rem var(--spacing-4) 0;
  position: relative;
  z-index: 10;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(123, 47, 190, 0.08);
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(123, 47, 190, 0.06), 0 1px 4px rgba(0, 0, 0, 0.03);
}

.shift-info {
  flex: 1;
}

.income-display {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.2rem 0.4rem;
}

.income-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.income-divider {
  width: 1px;
  height: 20px;
  background: rgba(123, 47, 190, 0.15);
  flex-shrink: 0;
}

.income-label {
  font-family: var(--font-family-body);
  font-size: 0.58rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.income-value {
  font-family: var(--font-family-body);
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--brand-primary);
  white-space: nowrap;
}

.kas-value {
  color: #059669;
}

.shift-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.action-btn {
  padding: 0.55rem 0.9rem;
  min-height: 44px;
  min-width: 80px;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.72rem;
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s;
  letter-spacing: 0.01em;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  user-select: none;
  position: relative;
  z-index: 1;
}

.belanja-btn {
  background: rgba(123, 47, 190, 0.08);
  color: var(--brand-primary);
  border: 1px solid rgba(123, 47, 190, 0.15);

  &:hover {
    background: rgba(123, 47, 190, 0.15);
    border-color: rgba(123, 47, 190, 0.3);
    box-shadow: 0 2px 6px rgba(123, 47, 190, 0.15);
  }

  &:active {
    opacity: 0.8;
  }
}

.close-btn {
  background: rgba(239, 68, 68, 0.08);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.15);

  &:hover {
    background: rgba(239, 68, 68, 0.15);
    border-color: rgba(239, 68, 68, 0.3);
    box-shadow: 0 2px 6px rgba(239, 68, 68, 0.15);
  }

  &:active {
    opacity: 0.8;
  }
}

.no-shift-message {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.3rem 0.5rem;
  color: var(--color-text-secondary);
  font-size: 0.7rem;
  font-weight: 600;
  flex: 1;
}

.open-btn {
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  color: white;
  border: none;
  box-shadow: 0 2px 8px rgba(123, 47, 190, 0.25);
  margin-left: auto;

  &:hover {
    background: linear-gradient(135deg, var(--brand-primary-dark) 0%, var(--brand-primary-darker) 100%);
    box-shadow: 0 3px 12px rgba(123, 47, 190, 0.35);
  }

  &:active {
    opacity: 0.8;
  }
}

@media (max-width: 1024px) {
  .shift-control-panel {
    padding: 0.35rem 0.7rem;
    margin: 0.4rem var(--spacing-4) 0;
    gap: 0.6rem;
  }

  .income-display {
    padding: 0.25rem 0.4rem;
    gap: 0.35rem;
  }

  .income-label {
    font-size: 0.58rem;
  }

  .income-value {
    font-size: 0.8rem;
  }

  .action-btn {
    padding: 0.3rem 0.5rem;
    font-size: 0.58rem;
  }

  .no-shift-message {
    padding: 0.25rem 0.4rem;
    gap: 0.5rem;
    font-size: 0.65rem;
  }
}

@media (max-width: 768px) {
  .shift-control-panel {
    display: none;
  }
}
</style>
