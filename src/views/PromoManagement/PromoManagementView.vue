<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePullToRefresh } from '@/composables/usePullToRefresh'
import { useToast } from '@/composables/useToast'
import PullToRefreshIndicator from '@/components/common/PullToRefreshIndicator.vue'
import BaseSearchBar from '@/components/base/BaseSearchBar.vue'
import BaseDataTable from '@/components/base/BaseDataTable.vue'
import BasePagination from '@/components/base/BasePagination.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import StatusBadge from '@/components/base/StatusBadge.vue'
import BaseBottomSheet from '@/components/base/BaseBottomSheet.vue'
import TableActionButtons from '@/components/table/TableActionButtons.vue'
import type { Action } from '@/components/table/TableActionButtons.vue'
import type { Column } from '@/components/base/BaseTableHeader.vue'
import { promoApi, type Promo as ApiPromo } from '@/services/api/promo.api'
import { useConfirm } from '@/composables/useConfirm'
import { formatRupiah } from '@/utils/formatters'

// Types
type Promo = ApiPromo & {
  displayStatus?: 'active' | 'upcoming' | 'expired'
}

// Confirm dialog
const { confirm } = useConfirm()

// Toast notifications
const { success: showSuccess, error: showError } = useToast()

// Pull to refresh
const { pullRefreshOffset, isRefreshing, handleTouchStart, handleTouchMove, handleTouchEnd } = usePullToRefresh({
  cooldown: 3000,
  onRefresh: async () => {
    await fetchPromos()
  }
})

// State
const contentCardRef = ref<HTMLElement | null>(null)

// ============= PROMO =============
const promos = ref<Promo[]>([])
const isLoadingPromos = ref(false)
const promoError = ref('')

const showPromoForm = ref(false)
const editingPromo = ref<Promo | null>(null)
const isSubmittingPromo = ref(false)
const promoFormData = ref({
  name: '',
  description: '',
  discountType: 'percentage' as 'percentage' | 'amount',
  discountValue: 0,
  minTransaction: 0,
  startDate: new Date().toISOString().split('T')[0] as string,
  endDate: new Date().toISOString().split('T')[0] as string,
  status: 'active' as 'active' | 'inactive'
})

// Convert date to YYYY-MM-DD format for API
const formatDateForAPI = (date: Date | string): string => {
  if (typeof date === 'string') return date
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Compute display status for promo
const computeDisplayStatus = (promo: Promo): 'active' | 'upcoming' | 'expired' => {
  const now = new Date()
  const startDate = new Date(promo.start_date)
  const endDate = new Date(promo.end_date)

  if (now < startDate) {
    return 'upcoming'
  } else if (now > endDate) {
    return 'expired'
  } else {
    return promo.status === 'active' ? 'active' : 'expired'
  }
}

// ============= TABLE COLUMNS =============
const tableColumns = computed<Column[]>(() => [
  { key: 'name', label: 'Nama Promo', sortable: false, width: '30%', align: 'left' },
  { key: 'period', label: 'Periode', sortable: false, width: '25%', align: 'left' },
  { key: 'discount', label: 'Diskon', sortable: false, width: '20%', align: 'center' },
  { key: 'displayStatus', label: 'Status', sortable: false, width: '15%', align: 'center' },
])

// ============= PAGINATION & SEARCH =============
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(10)

// Filtered promos
const filteredPromos = computed(() => {
  if (!searchQuery.value) return promos.value
  const query = searchQuery.value.toLowerCase()
  return promos.value.filter(p =>
    p.name.toLowerCase().includes(query) ||
    (p.description && p.description.toLowerCase().includes(query))
  )
})

// Paginated promos
const paginatedPromos = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredPromos.value.slice(start, end)
})

