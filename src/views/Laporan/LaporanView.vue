<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { transactionApi } from '@/services/api/transaction.api'
import { formatRupiah, formatDateJakarta, formatTimeJakarta } from '@/utils/formatters'
import { usePullToRefresh } from '@/composables/usePullToRefresh'
import PullToRefreshIndicator from '@/components/common/PullToRefreshIndicator.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import StatusBadge from '@/components/base/StatusBadge.vue'

const router = useRouter()
const authStore = useAuthStore()
const { error: showError } = useToast()
const isAdmin = computed(() => authStore.userRole === 'admin')

const isLoading = ref(false)

const shifts = ref<Array<{
  shift_id: string
  cashier_name: string
  opened_at: string
  closed_at: string | null
  status: string
  transaction_count: number
  total_items: number
  total_sales: number
  total_discount: number
  total_expenses: number
  total_netto: number
}>>([])

const activeSummaryShift = computed(() => {
  const activeShift = shifts.value.find(s => s.status === 'active')
  if (activeShift) return activeShift
  return shifts.value
    .filter(s => s.status !== 'active')
    .sort((a, b) => new Date(b.closed_at || 0).getTime() - new Date(a.closed_at || 0).getTime())[0] || null
})

const summaryStats = computed(() => {
  if (!activeSummaryShift.value) return { totalRevenue: 0, totalExpenses: 0, totalDiscount: 0, totalNetto: 0, totalItems: 0, totalTransactions: 0 }
  return {
    totalRevenue: activeSummaryShift.value.total_sales,
    totalExpenses: activeSummaryShift.value.total_expenses,
    totalDiscount: activeSummaryShift.value.total_discount || 0,
    totalNetto: activeSummaryShift.value.total_netto || 0,
    totalItems: activeSummaryShift.value.total_items || 0,
    totalTransactions: activeSummaryShift.value.transaction_count || 0,
  }
})

const fetchShifts = async () => {
  try {
    isLoading.value = true
    const response = await transactionApi.getReportsByShift({})
    shifts.value = response.data
  } catch (err) {
    showError('Gagal memuat data laporan')
  } finally {
    isLoading.value = false
  }
}

const goToDetailShift = (shiftId: string) => {
  router.push({ name: 'DetailShift', params: { shiftId } })
}

const { pullRefreshOffset, isRefreshing, handleTouchStart, handleTouchMove, handleTouchEnd } = usePullToRefresh({
  cooldown: 3000,
  onRefresh: async () => {
    try {
      await fetchShifts()
    } catch (err: any) {
      if (err?.response?.data?.error?.code === 'TOO_MANY_REQUESTS') {
        showError('Tunggu sebentar sebelum refresh lagi')
      }
      throw err
    }
  }
})

onMounted(fetchShifts)
</script>

