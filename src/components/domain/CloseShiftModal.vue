<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <div>
              <h2>Tutup Shift</h2>
              <p>{{ authStore.userName || 'Kasir' }}</p>
            </div>
            <button class="btn-close" title="Tutup" @click="$emit('close')"><AppIcon name="x" :size="18" /></button>
          </div>

          <div class="modal-body">
            <div class="summary-section">
              <div class="section-title">Ringkasan Shift</div>
              <div v-if="isLoadingSummary" class="summary-loading">Memuat ringkasan...</div>

              <div class="summary-card">
                <div class="summary-row">
                  <span class="label">Modal Awal</span>
                  <span class="value">{{ formatCurrency(modalAwal) }}</span>
                </div>

                <div class="group-title">Penjualan</div>
                <div class="summary-row">
                  <span class="label">Penjualan Tunai</span>
                  <span class="value">{{ formatCurrency(totalPenjualanCash) }}</span>
                </div>
                <div class="summary-row">
                  <span class="label">Penjualan QRIS</span>
                  <span class="value">{{ formatCurrency(totalPenjualanQris) }}</span>
                </div>

                <label class="money-field">
                  <span>Total Penjualan ShopeeFood</span>
                  <input
                    :value="formatMoneyInput(shopeeFoodAmount)"
                    type="text"
                    inputmode="numeric"
                    placeholder="Rp0"
                    @input="handleShopeeFoodInput"
                  />
                </label>
                <div class="summary-row detail-row">
                  <span class="label">Potongan ShopeeFood 20%</span>
                  <span class="value negative">-{{ formatCurrency(shopeeFoodDiscountNominal) }}</span>
                </div>
                <div class="summary-row detail-row">
                  <span class="label">ShopeeFood Diterima</span>
                  <span class="value">{{ formatCurrency(netShopeeFoodIncome) }}</span>
                </div>
                <p class="calculation-hint">Tidak masuk dalam uang tunai</p>

                <div class="group-title">Pengeluaran</div>
                <div class="summary-row">
                  <span class="label">Total Belanja</span>
                  <span class="value negative">-{{ formatCurrency(totalBelanja) }}</span>
                </div>

                <div class="summary-divider"></div>
                <div class="summary-row grand-total">
                  <span class="label">Total Pendapatan Bersih</span>
                  <span class="value">{{ formatCurrency(pemasukanBersih) }}</span>
                </div>
                <p class="calculation-hint">Tunai + QRIS + ShopeeFood diterima - belanja</p>
              </div>
            </div>

            <div class="actual-section">
              <div class="section-title">Periksa Uang Shift</div>
              <div class="summary-card">
                <div class="group-title first">Kas Tunai</div>
                <div class="summary-row">
                  <span class="label">Seharusnya Ada</span>
                  <span class="value">{{ formatCurrency(kasSeharusnya) }}</span>
                </div>
                <p class="calculation-hint">Modal awal + penjualan tunai - belanja</p>

                <label class="money-field">
                  <span>Hasil Hitung Kasir</span>
                  <input
                    :value="formatActualCashDisplay(actualCash)"
                    type="text"
                    inputmode="numeric"
                    placeholder="Rp0"
                    @input="handleActualCashInput"
                  />
                </label>

                <div v-if="actualCashEntered" class="cash-status" :class="`cash-status--${cashStatus.type}`">
                  <div class="summary-row">
                    <span class="label">{{ cashStatus.label }}</span>
                    <span class="value">{{ formatCurrency(cashStatus.amount) }}</span>
                  </div>
                  <p class="calculation-hint">{{ cashStatus.helper }}</p>
                </div>

                <div class="group-title">Kas Non-Tunai</div>
                <div class="summary-row">
                  <span class="label">Pembayaran QRIS</span>
                  <span class="value">{{ formatCurrency(totalPenjualanQris) }}</span>
                </div>
                <div class="summary-row">
                  <span class="label">ShopeeFood Diterima</span>
                  <span class="value">{{ formatCurrency(netShopeeFoodIncome) }}</span>
                </div>
                <div class="summary-divider"></div>
                <div class="summary-row subtotal-row">
                  <span class="label">Total Non-Tunai</span>
                  <span class="value">{{ formatCurrency(totalNonTunai) }}</span>
                </div>
                <p class="calculation-hint">QRIS + ShopeeFood diterima</p>
              </div>
            </div>

            <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
            <div v-if="successMessage" class="success-message">{{ successMessage }}</div>
          </div>

          <div class="modal-footer">
            <button class="btn-cancel" :disabled="isLoading" @click="$emit('close')">Batal</button>
            <button class="btn-submit" :disabled="isLoading || isLoadingSummary || summaryLoadFailed || !actualCashEntered || actualCash < 0" @click="handleCloseShift">
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
import { useShiftStore } from '@/stores/shift'
import { useAuthStore } from '@/stores/auth'
import { formatCurrency } from '@/utils/formatters'
import { shiftApi } from '@/services/api/shift.api'
import { printCloseShiftReceipt } from '@/services/close-shift-receipt.service'

