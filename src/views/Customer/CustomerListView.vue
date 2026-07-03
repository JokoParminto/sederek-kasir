<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCustomerStore } from '@/stores/customer'
import { customerApi } from '@/services/api/customer.api'
import { formatRupiah } from '@/utils/formatters'
import { useToast } from '@/composables/useToast'
import { usePullToRefresh } from '@/composables/usePullToRefresh'
import PullToRefreshIndicator from '@/components/common/PullToRefreshIndicator.vue'
import type { Customer } from '@/types'
import { DEFAULT_AVATAR } from '@/utils/constants'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseSearchBar from '@/components/base/BaseSearchBar.vue'
import StatusBadge from '@/components/base/StatusBadge.vue'
import BaseBadge from '@/components/base/BaseBadge.vue'
import BasePagination from '@/components/base/BasePagination.vue'
import BaseBottomSheet from '@/components/base/BaseBottomSheet.vue'
import BaseTextField from '@/components/base/BaseTextField.vue'
import BaseCheckbox from '@/components/base/BaseCheckbox.vue'
import BaseDataTable from '@/components/base/BaseDataTable.vue'
import type { Column } from '@/components/base/BaseTableHeader.vue'
import TableActionButtons from '@/components/table/TableActionButtons.vue'
import ConfirmationModal from '@/components/common/ConfirmationModal.vue'
import type { ActionIconKey } from '@/utils/tableActionIcons'

interface Action {
  id: string
  icon: ActionIconKey
  label: string
  variant?: 'default' | 'danger'
  disabled?: boolean
  onClick: () => void | Promise<void>
}

const router = useRouter()
const customerStore = useCustomerStore()
const { error: showError, success: showSuccess } = useToast()

// DataTable column configuration
const tableColumns: Column[] = [
  {
    key: 'name',
    label: 'Customer',
    sortable: true,
    width: '28%',
    align: 'left'
  },
  {
    key: 'phone_number',
    label: 'Nomor Telepon',
    sortable: true,
    width: '24%',
    align: 'left'
  },
  {
    key: 'total_spending',
    label: 'Total Belanja',
    sortable: true,
    width: '20%',
    align: 'right'
  },
  {
    key: 'status',
    label: 'Status',
    sortable: false,
    width: '20%',
    align: 'center'
  }
]

// Search
const searchQuery = ref('')

// Pagination
const currentPage = ref(1)
const itemsPerPage = ref(10)
const contentCardRef = ref<HTMLElement | null>(null)

const fetchPage = () =>
  customerStore.fetchCustomers({
    page: currentPage.value,
    limit: itemsPerPage.value,
    search: searchQuery.value || undefined,
  })

// Pull to refresh
const { pullRefreshOffset, isRefreshing, handleTouchStart, handleTouchMove, handleTouchEnd } = usePullToRefresh({
  cooldown: 3000,
  onRefresh: async () => {
    try {
      await fetchPage()
    } catch (err: any) {
      if (err?.response?.data?.error?.code === 'TOO_MANY_REQUESTS') {
        showError('Tunggu sebentar sebelum refresh lagi')
      }
      throw err
    }
  }
})

// Load on mount; re-fetch when page or search changes
onMounted(fetchPage)
watch(currentPage, fetchPage)
watch(itemsPerPage, () => { currentPage.value = 1; fetchPage() })

// BE already filters & paginates — just expose store slice directly
const filteredCustomers = computed(() => customerStore.customers)
const paginatedCustomers = computed(() => customerStore.customers)

// Modal state
const isModalOpen = ref(false)
const selectedCustomer = ref<Customer | null>(null)

// Delete confirmation state
const showDeleteConfirm = ref(false)
const customerToDelete = ref<string | null>(null)

// Form state
const formData = ref({
  name: '',
  phone_number: '',
  avatar_url: DEFAULT_AVATAR,
  member_type: null as 'umum' | 'akamsi' | 'vip' | null,
  member_status: 'inactive' as 'active' | 'pending' | 'inactive',
})
const formError = ref('')
const submitError = ref('')
const isSubmitting = ref(false)

// DataTable state
const tableSortBy = ref('name')
const tableSortDir = ref<'asc' | 'desc'>('asc')

// Tablet landscape menu state
const openMenuCustomerId = ref<string | null>(null)

