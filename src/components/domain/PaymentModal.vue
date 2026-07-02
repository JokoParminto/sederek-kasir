<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { PaymentMethod, SplitPayment } from '@/types'
import { formatRupiah } from '@/utils/formatters'
import { paymentMethodApi } from '@/services/api/paymentMethod.api'
import LoadingOverlay from '@/components/common/LoadingOverlay.vue'

interface Props {
  isOpen: boolean
  total: number
  isLoading?: boolean
}

interface Emits {
  pay: [method: string, details?: SplitPayment | Record<string, any>, paymentMethodId?: string]
  close: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const selectedMethod = ref<PaymentMethod>('cash')
const selectedMethodId = ref<string | null>(null)
const cashAmount = ref(0)
const qrisAmount = ref(0)
const cashInputDisplay = ref('')
const splitCashDisplay = ref('')
const splitQrisDisplay = ref('')
const paymentMethods = ref<Array<{ id: string; name: string; value: PaymentMethod; label: string; icon: string }>>([])
const isLoadingMethods = ref(false)

// Map payment method name to PaymentMethod type
const mapMethodName = (name: string): PaymentMethod => {
  const lowerName = name.toLowerCase()
  if (lowerName === 'cash') return 'cash'
  if (lowerName === 'qris') return 'qris'
  if (lowerName === 'transfer' || lowerName.includes('transfer')) return 'transfer'
  if (lowerName === 'split bill' || lowerName.includes('split')) return 'split'
  return 'cash' // default fallback
}

// Fetch payment methods from API
const fetchPaymentMethods = async () => {
  try {
    isLoadingMethods.value = true

    const response = await paymentMethodApi.getPaymentMethods()



    // Map API response to component format - 100% from database
    const mappedMethods = response.data
      .filter(m => m.status === 'active')
      .map(m => ({
        id: m.id,
        name: m.name,
        value: mapMethodName(m.name),
        label: `${m.icon} ${m.name}`,
        icon: m.icon
      }))


    paymentMethods.value = mappedMethods
    if (mappedMethods.length > 0 && !selectedMethodId.value) {
      const cashMethod = mappedMethods.find(m => m.value === 'cash')
      const defaultMethod = cashMethod || mappedMethods[0]
      if (defaultMethod) {
        selectedMethodId.value = defaultMethod.id || null
        selectedMethod.value = defaultMethod.value || 'cash'
      }
    }

  } catch (error) {

    // Fallback to empty - force user to fix API
    paymentMethods.value = []
  } finally {
    isLoadingMethods.value = false

  }
}

// Load payment methods on mount
onMounted(() => {
  fetchPaymentMethods()
})

// Also refresh when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen && paymentMethods.value.length === 0) {
    fetchPaymentMethods()
  }
})

const splitTotal = computed(() => cashAmount.value + qrisAmount.value)

const isSplitValid = computed(() => Math.abs(splitTotal.value - props.total) < 1)

// Cash payment calculations
const change = computed(() => Math.max(0, cashAmount.value - props.total))

const isCashValid = computed(() => cashAmount.value >= props.total)

const setExactAmount = () => {
  cashAmount.value = props.total
  cashInputDisplay.value = props.total.toLocaleString('id-ID')
}

// Format cash input with thousand separators
const handleCashInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const value = input.value.replace(/\./g, '') // Remove dots
  const numValue = parseInt(value) || 0
  cashAmount.value = numValue
  cashInputDisplay.value = numValue.toLocaleString('id-ID')
}

// Initialize cash display (default 0)
cashInputDisplay.value = ''