interface Props {
  isOpen: boolean
}

interface Emits {
  close: []
  closed: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const shiftStore = useShiftStore()
const authStore = useAuthStore()

const actualCash = ref(0)
const actualCashEntered = ref(false)
const shopeeFoodAmount = ref(0)
const shopeeFoodDiscount = ref(20)
const shiftSummary = ref<any | null>(null)
const isLoadingSummary = ref(false)
const summaryLoadFailed = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const formatActualCashDisplay = (value: number | null) => {
  if (value === 0) return actualCashEntered.value ? 'Rp0' : ''
  if (value === null || value < 0) return ''
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
  actualCashEntered.value = rawValue !== ''
  actualCash.value = rawValue ? parseInt(rawValue, 10) : 0
}

const formatMoneyInput = (value: number) => {
  if (value <= 0) return ''
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const handleShopeeFoodInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const rawValue = input.value.replace(/\D/g, '')
  shopeeFoodAmount.value = rawValue ? parseInt(rawValue, 10) : 0
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
const pemasukanBersih = computed(() => {
  const posNet = Number(shiftSummary.value?.net_income ?? (kasTotal.value - modalAwal.value))
  return posNet + netShopeeFoodIncome.value
})
const totalNonTunai = computed(() => totalPenjualanQris.value + netShopeeFoodIncome.value)

const selisih = computed(() => {
  if (!actualCashEntered.value) return 0
  return actualCash.value - kasSeharusnya.value
})

const cashStatus = computed(() => {
  if (selisih.value === 0) {
    return {
      label: 'Uang Tunai Cocok',
      amount: 0,
      type: 'match',
      helper: 'Hasil hitung sama dengan tunai seharusnya',
    }
  }
  if (selisih.value < 0) {
    return {
      label: 'Uang Kurang',
      amount: Math.abs(selisih.value),
      type: 'short',
      helper: 'Hasil hitung lebih kecil dari tunai seharusnya',
    }
  }
  return {
    label: 'Uang Lebih',
    amount: selisih.value,
    type: 'over',
    helper: 'Hasil hitung lebih besar dari tunai seharusnya',
  }
})

const printShiftSummary = async () => {
  if (!shiftSummary.value) return { success: false, message: 'Ringkasan shift tidak tersedia' }
  return printCloseShiftReceipt(shiftSummary.value, {
    cashierName: authStore.userName || '-',
    closedAt: shiftSummary.value.shift?.closed_at,
  })
}

const handleCloseShift = async () => {
  if (!shiftStore.currentShift) {
    errorMessage.value = 'Shift tidak ditemukan'
    return
  }

  if (!actualCashEntered.value || actualCash.value < 0) {
    errorMessage.value = 'Hasil hitung kasir harus diisi dan tidak boleh negatif'
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

    // Print from the authoritative close response, not the earlier preview summary.
    shiftSummary.value = result

    // Auto-print shift summary via customer receipt printer
    const printResult = await printShiftSummary()
    successMessage.value = printResult.success
      ? 'Shift berhasil ditutup dan struk tercetak'
      : `Shift berhasil ditutup, tetapi struk tidak tercetak: ${printResult.message}`

    // Reset form
    actualCash.value = 0
    actualCashEntered.value = false
    shopeeFoodAmount.value = 0

    // Close modal after 1.5 seconds and redirect
    setTimeout(() => {
      emit('close')
      emit('closed')
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
        actualCash.value = 0
        actualCashEntered.value = false
        shopeeFoodAmount.value = 0
        errorMessage.value = ''
        successMessage.value = ''
        shiftSummary.value = null
        summaryLoadFailed.value = false
        isLoadingSummary.value = true
        shiftSummary.value = await shiftApi.getShiftSummary(shiftStore.currentShift.id)
      } catch (error) {
        summaryLoadFailed.value = true
        errorMessage.value = 'Gagal memuat ringkasan shift. Tutup dan buka kembali form untuk mencoba lagi.'
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

.discount-static {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-text-primary);
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

/* Final close-shift layout */
.modal-content {
  max-width: 680px;
  background: var(--color-surface-0);
  border: 1px solid var(--color-border-light);
}

.modal-header {
  padding: 16px 20px;
  border-bottom-color: var(--color-border-light);
  background: var(--color-surface-0);

  p {
    margin: 3px 0 0;
    color: var(--color-text-tertiary);
    font-size: 11px;
  }
}

.btn-close {
  width: 44px;
  height: 44px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface-1);

  &:hover {
    border-color: var(--brand-border-primary);
    background: var(--brand-primary-pale);
    color: var(--color-primary);
  }
}

.modal-body {
  gap: 18px;
  padding: 18px 20px 24px;
  background: var(--color-surface-1);
}

.summary-section,
.actual-section {
  gap: 8px;
}

.section-title {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.summary-card {
  gap: 9px;
  padding: 16px;
  border: 1px solid var(--color-border-light);
  border-radius: 14px;
  background: var(--color-surface-0);
  box-shadow: var(--shadow-1);
}

.group-title {
  margin-top: 7px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border-light);
  color: var(--color-primary-dark);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.group-title.first {
  margin-top: 0;
  padding-top: 0;
  border-top: 0;
}

.summary-row .label,
.summary-sub .label {
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 600;
}

.summary-row .value,
.summary-sub .value {
  flex-shrink: 0;
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 800;
}

.detail-row {
  padding-left: 10px;
}

.summary-divider {
  background: var(--color-border-light);
}

.money-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin-top: 2px;

  > span {
    color: var(--color-text-secondary);
    font-size: 12px;
    font-weight: 700;
  }

  input {
    width: 100%;
    min-height: 48px;
    box-sizing: border-box;
    padding: 0 14px;
    border: 1px solid var(--color-border);
    border-radius: 11px;
    background: var(--color-surface-1);
    color: var(--color-text-primary);
    font-family: var(--font-family-body);
    font-size: 15px;
    font-weight: 700;

    &:focus {
      outline: 2px solid var(--brand-overlay-primary-20);
      border-color: var(--color-primary);
      background: var(--color-surface-0);
    }
  }
}

.calculation-hint {
  margin: -3px 0 2px;
  color: var(--color-text-tertiary);
  font-size: 10px;
  font-style: italic;
  line-height: 1.45;
}

.grand-total,
.subtotal-row {
  .label,
  .value {
    color: var(--color-primary-dark);
    font-size: 14px;
    font-weight: 900;
  }
}

.cash-status {
  margin-top: 2px;
  padding: 11px 12px;
  border: 1px solid var(--color-border);
  border-radius: 11px;

  .calculation-hint { margin: 3px 0 0; }
}

.cash-status--match {
  border-color: #86efac;
  background: #f0fdf4;

  .label, .value { color: #15803d; }
}

.cash-status--short {
  border-color: #fecaca;
  background: #fef2f2;

  .label, .value { color: #b91c1c; }
}

.cash-status--over {
  border-color: #fde68a;
  background: #fffbeb;

  .label, .value { color: #92400e; }
}

.modal-footer {
  padding: 14px 20px calc(14px + env(safe-area-inset-bottom));
  border-top-color: var(--color-border-light);
  background: var(--color-surface-0);
}

.btn-submit {
  min-height: 44px;
  background: var(--brand-gradient-primary);
  box-shadow: var(--brand-shadow-primary);
}

.btn-cancel {
  min-height: 44px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-1);
}

@media (max-width: 600px) {
  .modal-overlay { padding: 0; align-items: flex-end; }
  .modal-content { max-width: 100%; max-height: 95dvh; border-radius: 20px 20px 0 0; }
  .modal-header, .modal-body, .modal-footer { padding-left: 14px; padding-right: 14px; }
  .summary-card { padding: 14px; }
  .summary-row { gap: 10px; }
  .grand-total .label { max-width: 55%; }
}
</style>