const toggleActionMenu = (customerId: string) => {
  openMenuCustomerId.value = openMenuCustomerId.value === customerId ? null : customerId
}


const openCreateModal = () => {
   selectedCustomer.value = null
   formData.value = {
     name: '',
     phone_number: '',
     avatar_url: DEFAULT_AVATAR,
     member_type: null,
     member_status: 'inactive',
   }
   formError.value = ''
   submitError.value = ''
   isModalOpen.value = true
 }

const openEditModal = (customer: Customer) => {
  selectedCustomer.value = customer
  formData.value = {
    name: customer.name,
    phone_number: (customer.phone_number || '').replace(/\D/g, ''),
    avatar_url: customer.avatar_url || DEFAULT_AVATAR,
    member_type: customer.member_type ?? null,
    member_status: customer.member_status ?? 'inactive',
  }
  formError.value = ''
  submitError.value = ''
  isModalOpen.value = true
}

const closeModal = async (isSubmitted: boolean = false) => {
  isModalOpen.value = false
  selectedCustomer.value = null

  // Refresh customers if form was submitted
  if (isSubmitted) {
    try {
      await customerStore.fetchCustomers()
    } catch (err) {
      showError('Gagal memuat data customers')
    }
  }
}

const handleEdit = (id: string) => {
  const customer = customerStore.getCustomerById(id)
  if (customer) {
    openEditModal(customer)
  }
}

const handleDeleteClick = (id: string) => {
  customerToDelete.value = id
  showDeleteConfirm.value = true
}

const handleDeleteConfirm = async () => {
  if (!customerToDelete.value) return

  try {
    await customerApi.deleteCustomer(customerToDelete.value)
    customerStore.deleteCustomer(customerToDelete.value)
    showSuccess('Customer berhasil dihapus')

    showDeleteConfirm.value = false
    customerToDelete.value = null
  } catch (err) {
    showError('Gagal menghapus customer')
  }
}

const handleDeleteCancel = () => {
  showDeleteConfirm.value = false
  customerToDelete.value = null
}

/**
 * Get actions array for a customer row
 * Used by TableActionButtons component
 */
const getRowActions = (customer: Customer): Action[] => [
  {
    id: `edit-${customer.id}`,
    icon: 'edit',
    label: 'Edit',
    onClick: () => openEditModal(customer),
  },
  {
    id: `delete-${customer.id}`,
    icon: 'delete',
    label: 'Hapus',
    variant: 'danger',
    onClick: () => handleDeleteClick(customer.id),
  },
]

const handleSearch = (query: string) => {
  searchQuery.value = query
  currentPage.value = 1
  fetchPage()
}

const handlePhoneNumberInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  // Filter hanya angka, hapus karakter yang bukan digit
  const filteredValue = input.value.replace(/\D/g, '')
  formData.value.phone_number = filteredValue
}


const handleSubmitForm = async () => {
  formError.value = ''
  submitError.value = ''

  if (!formData.value.name.trim()) {
    formError.value = 'Nama customer harus diisi'
    return
  }

  if (formData.value.phone_number.trim() && !/^\d+$/.test(formData.value.phone_number)) {
    formError.value = 'Nomor telepon hanya boleh berisi angka'
    return
  }

  try {
    isSubmitting.value = true

    const memberType = formData.value.member_type
    const memberStatus = formData.value.member_status
    const customerData = {
      name: formData.value.name.trim(),
      phone_number: formData.value.phone_number.trim(),
      avatar_url: formData.value.avatar_url || DEFAULT_AVATAR,
      is_member: memberType !== null && memberStatus === 'active',
      total_spending: 0,
      member_type: memberType,
      member_status: memberStatus,
    }

    if (selectedCustomer.value) {
      await customerApi.updateCustomer(selectedCustomer.value.id, customerData as any)
      showSuccess('Customer berhasil diupdate')
    } else {
      await customerApi.createCustomer(customerData as any)
      showSuccess('Customer berhasil ditambahkan')
    }

    closeModal(true)
  } catch (err) {
    console.error('[CustomerListView] handleSubmitForm error:', err)
    const message = err instanceof Error ? err.message : 'Gagal menyimpan customer'
    submitError.value = message
  } finally {
    isSubmitting.value = false
  }
}