// ============= PROMO HANDLERS =============
const fetchPromos = async () => {
  try {
    isLoadingPromos.value = true
    promoError.value = ''


    const response = await promoApi.listPromos()


    // Add display status to each promo
    promos.value = response.data.map(promo => ({
      ...promo,
      displayStatus: computeDisplayStatus(promo)
    }))
  } catch (error: any) {

    promoError.value = error.response?.data?.message || 'Gagal memuat promo'
  } finally {
    isLoadingPromos.value = false
  }
}

const openCreatePromoModal = () => {
  editingPromo.value = null
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  promoFormData.value = {
    name: '',
    description: '',
    discountType: 'percentage',
    discountValue: 0,
    minTransaction: 0,
    startDate: formatDateForAPI(new Date()),
    endDate: formatDateForAPI(tomorrow),
    status: 'active'
  }
  showPromoForm.value = true
}

const openEditPromoModal = (promo: Promo) => {
  editingPromo.value = promo
  promoFormData.value = {
    name: promo.name,
    description: promo.description || '',
    discountType: promo.discount_type,
    discountValue: promo.discount_value,
    minTransaction: promo.min_transaction || 0,
    startDate: formatDateForAPI(new Date(promo.start_date)),
    endDate: formatDateForAPI(new Date(promo.end_date)),
    status: promo.status
  }
  showPromoForm.value = true
}

const closePromoModal = () => {
  showPromoForm.value = false
}

const handleSubmitPromo = async () => {
  if (!promoFormData.value.name.trim() || !promoFormData.value.startDate || !promoFormData.value.endDate) {
    showError('Nama, Tanggal Mulai, dan Tanggal Akhir harus diisi')
    return
  }

  const startDate = new Date(promoFormData.value.startDate)
  const endDate = new Date(promoFormData.value.endDate)

  if (startDate >= endDate) {
    showError('Tanggal Akhir harus lebih besar dari Tanggal Mulai')
    return
  }

  try {
    isSubmittingPromo.value = true
    promoError.value = ''

    const payload = {
      name: promoFormData.value.name,
      description: promoFormData.value.description,
      discount_value: promoFormData.value.discountValue,
      discount_type: promoFormData.value.discountType,
      start_date: formatDateForAPI(promoFormData.value.startDate),
      end_date: formatDateForAPI(promoFormData.value.endDate),
      min_transaction: promoFormData.value.minTransaction,
      status: promoFormData.value.status
    }

    if (editingPromo.value) {
      await promoApi.updatePromo(editingPromo.value.id, payload)
      showSuccess('Promo berhasil diupdate')
    } else {
      await promoApi.createPromo(payload)
      showSuccess('Promo berhasil dibuat')
    }

    showPromoForm.value = false
    await fetchPromos()
  } catch (error: any) {

    showError(error.response?.data?.message || 'Gagal menyimpan promo')
  } finally {
    isSubmittingPromo.value = false
  }
}

const handleDeletePromo = async (id: string) => {
  const confirmed = await confirm({
    title: 'Hapus Promo',
    message: 'Yakin ingin menghapus promo ini? Tindakan ini tidak dapat dibatalkan.',
    confirmText: 'Hapus',
    cancelText: 'Batal',
    type: 'danger'
  })

  if (!confirmed) return

  try {
    await promoApi.deletePromo(id)
    showSuccess('Promo berhasil dihapus')
    await fetchPromos()
  } catch (error: any) {

    showError(error.response?.data?.message || 'Gagal menghapus promo')
  }
}

// Common handlers
const handleSearch = (query: string) => {
  searchQuery.value = query
  currentPage.value = 1
}

const formatDateShort = (date: string) => {
  const d = new Date(date)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Oct', 'Nov', 'Des']
  const day = d.getDate()
  const month = months[d.getMonth()]
  const year = d.getFullYear()
  return `${day} ${month} ${year}`
}

const formatPeriod = (startDate: string, endDate: string) => {
  return `${formatDateShort(startDate)} - ${formatDateShort(endDate)}`
}