<template>
  <div
    class="page"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <PullToRefreshIndicator :pull-refresh-offset="pullRefreshOffset" :is-refreshing="isRefreshing" />

    <div class="container">

      <!-- Loading -->
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Memuat data laporan...</p>
      </div>

      <template v-if="!isLoading">
        <!-- Header -->
        <div class="page-header">
          <div>
            <h1 class="page-title">Laporan Kasir</h1>
            <p class="page-subtitle">Riwayat shift dan transaksi Anda</p>
          </div>
        </div>

        <!-- Summary sticky -->
        <div v-if="activeSummaryShift" class="summary-sticky">
          <div class="summary-top">
            <span class="summary-title">Summary Shift Terkini</span>
            <StatusBadge
              :status="activeSummaryShift.status"
              :label="activeSummaryShift.status === 'active' ? 'Aktif' : 'Ditutup'"
              :variant="activeSummaryShift.status === 'active' ? 'success' : 'neutral'"
            />
          </div>
          <div class="summary-kpis">
            <div class="kpi">
              <span class="kpi-label">Transaksi</span>
              <span class="kpi-value">{{ summaryStats.totalTransactions }}</span>
            </div>
            <div class="kpi-sep"></div>
            <div class="kpi">
              <span class="kpi-label">Total Item</span>
              <span class="kpi-value">{{ summaryStats.totalItems }}</span>
            </div>
            <div class="kpi-sep"></div>
            <div class="kpi">
              <span class="kpi-label">Revenue</span>
              <span class="kpi-value">{{ formatRupiah(summaryStats.totalRevenue) }}</span>
            </div>
            <div class="kpi-sep"></div>
            <div class="kpi">
              <span class="kpi-label">Diskon</span>
              <span class="kpi-value">{{ formatRupiah(summaryStats.totalDiscount) }}</span>
            </div>
            <template v-if="isAdmin">
              <div class="kpi-sep"></div>
              <div class="kpi">
                <span class="kpi-label">Netto</span>
                <span class="kpi-value" :class="summaryStats.totalNetto >= 0 ? 'kpi-positive' : 'kpi-negative'">
                  {{ formatRupiah(summaryStats.totalNetto) }}
                </span>
              </div>
            </template>
          </div>
        </div>

        <!-- Empty -->
        <div v-if="shifts.length === 0" class="empty-state">
          <AppIcon name="inbox" :size="40" class="empty-icon" />
          <p class="empty-title">Belum ada shift</p>
          <p class="empty-desc">Buka shift terlebih dahulu untuk melihat laporan</p>
        </div>

        <!-- Shift list -->
        <div v-if="shifts.length > 0" class="shifts-section">
          <h3 class="section-label">Daftar Shift</h3>

          <div class="shifts-list">
            <BaseCard
              v-for="shift in shifts"
              :key="shift.shift_id"
              class="shift-card"
              @click="goToDetailShift(shift.shift_id)"
            >
              <!-- Card Header -->
              <template #header>
                <div class="shift-header">
                  <div class="shift-date-group">
                    <span class="shift-date">{{ formatDateJakarta(shift.opened_at) }}</span>
                    <span class="shift-time">
                      {{ formatTimeJakarta(shift.opened_at) }}
                      <template v-if="shift.status !== 'active'">
                        – {{ formatTimeJakarta(shift.closed_at || '') }}
                      </template>
                      <template v-else> – sekarang</template>
                      <span class="shift-cashier">· {{ shift.cashier_name }}</span>
                    </span>
                  </div>
                  <StatusBadge
                    :status="shift.status"
                    :label="shift.status === 'active' ? 'Aktif' : 'Ditutup'"
                    :variant="shift.status === 'active' ? 'success' : 'neutral'"
                  />
                </div>
              </template>

              <!-- Stats grid -->
              <div class="shift-stats">
                <div class="stat-cell stat-cell--trx">
                  <span class="stat-cell-label">Transaksi</span>
                  <span class="stat-cell-value">{{ shift.transaction_count }}<span class="stat-cell-unit">trx</span></span>
                </div>
                <div class="stat-cell stat-cell--items">
                  <span class="stat-cell-label">Total Item</span>
                  <span class="stat-cell-value">{{ shift.total_items ?? 0 }}<span class="stat-cell-unit">pcs</span></span>
                </div>
                <div class="stat-cell stat-cell--revenue">
                  <span class="stat-cell-label">Revenue</span>
                  <span class="stat-cell-value highlight">{{ formatRupiah(shift.total_sales) }}</span>
                </div>
                <div v-if="isAdmin" class="stat-cell stat-cell--netto">
                  <span class="stat-cell-label">Netto</span>
                  <span
                    class="stat-cell-value"
                    :class="(shift.total_netto ?? 0) >= 0 ? 'positive' : 'negative'"
                  >
                    {{ formatRupiah(shift.total_netto ?? 0) }}
                  </span>
                </div>
              </div>

              <!-- Footer -->
              <template #footer>
                <span class="lihat-detail">Lihat Detail →</span>
              </template>
            </BaseCard>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: var(--spacing-4);
  min-height: 100vh;
  background: var(--color-bg-secondary);
}

.container {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

/* Header */
.page-header {
  display: flex;
  align-items: flex-start;
}


/* Summary sticky */
.summary-sticky {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--color-surface-0);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
  box-shadow: var(--shadow-2);
  overflow: hidden;
}

.summary-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-3) var(--spacing-4);
  border-bottom: 1px solid var(--color-border-light);
}

.summary-title {
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.summary-kpis {
  display: flex;
  align-items: stretch;
  padding: var(--spacing-3) var(--spacing-4);
}

.kpi {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  padding: 0 var(--spacing-4);
}

.kpi:first-child { padding-left: 0; }
.kpi:last-child { padding-right: 0; }

.kpi-sep {
  width: 1px;
  background: var(--color-border-light);
  align-self: stretch;
  margin: var(--spacing-1) 0;
  flex-shrink: 0;
}

.kpi-label {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-tertiary);
  letter-spacing: 0.05em;
}

