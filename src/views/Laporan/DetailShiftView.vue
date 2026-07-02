<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { usePullToRefresh } from '@/composables/usePullToRefresh'
import { transactionApi } from '@/services/api/transaction.api'
import { formatRupiah, formatDateJakarta, formatTimeJakarta } from '@/utils/formatters'
import { useSwipeNavigation } from '@/composables/useSwipeNavigation'
import TransactionEditModal from '@/components/domain/TransactionEditModal.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import StatusBadge from '@/components/base/StatusBadge.vue'
import PullToRefreshIndicator from '@/components/common/PullToRefreshIndicator.vue'

const router = useRouter()
const route = useRoute()
const { error: showError } = useToast()

const { pullRefreshOffset, isRefreshing, handleTouchStart, handleTouchMove, handleTouchEnd } = usePullToRefresh({
  cooldown: 3000,
  onRefresh: async () => { await fetchShiftData() }
})

const isLoading = ref(false)
const shiftId = route.params.shiftId as string
const shift = ref<any>(null)
const transactions = ref<Array<any>>([])
const showEditModal = ref(false)
const selectedTransactionForEdit = ref<any>(null)
const currentShiftForEdit = ref<any>(null)

const isShiftActive = computed(() => shift.value?.status === 'active')

const summaryStats = computed(() => {
  if (!shift.value) return {
    totalRevenue: 0, totalExpenses: 0, totalDiscount: 0,
    totalItems: 0, totalNetto: 0, modalAwal: 0, transactionCount: 0
  }
  return {
    totalRevenue:      parseFloat(shift.value.total_sales    || 0),
    totalExpenses:     parseFloat(shift.value.total_expenses || 0),
    totalDiscount:     parseFloat(shift.value.total_discount || 0),
    totalItems:        parseInt(shift.value.total_items       || 0),
    totalNetto:        parseFloat(shift.value.total_netto    || 0),
    modalAwal:         parseFloat(shift.value.modal_awal     || 0),
    transactionCount:  parseInt(shift.value.transaction_count || 0),
  }
})

const getPaymentMethodLabel = (method: string) => {
  const map: Record<string, string> = {
    cash: 'Tunai', qris: 'QRIS', transfer: 'Transfer',
    debit: 'Debit', credit: 'Kredit',
  }
  return map[method?.toLowerCase()] || method || 'Tunai'
}

const getPaymentMethodClass = (method: string) => {
  const map: Record<string, string> = {
    cash: 'pm-cash', qris: 'pm-qris', transfer: 'pm-transfer',
    debit: 'pm-debit', credit: 'pm-credit',
  }
  return map[method?.toLowerCase()] || 'pm-cash'
}

const getItemCount = (t: any) =>
  t.items_count ?? t.itemCount ?? t.items?.length ?? 0

const fetchShiftData = async () => {
  try {
    isLoading.value = true
    const shiftsResponse = await transactionApi.getReportsByShift({ shift_id: shiftId })
    const shiftData = shiftsResponse.data[0]
    if (!shiftData) { showError('Shift tidak ditemukan'); return }
    shift.value = shiftData
    const transactionsResponse = await transactionApi.getTransactionsByShift({
      status: 'paid,completed',
      shift_id: shiftId
    })
    transactions.value = transactionsResponse.data
  } catch (err) {
    showError('Gagal memuat data shift')
  } finally {
    isLoading.value = false
  }
}

const goToTransactionDetail = (transactionId: string) => {
  router.push({ name: 'TransactionDetail', params: { shiftId, transactionId } })
}

const openEditModal = (transaction: any) => {
  selectedTransactionForEdit.value = transaction
  currentShiftForEdit.value = shift.value
  showEditModal.value = true
}

const closeEditModal = () => {
  showEditModal.value = false
  selectedTransactionForEdit.value = null
  currentShiftForEdit.value = null
}

