<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePullToRefresh } from '@/composables/usePullToRefresh'
import { useToast } from '@/composables/useToast'
import PullToRefreshIndicator from '@/components/common/PullToRefreshIndicator.vue'
import BaseDataTable from '@/components/base/BaseDataTable.vue'
import BaseSearchBar from '@/components/base/BaseSearchBar.vue'
import BaseChipsGroup from '@/components/base/BaseChipsGroup.vue'
import type { Column } from '@/components/base/BaseTableHeader.vue'
import BasePagination from '@/components/base/BasePagination.vue'
import { paymentMethodApi, type PaymentMethod } from '@/services/api/paymentMethod.api'
import { useConfirm } from '@/composables/useConfirm'
import TableActionButtons from '@/components/table/TableActionButtons.vue'
import type { Action } from '@/components/table/TableActionButtons.vue'

// Confirm dialog
const { confirm } = useConfirm()

// Toast notifications
const { success: showSuccess, error: showError } = useToast()

// Pull to refresh
const { pullRefreshOffset, isRefreshing, handleTouchStart, handleTouchMove, handleTouchEnd } = usePullToRefresh({
  cooldown: 3000,
  onRefresh: async () => {
    await fetchPaymentMethods()
  }
})

// State
const contentCardRef = ref<HTMLElement | null>(null)

// ============= PAYMENT METHODS =============
const paymentMethods = ref<PaymentMethod[]>([])
const isLoadingPaymentMethods = ref(false)
const paymentError = ref('')

const showPaymentForm = ref(false)
const editingPayment = ref<PaymentMethod | null>(null)
const isSubmittingPayment = ref(false)
const paymentFormData = ref({
  icon: '',
  name: '',
  status: 'active' as 'active' | 'inactive'
})

// ============= PAGINATION & SEARCH =============
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(10)

// Filtered payment methods
const filteredPaymentMethods = computed(() => {
  if (!searchQuery.value) return paymentMethods.value
  const query = searchQuery.value.toLowerCase()
  return paymentMethods.value.filter(m =>
    m.name.toLowerCase().includes(query)
  )
})

// Paginated payment methods
const paginatedPaymentMethods = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredPaymentMethods.value.slice(start, end)
})

// Table columns
const tableColumns: Column[] = [
  {
    key: 'icon',
    label: 'Icon',
    sortable: false,
    width: '15%',
    align: 'center',
  },
  {
    key: 'name',
    label: 'Nama Metode Pembayaran',
    sortable: false,
    width: '50%',
  },
  {
    key: 'status',
    label: 'Status',
    sortable: false,
    width: '20%',
    align: 'center',
  },
]

// Get actions for a payment method row
const getRowActions = (method: PaymentMethod): Action[] => [
  {
    id: `edit-${method.id}`,
    icon: 'edit',
    label: 'Edit',
    onClick: () => openEditPaymentModal(method),
  },
  {
    id: `delete-${method.id}`,
    icon: 'delete',
    label: 'Hapus',
    variant: 'danger',
    onClick: () => handleDeletePayment(method.id),
  },
]

// ============= PAYMENT HANDLERS =============
const fetchPaymentMethods = async () => {
  try {
    isLoadingPaymentMethods.value = true
    paymentError.value = ''

    const response = await paymentMethodApi.getPaymentMethods()


    paymentMethods.value = response.data

  } catch (error: any) {

    paymentError.value = error.response?.data?.message || 'Gagal memuat data metode pembayaran'
  } finally {
    isLoadingPaymentMethods.value = false
  }
}

const openCreatePaymentModal = () => {
  editingPayment.value = null
  paymentFormData.value = {
    icon: '',
    name: '',
    status: 'active'
  }
  paymentError.value = ''
  showPaymentForm.value = true
}

const openEditPaymentModal = (method: PaymentMethod) => {
  editingPayment.value = method
  paymentFormData.value = {
    icon: method.icon,
    name: method.name,
    status: method.status
  }
  paymentError.value = ''
  showPaymentForm.value = true
}

const closePaymentModal = () => {
  showPaymentForm.value = false
  paymentError.value = ''
}

const handleSubmitPayment = async () => {
  paymentError.value = ''

  if (!paymentFormData.value.name.trim() || !paymentFormData.value.icon.trim()) {
    paymentError.value = 'Icon dan Nama harus diisi'
    return
  }

  try {
    isSubmittingPayment.value = true

    if (editingPayment.value) {
      // Update existing payment method
      await paymentMethodApi.updatePaymentMethod(editingPayment.value.id, {
        icon: paymentFormData.value.icon,
        name: paymentFormData.value.name,
        status: paymentFormData.value.status,
      })
      showSuccess('Metode pembayaran berhasil diupdate')
    } else {
      // Create new payment method
      await paymentMethodApi.createPaymentMethod({
        icon: paymentFormData.value.icon,
        name: paymentFormData.value.name,
        status: paymentFormData.value.status,
      })
      showSuccess('Metode pembayaran berhasil ditambahkan')
    }

    showPaymentForm.value = false
    await fetchPaymentMethods()
  } catch (error: any) {

    paymentError.value = error.response?.data?.message || 'Gagal menyimpan metode pembayaran'
  } finally {
    isSubmittingPayment.value = false
  }
}