// Top customers (limit to 5)
const topSpenders = computed(() => customerStore.topCustomers.slice(0, 5))
</script>

<template>
  <div
    class="customer-view"
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
          placeholder="Cari customer..."
          @update:model-value="handleSearch"
        >
          <template #actions>
            <BaseButton variant="primary" @click="openCreateModal">
              <AppIcon name="add" :size="15" /> Add
            </BaseButton>
          </template>
        </BaseSearchBar>

         <!-- Customer List Content -->
         <div class="list-content">
           <BaseDataTable
           :columns="tableColumns"
           :data="paginatedCustomers"
           :current-page="1"
           :items-per-page="999"
           :sort-by="tableSortBy"
           :sort-dir="tableSortDir"
           hide-pagination-on-single-page
           @update:sort-by="(col) => tableSortBy = col"
           @update:sort-dir="(dir) => tableSortDir = dir"
         >
          <!-- Customer name cell with avatar — click navigates to detail -->
          <template #cell-name="{ row }">
            <div class="customer-info customer-info--link" @click="router.push(`/customer/${row.id}`)">
              <div class="customer-avatar">{{ row.avatar_url }}</div>
              <span class="customer-name">{{ row.name }}</span>
            </div>
          </template>

          <!-- Total spending cell with Rupiah format -->
          <template #cell-total_spending="{ row }">
            <span class="price-cell">{{ formatRupiah(row.total_spending) }}</span>
          </template>

          <!-- Status cell with badge -->
          <template #cell-status="{ row }">
            <StatusBadge
              v-if="row.is_member"
              status="active"
              label="Member"
            />
            <BaseBadge
              v-else
              label="Regular"
              variant="neutral"
            />
          </template>

          <!-- Action buttons -->
          <template #actions="{ row }">
            <TableActionButtons :actions="getRowActions(row)" />
          </template>
         </BaseDataTable>

         <!-- Mobile Card Layout -->
         <div class="card-grid">
           <div v-for="customer in paginatedCustomers" :key="customer.id" class="customer-card">
             <div class="card-header card-header--link" @click="router.push(`/customer/${customer.id}`)">
               <div class="customer-avatar-large">{{ customer.avatar_url }}</div>
               <div class="card-customer-info">
                 <h3 class="card-title">{{ customer.name }}</h3>
                 <p class="card-phone">{{ customer.phone_number }}</p>
               </div>
             </div>

             <div class="card-body">
               <div class="card-row">
                 <span class="card-label">Total Belanja:</span>
                 <span class="card-spending">{{ formatRupiah(customer.total_spending) }}</span>
               </div>
               <div class="card-row">
                 <span class="card-label">Status:</span>
                 <StatusBadge
                   v-if="customer.is_member"
                   status="active"
                   label="Member"
                 />
                 <BaseBadge
                   v-else
                   label="Regular"
                   variant="neutral"
                 />
               </div>
             </div>

             <div class="card-actions">
               <button class="btn-card-action btn-edit" @click="handleEdit(customer.id)" title="Edit"><AppIcon name="edit" :size="15" /></button>
               <button class="btn-card-action btn-delete" @click="handleDeleteClick(customer.id)" title="Hapus"><AppIcon name="delete" :size="15" /></button>
             </div>
           </div>
         </div>
         </div>

         <!-- Pagination - OUTSIDE BaseDataTable, controlled by CustomerListView -->
         <!-- Pagination -->
         <BasePagination
           :current-page="currentPage"
           :total-items="customerStore.total"
           :items-per-page="itemsPerPage"
           @update:current-page="currentPage = $event"
           @update:items-per-page="itemsPerPage = $event; currentPage = 1"
         />
       </div>
     </div>

    <!-- Customer Form Sheet -->
    <BaseBottomSheet
      v-model="isModalOpen"
      :title="selectedCustomer ? 'Edit Customer' : 'Tambah Customer'"
      @close="closeModal(false)"
    >
      <form @submit.prevent="handleSubmitForm">
        <BaseTextField
          v-model="formData.name"
          label="Nama Lengkap"
          placeholder="Contoh: Andi Wijaya"
          required
        />

        <BaseTextField
          :model-value="formData.phone_number"
          label="Nomor Telepon"
          placeholder="Contoh: 081234567890"
          :error="formError"
          @update:model-value="(val) => { formData.phone_number = val.replace(/\D/g, '') }"
        />

        <BaseTextField
          v-model="formData.avatar_url"
          label="Avatar (Emoji)"
          placeholder="Contoh: 👤"
          :maxlength="2"
        />

        <!-- Member Tier -->
        <div class="member-section">
          <label class="member-section-label">Tipe Member</label>
          <div class="tier-pills">
            <button type="button"
              v-for="opt in [{ value: null, label: 'Non-Member', icon: '—' }, { value: 'umum', label: 'Umum', icon: 'U' }, { value: 'akamsi', label: 'Akamsi', icon: 'A' }, { value: 'vip', label: 'VIP', icon: '★' }]"
              :key="String(opt.value)"
              class="tier-pill"
              :class="[`tier-pill--${opt.value ?? 'none'}`, { 'tier-pill--active': formData.member_type === opt.value }]"
              @click="formData.member_type = opt.value as any"
            >
              <span class="tier-pill-icon">{{ opt.icon }}</span>
              <span class="tier-pill-label">{{ opt.label }}</span>
            </button>
          </div>

          <div v-if="formData.member_type" class="status-row">
            <span class="status-row-label">Status:</span>
            <div class="status-pills">
              <button type="button"
                v-for="s in [{ value: 'active', label: 'Aktif' }, { value: 'pending', label: 'Pending' }, { value: 'inactive', label: 'Nonaktif' }]"
                :key="s.value"
                class="status-pill"
                :class="[`status-pill--${s.value}`, { 'status-pill--active': formData.member_status === s.value }]"
                @click="formData.member_status = s.value as any"
              >{{ s.label }}</button>
            </div>
          </div>
        </div>

        <div v-if="submitError" class="form-submit-error">
          {{ submitError }}
        </div>
      </form>

      <template #footer>
        <BaseButton variant="secondary" type="button" :disabled="isSubmitting" @click="closeModal(false)">
          Batal
        </BaseButton>
        <BaseButton variant="primary" :loading="isSubmitting" @click="handleSubmitForm">
          {{ selectedCustomer ? 'Update' : 'Simpan' }}
        </BaseButton>
      </template>
    </BaseBottomSheet>

    <!-- Delete Confirmation Modal -->
    <ConfirmationModal
      :is-open="showDeleteConfirm"
      title="Hapus Customer"
      message="Apakah Anda yakin ingin menghapus customer ini? Tindakan ini tidak dapat dibatalkan."
      confirm-text="Hapus"
      cancel-text="Batal"
      variant="danger"
      icon-type="warning"
      @confirm="handleDeleteConfirm"
      @cancel="handleDeleteCancel"
    />
  </div>