const handleTransactionSaved = async () => {
  await fetchShiftData()
  closeEditModal()
}

useSwipeNavigation({ onSwipeLeft: () => router.back() })
onMounted(fetchShiftData)
</script>

<template>
  <div class="page" @touchstart="handleTouchStart" @touchmove="handleTouchMove" @touchend="handleTouchEnd">
    <PullToRefreshIndicator :pull-refresh-offset="pullRefreshOffset" :is-refreshing="isRefreshing" />

    <!-- Sticky Header -->
    <div class="sticky-header">
      <BaseButton variant="ghost" size="sm" @click="() => router.back()">← Kembali</BaseButton>
      <h1 class="header-title">Detail Shift</h1>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Memuat detail shift...</p>
    </div>

    <!-- Content -->
    <div v-if="!isLoading && shift" class="container">

      <!-- Shift Info -->
      <BaseCard>
        <div class="shift-info-header">
          <div class="shift-info-left">
            <h2 class="shift-date">{{ formatDateJakarta(shift.opened_at) }}</h2>
            <p class="shift-time">
              {{ formatTimeJakarta(shift.opened_at) }}
              <span v-if="shift.status !== 'active'"> – {{ formatTimeJakarta(shift.closed_at || '') }}</span>
              <span v-else class="live-badge">● Live</span>
            </p>
          </div>
          <StatusBadge
            :status="shift.status"
            :label="shift.status === 'active' ? 'Aktif' : 'Ditutup'"
            :variant="shift.status === 'active' ? 'success' : 'neutral'"
          />
        </div>
        <div class="shift-meta-row">
          <div class="shift-meta-item">
            <span class="meta-label">Kasir</span>
            <span class="meta-value">{{ shift.cashier_name }}</span>
          </div>
          <div class="shift-meta-item">
            <span class="meta-label">Modal Awal</span>
            <span class="meta-value">{{ formatRupiah(summaryStats.modalAwal) }}</span>
          </div>
          <div class="shift-meta-item">
            <span class="meta-label">Total Transaksi</span>
            <span class="meta-value">{{ summaryStats.transactionCount }} trx</span>
          </div>
        </div>
      </BaseCard>

      <!-- Summary -->
      <BaseCard>
        <template #header>
          <h3 class="section-title">Ringkasan</h3>
        </template>
        <div class="summary-grid">
          <div class="stat-card items">
            <AppIcon name="menu" :size="20" class="stat-icon" />
            <div class="stat-content">
              <p class="stat-label">Item Terjual</p>
              <p class="stat-value">{{ summaryStats.totalItems }}<span class="stat-unit"> pcs</span></p>
            </div>
          </div>
          <div class="stat-card revenue">
            <AppIcon name="banknote" :size="20" class="stat-icon" />
            <div class="stat-content">
              <p class="stat-label">Total Revenue</p>
              <p class="stat-value">{{ formatRupiah(summaryStats.totalRevenue) }}</p>
            </div>
          </div>
          <div class="stat-card netto">
            <AppIcon name="trending-up" :size="20" class="stat-icon" />
            <div class="stat-content">
              <p class="stat-label">Net Profit</p>
              <p class="stat-value" :class="summaryStats.totalNetto < 0 ? 'negative' : ''">
                {{ formatRupiah(summaryStats.totalNetto) }}
              </p>
            </div>
          </div>
          <div class="stat-card expenses">
            <AppIcon name="trend-down" :size="20" class="stat-icon" />
            <div class="stat-content">
              <p class="stat-label">Pengeluaran</p>
              <p class="stat-value">{{ formatRupiah(summaryStats.totalExpenses) }}</p>
            </div>
          </div>
          <div class="stat-card discount">
            <AppIcon name="percent" :size="20" class="stat-icon" />
            <div class="stat-content">
              <p class="stat-label">Total Diskon</p>
              <p class="stat-value">{{ formatRupiah(summaryStats.totalDiscount) }}</p>
            </div>
          </div>
        </div>
      </BaseCard>

      <!-- Transactions -->
      <BaseCard>
        <template #header>
          <div class="txn-list-header">
            <h3 class="section-title">Daftar Transaksi</h3>
            <span class="txn-count">{{ transactions.length }} transaksi</span>
          </div>
        </template>

        <div v-if="transactions.length === 0" class="empty-state">
          <AppIcon name="inbox" :size="40" class="empty-icon" />
          <p>Tidak ada transaksi di shift ini</p>
        </div>

        <div v-else class="transaction-list">
          <div
            v-for="transaction in transactions"
            :key="transaction.id"
            class="transaction-card"
            @click="goToTransactionDetail(transaction.id)"
          >
            <!-- Row 1: number + time -->
            <div class="txn-row txn-top">
              <span class="txn-number">{{ transaction.transactionNumber }}</span>
              <span class="txn-time">{{ formatTimeJakarta(transaction.paidAt || transaction.createdAt) }}</span>
            </div>

            <!-- Row 2: customer + item count -->
            <div class="txn-row txn-mid">
              <span class="txn-customer" :class="{ 'is-walkin': !transaction.customerName }">
                <AppIcon name="user" :size="11" />
                {{ transaction.customerName || 'Walk In' }}
              </span>
              <span class="items-chip">{{ getItemCount(transaction) }} item</span>
            </div>

            <!-- Row 3: total + payment method + status -->
            <div class="txn-row txn-footer">
              <span class="txn-total">{{ formatRupiah(transaction.total) }}</span>
              <div class="txn-footer-right">
                <span class="pm-chip" :class="getPaymentMethodClass(transaction.paymentMethod)">
                  {{ getPaymentMethodLabel(transaction.paymentMethod) }}
                </span>
                <StatusBadge
                  :status="transaction.status"
                  :label="({ paid: 'Lunas', completed: 'Selesai', cancelled: 'Batal', open: 'Belum Lunas', partial_paid: 'Sebagian', draft: 'Draft' } as Record<string, string>)[transaction.status] || transaction.status"
                  :variant="(({ paid: 'success', completed: 'success', cancelled: 'danger', open: 'info', partial_paid: 'warning', draft: 'neutral' } as Record<string, 'neutral' | 'success' | 'warning' | 'danger' | 'info'>)[transaction.status]) || 'neutral'"
                />
                <BaseButton
                  v-if="isShiftActive"
                  variant="secondary"
                  size="sm"
                  class="edit-btn"
                  @click.stop="openEditModal(transaction)"
                >
                  <AppIcon name="edit" :size="12" /> Edit
                </BaseButton>
              </div>
            </div>
          </div>
        </div>
      </BaseCard>
    </div>

    <TransactionEditModal
      v-if="showEditModal"
      :is-open="showEditModal"
      :transaction="selectedTransactionForEdit"
      :shift="currentShiftForEdit"
      @close="closeEditModal"
      @save="handleTransactionSaved"
    />
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--color-bg-secondary);
  padding-bottom: var(--spacing-4);
}

