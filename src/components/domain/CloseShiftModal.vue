<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay">
        <div class="modal-content">
          <!-- Header -->
          <div class="modal-header">
            <h2>Tutup Shift</h2>
            <button class="btn-close" @click="$emit('close')"><AppIcon name="x" :size="16" /></button>
          </div>

          <!-- Body -->
          <div class="modal-body">
            <!-- Shift Summary -->
            <div class="summary-section">
              <div class="section-title">Ringkasan Shift</div>
              <div v-if="isLoadingSummary" class="summary-loading">Memuat ringkasan...</div>

              <div class="summary-card">
                <div class="summary-row">
                  <span class="label">Modal Awal</span>
                  <span class="value">{{ formatCurrency(modalAwal) }}</span>
                </div>
                <div class="summary-divider"></div>
                <div class="summary-row">
                  <span class="label">Total Penjualan</span>
                  <span class="value">{{ formatCurrency(totalPenjualan) }}</span>
                </div>
                <div class="summary-sub">
                  <span class="label">Total Penjualan cash</span>
                  <span class="value">{{ formatCurrency(totalPenjualanCash) }}</span>
                </div>
                <div class="summary-sub">
                  <span class="label">Total Penjualan QRIS</span>
                  <span class="value">{{ formatCurrency(totalPenjualanQris) }}</span>
                </div>
                <div class="summary-divider"></div>
                <div class="summary-row">
                  <span class="label">Total Belanja</span>
                  <span class="value negative">-{{ formatCurrency(totalBelanja) }}</span>
                </div>
                <div class="summary-divider"></div>
                <div class="summary-row total">
                  <span class="label">Pendapatan Bersih</span>
                  <span class="value">{{ formatCurrency(penjualanPos) }}</span>
                </div>
              </div>
            </div>

            <!-- Shopee Food Sales Section -->
            <div class="shopee-food-section">
              <div class="section-title">Penjualan Shopee Food</div>
              <div v-if="isLoadingSummary" class="summary-loading">Memuat ringkasan...</div>

              <div class="form-group">
                <label class="label">Total Penjualan (Rp)</label>
                <input
                  :value="shopeeFoodAmount > 0 ? formatCurrency(shopeeFoodAmount).replace('Rp ', '') : ''"
                  type="text"
                  class="input"
                  placeholder="Rp 0"
                  @input="e => {
                    const rawValue = (e.target as HTMLInputElement).value.replace(/\D/g, '')
                    shopeeFoodAmount = rawValue ? parseInt(rawValue, 10) : 0
                  }"
                />
              </div>
              <div class="form-group inline">
                <label class="label">Diskon/Potongan (%)</label>
                <div class="discount-input-group">
                  <input
                    v-model.number="shopeeFoodDiscount"
                    type="text" inputmode="numeric"
                    class="input small percent"
                    placeholder="0"
                    min="0"
                    max="100"
                    @change="e => {
                      const value = parseFloat((e.target as HTMLInputElement).value)
                      shopeeFoodDiscount = isNaN(value) ? 0 : Math.min(100, Math.max(0, value))
                    }"
                  />
                  <span class="percent-symbol">%</span>
                </div>
              </div>

              <div class="summary-card compact">
                <div class="summary-row total">
                  <span class="label">INCOME BERSIH</span>
                  <span class="value">{{ formatCurrency(netShopeeFoodIncome) }}</span>
                </div>
              </div>
            </div>

            <!-- Actual Cash Input -->
            <div class="actual-section">
              <div class="section-title">Input Kas Nyata</div>
              <div v-if="isLoadingSummary" class="summary-loading">Memuat ringkasan...</div>

              <div class="form-group">
                <label class="label">Kas Nyata (Rp)</label>
                <input
                  :value="formatActualCashDisplay(actualCash)"
                  type="text"
                  class="input"
                  placeholder="Rp 0"
                  @input="handleActualCashInput"
                />
              </div>

              <div class="summary-card">
                <div class="summary-row">
                  <span class="label">Kas Seharusnya</span>
                  <span class="value">{{ formatCurrency(kasSeharusnya) }}</span>
                </div>
                <div class="summary-row">
                  <span class="label">Kas Nyata</span>
                  <span class="value">{{ formatCurrency(actualCash) }}</span>
                </div>
                <div class="summary-row">
                  <span class="label">Selisih</span>
                  <span class="value" :class="{ 'positive': selisih > 0, 'negative': selisih < 0 }">
                    {{ selisih >= 0 ? '+' : '' }}{{ formatCurrency(selisih) }}
                  </span>
                </div>
              </div>

              <div class="summary-card">
                <div class="summary-row">
                  <span class="label">Kas Total</span>
                  <span class="value">{{ formatCurrency(kasTotal) }}</span>
                </div>
                <div class="summary-row">
                  <span class="label">Modal</span>
                  <span class="value negative">-{{ formatCurrency(modalAwal) }}</span>
                </div>
                <div class="summary-row total">
                  <span class="label">Pemasukan Bersih</span>
                  <span class="value">{{ formatCurrency(pemasukanBersih) }}</span>
                </div>
              </div>
            </div>

            <!-- Error Message -->
            <div v-if="errorMessage" class="error-message">
              {{ errorMessage }}
            </div>

            <!-- Success Message -->
            <div v-if="successMessage" class="success-message">
              {{ successMessage }}
            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button
              class="btn-cancel"
              @click="$emit('close')"
              :disabled="isLoading"
            >
              Batal
            </button>
            <button
              class="btn-submit"
              @click="handleCloseShift"
              :disabled="isLoading || actualCash <= 0"
            >
              {{ isLoading ? 'Menutup shift...' : 'Tutup Shift' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useShiftStore } from '@/stores/shift'
import { formatCurrency } from '@/utils/formatters'
import { shiftApi } from '@/services/api/shift.api'

interface Props {
  isOpen: boolean
}

interface Emits {
  close: []
  closed: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const router = useRouter()
const shiftStore = useShiftStore()

const actualCash = ref(0)
const shopeeFoodAmount = ref(0)
const shopeeFoodDiscount = ref(0)
const shiftSummary = ref<any | null>(null)
const isLoadingSummary = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const formatActualCashDisplay = (value: number | null) => {
  if (!value || value <= 0) return ''
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const handleActualCashInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const rawValue = input.value.replace(/\D/g, '')
  actualCash.value = rawValue ? parseInt(rawValue, 10) : 0
}

const shopeeFoodDiscountNominal = computed(() => {
  const gross = shopeeFoodAmount.value
  const discountPercent = shopeeFoodDiscount.value
  return (gross * discountPercent) / 100
})

const netShopeeFoodIncome = computed(() => {
  const gross = shopeeFoodAmount.value
  const discountNominal = shopeeFoodDiscountNominal.value
  return Math.max(0, gross - discountNominal)
})

const modalAwal = computed(() => Number(shiftSummary.value?.modal_awal || 0))
const totalPenjualan = computed(() => Number(shiftSummary.value?.total_sales_income || 0))
const totalPenjualanCash = computed(() => Number(shiftSummary.value?.cash_income || 0))
const totalPenjualanQris = computed(() => Number(shiftSummary.value?.qris_income || 0))
const totalBelanja = computed(() => Number(shiftSummary.value?.total_expenses || 0))
// Pendapatan bersih POS = penjualan - belanja (tidak termasuk modal awal)
const penjualanPos = computed(() => totalPenjualan.value - totalBelanja.value)
// Kas yang seharusnya ada di laci = modal awal + penjualan cash - belanja
const kasSeharusnya = computed(() => modalAwal.value + totalPenjualanCash.value - totalBelanja.value)
// Total kas yang seharusnya ada = modal awal + pendapatan bersih
const kasTotal = computed(() => modalAwal.value + penjualanPos.value)
const pemasukanBersih = computed(() =>
  Number(shiftSummary.value?.net_income ?? (kasTotal.value - modalAwal.value))
)

const selisih = computed(() => {
  if (actualCash.value === 0) return 0
  return actualCash.value - kasSeharusnya.value
})

const handleCloseShift = async () => {
  if (!shiftStore.currentShift) {
    errorMessage.value = 'Shift tidak ditemukan'
    return
  }

  if (actualCash.value <= 0) {
    errorMessage.value = 'Kas nyata harus lebih dari 0'
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const result = await shiftStore.closeCurrentShift(actualCash.value, {
      shopee_food_amount: shopeeFoodAmount.value,
      shopee_food_discount_percent: shopeeFoodDiscount.value,
      shopee_food_discount_nominal: shopeeFoodDiscountNominal.value,
      shopee_food_net: netShopeeFoodIncome.value,
    })


    successMessage.value = 'Shift berhasil ditutup'

    // Reset form
    actualCash.value = 0

    // Close modal after 1.5 seconds and redirect
    setTimeout(() => {
      emit('close')
      emit('closed')
      // Optionally redirect to a report page or back to kasir
      // router.push('/kasir')
    }, 1500)
  } catch (error) {

    errorMessage.value = error instanceof Error ? error.message : 'Gagal menutup shift'
  } finally {
    isLoading.value = false
  }
}

// Refresh shift data when modal opens
watch(
  () => props.isOpen,
  async (newIsOpen) => {
    if (newIsOpen) {
      try {
        if (!shiftStore.currentShift?.id) return
        isLoadingSummary.value = true
        shiftSummary.value = await shiftApi.getShiftSummary(shiftStore.currentShift.id)
      } catch (error) {

      } finally {
        isLoadingSummary.value = false
      }
    }
  }
)
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1rem;
}

.modal-content {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 252, 251, 0.98) 100%);
  border-radius: 16px;
  box-shadow: 0 24px 70px rgba(2, 6, 23, 0.28), 0 6px 18px rgba(2, 6, 23, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.5);
  width: 100%;
  max-width: 620px;
  max-height: 90dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  padding: 1.2rem 1.5rem;
  border-bottom: 1px solid rgba(123, 47, 190, 0.12);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;

  h2 {
    margin: 0;
    font-family: var(--font-family-body);
    font-size: 1.05rem;
    font-weight: 800;
    color: var(--color-text-primary);
  }
}

