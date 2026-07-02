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
  if (!shift.value) return { totalRevenue: 0, totalExpenses: 0, totalDiscount: 0, totalItems: 0 }
  let totalRevenue = 0
  let totalDiscount = 0
  let totalItems = 0
  transactions.value.forEach((t: any) => {
    totalRevenue += t.total || 0
    totalDiscount += (t.itemDiscounts || 0) + (t.globalDiscountAmount || 0)
    if (t.items?.length > 0) {
      totalItems += t.items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0)
    } else {
      totalItems += t.itemCount || 0
    }
  })
  return { totalRevenue, totalExpenses: shift.value.total_expenses || 0, totalDiscount, totalItems }
})

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
          <div>
            <h2 class="shift-date">{{ formatDateJakarta(shift.opened_at) }}</h2>
            <p class="shift-time">
              {{ formatTimeJakarta(shift.opened_at) }}
              <span v-if="shift.status !== 'active'"> – {{ formatTimeJakarta(shift.closed_at || '') }}</span>
              <span v-else> – sekarang</span>
            </p>
          </div>
          <StatusBadge
            :status="shift.status"
            :label="shift.status === 'active' ? 'Aktif' : 'Ditutup'"
            :variant="shift.status === 'active' ? 'success' : 'neutral'"
          />
        </div>
        <div class="shift-detail-row">
          <span class="detail-label">Kasir</span>
          <span class="detail-value">{{ shift.cashier_name }}</span>
        </div>
      </BaseCard>

      <!-- Summary -->
      <BaseCard>
        <template #header>
          <h3 class="section-title">Summary</h3>
        </template>
        <div class="summary-grid">
          <div class="stat-card items">
            <AppIcon name="menu" :size="22" class="stat-icon" />
            <div class="stat-content">
              <p class="stat-label">Total Item Terjual</p>
              <p class="stat-value">{{ summaryStats.totalItems }} <span class="stat-unit">pcs</span></p>
            </div>
          </div>
          <div class="stat-card revenue">
            <AppIcon name="banknote" :size="22" class="stat-icon" />
            <div class="stat-content">
              <p class="stat-label">Total Revenue</p>
              <p class="stat-value">{{ formatRupiah(summaryStats.totalRevenue) }}</p>
            </div>
          </div>
          <div class="stat-card expenses">
            <AppIcon name="trend-down" :size="22" class="stat-icon" />
            <div class="stat-content">
              <p class="stat-label">Total Pengeluaran</p>
              <p class="stat-value">{{ formatRupiah(summaryStats.totalExpenses) }}</p>
            </div>
          </div>
          <div class="stat-card discount">
            <AppIcon name="percent" :size="22" class="stat-icon" />
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
          <h3 class="section-title">Daftar Transaksi</h3>
        </template>

        <!-- Empty -->
        <div v-if="transactions.length === 0" class="empty-state">
          <AppIcon name="inbox" :size="40" class="empty-icon" />
          <p>Tidak ada transaksi di shift ini</p>
        </div>

        <!-- List -->
        <div v-else class="transaction-list">
          <div
            v-for="transaction in transactions"
            :key="transaction.id"
            class="transaction-card"
            @click="goToTransactionDetail(transaction.id)"
          >
            <div class="transaction-header">
              <div class="transaction-meta">
                <span class="transaction-number">{{ transaction.transactionNumber }}</span>
                <span class="transaction-time">
                  {{ formatTimeJakarta(transaction.paidAt || transaction.createdAt) }}
                </span>
              </div>
            </div>

            <div class="transaction-info-row">
              <span class="transaction-customer" :class="{ 'is-walkin': !transaction.customerName }">
                <AppIcon name="user" :size="11" />
                {{ transaction.customerName || 'Walk In' }}
              </span>
              <span class="items-preview">{{ transaction.itemCount ?? transaction.items?.length ?? 0 }} item</span>
            </div>

            <div class="transaction-footer">
              <span class="transaction-total">{{ formatRupiah(transaction.total) }}</span>
              <div class="footer-right">
                <StatusBadge
                  :status="transaction.status"
                  :label="({ paid: 'Lunas', completed: 'Selesai', cancelled: 'Dibatalkan', open: 'Belum Lunas', partial_paid: 'Sebagian', draft: 'Draft' } as Record<string, string>)[transaction.status] || transaction.status"
                  :variant="(({ paid: 'success', completed: 'success', cancelled: 'danger', open: 'info', partial_paid: 'warning', draft: 'neutral' } as Record<string, 'neutral' | 'success' | 'warning' | 'danger' | 'info'>)[transaction.status]) || 'neutral'"
                />
                <span class="view-detail">Detail →</span>
              </div>
            </div>

            <!-- Edit button (active shift only) -->
            <div v-if="isShiftActive" class="transaction-edit-btn" @click.stop>
              <BaseButton variant="secondary" size="sm" @click="openEditModal(transaction)">
                <AppIcon name="edit" :size="13" /> Edit
              </BaseButton>
            </div>
          </div>
        </div>
      </BaseCard>
    </div>

    <!-- Edit Modal -->
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
}