/* Sticky header */
.sticky-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--color-surface-0);
  border-bottom: 1px solid var(--color-border-light);
  padding: var(--spacing-3) var(--spacing-4);
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.header-title {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
  flex: 1;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--spacing-4);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

/* Shift info */
.shift-info-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-3);
  padding-bottom: var(--spacing-3);
  border-bottom: 1px solid var(--color-border-light);
}

.shift-date {
  font-size: var(--font-size-2xl);
  font-weight: 800;
  line-height: var(--line-height-tight);
  color: var(--color-text-primary);
  margin: 0 0 0.25rem 0;
}

.shift-time {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.live-badge {
  color: var(--brand-primary);
  font-weight: 700;
  font-size: var(--font-size-xs);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }

.shift-meta-row {
  display: flex;
  gap: var(--spacing-4);
  flex-wrap: wrap;
}

.shift-meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.meta-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.meta-value {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  font-weight: 600;
}

/* Section title */
.section-title {
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

/* Summary grid */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--spacing-3);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light);
  background: var(--color-bg-secondary);
  transition: border-color var(--transition-duration-short) var(--transition-standard);

  &:hover { border-color: rgba(27, 107, 58, 0.25); }

  &.netto {
    grid-column: span 2;
    background: rgba(27, 107, 58, 0.04);
    border-color: rgba(27, 107, 58, 0.2);
  }
}