</template>

<style scoped>
.customer-view {
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

.pull-hint {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  padding: var(--spacing-2) var(--spacing-4) 0;
  letter-spacing: 0.04em;
  font-weight: 600;
}

.page-header {
  margin-bottom: 2rem;
}


.top-spenders-section {
  margin-bottom: var(--spacing-4);
}

.section-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-2) 0;
}

.top-spenders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.75rem;
}

.top-customer-card {
  position: relative;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  border: 1px solid rgba(123, 47, 190, 0.08);
  box-shadow: 0 4px 16px rgba(123, 47, 190, 0.06);
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--brand-primary) 0%, #a78bfa 100%);
    opacity: 0;
    transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(123, 47, 190, 0.1);
    border-color: rgba(123, 47, 190, 0.15);

    &::before {
      opacity: 1;
    }
  }
}

.rank-badge {
  position: absolute;
  top: 0.35rem;
  right: 0.35rem;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.55rem;
  font-weight: 700;
  color: white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);

  &.rank-1 {
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  }

  &.rank-2 {
    background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%);
  }

  &.rank-3 {
    background: linear-gradient(135deg, #fb923c 0%, #f97316 100%);
  }

  &.rank-4,
  &.rank-5 {
    background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  }
}

.top-customer-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--brand-primary) 0%, #a78bfa 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(123, 47, 190, 0.15);
}

.top-customer-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  width: 100%;
}

.top-customer-name {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
  text-align: center;
}