.shift-detail-row {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.detail-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-weight: 700;
  letter-spacing: 0.05em;
}

.detail-value {
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  font-weight: 600;
}

/* Section title (inside BaseCard header slot) */
.section-title {
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

/* Summary grid */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
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
}

.stat-card:hover {
  border-color: rgba(123, 47, 190, 0.2);
}

.stat-icon { font-size: 1.25rem; flex-shrink: 0; }

.stat-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-weight: 600;
  letter-spacing: 0.04em;
  margin: 0;
}

.stat-value {
  font-size: var(--font-size-xl);
  font-weight: 800;
  line-height: var(--line-height-tight);
  margin: 0.2rem 0 0 0;
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-unit {
  font-size: var(--font-size-sm);
  font-weight: 600;
  opacity: 0.7;
}

/* Transaction list */
.transaction-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.transaction-card {
  padding: var(--spacing-3);
  padding-right: var(--spacing-10);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  background: var(--color-surface-0);
  cursor: pointer;
  transition: all var(--transition-duration-short) var(--transition-standard);
  position: relative;
}

.transaction-card:hover {
  border-color: rgba(123, 47, 190, 0.2);
  box-shadow: var(--shadow-2);
  background: rgba(123, 47, 190, 0.02);
}

.transaction-card:active { transform: scale(0.99); }

.transaction-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-2);
  gap: var(--spacing-2);
}

.transaction-meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  flex: 1;
  min-width: 0;
}

.transaction-number {
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text-primary);
  font-family: monospace;
  flex-shrink: 0;
}

.transaction-time {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  font-weight: 500;
  white-space: nowrap;
  margin-left: auto;
  flex-shrink: 0;
}

.transaction-info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-2);
}

.transaction-customer {
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

.items-preview {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: 99px;
  padding: 0.1rem 0.5rem;
  white-space: nowrap;
  flex-shrink: 0;
}

.transaction-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--spacing-2);
  border-top: 1px solid var(--color-border-light);
}

.footer-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.transaction-total {
  font-size: var(--font-size-lg);
  font-weight: 800;
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.view-detail {
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  font-weight: 600;
}

.transaction-edit-btn {
  position: absolute;
  top: 50%;
  right: var(--spacing-3);
  transform: translateY(-50%);
}

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

.empty-state p {
  font-size: var(--font-size-base);
  margin: 0;
}

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

.loading-state p {
  font-size: var(--font-size-sm);
  margin: 0;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Responsive */
@media (max-width: 768px) {
  .sticky-header { padding: var(--spacing-2) var(--spacing-3); }
  .container { padding: var(--spacing-3); }
  .shift-info-header { flex-direction: column; gap: var(--spacing-2); align-items: flex-start; }
  .transaction-header { flex-direction: column; align-items: flex-start; }
}
</style>