const handleDeletePayment = async (id: string) => {
  const confirmed = await confirm({
    title: 'Hapus Metode Pembayaran',
    message: 'Yakin ingin menghapus metode pembayaran ini? Tindakan ini tidak dapat dibatalkan.',
    confirmText: 'Hapus',
    cancelText: 'Batal',
    type: 'danger'
  })

  if (!confirmed) return

  try {
    await paymentMethodApi.deletePaymentMethod(id)
    showSuccess('Metode pembayaran berhasil dihapus')
    await fetchPaymentMethods()
  } catch (error: any) {

    showError(error.response?.data?.message || 'Gagal menghapus metode pembayaran')
  }
}

// Common handlers
const handleSearch = (query: string) => {
  searchQuery.value = query
  currentPage.value = 1
}

// Lifecycle
onMounted(async () => {
  // Load data on mount
  await fetchPaymentMethods()
})

</script>

<template>
  <div
    class="payment-methods-view"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <PullToRefreshIndicator :pull-refresh-offset="pullRefreshOffset" :is-refreshing="isRefreshing" />

    <div class="container">
      <!-- Content Card -->
      <div ref="contentCardRef" class="content-card">
        <!-- Search Bar -->
        <BaseSearchBar
          :model-value="searchQuery"
          placeholder="Cari metode pembayaran..."
          @update:model-value="handleSearch($event)"
        >
          <template #actions>
            <button class="btn-add-method" @click="openCreatePaymentModal">
              <AppIcon name="add" :size="15" /> Tambah Metode
            </button>
          </template>
        </BaseSearchBar>

        <!-- Chips Group -->
        <div class="chips-container">
          <BaseChipsGroup>
            <button class="chip chip--active" disabled>
              Metode Pembayaran
            </button>
          </BaseChipsGroup>
        </div>

        <!-- Payment Methods Content -->
        <div class="list-content">
          <!-- Error Alert -->
          <div v-if="paymentError" class="alert alert-error">
            <AppIcon name="x-circle" :size="16" /> <span>{{ paymentError }}</span>
            <button @click="paymentError = ''" class="btn-close-alert"><AppIcon name="close" :size="14" /></button>
          </div>

          <!-- BaseDataTable Component -->
          <div class="table-wrapper">
            <BaseDataTable
              :columns="tableColumns"
              :data="paginatedPaymentMethods"
              :current-page="1"
              :items-per-page="999"
            >
              <template #cell-icon="{ row }">
                <span class="icon-emoji">{{ row.icon }}</span>
              </template>

              <template #cell-status="{ row }">
                <span class="status-badge" :class="row.status">
                  <AppIcon :name="row.status === 'active' ? 'check-circle' : 'x-circle'" :size="13" />
                  {{ row.status === 'active' ? 'Active' : 'Inactive' }}
                </span>
              </template>

              <template #actions="{ row }">
                <TableActionButtons :actions="getRowActions(row)" :dropdown-breakpoint="0" />
              </template>

              <template #empty>
                <div class="empty-state">
                  <div class="empty-icon"><AppIcon name="payment" :size="40" /></div>
                  <p>Tidak ada metode pembayaran ditemukan</p>
                </div>
              </template>
            </BaseDataTable>
          </div>

          <!-- Mobile Card Layout -->
          <div class="card-grid">
            <div v-for="method in paginatedPaymentMethods" :key="method.id" class="payment-card">
              <div class="card-header">
                <span class="payment-icon">{{ method.icon }}</span>
                <h3 class="card-title">{{ method.name }}</h3>
              </div>

              <div class="card-body">
                <div class="card-row">
                  <span class="card-label">Status:</span>
                  <span class="status-badge" :class="method.status">
                    <AppIcon :name="method.status === 'active' ? 'check-circle' : 'x-circle'" :size="13" />
                    {{ method.status === 'active' ? 'Active' : 'Inactive' }}
                  </span>
                </div>
              </div>

              <div class="card-actions">
                <button class="btn-card-action btn-edit" @click="openEditPaymentModal(method)" title="Edit">
                  <AppIcon name="edit" :size="14" /> Edit
                </button>
                <button class="btn-card-action btn-delete" @click="handleDeletePayment(method.id)" title="Hapus">
                  <AppIcon name="delete" :size="14" /> Hapus
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <BasePagination
          :current-page="currentPage"
          :total-items="filteredPaymentMethods.length"
          :items-per-page="itemsPerPage"
          :loading="isLoadingPaymentMethods"
          @update:current-page="currentPage = $event"
          @update:itemsPerPage="itemsPerPage = $event; currentPage = 1"
        />
      </div>
    </div>

    <!-- ============ PAYMENT METHOD FORM SHEET ============ -->
    <Teleport to="body" v-if="showPaymentForm">
      <div class="sheet-overlay" @click.self="closePaymentModal">
        <div class="form-sheet">
          <div class="form-header">
            <h2>{{ editingPayment ? 'Edit Metode' : 'Tambah Metode Pembayaran' }}</h2>
            <button class="btn-close" @click="closePaymentModal"><AppIcon name="close" :size="18" /></button>
          </div>

          <form @submit.prevent="handleSubmitPayment" class="form-body">
            <div v-if="paymentError" class="form-error-box">
              {{ paymentError }}
            </div>

            <div class="form-group">
              <label class="form-label">Icon (Copy paste emoji)</label>
              <input
                v-model="paymentFormData.icon"
                type="text"
                class="form-input"
                placeholder="Contoh: 💵 atau 📱"
                maxlength="5"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Nama Metode Pembayaran</label>
              <input
                v-model="paymentFormData.name"
                type="text"
                class="form-input"
                placeholder="Contoh: Cash, QRIS, Split Bill"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Status</label>
              <div class="radio-group">
                <label class="radio-option">
                  <input type="radio" v-model="paymentFormData.status" value="active" />
                  <span>Active</span>
                </label>
                <label class="radio-option">
                  <input type="radio" v-model="paymentFormData.status" value="inactive" />
                  <span>Inactive</span>
                </label>
              </div>
            </div>
          </form>

          <div class="form-footer">
            <button type="button" class="btn-cancel" @click="closePaymentModal" :disabled="isSubmittingPayment">Batal</button>
            <button type="submit" class="btn-submit" @click="handleSubmitPayment" :disabled="isSubmittingPayment">
              <AppIcon :name="isSubmittingPayment ? 'loading' : 'save'" :size="15" :spin="isSubmittingPayment" />
              {{ isSubmittingPayment ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.payment-methods-view {
  padding: var(--spacing-3);
  min-height: 100vh;
  background: #f8fafb;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 300px;
    background: linear-gradient(135deg, rgba(123, 47, 190, 0.03) 0%, rgba(52, 211, 153, 0.05) 100%);
    pointer-events: none;
  }
}

.container {
  position: relative;
  max-width: 1400px;
  margin: 0 auto;
}

.content-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  border: 1px solid rgba(123, 47, 190, 0.08);
  box-shadow: 0 20px 60px rgba(123, 47, 190, 0.08), 0 4px 16px rgba(0, 0, 0, 0.04);
  overflow: visible;
  height: calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - var(--spacing-4) * 2);
  display: flex;
  flex-direction: column;
}