.btn-close {
  border: none;
  background: transparent;
  font-size: 1rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background: rgba(0, 0, 0, 0.06);
    color: var(--color-text-primary);
  }

  &:active {
    transform: scale(0.94);
  }
}

.modal-body {
  padding: 1.25rem 1.6rem 1.6rem;
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

.section-title {
  font-size: 0.75rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: var(--color-text-secondary);
  margin-bottom: 0.6rem;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.summary-card {
  border: 1px solid rgba(123, 47, 190, 0.18);
  border-radius: 16px;
  padding: 0.9rem 1.1rem;
  background: linear-gradient(145deg, rgba(123, 47, 190, 0.08) 0%, rgba(123, 47, 190, 0.03) 100%);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.summary-card + .summary-card {
  margin-top: 0.75rem;
}

.summary-loading {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.5rem;
}

.summary-card.compact {
  padding: 0.75rem 1rem;
}

.summary-row,
.summary-sub {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.summary-row .label,
.summary-sub .label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  font-weight: 600;
}

.summary-row .value,
.summary-sub .value {
  font-size: 0.92rem;
  font-weight: 900;
  color: var(--color-text-primary);
}

.summary-sub {
  padding-left: 0.5rem;
}

.summary-row.total .label,
.summary-row.total .value {
  font-size: 1rem;
  font-weight: 900;
}

.summary-divider {
  height: 1px;
  background: rgba(123, 47, 190, 0.12);
  margin: 0.25rem 0;
}

.value.negative {
  color: #dc2626;
}

.value.positive {
  color: var(--brand-primary-dark);
}


.btn-cancel,
.btn-submit {
  flex: 1;
  padding: 0.7rem 1rem;
  border-radius: 12px;
  font-weight: 700;
}

.summary-section,
.actual-section {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.reconciliation {
  background: linear-gradient(135deg, rgba(123, 47, 190, 0.05) 0%, rgba(52, 211, 153, 0.05) 100%);
  border: 1px solid rgba(123, 47, 190, 0.15);
  border-radius: 8px;
  padding: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.reconciliation-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.78rem;

  &.selisih {
    padding-top: 0.5rem;
    border-top: 1px solid rgba(123, 47, 190, 0.15);

    &.is-match {
      .value {
        color: var(--brand-primary);
        font-weight: 700;
      }
    }
  }

  .label {
    font-weight: 600;
    text-transform: none;
    letter-spacing: 0;
    font-size: 0.8rem;
  }

  .value {
    font-weight: 700;
    color: var(--color-text-primary);

    &.positive {
      color: var(--brand-primary);
    }

    &.negative {
      color: #ef4444;
    }
  }
}

.reconciliation-divider {
  height: 1px;
  background: rgba(123, 47, 190, 0.15);
  margin: 0;
}

.error-message {
  padding: 0.75rem;
  background: rgba(254, 242, 242, 0.9);
  color: #dc2626;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.success-message {
  padding: 0.75rem;
  background: rgba(240, 253, 244, 0.9);
  color: var(--brand-primary);
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  border: 1px solid rgba(123, 47, 190, 0.3);
}

.modal-footer {
  position: sticky;
  bottom: 0;
  background: white;
  z-index: 10;
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(123, 47, 190, 0.12);
  display: flex;
  gap: 0.75rem;
  justify-content: space-between;
  flex-shrink: 0;
}

.btn-cancel,
.btn-submit {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 0.01em;
}

.btn-cancel {
  background: rgba(0, 0, 0, 0.05);
  color: var(--color-text-primary);

  &:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.08);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-submit {
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(123, 47, 190, 0.3);

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, var(--brand-primary-dark) 0%, var(--brand-primary-darker) 100%);
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(123, 47, 190, 0.4);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

/* Animations */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-content {
  animation: modalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes modalSlideIn {
  from {
    transform: scale(0.95) translateY(10px);
    opacity: 0;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

.shopee-food-section {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;

  h3 {
    margin: 0;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--color-text-primary);
    letter-spacing: 0.02em;
  }
}

.input.small {
  padding: 0.5rem 0.6rem;
  font-size: 0.75rem;

  &.percent {
    max-width: 80px;
  }
}

.discount-input-group {
  display: flex;
  align-items: center;
  gap: 0.3rem;

  .percent-symbol {
    font-weight: 600;
    color: var(--color-text-secondary);
    font-size: 0.75rem;
  }
}

.discount-nominal {
  margin-top: 0.25rem;
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  font-weight: 500;

  small {
    color: #f59e0b;
  }
}

.shopee-food-net {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.8rem;
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(251, 146, 60, 0.1) 100%);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 8px;
  font-size: 0.8rem;

  .label {
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .value {
    font-weight: 700;
    color: #f59e0b;
  }
}

@media (max-width: 480px) {
  .modal-content {
    max-width: 95vw;
  }

  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 1.2rem;
  }

  .modal-header h2 {
    font-size: 1rem;
  }

  .btn-cancel,
  .btn-submit {
    padding: 0.6rem 1rem;
    font-size: 0.75rem;
  }
}
</style>