.kpi-value {
  font-size: var(--font-size-xl);
  font-weight: 800;
  line-height: var(--line-height-tight);
  color: var(--color-text-primary);
  white-space: nowrap;
}

.kpi-positive { color: #166534; }
.kpi-negative { color: var(--color-danger); }

/* Section label */
.section-label {
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-text-secondary);
  letter-spacing: 0.06em;
  margin: 0 0 var(--spacing-3) 0;
}

/* Shifts */
.shifts-section {
  display: flex;
  flex-direction: column;
}

.shifts-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

/* BaseCard override — clickable */
.shift-card {
  cursor: pointer;
  transition: transform var(--transition-duration-short) var(--transition-standard),
              box-shadow var(--transition-duration-short) var(--transition-standard);
}

.shift-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-4) !important;
}

.shift-card:active { transform: translateY(0); }

/* Shift card header (inside BaseCard #header slot) */
.shift-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-3);
  width: 100%;
}

.shift-date-group {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.shift-date {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: var(--line-height-tight);
}

.shift-time {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  font-weight: 500;
}

.shift-cashier {
  font-weight: 600;
  color: var(--color-text-secondary);
}

/* Stats grid inside BaseCard body */
.shift-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
  gap: var(--spacing-2);
}

.stat-cell {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: var(--spacing-2) var(--spacing-3);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-light);
  border-left: 3px solid var(--color-border);
}

.stat-cell--trx    { border-left-color: #3b82f6; }
.stat-cell--items  { border-left-color: #10b981; }
.stat-cell--revenue { border-left-color: var(--brand-primary); }
.stat-cell--netto  { border-left-color: #f59e0b; }

.stat-cell-label {
  font-size: 0.65rem;
  color: var(--color-text-tertiary);
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.stat-cell-value {
  font-size: var(--font-size-base);
  color: var(--color-text-primary);
  font-weight: 700;
  line-height: var(--line-height-tight);
  display: flex;
  align-items: baseline;
  gap: 0.2rem;
}

.stat-cell-unit {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--color-text-tertiary);
}

.stat-cell-value.highlight {
  font-size: var(--font-size-base);
  font-weight: 800;
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-cell-value.positive { color: #166534; font-weight: 800; }
.stat-cell-value.negative { color: var(--color-danger); font-weight: 800; }

/* BaseCard footer */
.lihat-detail {
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  font-weight: 600;
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 360px;
  gap: var(--spacing-2);
  color: var(--color-text-secondary);
}

.empty-icon { font-size: 3.5rem; opacity: 0.25; }
.empty-title { font-size: var(--font-size-lg); font-weight: 700; color: var(--color-text-primary); margin: 0; }
.empty-desc { font-size: var(--font-size-sm); margin: 0; text-align: center; max-width: 280px; }

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
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Tablet Landscape (768px-1023px) — Samsung Tab A9 */
@media (min-width: 768px) and (max-width: 1023px) {
  .page { padding: var(--spacing-2); }
  .container { gap: var(--spacing-2); }
  .page-header { padding: var(--spacing-2) var(--spacing-3); margin-bottom: var(--spacing-1); }
  .summary-kpis { padding: var(--spacing-2) var(--spacing-3); }
  .kpi { padding: 0 var(--spacing-2); }
  .kpi-value { font-size: var(--font-size-base); }
  .shift-stats { gap: var(--spacing-2); }
  .stat-cell { padding: var(--spacing-2); }
}

/* Mobile */
@media (max-width: 768px) {
  .page { padding: var(--spacing-3); }
  .summary-kpis { padding: var(--spacing-3); overflow-x: auto; scrollbar-width: none; }
  .summary-kpis::-webkit-scrollbar { display: none; }
  .kpi { min-width: 90px; padding: 0 var(--spacing-3); }
  .kpi-value { font-size: var(--font-size-lg); }
  .shift-stats { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 480px) {
  .summary-top { padding: var(--spacing-3); }
  .kpi-value { font-size: var(--font-size-base); }
  .shift-header { flex-direction: column; align-items: flex-start; gap: var(--spacing-2); }
}
</style>