const handlePay = () => {
  if (!selectedMethodId.value) return
  const selected = paymentMethods.value.find(m => m.id === selectedMethodId.value)
  const methodName = selected?.name || selectedMethod.value
  const cashName = paymentMethods.value.find(m => m.value === 'cash')?.name || 'Cash'
  const qrisName = paymentMethods.value.find(m => m.value === 'qris')?.name || 'QRIS'
  if (selectedMethod.value === 'cash') {
    if (!isCashValid.value) return
    emit('pay', methodName, {
      [cashName]: cashAmount.value,
    }, selectedMethodId.value || undefined)
  } else if (selectedMethod.value === 'split') {
    if (!isSplitValid.value) return
    emit('pay', methodName, {
      [cashName]: cashAmount.value,
      [qrisName]: qrisAmount.value,
    }, selectedMethodId.value || undefined)
  } else {
    emit('pay', methodName, undefined, selectedMethodId.value || undefined)
  }
}

const setQrisAmount = () => {
  if (selectedMethod.value === 'split') {
    qrisAmount.value = Math.max(0, props.total - cashAmount.value)
  }
}

const setCashAmount = () => {
  if (selectedMethod.value === 'split') {
    cashAmount.value = Math.max(0, props.total - qrisAmount.value)
  }
}

const distributeSplit = () => {
  const half = Math.round(props.total / 2)
  cashAmount.value = half
  qrisAmount.value = props.total - half
  splitCashDisplay.value = half.toLocaleString('id-ID')
  splitQrisDisplay.value = (props.total - half).toLocaleString('id-ID')
}

// Format split cash input
const handleSplitCashInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const value = input.value.replace(/\./g, '') // Remove dots
  const numValue = parseInt(value) || 0
  cashAmount.value = numValue
  splitCashDisplay.value = numValue.toLocaleString('id-ID')
  setQrisAmount()
}

// Format split QRIS input
const handleSplitQrisInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const value = input.value.replace(/\./g, '') // Remove dots
  const numValue = parseInt(value) || 0
  qrisAmount.value = numValue
  splitQrisDisplay.value = numValue.toLocaleString('id-ID')
  setCashAmount()
}

// Initialize split display values
const initializeSplitDisplay = () => {
  if (selectedMethod.value === 'split') {
    splitCashDisplay.value = cashAmount.value > 0 ? cashAmount.value.toLocaleString('id-ID') : ''
    splitQrisDisplay.value = qrisAmount.value > 0 ? qrisAmount.value.toLocaleString('id-ID') : ''
  }
}

// Reset all payment form values when modal opens
const resetPaymentForm = () => {
  selectedMethod.value = 'cash'
  const cashMethod = paymentMethods.value.find(m => m.value === 'cash')
  selectedMethodId.value = cashMethod?.id || paymentMethods.value[0]?.id || null
  cashAmount.value = 0
  qrisAmount.value = 0
  cashInputDisplay.value = ''
  splitCashDisplay.value = ''
  splitQrisDisplay.value = ''
}

// Watch for modal open/close
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    resetPaymentForm()
  }
})