const formatDiscount = (type: string, value: number) => {
  return type === 'percentage' ? `${value}%` : `Rp ${value.toLocaleString('id-ID')}`
}

// Format currency input for display
const formatCurrencyInput = (value: number): string => {
  if (!value || value === 0) return ''
  return value.toLocaleString('id-ID')
}

// Parse currency input (remove thousand separators)
const parseCurrencyInput = (value: string): number => {
  const cleaned = value.replace(/\./g, '')
  return parseInt(cleaned) || 0
}

// Handle min transaction input
const minTransactionDisplay = computed({
  get: () => formatCurrencyInput(promoFormData.value.minTransaction),
  set: (value: string) => {
    promoFormData.value.minTransaction = parseCurrencyInput(value)
  }
})

const getRowActions = (row: Promo): Action[] => [
  { id: 'edit', icon: 'edit', label: 'Edit', onClick: () => openEditPromoModal(row) },
  { id: 'delete', icon: 'delete', label: 'Hapus', variant: 'danger', onClick: () => handleDeletePromo(row.id) },
]

const getStatusVariant = (status: string): 'success' | 'info' | 'neutral' => {
  if (status === 'active') return 'success'
  if (status === 'upcoming') return 'info'
  return 'neutral'
}

const getStatusLabel = (status: string) => {
  if (status === 'active') return 'Aktif'
  if (status === 'upcoming') return 'Upcoming'
  return 'Expired'
}

// Lifecycle
onMounted(async () => {
  // Load data on mount
  await fetchPromos()
})
</script>