.stat-icon { flex-shrink: 0; color: var(--brand-primary); opacity: 0.8; }

.stat-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin: 0;
}

.stat-value {
  font-size: var(--font-size-lg);
  font-weight: 800;
  line-height: var(--line-height-tight);
  margin: 0.15rem 0 0 0;
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  &.negative {
    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
}

.stat-unit {
  font-size: var(--font-size-sm);
  font-weight: 600;
  opacity: 0.7;
}

/* Transaction list header */
.txn-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.txn-count {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: 99px;
  padding: 0.15rem 0.6rem;
  font-weight: 600;
}

/* Transaction list */
.transaction-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.transaction-card {
  padding: var(--spacing-3);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  background: var(--color-surface-0);
  cursor: pointer;
  transition: all var(--transition-duration-short) var(--transition-standard);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);

  &:hover {
    border-color: rgba(27, 107, 58, 0.25);
    box-shadow: var(--shadow-2);
    background: rgba(27, 107, 58, 0.02);
  }

  &:active { transform: scale(0.99); }
}

.txn-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-2);
}

.txn-number {
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-text-primary);
  font-family: monospace;
}

.txn-time {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-weight: 500;
}

.txn-customer {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);

  &.is-walkin {
    font-weight: 400;
    color: var(--color-text-tertiary);
    font-style: italic;
  }
}

.items-chip {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: 99px;
  padding: 0.1rem 0.5rem;
  white-space: nowrap;
  flex-shrink: 0;
}

.txn-footer {
  padding-top: var(--spacing-2);
  border-top: 1px solid var(--color-border-light);
}

.txn-total {
  font-size: var(--font-size-base);
  font-weight: 800;
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.txn-footer-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  flex-wrap: wrap;
  justify-content: flex-end;
}

/* Payment method chip */
.pm-chip {
  font-size: 0.65rem;
  font-weight: 700;
  border-radius: 99px;
  padding: 0.15rem 0.55rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  flex-shrink: 0;

  &.pm-cash     { background: rgba(34, 197, 94, 0.12); color: #15803d; }
  &.pm-qris     { background: rgba(99, 102, 241, 0.12); color: #4338ca; }
  &.pm-transfer { background: rgba(14, 165, 233, 0.12); color: #0369a1; }
  &.pm-debit    { background: rgba(249, 115, 22, 0.12); color: #c2410c; }
  &.pm-credit   { background: rgba(236, 72, 153, 0.12); color: #be185d; }
}

.edit-btn { flex-shrink: 0; }

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  gap: var(--spacing-2);
  color: var(--color-text-secondary);
}

.empty-icon { opacity: 0.3; color: var(--color-text-tertiary); }
.empty-state p { font-size: var(--font-size-base); margin: 0; }

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: var(--spacing-3);
  color: var(--color-text-secondary);
}

.loading-state p { font-size: var(--font-size-sm); margin: 0; }

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--brand-primary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Responsive */
@media (max-width: 768px) {
  .sticky-header { padding: var(--spacing-2) var(--spacing-3); }
  .container { padding: var(--spacing-3); }
  .shift-info-header { flex-direction: column; gap: var(--spacing-2); align-items: flex-start; }
  .stat-card.netto { grid-column: span 1; }
  .txn-footer-right { gap: var(--spacing-1); }
}
</style>