.content-card > :deep(.base-search-bar) {
  flex-shrink: 0;
}

.content-card > .chips-container {
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

.chips-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-3);
  padding: 0.75rem var(--spacing-3);
  border-bottom: 2px solid rgba(123, 47, 190, 0.15);
  background: white;
  flex-shrink: 0;
}

.chip {
  flex-shrink: 0;
  padding: 0.5rem 1rem;
  border: 1px solid rgba(123, 47, 190, 0.15);
  background: white;
  color: var(--color-text-secondary);
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.8rem;
  min-height: 44px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(240, 253, 244, 0.8);
    border-color: rgba(123, 47, 190, 0.3);
  }

  &--active {
    background: linear-gradient(135deg, var(--brand-primary) 0%, #a78bfa 100%);
    border-color: transparent;
    color: white;
    box-shadow: 0 8px 24px rgba(123, 47, 190, 0.35);
  }

  &:disabled {
    cursor: not-allowed;
  }
}

.btn-add-method {
  padding: 0.6rem 1.2rem;
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.85rem;
  min-height: 44px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(123, 47, 190, 0.4);
    background: linear-gradient(135deg, var(--brand-primary-dark) 0%, var(--brand-primary-darker) 100%);
  }

  &:active {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(123, 47, 190, 0.3);
  }
}

/* List Content Container */
.list-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: var(--spacing-3);
}

.table-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

/* Card Grid for Mobile */
.card-grid {
  display: none;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  width: 100%;
  padding: 1rem;
}

.payment-card {
  background: white;
  border: 1px solid rgba(123, 47, 190, 0.08);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;

  &:active {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.card-header {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  border-bottom: 1px solid rgba(123, 47, 190, 0.08);
  align-items: center;
}

.payment-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.card-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text-primary);
  flex: 1;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  flex: 1;
}