<template>
  <div
    class="promo-management-view"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <PullToRefreshIndicator :pull-refresh-offset="pullRefreshOffset" :is-refreshing="isRefreshing" />

    <div class="container">
      <div class="content-card">
        <!-- Search Bar with Add Button -->
        <BaseSearchBar
          :model-value="searchQuery"
          placeholder="Cari promo..."
          @update:model-value="handleSearch"
        >
          <template #actions>
            <BaseButton variant="primary" size="sm" @click="openCreatePromoModal">
              + Tambah Promo
            </BaseButton>
          </template>
        </BaseSearchBar>

        <!-- Content Area: Table + Mobile Cards -->
        <div class="list-content">
          <div class="table-wrapper">
            <BaseDataTable
              :columns="tableColumns"
              :data="paginatedPromos"
              :current-page="1"
              :items-per-page="999"
              hide-pagination-on-single-page
            >
              <template #cell-period="{ row }">
                <span>{{ formatPeriod(row.start_date, row.end_date) }}</span>
              </template>

              <template #cell-discount="{ row }">
                <span>{{ formatDiscount(row.discount_type, row.discount_value) }}</span>
              </template>

              <template #cell-displayStatus="{ row }">
                <StatusBadge
                  :status="row.displayStatus"
                  :label="getStatusLabel(row.displayStatus)"
                  :variant="getStatusVariant(row.displayStatus)"
                />
              </template>

              <template #actions="{ row }">
                <TableActionButtons :actions="getRowActions(row)" />
              </template>
            </BaseDataTable>
          </div>

          <!-- Mobile Card Grid -->
          <div class="card-grid">
            <BaseCard v-for="promo in paginatedPromos" :key="promo.id" :padded="false">
              <template #header>
                <div class="mobile-card-header">
                  <span class="mobile-card-title">{{ promo.name }}</span>
                  <StatusBadge
                    :status="promo.displayStatus ?? 'expired'"
                    :label="getStatusLabel(promo.displayStatus ?? 'expired')"
                    :variant="getStatusVariant(promo.displayStatus ?? 'expired')"
                  />
                </div>
              </template>
              <div class="mobile-card-body">
                <div class="card-row">
                  <span class="card-label">Periode</span>
                  <span class="card-value">{{ formatPeriod(promo.start_date, promo.end_date) }}</span>
                </div>
                <div class="card-row">
                  <span class="card-label">Diskon</span>
                  <span class="card-value">{{ formatDiscount(promo.discount_type, promo.discount_value) }}</span>
                </div>
                <div class="card-row">
                  <span class="card-label">Min Transaksi</span>
                  <span class="card-value">{{ formatRupiah(promo.min_transaction ?? 0) }}</span>
                </div>
              </div>
              <template #footer>
                <div class="mobile-card-actions">
                  <BaseButton variant="secondary" size="sm" :fullWidth="true" @click="openEditPromoModal(promo)">
                    Edit
                  </BaseButton>
                  <BaseButton variant="danger" size="sm" :fullWidth="true" @click="handleDeletePromo(promo.id)">
                    Hapus
                  </BaseButton>
                </div>
              </template>
            </BaseCard>
          </div>
        </div>

        <!-- Pagination -->
        <BasePagination
          :current-page="currentPage"
          :total-items="filteredPromos.length"
          :items-per-page="itemsPerPage"
          @update:current-page="currentPage = $event"
          @update:items-per-page="itemsPerPage = $event; currentPage = 1"
        />
      </div>
    </div>

    <!-- ============ PROMO FORM SHEET ============ -->
    <BaseBottomSheet
      v-model="showPromoForm"
      :title="editingPromo ? 'Edit Promo' : 'Tambah Promo Baru'"
      size="large"
      @close="closePromoModal"
    >
      <form @submit.prevent="handleSubmitPromo">
            <div class="form-group">
              <label class="form-label">Nama Promo</label>
              <input v-model="promoFormData.name" type="text" class="form-input" placeholder="Nama promo" />
            </div>

            <div class="form-group">
              <label class="form-label">Deskripsi</label>
              <textarea v-model="promoFormData.description" class="form-input" rows="3" placeholder="Deskripsi promo"></textarea>
            </div>

            <div class="form-group">
              <label class="form-label">Tipe Diskon</label>
              <div class="radio-group">
                <label class="radio-option">
                  <input type="radio" v-model="promoFormData.discountType" value="percentage" />
                  <span>Persentase (%)</span>
                </label>
                <label class="radio-option">
                  <input type="radio" v-model="promoFormData.discountType" value="amount" />
                  <span>Nominal (Rp)</span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Nilai Diskon</label>
              <input
                v-model="promoFormData.discountValue"
                type="text" inputmode="numeric"
                class="form-input"
                :placeholder="promoFormData.discountType === 'percentage' ? 'Contoh: 10' : 'Contoh: 50000'"
                min="0"
              />
            </div>

            <div class="form-group">
              <label class="form-label">📊 Minimum Transaksi</label>
              <input
                v-model="minTransactionDisplay"
                type="text"
                class="form-input"
                placeholder="Contoh: 100000"
              />
            </div>

            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label">Tanggal Mulai</label>
                <input
                  v-model="promoFormData.startDate"
                  type="date"
                  class="form-input date-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Tanggal Akhir</label>
                <input
                  v-model="promoFormData.endDate"
                  type="date"
                  class="form-input date-input"
                  :min="promoFormData.startDate"
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">🟢 Status</label>
              <div class="radio-group">
                <label class="radio-option">
                  <input type="radio" v-model="promoFormData.status" value="active" />
                  <span>Active</span>
                </label>
                <label class="radio-option">
                  <input type="radio" v-model="promoFormData.status" value="inactive" />
                  <span>Inactive</span>
                </label>
              </div>
            </div>
          </form>

      <template #footer>
        <BaseButton variant="secondary" :disabled="isSubmittingPromo" @click="closePromoModal">Batal</BaseButton>
        <BaseButton variant="primary" :loading="isSubmittingPromo" :disabled="isSubmittingPromo" @click="handleSubmitPromo">
          Simpan
        </BaseButton>
      </template>
    </BaseBottomSheet>
  </div>
</template>

<style scoped>
.promo-management-view {
  padding: var(--spacing-3);
  min-height: 100vh;
  background: var(--color-bg-secondary);
  position: relative;
}