// Watch for method changes to initialize split display
watch(() => selectedMethod.value, () => {
  initializeSplitDisplay()
})
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <LoadingOverlay v-if="isLoading" text="Processing..." />
      <!-- Scrollable Content -->
      <div class="modal-scrollable">
        <!-- Header -->
        <div class="modal-header">
          <h2 class="modal-title">Pilih Metode Pembayaran</h2>
          <button class="btn-close" @click="$emit('close')"><AppIcon name="x" :size="16" /></button>
        </div>

        <!-- Total -->
        <div class="total-display">
          <span>Total Pembayaran:</span>
          <span class="amount">{{ formatRupiah(total) }}</span>
        </div>

        <!-- Payment Methods -->
        <div class="payment-methods">
          <!-- Loading State -->
          <div v-if="isLoadingMethods" class="loading-methods">
            <div class="spinner"></div>
            <p>Memuat metode pembayaran...</p>
          </div>

          <!-- Payment Method Buttons -->
          <template v-else>
            <button
              v-for="method in paymentMethods"
              :key="method.id"
              :class="['method-btn', { active: selectedMethod === method.value }]"
              @click="selectedMethod = method.value; selectedMethodId = method.id"
            >
              <span class="icon">{{ method.icon }}</span>
              <span class="label">{{ method.label }}</span>
            </button>
          </template>
        </div>

        <!-- Cash Payment Form -->
        <div v-if="selectedMethod === 'cash'" class="cash-payment-form">
          <div class="input-group">
            <label class="label">💵 Uang Diterima</label>
            <div class="amount-input">
              <input
                :value="cashInputDisplay"
                type="text"
                class="input-field"
                placeholder="Masukkan jumlah uang"
                @input="handleCashInput"
              />
              <span class="currency">Rp</span>
            </div>
          </div>

          <button class="btn-exact-amount" @click="setExactAmount">
            Uang Pas ({{ formatRupiah(total) }})
          </button>

          <div class="change-display">
            <div class="change-label">Kembalian:</div>
            <div class="change-amount" :class="{ negative: change < 0 }">
              {{ formatRupiah(change) }}
            </div>
          </div>

          <div v-if="!isCashValid" class="cash-warning">
            ⚠ Uang yang diterima kurang dari total pembayaran
          </div>
        </div>

        <!-- Split Payment Form -->
        <div v-if="selectedMethod === 'split'" class="split-payment-form">
          <div class="split-inputs">
            <div class="input-group">
              <label class="label">Cash</label>
              <div class="amount-input">
                <input
                  :value="splitCashDisplay"
                  type="text"
                  class="input-field"
                  placeholder="0"
                  @input="handleSplitCashInput"
                />
                <span class="currency">Rp</span>
              </div>
            </div>

            <div class="plus-sign">+</div>

            <div class="input-group">
              <label class="label">QRIS</label>
              <div class="amount-input">
                <input
                  :value="splitQrisDisplay"
                  type="text"
                  class="input-field"
                  placeholder="0"
                  @input="handleSplitQrisInput"
                />
                <span class="currency">Rp</span>
              </div>
            </div>
          </div>

          <button class="btn-distribute" @click="distributeSplit">
            Bagi 50:50
          </button>

          <div :class="['split-total', { invalid: !isSplitValid }]">
            <div class="split-total-row">
              <span>Total:</span>
              <span>{{ formatRupiah(splitTotal) }}</span>
            </div>
            <div v-if="!isSplitValid" class="split-error">
              ⚠ Harus sama dengan {{ formatRupiah(total) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="modal-footer">
        <button class="btn-cancel" @click="$emit('close')">
          Batal
        </button>
        <button
          class="btn-pay"
          @click="handlePay"
          :disabled="!selectedMethodId || (selectedMethod === 'split' && !isSplitValid) || (selectedMethod === 'cash' && !isCashValid)"
          :class="{ loading: isLoading }"
        >
          {{ isLoading ? 'Processing...' : `Bayar ${formatRupiah(total)}` }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 2000;
  padding: 0;
  animation: fadeIn 0.2s ease;

  @media (min-width: 768px) {
    align-items: center;
    padding: 1rem;
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 20px 20px 0 0;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.2), 0 8px 24px rgba(123, 47, 190, 0.15);
  border: 1px solid rgba(123, 47, 190, 0.1);
  max-width: 460px;
  width: 100%;
  height: auto;
  max-height: 85dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-overflow-scrolling: touch;

  @media (min-width: 768px) {
    height: 700px;
    max-height: 90dvh;
    border-radius: 20px;
  }

  @media (max-width: 767px) {
    width: 100%;
    max-width: 100%;
    border-radius: 20px 20px 0 0;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-scrollable {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-4);
  border-bottom: 1px solid rgba(123, 47, 190, 0.08);
  position: sticky;
  top: 0;
  background: rgba(255, 255, 255, 0.98);
  z-index: 10;
}

.modal-title {
  font-size: 1rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  letter-spacing: -0.01em;
}

.btn-close {
  background: rgba(239, 68, 68, 0.1);
  border: none;
  min-width: 44px;
  min-height: 44px;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  font-size: 1.2rem;
  cursor: pointer;
  color: #dc2626;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  flex-shrink: 0;

  @media (hover: hover) {
    &:hover {
      background: rgba(239, 68, 68, 0.2);
      transform: scale(1.05);
    }
  }

  &:active {
    transform: scale(0.95);
  }
}

.total-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-4);
  background: rgba(240, 253, 244, 0.5);
  font-weight: 600;
  font-size: 0.8rem;
  gap: var(--spacing-4);
  color: var(--color-text-secondary);
}

.amount {
  font-size: 1.4rem;
  font-weight: 900;
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
}

.payment-methods {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  border-bottom: 1px solid rgba(123, 47, 190, 0.08);
  min-height: 120px;
}

.loading-methods {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-3);
  padding: var(--spacing-8);
  color: var(--color-text-secondary);

  p {
    font-size: 0.85rem;
    font-weight: 500;
  }
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(123, 47, 190, 0.1);
  border-top-color: var(--brand-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.method-btn {
  padding: var(--spacing-3);
  border: 1px solid rgba(123, 47, 190, 0.15);
  background: white;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-2);
  text-align: center;

  &:hover {
    border-color: rgba(123, 47, 190, 0.4);
    background: rgba(240, 253, 244, 0.6);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(123, 47, 190, 0.15);
  }

  &.active {
    border-color: transparent;
    background: linear-gradient(135deg, var(--brand-primary) 0%, #a78bfa 100%);
    color: white;
    box-shadow: 0 6px 20px rgba(123, 47, 190, 0.35);
    transform: translateY(-2px);
  }

  &.active:hover {
    background: linear-gradient(135deg, var(--brand-primary-dark) 0%, var(--brand-primary) 100%);
    box-shadow: 0 8px 24px rgba(123, 47, 190, 0.45);
  }
}

.icon {
  font-size: 1.3rem;
}

.label {
  font-weight: 700;
  font-size: 0.75rem;
  letter-spacing: 0.01em;
}

/* Cash Payment Form */
.cash-payment-form {
  padding: var(--spacing-4);
  border-bottom: 1px solid rgba(123, 47, 190, 0.08);
  background: rgba(240, 253, 244, 0.3);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.btn-exact-amount {
  width: 100%;
  padding: 0.5rem;
  background: white;
  border: 1px dashed rgba(123, 47, 190, 0.4);
  color: var(--brand-primary);
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 0.02em;

  &:hover {
    background: linear-gradient(135deg, var(--brand-primary) 0%, #a78bfa 100%);
    color: white;
    border-color: transparent;
    box-shadow: 0 4px 12px rgba(123, 47, 190, 0.25);
  }
}

.change-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: white;
  border-radius: 10px;
  border: 1.5px solid rgba(123, 47, 190, 0.2);
}

.change-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  letter-spacing: 0.02em;
}

.change-amount {
  font-size: 1.2rem;
  font-weight: 900;
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;

  &.negative {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}

.cash-warning {
  padding: 0.6rem 0.75rem;
  background: rgba(254, 242, 242, 0.8);
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  font-size: 0.7rem;
  font-weight: 700;
  text-align: center;
  letter-spacing: 0.01em;
}

.split-payment-form {
  padding: var(--spacing-4);
  border-bottom: 1px solid rgba(123, 47, 190, 0.08);
  background: rgba(240, 253, 244, 0.3);
}

.split-inputs {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.input-group {
  flex: 1;
}

.label {
  display: block;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  margin-bottom: 0.4rem;
  letter-spacing: 0.02em;
}

.amount-input {
  position: relative;
  display: flex;
  align-items: center;
}

.input-field {
  width: 100%;
  padding: 0.55rem 2.5rem 0.55rem 0.75rem;
  border: 1px solid rgba(123, 47, 190, 0.2);
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 700;
  background: white;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:focus {
    outline: none;
    border-color: var(--brand-primary);
    background: white;
    box-shadow: 0 4px 12px rgba(123, 47, 190, 0.15);
  }
}

.currency {
  position: absolute;
  right: 0.75rem;
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  font-weight: 700;
}

.plus-sign {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--color-text-secondary);
  margin-bottom: 1.5rem;
}

.btn-distribute {
  width: 100%;
  padding: 0.5rem;
  background: white;
  border: 1px dashed rgba(123, 47, 190, 0.4);
  color: var(--brand-primary);
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.7rem;
  cursor: pointer;
  margin-bottom: 0.75rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 0.02em;

  &:hover {
    background: linear-gradient(135deg, var(--brand-primary) 0%, #a78bfa 100%);
    color: white;
    border-color: transparent;
    box-shadow: 0 4px 12px rgba(123, 47, 190, 0.25);
  }
}

.split-total {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.65rem 0.75rem;
  background: white;
  border-radius: 10px;
  border: 1px solid rgba(123, 47, 190, 0.2);
  font-weight: 700;
  font-size: 0.8rem;

  &.invalid {
    border-color: #ef4444;
    background: rgba(254, 242, 242, 0.5);
  }
}

.split-total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.split-error {
  display: block;
  width: 100%;
  text-align: center;
  color: #dc2626;
  font-size: 0.7rem;
  font-weight: 700;
}

.modal-footer {
  position: sticky;
  bottom: 0;
  background: rgba(255, 255, 255, 0.98);
  z-index: 10;
  display: flex;
  gap: 0.75rem;
  padding: var(--spacing-4);
  border-top: 1px solid rgba(123, 47, 190, 0.08);
  flex-shrink: 0;
}

.btn-cancel,
.btn-pay {
  flex: 1;
  padding: 0.65rem;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 0.01em;
}

.btn-cancel {
  background: rgba(0, 0, 0, 0.05);
  color: var(--color-text-secondary);
  border: 1px solid rgba(0, 0, 0, 0.08);

  &:hover {
    background: rgba(0, 0, 0, 0.08);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
}

.btn-pay {
  flex: 2;
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  color: white;
  box-shadow: 0 4px 16px rgba(123, 47, 190, 0.3);

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, var(--brand-primary-dark) 0%, var(--brand-primary-darker) 100%);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(123, 47, 190, 0.4);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.loading {
    opacity: 0.7;
  }
}

/* Responsive */
@media (max-width: 768px) {
  .modal-overlay {
    align-items: flex-end;
    padding: 0;
  }

  .modal-content {
    border-radius: 20px 20px 0 0;
    max-height: 85dvh;
  }

  .modal-header {
    padding: 0.75rem;
  }

  .modal-title {
    font-size: 0.9rem;
  }

  .btn-close {
    width: 28px;
    height: 28px;
    font-size: 1rem;
  }

  .total-display {
    padding: 0.75rem;
    font-size: 0.75rem;
  }

  .amount {
    font-size: 1.2rem;
  }

  .payment-methods {
    padding: 0.75rem;
    gap: 0.6rem;
  }

  .method-btn {
    padding: 0.75rem 0.6rem;
  }

  .icon {
    font-size: 1.1rem;
  }

  .label {
    font-size: 0.7rem;
  }

  .cash-payment-form {
    padding: 0.75rem;
    gap: 0.6rem;
  }

  .change-display {
    padding: 0.65rem;
  }

  .change-label {
    font-size: 0.75rem;
  }

  .change-amount {
    font-size: 1.1rem;
  }

  .split-payment-form {
    padding: 0.75rem;
  }

  .split-inputs {
    flex-direction: column;
    gap: 0.6rem;
  }

  .plus-sign {
    display: none;
  }

  .modal-footer {
    padding: 0.75rem;
    gap: 0.6rem;
  }

  .btn-cancel,
  .btn-pay {
    padding: 0.6rem;
    font-size: 0.75rem;
  }
}
</style>