.card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.card-label {
  color: var(--color-text-secondary);
  font-weight: 600;
  font-size: 0.75rem;
  letter-spacing: 0.01em;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid rgba(123, 47, 190, 0.08);
}

.btn-card-action {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid rgba(123, 47, 190, 0.2);
  background: white;
  color: var(--color-text-primary);
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: center;

  &:active {
    background: rgba(123, 47, 190, 0.1);
    border-color: rgba(123, 47, 190, 0.3);
  }

  &.btn-edit {
    color: var(--brand-primary-dark);
    border-color: rgba(123, 47, 190, 0.3);
  }

  &.btn-delete {
    color: #dc2626;
    border-color: rgba(239, 68, 68, 0.3);
  }
}

/* ============================================
   RESPONSIVE: Tablet Landscape (768px–1023px) — keep table visible
   ============================================ */
@media (min-width: 768px) and (max-width: 1023px) {
  .payment-methods-view { padding: var(--spacing-2); }
}

/* ============================================
   RESPONSIVE: Mobile (≤767px) — switch to card grid
   ============================================ */
@media (max-width: 767px) {
  :deep(.base-data-table) {
    display: none;
  }

  .table-wrapper {
    display: none;
  }

  .card-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
    padding: 0.75rem;
  }
}

/* ============================================
   RESPONSIVE: Mobile (≤767px)
   ============================================ */
@media (max-width: 767px) {
  .card-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
    padding: 0.75rem;
  }

  .payment-card {
    border-radius: 10px;
  }

  .card-header {
    padding: 0.875rem;
    gap: 0.625rem;
  }

  .payment-icon {
    font-size: 1.3rem;
  }

  .card-title {
    font-size: 0.9rem;
  }

  .card-body {
    gap: 0.625rem;
    padding: 0.625rem 0.875rem;
  }

  .card-actions {
    padding: 0.625rem 0.875rem;
  }
}

.alert {
  padding: var(--spacing-3) var(--spacing-4);
  margin: var(--spacing-3) var(--spacing-3) 0;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-3);
}

.alert-error {
  background: #fee;
  color: #c33;
  border: 1px solid #fcc;
}

.btn-close-alert {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 1.25rem;
  padding: 0;
}

.table-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.icon-emoji {
  font-size: 1.5rem;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &.active {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(123, 47, 190, 0.08) 100%);
    color: var(--brand-primary-dark);
    border: 1px solid rgba(123, 47, 190, 0.3);
  }

  &.inactive {
    background: linear-gradient(135deg, rgba(107, 114, 128, 0.12) 0%, rgba(75, 85, 99, 0.08) 100%);
    color: #4b5563;
    border: 1px solid rgba(107, 114, 128, 0.3);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: var(--color-text-secondary);
  gap: var(--spacing-2);

  p {
    font-size: 0.9rem;
    font-weight: 500;
    margin: 0;
  }
}

.empty-icon {
  font-size: 4rem;
  opacity: 0.3;
}

/* Form Styles */
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.form-sheet {
  width: 100%;
  max-height: 90vh;
  background: white;
  border-radius: 12px 12px 0 0;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
}

.form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-4);
  border-bottom: 1px solid var(--color-border);
}

.form-header h2 {
  font-size: 1rem;
  margin: 0;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--color-text-secondary);
}

.form-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-4);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-error-box {
  padding: var(--spacing-3) var(--spacing-4);
  background: #fee;
  border: 1px solid #fcc;
  border-radius: var(--radius-md);
  color: #c33;
  font-size: 0.875rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin: 0;
}

.form-label {
  font-weight: 600;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  letter-spacing: 0.01em;
}

.form-input {
  padding: 0.65rem 0.85rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.85rem;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  background: var(--color-surface-0);
  font-family: inherit;
  color: var(--color-text-primary);

  &:focus {
    outline: none;
    border-color: var(--color-primary-500);
    background: var(--color-surface-1);
    box-shadow: 0 4px 12px rgba(123, 47, 190, 0.1);
  }

  &::placeholder {
    color: var(--color-text-hint);
  }
}

.radio-group {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  font-size: 0.875rem;
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
    border: 2px solid #d0d0d0;
    border-radius: 50%;
    background: white;
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

.form-footer {
  display: flex;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-1);
}

.btn-cancel,
.btn-submit {
  flex: 1;
  padding: var(--spacing-3) var(--spacing-4);
  border: none;
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-duration-short) var(--transition-standard);
}

.btn-cancel {
  background: var(--color-surface-3);
  color: var(--color-text-primary);
}

.btn-cancel:hover:not(:disabled) {
  background: var(--color-surface-4);
}

.btn-submit {
  background: var(--color-primary);
  color: white;
}

.btn-submit:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.btn-cancel:disabled,
.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .payment-methods-view {
    padding: var(--spacing-2);
  }
}
</style>