.container {
  position: relative;
  max-width: 1400px;
  margin: 0 auto;
}

.content-card {
  background: var(--color-surface-0);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-light);
  box-shadow: var(--shadow-2);
  overflow: visible;
  height: calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - var(--spacing-4) * 2);
  display: flex;
  flex-direction: column;
}

.content-card > :deep(.base-search-bar) {
  flex-shrink: 0;
}

.content-card > .list-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-card > :deep(.base-pagination) {
  flex-shrink: 0;
}

.list-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0.75rem;
}

.table-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

/* Card Grid (mobile) */
.card-grid {
  display: none;
  grid-template-columns: 1fr;
  gap: var(--spacing-3);
  width: 100%;
  padding: 0;
}

.mobile-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-2);
  width: 100%;
}

.mobile-card-title {
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text-primary);
}

.mobile-card-body {
  display: flex;
  flex-direction: column;
  padding: var(--spacing-4) var(--spacing-6);
}

.card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-2) 0;
  border-bottom: 1px solid var(--color-border-light);
  font-size: var(--font-size-sm);
}

.card-row:last-child { border-bottom: none; }

.card-label {
  color: var(--color-text-tertiary);
  font-weight: 600;
  font-size: var(--font-size-xs);
  letter-spacing: 0.03em;
}

.card-value {
  color: var(--color-text-primary);
  font-weight: 600;
}

.mobile-card-actions {
  display: flex;
  gap: var(--spacing-3);
  width: 100%;
}

/* Tablet Landscape (768px–1023px) — keep table visible */
@media (min-width: 768px) and (max-width: 1023px) {
  .promo-management-view { padding: var(--spacing-2); }
}

/* Mobile (≤767px) — switch to card grid */
@media (max-width: 767px) {
  .card-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
    padding: 0;
  }

  :deep(.base-data-table) {
    display: none;
  }

  .promo-card {
    padding: 1rem;
  }

  .btn-card-action {
    padding: 0.5rem;
    font-size: 0.9rem;
    min-height: 32px;
  }
}

/* Form inside BaseBottomSheet */
form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-3);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.form-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
  letter-spacing: 0.04em;
}

.form-input {
  padding: var(--spacing-2) var(--spacing-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-family: inherit;
  background: var(--color-surface-0);
  color: var(--color-text-primary);
  transition: border-color var(--transition-duration-short) var(--transition-standard),
              box-shadow var(--transition-duration-short) var(--transition-standard);
  width: 100%;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(123, 47, 190, 0.1);
}

.form-input:disabled {
  background: var(--color-bg-secondary);
  color: var(--color-text-disabled);
  cursor: not-allowed;
}

textarea.form-input {
  resize: vertical;
  min-height: 80px;
}

.date-input {
  cursor: pointer;
  min-height: 40px;
}

.date-input::-webkit-calendar-picker-indicator {
  cursor: pointer;
  opacity: 0.6;
  filter: invert(30%) sepia(60%) saturate(500%) hue-rotate(240deg);
}

.radio-group {
  display: flex;
  gap: var(--spacing-4);
  flex-wrap: wrap;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  cursor: pointer;
  font-size: var(--font-size-sm);
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  input[type="radio"] {
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    min-width: 20px;
    flex-shrink: 0;
    border: 2px solid var(--color-border);
    border-radius: 50%;
    background: var(--color-surface-0);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    margin: 0;

    &:hover {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px rgba(123, 47, 190, 0.1);
    }

    &:checked {
      border-color: var(--color-primary);
      background: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(123, 47, 190, 0.1);

      &::after {
        content: '✓';
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 12px;
      }
    }

    &:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(123, 47, 190, 0.2);
    }
  }

  span {
    color: var(--color-text-primary);
    font-weight: 500;
  }

  &:has(input:checked) {
    background: rgba(123, 47, 190, 0.05);
  }
}

</style>
