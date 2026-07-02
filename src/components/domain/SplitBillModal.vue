<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import type { Transaction } from '@/types'
import { formatRupiah } from '@/utils/formatters'
import { paymentMethodApi } from '@/services/api/paymentMethod.api'

interface Props {
  isOpen: boolean
  transactions: Transaction[]
  isLoading?: boolean
  loadingDetailIds?: string[]
}

interface Emits {
  close: []
  recordPayment: [
    transactionId: string,
    paymentMethod: string,
    paymentMethodId: string | null,
    paidItems: Array<{ item_id: string; item_subtotal: number; quantity: number }>
  ]
  searchTransactions: [query: string]
  loadItems: [transactionId: string]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const selectedItemsByTransaction = ref<Record<string, string[]>>({})
const paymentMethodByTransaction = ref<Record<string, string>>({})
const paymentMethodIdByTransaction = ref<Record<string, string | null>>({})
const paymentMethods = ref<Array<{ id: string; name: string; icon: string }>>([])
const isLoadingMethods = ref(false)
const isSubmitting = ref(false)
const isSearching = ref(false)
const searchQuery = ref('')
let searchDebounce: ReturnType<typeof setTimeout> | null = null

const getTransactionStatus = (status: string) => {
  const statusMap: Record<string, string> = {
    open: 'Open',
    partial_paid: 'Partial Paid',
    paid: 'Paid',
    cancelled: 'Cancelled'
  }
  return statusMap[status] || status
}


const getTransactionCustomer = (transaction: Transaction) =>
  transaction.customerName || (transaction.customerId ? `Customer ${transaction.customerId.slice(0, 6)}` : 'Walk In')

const getItemName = (item: any) => item.productName || item.product_name || 'Item'
const isItemPaid = (item: any) => (item.paymentStatus || item.payment_status) === 'paid'

const loadPaymentMethods = async () => {
  try {
    isLoadingMethods.value = true
    const response = await paymentMethodApi.getPaymentMethods()
    paymentMethods.value = response.data.filter(m => m.status === 'active')
    if (paymentMethods.value.length > 0) {
      const defaultMethod = paymentMethods.value[0]
      if (defaultMethod) {
        for (const txn of props.transactions) {
          if (!paymentMethodByTransaction.value[txn.id]) {
            paymentMethodByTransaction.value[txn.id] = defaultMethod.name
            paymentMethodIdByTransaction.value[txn.id] = defaultMethod.id
          }
        }
      }
    }
  } catch (error) {

  } finally {
    isLoadingMethods.value = false
  }
}

const getSelectedItems = (transactionId: string) => selectedItemsByTransaction.value[transactionId] || []

const getPaymentMethod = (transactionId: string) =>
  paymentMethodByTransaction.value[transactionId] || paymentMethods.value[0]?.name || 'Cash'

const getPaymentMethodId = (transactionId: string) =>
  paymentMethodIdByTransaction.value[transactionId] || paymentMethods.value[0]?.id || null

const setPaymentMethod = (transactionId: string, method: string) => {
  const selected = paymentMethods.value.find(m => m.name === method)
  paymentMethodByTransaction.value = {
    ...paymentMethodByTransaction.value,
    [transactionId]: method
  }
  paymentMethodIdByTransaction.value = {
    ...paymentMethodIdByTransaction.value,
    [transactionId]: selected?.id || null
  }
}

const toggleItemSelection = (transactionId: string, itemId: string) => {
  const current = new Set(getSelectedItems(transactionId))
  if (current.has(itemId)) {
    current.delete(itemId)
  } else {
    current.add(itemId)
  }
  selectedItemsByTransaction.value = {
    ...selectedItemsByTransaction.value,
    [transactionId]: Array.from(current)
  }
}

const getCalculatedAmount = (transaction: Transaction) => {
  const selectedItems = transaction.items.filter(item => getSelectedItems(transaction.id).includes(item.id))
  return selectedItems.reduce((sum, item) => sum + item.subtotal, 0)
}

const handleRecordPayment = async (transaction: Transaction) => {
  const selectedIds = getSelectedItems(transaction.id)
  if (selectedIds.length === 0) return

  const selectedItems = transaction.items.filter(item => selectedIds.includes(item.id) && !isItemPaid(item))
  const calculatedAmount = selectedItems.reduce((sum, item) => sum + item.subtotal, 0)
  if (calculatedAmount <= 0) return

  isSubmitting.value = true
  try {
    const paidItems = selectedItems.map(item => ({
      item_id: item.id,
      item_subtotal: item.subtotal,
      quantity: item.quantity
    }))

    emit(
      'recordPayment',
      transaction.id,
      getPaymentMethod(transaction.id),
      getPaymentMethodId(transaction.id),
      paidItems
    )

    selectedItemsByTransaction.value = {
      ...selectedItemsByTransaction.value,
      [transaction.id]: []
    }
  } finally {
    isSubmitting.value = false
  }
}

const handleClose = () => {
  selectedItemsByTransaction.value = {}
  paymentMethodByTransaction.value = {}
  paymentMethodIdByTransaction.value = {}
  emit('close')
}

watch(searchQuery, (value) => {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    isSearching.value = true
    emit('searchTransactions', value.trim())
    setTimeout(() => {
      isSearching.value = false
    }, 2000)
  }, 300)
})