.top-customer-phone {
  font-size: 0.6rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.top-customer-spent {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  padding: 0.4rem;
  background: rgba(240, 253, 244, 0.5);
  border-radius: 6px;
  width: 100%;
  margin-top: 0.15rem;
}

.spent-label {
  font-size: 0.55rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  letter-spacing: 0.05em;
}

.spent-amount {
  font-size: 0.65rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.content-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  border: 1px solid rgba(123, 47, 190, 0.08);
  box-shadow: 0 20px 60px rgba(123, 47, 190, 0.08), 0 4px 16px rgba(0, 0, 0, 0.04);
  overflow: visible;
  /* Fixed height - prevent global scroll */
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

.list-content {
  flex: 1;
  display: block;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.75rem;
}

.table-wrapper {
  overflow-x: auto;
  overflow-y: auto;
  width: 100%;
}

.customer-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.customer-info--link {
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.15s;

  &:hover {
    background: rgba(123, 47, 190, 0.06);
  }
}

.customer-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--brand-primary) 0%, #a78bfa 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.customer-name {
  font-weight: 600;
  color: var(--color-text-primary);
}

.price-cell {
  font-weight: 700;
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.date-text {
  color: var(--color-text-secondary);
  font-size: 0.75rem;
}

.no-data {
  color: var(--color-text-hint);
  font-style: italic;
}

/* ============================================
   TABLET LANDSCAPE (768px–1023px) — keep table visible, compact padding
   ============================================ */
@media (min-width: 768px) and (max-width: 1023px) {
  .customer-view { padding: var(--spacing-2); }
}

/* ============================================
   TABLET LANDSCAPE: Optimized for TARGET POS (1024px–1279px)
   ============================================ */
@media (min-width: 1024px) and (max-width: 1279px) {
  /* Container - More padding */
  .customer-view {
    padding: var(--spacing-4);
  }

  .container {
    padding: var(--spacing-4);
  }

  /* Search Bar - More padding */
  .search-bar {
    padding: var(--spacing-4);
  }

  .search-input {
    padding: 0.75rem var(--spacing-3);
    font-size: 0.9rem;
    min-height: 48px;
  }

  /* Category Chips - Touch-friendly */
  .chip {
    min-height: 48px;
    padding: 0.6rem 1.2rem;
  }



  .form-submit-error {
    margin-top: 0.5rem;
    padding: 0.6rem 0.85rem;
    background: rgba(254, 242, 242, 0.9);
    color: #dc2626;
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 8px;
    font-size: var(--font-size-sm);
    font-weight: 500;
  }

  /* Form Layout - Two columns */
  .form-body {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.25rem 1.5rem;
    padding: 1.25rem;
  }

  .form-group {
    grid-column: span 1;
  }

  .member-section {
    grid-column: span 2;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .member-section-label {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .tier-pills {
    display: flex;
    gap: 0.4rem;
  }
  .tier-pill {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    padding: 0.55rem 0.5rem;
    border-radius: 10px;
    border: 1.5px solid #e2e8f0;
    background: #fff;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    flex: 1;
    font-family: inherit;
  }
  .tier-pill:hover {
    border-color: #94a3b8;
    background: #f8fafc;
  }
  .tier-pill-icon {
    font-size: 0.95rem;
    font-weight: 700;
    line-height: 1;
    color: #94a3b8;
  }
  .tier-pill-label {
    font-size: 0.68rem;
    font-weight: 600;
    color: #94a3b8;
  }
  .tier-pill--active.tier-pill--none { border-color: #94a3b8; background: #f1f5f9; }
  .tier-pill--active.tier-pill--none .tier-pill-icon,
  .tier-pill--active.tier-pill--none .tier-pill-label { color: #475569; }
  .tier-pill--active.tier-pill--umum { border-color: #16a34a; background: #f0fdf4; }
  .tier-pill--active.tier-pill--umum .tier-pill-icon,
  .tier-pill--active.tier-pill--umum .tier-pill-label { color: #15803d; }
  .tier-pill--active.tier-pill--akamsi { border-color: #2563eb; background: #eff6ff; }
  .tier-pill--active.tier-pill--akamsi .tier-pill-icon,
  .tier-pill--active.tier-pill--akamsi .tier-pill-label { color: #1d4ed8; }
  .tier-pill--active.tier-pill--vip { border-color: #7c3aed; background: #fdf4ff; }
  .tier-pill--active.tier-pill--vip .tier-pill-icon,
  .tier-pill--active.tier-pill--vip .tier-pill-label { color: #7c3aed; }

  .status-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.45rem 0.7rem;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
  }
  .status-row-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    white-space: nowrap;
  }
  .status-pills {
    display: flex;
    gap: 0.3rem;
  }
  .status-pill {
    padding: 0.25rem 0.65rem;
    border-radius: 99px;
    font-size: 0.7rem;
    font-weight: 600;
    border: 1.5px solid #e2e8f0;
    background: #fff;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    color: #94a3b8;
    font-family: inherit;
  }
  .status-pill:hover { background: #f1f5f9; }
  .status-pill--active.status-pill--active   { background: #dcfce7; color: #15803d; border-color: #86efac; }
  .status-pill--active.status-pill--pending  { background: #fef9c3; color: #92400e; border-color: #fde68a; }
  .status-pill--active.status-pill--inactive { background: #f1f5f9; color: #475569; border-color: #cbd5e1; }

  /* Form inputs - Touch-friendly */
  .form-input {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
    min-height: 48px;
  }

   /* Customer avatar - LARGER for touch */
   .customer-avatar {
     width: 44px;
     height: 44px;
     font-size: 1.1rem;
   }
    flex-direction: column;
    position: absolute;
    top: 100%;
    right: 0;
    background: white;
    border: 1px solid rgba(123, 47, 190, 0.2);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 10;
    min-width: 160px;
    margin-top: 0.4rem;
  }

  .dropdown-item {
    padding: 0.85rem 1.2rem;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    font-size: 0.85rem;
    transition: background 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    color: var(--color-text-primary);
    min-height: 48px;
    display: flex;
    align-items: center;

    &:hover {
      background: rgba(123, 47, 190, 0.1);
    }

    &:not(:last-child) {
      border-bottom: 1px solid rgba(123, 47, 190, 0.1);
    }
  }

  /* Badge styling for tablet landscape */

/* ============================================
   DESKTOP: Full Table (≥1280px) - Compact for Mobile App
   ============================================ */
@media (min-width: 1280px) {
  .data-table thead {
    display: table-header-group;
  }

  .data-table thead tr {
    display: table-row;
  }

  .data-table th,
  .data-table td {
    display: table-cell;
    padding: 0.8rem 0.9rem;
    font-size: 0.85rem;
  }

  .data-table th {
    font-size: 0.7rem;
  }

  /* All columns visible */
  .data-table td.col-status {
    display: table-cell;
  }

    .customer-avatar {
      width: 40px;
      height: 40px;
      font-size: 1rem;
    }
  }

/* Mobile (<1024px) - Hidden by ActionButtonGroup component */
@media (max-width: 1023px) {
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

/* Pagination Responsive Styles */

/* Desktop (≥1280px) */
@media (min-width: 1280px) {
  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    margin-top: 0;
    background: linear-gradient(135deg, rgba(123, 47, 190, 0.02) 0%, rgba(52, 211, 153, 0.02) 100%);
    border-top: 2px solid rgba(123, 47, 190, 0.15);
    flex-shrink: 0;
  }

  .pagination-btn {
    padding: 0.5rem 0.9rem;
    font-size: 0.8rem;
    min-height: 36px;

    .pagination-btn__text {
      display: inline;
    }

    .pagination-btn__icon {
      display: none;
    }
  }

  .pagination-pages {
    display: flex;
    gap: 0.4rem;
    justify-content: center;
  }

  .pagination-page {
    min-width: 36px;
    min-height: 36px;
    font-size: 0.8rem;
  }

  .pagination-info {
    display: block;
  }
}

/* Tablet Landscape (1024-1279px) - Compact pagination */
@media (min-width: 1024px) and (max-width: 1279px) {
  .pagination {
    flex-direction: row;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem;
    margin-top: 0;
  }

  .pagination-btn {
    padding: 0.6rem 0.9rem;
    font-size: 0.8rem;
    min-height: 40px;

    .pagination-btn__text {
      display: none;
    }

    .pagination-btn__icon {
      display: inline;
    }
  }

  .pagination-pages {
    gap: 0.3rem;
  }

  .pagination-page {
    min-width: 36px;
    min-height: 36px;
    font-size: 0.8rem;
    padding: 0.4rem;
  }

  .pagination-info {
    display: none;
  }
}

/* Tablet Portrait (768-1023px) - Vertical pagination */
@media (min-width: 768px) and (max-width: 1023px) {
  .pagination {
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.75rem;
  }

  .pagination-btn {
    padding: 0.6rem 1rem;
    font-size: 0.8rem;
    min-height: 40px;
    width: 100%;

    .pagination-btn__text {
      display: inline;
    }

    .pagination-btn__icon {
      display: none;
    }
  }

  .pagination-pages {
    gap: 0.4rem;
    width: 100%;
  }

  .pagination-page {
    min-width: 40px;
    min-height: 40px;
    font-size: 0.85rem;
    flex: 1;
  }

  .pagination-info {
    display: block;
    text-align: center;
    width: 100%;
  }
}

/* Mobile (<768px) - Horizontal scroll pagination */
@media (max-width: 767px) {
  .top-spenders-grid {
    grid-template-columns: 1fr;
  }

  .section-title {
    font-size: 1rem;
  }

  .toolbar {
    flex-direction: column;
  }

  .data-table {
    font-size: 0.75rem;

    th, td {
      padding: 0.65rem 0.75rem;
    }
  }

  .customer-avatar {
    width: 32px;
    height: 32px;
    font-size: 1rem;
  }

  .action-buttons {
    flex-direction: column;
    gap: 0.35rem;
  }

  .pagination {
    flex-direction: row;
    justify-content: space-between;
    gap: 0.4rem;
    padding: 0.75rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;

    scrollbar-width: thin;
    &::-webkit-scrollbar {
      height: 4px;
    }
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    &::-webkit-scrollbar-thumb {
      background: rgba(123, 47, 190, 0.2);
      border-radius: 4px;
    }
  }

  .pagination-btn {
    padding: 0.55rem 0.8rem;
    font-size: 0.75rem;
    min-height: 36px;
    flex-shrink: 0;

    .pagination-btn__text {
      display: none;
    }

    .pagination-btn__icon {
      display: inline;
      font-size: 1rem;
    }
  }

  .pagination-pages {
    gap: 0.3rem;
    flex-shrink: 0;
  }

  .pagination-page {
    min-width: 32px;
    min-height: 32px;
    font-size: 0.75rem;
    padding: 0;
  }

  .pagination-info {
    display: none;
  }
}

/* =============================================
   MOBILE CARD LAYOUT
   ============================================= */

.card-grid {
  display: none;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  width: 100%;
  padding: 0;
}

.customer-card {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(123, 47, 190, 0.12);
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    box-shadow: 0 4px 16px rgba(123, 47, 190, 0.12);
    border-color: rgba(123, 47, 190, 0.2);
  }
}

.customer-avatar-large {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--brand-primary) 0%, #a78bfa 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.card-header {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.card-header--link {
  cursor: pointer;
  border-radius: 8px;
  padding: 0.25rem;
  margin: -0.25rem;
  transition: background 0.15s;

  &:hover {
    background: rgba(123, 47, 190, 0.06);
  }
}

.card-customer-info {
  flex: 1;
  min-width: 0;
}

.card-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1.4;
}

.card-phone {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  font-size: 0.875rem;
}

.card-label {
  color: var(--color-text-secondary);
  font-weight: 500;
}

.card-spending {
  font-weight: 700;
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.card-actions {
  display: flex;
  gap: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(123, 47, 190, 0.08);
}

.btn-card-action {
  flex: 1;
  padding: 0.625rem;
  border: 1px solid rgba(123, 47, 190, 0.2);
  border-radius: 8px;
  background: transparent;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;

  &:active {
    opacity: 0.8;
    transform: scale(0.98);
  }

  &.btn-delete {
    border-color: rgba(220, 38, 38, 0.2);

    &:active {
      background: rgba(220, 38, 38, 0.05);
    }
  }
}

/* Show card grid on mobile only (≤767px) */
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

  .customer-card {
    padding: 1rem;
  }

  .btn-card-action {
    padding: 0.5rem;
    font-size: 0.9rem;
    min-height: 32px;
  }
}
</style>