watch(
  () => props.transactions,
  (transactions) => {
    const nextSelection: Record<string, string[]> = {}
    for (const txn of transactions) {
      const validIds = (txn.items ?? [])
        .filter(item => !isItemPaid(item))
        .map(item => item.id)
      const selectedIds = getSelectedItems(txn.id)
      nextSelection[txn.id] = selectedIds.filter(id => validIds.includes(id))

      // Lazy-load items for transactions that don't have them yet
      if ((!txn.items || txn.items.length === 0) && !(props.loadingDetailIds ?? []).includes(txn.id)) {
        emit('loadItems', txn.id)
      }
    }
    selectedItemsByTransaction.value = nextSelection
  },
  { deep: true, immediate: true }
)

watch(
  () => props.isLoading,
  (loading) => {
    if (loading) {
      selectedItemsByTransaction.value = {}
    }
  }
)

onMounted(() => {
  loadPaymentMethods()
})

onUnmounted(() => {
  if (searchDebounce) clearTimeout(searchDebounce)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="menu-slide">
      <div v-if="isOpen" class="modal-overlay" @click="handleClose">
        <div class="modal-container modal-fixed" @click.stop>
          <div class="modal-header">
            <h2 class="modal-title">Split Bill</h2>
            <button class="btn-close" @click="handleClose"><AppIcon name="x" :size="16" /></button>
          </div>

          <div class="modal-body">
            <div class="search-bar">
              <div class="search-input">
                <AppIcon name="search" :size="15" class="search-icon" />
                <input v-model="searchQuery" type="text" placeholder="Cari nama customer..." />
                <button v-if="searchQuery" class="search-clear" type="button" @click="searchQuery = ''"><AppIcon name="x" :size="14" /></button>
              </div>
            </div>

            <div v-if="transactions.length === 0" class="empty-state">
              <AppIcon name="inbox" :size="40" class="empty-icon" />
              <p>Belum ada transaksi</p>
            </div>

            <div v-else>
              <div v-if="isLoading || isSearching" class="transaction-loading">
                <div class="loading-spinner"></div>
                <div class="loading-text">Memuat transaksi...</div>
              </div>
              <div class="transaction-list">
                <div v-for="txn in transactions" :key="txn.id" class="transaction-item">
                  <div class="transaction-header">
                    <div class="transaction-meta">
                      <span class="transaction-customer">
                        {{ getTransactionCustomer(txn) }}
                        <span class="transaction-number">{{ txn.transactionNumber || `HOLD-${txn.id.slice(0, 8)}` }}</span>
                      </span>
                      <span class="transaction-status" :class="`status-${txn.status}`">
                        {{ getTransactionStatus(txn.status) }}
                      </span>
                    </div>
                    <div class="transaction-amount">
                      <span class="total">{{ formatRupiah(txn.total) }}</span>
                      <span class="remaining">Remaining: {{ formatRupiah(Math.max(0, txn.total - (txn.amount_paid || 0))) }}</span>
                    </div>
                  </div>

                  <div class="transaction-content">
                    <div class="items-section">
                      <div class="section-title">Items (pilih yang mau dibayar)</div>
                      <div v-if="(loadingDetailIds ?? []).includes(txn.id) || !txn.items?.length" class="items-loading">
                        <div class="loading-spinner"></div>
                        <span>Memuat items...</span>
                      </div>
                      <div v-else class="items-list">
                        <label
                          v-for="item in txn.items"
                          :key="item.id"
                          class="item-checkbox"
                          :class="{ paid: isItemPaid(item) }"
                        >
                          <input
                            type="checkbox"
                            :checked="getSelectedItems(txn.id).includes(item.id)"
                            :disabled="isItemPaid(item)"
                            @change="toggleItemSelection(txn.id, item.id)"
                          />
                          <div class="item-info">
                            <span class="item-name">{{ getItemName(item) }}</span>
                            <span class="item-price">{{ formatRupiah(item.subtotal) }}</span>
                          </div>
                          <span v-if="isItemPaid(item)" class="paid-chip">PAID</span>
                        </label>
                      </div>
                    </div>

                    <div class="payment-side">
                      <div class="amount-display">
                        <div class="amount-label">Total dibayar</div>
                        <div class="amount-value">{{ formatRupiah(getCalculatedAmount(txn)) }}</div>
                        <div class="amount-help">Dihitung dari item yang dipilih</div>
                      </div>

                      <div class="form-group">
                        <label>Payment Method</label>
                        <select
                          :value="getPaymentMethod(txn.id)"
                          class="input"
                          :disabled="isLoadingMethods || paymentMethods.length === 0"
                          @change="setPaymentMethod(txn.id, ($event.target as HTMLSelectElement).value)"
                        >
                          <option v-if="isLoadingMethods" disabled value="">Loading...</option>
                          <option v-else-if="paymentMethods.length === 0" disabled value="">No methods</option>
                          <option v-for="method in paymentMethods" :key="method.id" :value="method.name">
                            {{ method.icon }} {{ method.name }}
                          </option>
                        </select>
                      </div>

                      <div class="payment-summary">
                        <div class="summary-row">
                          <span class="label">Total</span>
                          <span class="value">{{ formatRupiah(txn.total) }}</span>
                        </div>
                        <div class="summary-row">
                          <span class="label">Remaining</span>
                          <span class="value">{{ formatRupiah(Math.max(0, txn.total - (txn.amount_paid || 0))) }}</span>
                        </div>
                      </div>

                      <button
                        class="btn btn-primary full"
                        @click="handleRecordPayment(txn)"
                        :disabled="isSubmitting || getSelectedItems(txn.id).length === 0 || getCalculatedAmount(txn) <= 0"
                      >
                        <AppIcon v-if="isSubmitting" name="loader" :size="14" :spin="true" />
                        {{ isSubmitting ? 'Processing...' : 'Record Payment' }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
 .menu-slide-enter-active,
 .menu-slide-leave-active {
   transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
 }

 .menu-slide-enter-from,
 .menu-slide-leave-to {
   opacity: 0;
   background: rgba(0, 0, 0, 0);
 }

 .menu-slide-enter-active .modal-container,
 .menu-slide-leave-active .modal-container {
   transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
 }

 .menu-slide-enter-from .modal-container,
 .menu-slide-leave-to .modal-container {
   transform: translateY(100%);
 }

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 2000;
}

.modal-container {
  background: white;
  width: 100%;
  max-height: 90dvh;
  border-radius: 20px 20px 0 0;
  display: flex;
  flex-direction: column;
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  height: 78dvh;
}

.modal-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(123, 47, 190, 0.12);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-size: 1rem;
  font-weight: 800;
  color: var(--color-text-primary);
  margin: 0;
}

.btn-close {
  border: none;
  background: transparent;
  font-size: 1rem;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.search-bar {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.search-input {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  border: 1.5px solid rgba(123, 47, 190, 0.2);
  border-radius: 12px;
  background: rgba(123, 47, 190, 0.06);
}

.search-input input {
  border: none;
  background: transparent;
  outline: none;
  flex: 1;
  font-size: 0.9rem;
  color: var(--color-text-primary);
}

.search-icon {
  font-size: 1rem;
  opacity: 0.7;
}

.search-clear {
  border: none;
  background: rgba(123, 47, 190, 0.12);
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  padding: 0.2rem 0.45rem;
  border-radius: 8px;
  cursor: pointer;
}

.transaction-loading {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 0.9rem;
  border: 1px solid rgba(123, 47, 190, 0.2);
  border-radius: 12px;
  background: rgba(123, 47, 190, 0.06);
  color: var(--color-text-secondary);
  font-weight: 600;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  border: 2px solid rgba(123, 47, 190, 0.2);
  border-top-color: var(--brand-primary);
  animation: spin 0.9s linear infinite;
}

.loading-text {
  font-size: 0.8rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  color: var(--color-text-secondary);
  padding: 2rem 0;
}

.empty-icon {
  font-size: 2rem;
}

.transaction-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.transaction-item {
  background: white;
  border: 1.5px solid rgba(123, 47, 190, 0.15);
  border-radius: 12px;
  padding: 1rem;
  transition: all 0.3s ease;
}

.transaction-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.transaction-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.transaction-customer {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--color-text-primary);
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  background: rgba(123, 47, 190, 0.12);
  border: 1px solid rgba(123, 47, 190, 0.25);
}

.transaction-number {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  letter-spacing: 0.04em;
}

.transaction-status {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.status-open {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
  border: 1px solid rgba(59, 130, 246, 0.25);
}

.status-partial_paid {
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.status-paid {
  background: rgba(16, 185, 129, 0.12);
  color: #065f46;
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.status-cancelled {
  background: rgba(239, 68, 68, 0.1);
  color: #b91c1c;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.transaction-amount {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.transaction-amount .total {
  font-weight: 700;
  font-size: 0.95rem;
}

.transaction-amount .remaining {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.transaction-content {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  gap: 1rem;
  margin-top: 0.75rem;
}

.section-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  letter-spacing: 0.04em;
  margin-bottom: 0.5rem;
}

.items-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  color: var(--color-text-secondary);
  font-size: 0.8rem;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
}

.item-checkbox {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(123, 47, 190, 0.15);
  cursor: pointer;
  transition: all 0.2s ease;
}

.item-checkbox.paid {
  background: rgba(123, 47, 190, 0.06);
  border-style: dashed;
  cursor: not-allowed;
  opacity: 0.8;
}

.item-checkbox input {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: var(--brand-primary);
  flex-shrink: 0;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  flex: 1;
}

.item-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.item-price {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--brand-primary);
}

.paid-chip {
  margin-left: auto;
  font-size: 0.65rem;
  font-weight: 800;
  color: #0f766e;
  background: rgba(20, 184, 166, 0.15);
  border: 1px solid rgba(20, 184, 166, 0.3);
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  letter-spacing: 0.06em;
}

.payment-side {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.amount-display {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.875rem;
  background: linear-gradient(135deg, rgba(123, 47, 190, 0.08) 0%, rgba(52, 211, 153, 0.05) 100%);
  border: 1.5px solid rgba(123, 47, 190, 0.2);
  border-radius: 10px;
}

.amount-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  letter-spacing: 0.04em;
}

.amount-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.amount-help {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.payment-summary {
  background: rgba(123, 47, 190, 0.05);
  border-left: 3px solid var(--brand-primary);
  padding: 0.75rem;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.input {
  border: 1px solid rgba(123, 47, 190, 0.2);
  border-radius: 10px;
  padding: 0.6rem 0.75rem;
  font-size: 0.9rem;
  background: white;
}

.btn {
  padding: 0.6rem 0.75rem;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
}

.btn-primary {
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(123, 47, 190, 0.25);
}

.btn.full {
  width: 100%;
}

@media (min-width: 1024px) {
  .modal-container {
    max-height: 85dvh;
    border-radius: 18px 18px 0 0;
    height: 80dvh;
  }

  .transaction-list {
    max-height: unset;
  }
}

@media (max-width: 900px) {
  .transaction-content {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .modal-container {
    height: 82dvh;
  }
}
</style>
