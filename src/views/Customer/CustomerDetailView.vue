<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { customerApi } from '@/services/api/customer.api'
import { transactionApi } from '@/services/api/transaction.api'
import { formatRupiah, formatDateTimeJakarta } from '@/utils/formatters'
import { DEFAULT_AVATAR } from '@/utils/constants'
import type { Customer } from '@/types'
import type { Transaction } from '@/types'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseBadge from '@/components/base/BaseBadge.vue'
import StatusBadge from '@/components/base/StatusBadge.vue'
import BaseBottomSheet from '@/components/base/BaseBottomSheet.vue'
import BaseTextField from '@/components/base/BaseTextField.vue'
import BaseCheckbox from '@/components/base/BaseCheckbox.vue'

const route = useRoute()
const router = useRouter()
const { error: showError, success: showSuccess } = useToast()

const customer = ref<Customer | null>(null)
const transactions = ref<Transaction[]>([])
const isLoading = ref(false)
const isLoadingTrx = ref(false)

// Edit modal
const isEditOpen = ref(false)
const isSubmitting = ref(false)
const formData = ref({
  name: '',
  phone_number: '',
  avatar_url: '',
  member_type: null as 'umum' | 'akamsi' | 'vip' | null,
  member_status: 'inactive' as 'active' | 'pending' | 'inactive',
})
const formError = ref('')
const submitError = ref('')

const customerId = computed(() => route.params.id as string)

const transactionStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    completed: 'Selesai',
    paid: 'Dibayar',
    cancelled: 'Batal',
    hold: 'Hold',
    open: 'Buka',
    draft: 'Draft',
    partial_paid: 'Sebagian',
  }
  return map[status] || status
}

const transactionStatusVariant = (status: string): 'success' | 'danger' | 'warning' | 'neutral' | 'info' => {
  const map: Record<string, 'success' | 'danger' | 'warning' | 'neutral' | 'info'> = {
    completed: 'success',
    paid: 'success',
    cancelled: 'danger',
    hold: 'warning',
    open: 'info',
    draft: 'neutral',
    partial_paid: 'warning',
  }
  return map[status] || 'neutral'
}

const paymentLabel = (method: string) => {
  const map: Record<string, string> = {
    cash: 'Tunai', qris: 'QRIS', transfer: 'Transfer', split: 'Split Bill',
  }
  return map[method] || method
}

const openEditModal = () => {
  if (!customer.value) return
  formData.value = {
    name: customer.value.name,
    phone_number: (customer.value.phone_number || '').replace(/\D/g, ''),
    avatar_url: customer.value.avatar_url || DEFAULT_AVATAR,
    member_type: customer.value.member_type ?? null,
    member_status: customer.value.member_status ?? 'inactive',
  }
  formError.value = ''
  submitError.value = ''
  isEditOpen.value = true
}

const closeEditModal = () => {
  isEditOpen.value = false
}

const handleSave = async () => {
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
    const updated = await customerApi.updateCustomer(customerId.value, {
      name: formData.value.name.trim(),
      phone_number: formData.value.phone_number.trim(),
      avatar_url: formData.value.avatar_url || DEFAULT_AVATAR,
      is_member: memberType !== null && memberStatus === 'active',
      member_type: memberType,
      member_status: memberStatus,
    } as any)
    customer.value = updated
    showSuccess('Customer berhasil diupdate')
    closeEditModal()
  } catch (err) {
    console.error('[CustomerDetailView] handleSave error:', err)
    submitError.value = err instanceof Error ? err.message : 'Gagal menyimpan customer'
  } finally {
    isSubmitting.value = false
  }
}

onMounted(async () => {
  isLoading.value = true
  try {
    customer.value = await customerApi.getCustomerById(customerId.value)
  } catch {
    showError('Customer tidak ditemukan')
    router.replace('/customer')
    return
  } finally {
    isLoading.value = false
  }

  isLoadingTrx.value = true
  try {
    const result = await transactionApi.listTransactions({ customerId: customerId.value, limit: 30 })
    transactions.value = result.data.filter((t: Transaction) => t.status !== 'draft' && t.status !== 'hold')
  } catch {
    // non-fatal — page still works without transaction history
  } finally {
    isLoadingTrx.value = false
  }
})
</script>

<template>
  <div class="customer-detail-view">
    <!-- Loading skeleton -->
    <div v-if="isLoading" class="loading-state">
      <div class="skeleton skeleton--avatar" />
      <div class="skeleton skeleton--line" />
      <div class="skeleton skeleton--line skeleton--short" />
    </div>

    <template v-else-if="customer">
      <!-- Page header -->
      <div class="page-header">
        <BaseButton variant="ghost" size="sm" @click="router.back()">← Kembali</BaseButton>
        <div class="header-content">
          <h1 class="page-title">Detail Customer</h1>
          <p class="page-subtitle">{{ customer.name }}</p>
        </div>
        <BaseButton variant="secondary" size="sm" @click="openEditModal">
          <AppIcon name="edit" :size="13" /> Edit
        </BaseButton>
      </div>

      <!-- Customer info card -->
      <BaseCard class="info-card">
        <div class="customer-profile">
          <div class="customer-avatar">{{ customer.avatar_url || DEFAULT_AVATAR }}</div>
          <div class="customer-identity">
            <div class="customer-name">{{ customer.name }}</div>
            <div class="customer-phone">{{ customer.phone_number }}</div>
            <div class="customer-badges">
              <BaseBadge v-if="customer.is_member && customer.member_type" variant="success">
                {{ { umum: 'Member Umum', akamsi: 'Member Akamsi', vip: 'Member VIP' }[customer.member_type!] ?? 'Member' }}
              </BaseBadge>
              <BaseBadge v-else-if="customer.member_type" variant="warning">
                {{ customer.member_type.toUpperCase() }} ({{ customer.member_status }})
              </BaseBadge>
              <BaseBadge v-else variant="neutral">Regular</BaseBadge>
            </div>
          </div>
        </div>

        <div class="stats-row">
          <div class="stat-item">
            <span class="stat-label">Total Belanja</span>
            <span class="stat-value stat-value--primary">{{ formatRupiah(customer.total_spending) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Transaksi</span>
            <span class="stat-value">{{ transactions.length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Terakhir Transaksi</span>
            <span class="stat-value">
              {{ customer.last_transaction ? formatDateTimeJakarta(customer.last_transaction) : '—' }}
            </span>
          </div>
        </div>
      </BaseCard>

      <!-- Transaction history -->
      <div class="section-header">
        <h2 class="section-title">Riwayat Transaksi</h2>
        <span v-if="transactions.length > 0" class="trx-count">{{ transactions.length }} transaksi</span>
      </div>

      <div v-if="isLoadingTrx" class="trx-loading">
        <div class="trx-skeleton" v-for="i in 3" :key="i" />
      </div>

      <div v-else-if="transactions.length === 0" class="trx-empty">
        <AppIcon name="receipt" :size="32" class="trx-empty-icon" />
        <span>Belum ada transaksi</span>
      </div>

      <div v-else class="trx-list">
        <div
          v-for="trx in transactions"
          :key="trx.id"
          class="trx-card"
          :class="`trx-card--${trx.status}`"
          @click="router.push({ name: 'TransactionDetailDirect', params: { transactionId: trx.id } })"
        >
          <div class="trx-card-body">
            <div class="trx-main">
              <div class="trx-top">
                <span class="trx-number">{{ trx.transactionNumber }}</span>
                <StatusBadge
                  :status="transactionStatusLabel(trx.status)"
                  :variant="transactionStatusVariant(trx.status)"
                />
              </div>
              <div class="trx-meta">
                <span class="trx-date">{{ formatDateTimeJakarta(trx.paidAt || trx.createdAt) }}</span>
                <span class="trx-dot">·</span>
                <span class="trx-items">{{ trx.itemCount ?? trx.items.length }} item</span>
                <span class="trx-dot">·</span>
                <span class="trx-payment">{{ paymentLabel(trx.paymentMethod) }}</span>
              </div>
            </div>
            <div class="trx-amount">{{ formatRupiah(trx.total) }}</div>
          </div>
          <div v-if="trx.notes" class="trx-notes">{{ trx.notes }}</div>
        </div>
      </div>
    </template>

    <!-- Edit Bottom Sheet -->
    <BaseBottomSheet v-model="isEditOpen" title="Edit Customer" @close="closeEditModal">
      <form @submit.prevent="handleSave">
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
        <div class="tier-field">
          <label class="tier-label">Tipe Member</label>
          <select v-model="formData.member_type" class="tier-select">
            <option :value="null">Bukan Member</option>
            <option value="umum">Umum</option>
            <option value="akamsi">Akamsi</option>
            <option value="vip">VIP</option>
          </select>
        </div>
        <div v-if="formData.member_type" class="tier-field">
          <label class="tier-label">Status Member</label>
          <select v-model="formData.member_status" class="tier-select">
            <option value="pending">Pending</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>
        <div v-if="submitError" class="form-submit-error">{{ submitError }}</div>
      </form>

      <template #footer>
        <BaseButton variant="secondary" :disabled="isSubmitting" @click="closeEditModal">Batal</BaseButton>
        <BaseButton variant="primary" :loading="isSubmitting" @click="handleSave">Simpan</BaseButton>
      </template>
    </BaseBottomSheet>
  </div>
</template>

<style scoped>
.customer-detail-view {
  padding: var(--spacing-3);
  min-height: 100vh;
  background: #f8fafb;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

/* ── Page header ── */
.page-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  background: white;
  border-radius: 12px;
  padding: var(--spacing-2) var(--spacing-3);
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.header-content {
  flex: 1;
}

.page-title {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.2;
}

.page-subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0;
}

/* ── Customer profile card ── */
.customer-profile {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.customer-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(123, 47, 190, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  flex-shrink: 0;
}

.customer-identity {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.customer-name {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text-primary);
}

.customer-phone {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.customer-badges {
  display: flex;
  gap: var(--spacing-1);
}

/* ── Stats row ── */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-2);
  padding-top: var(--spacing-2);
  margin-top: var(--spacing-2);
  border-top: 1px solid var(--color-border);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.stat-value {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-primary);
}

.stat-value--primary {
  color: var(--brand-primary);
}

/* ── Section header ── */
.section-header {
  padding: 0 var(--spacing-1);
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.section-title {
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.trx-count {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--brand-primary);
  background: rgba(123, 47, 190, 0.08);
  padding: 0.15rem 0.5rem;
  border-radius: 99px;
}

/* ── Transaction list ── */
.trx-loading {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.trx-skeleton {
  height: 72px;
  border-radius: 12px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.trx-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-6) var(--spacing-3);
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  background: white;
  border-radius: 12px;
}

.trx-empty-icon {
  opacity: 0.3;
}

.trx-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.trx-card {
  background: white;
  border-radius: 12px;
  border-left: 3px solid transparent;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  cursor: pointer;
  transition: all 0.15s;
  overflow: hidden;

  &:hover {
    box-shadow: 0 3px 12px rgba(0,0,0,0.1);
    transform: translateY(-1px);
  }

  &.trx-card--completed,
  &.trx-card--paid { border-left-color: #10b981; }
  &.trx-card--cancelled { border-left-color: #ef4444; }
  &.trx-card--hold { border-left-color: #f59e0b; }
  &.trx-card--open,
  &.trx-card--partial_paid { border-left-color: #3b82f6; }
}

.trx-card-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
}

.trx-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.trx-top {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.trx-number {
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-text-primary);
}

.trx-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.trx-date,
.trx-items,
.trx-payment {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

.trx-dot {
  font-size: var(--font-size-xs);
  color: var(--color-text-hint);
}

.trx-amount {
  font-size: var(--font-size-base);
  font-weight: 800;
  color: var(--brand-primary);
  white-space: nowrap;
  flex-shrink: 0;
}

.trx-notes {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  padding: 0.4rem var(--spacing-3) 0.6rem;
  border-top: 1px solid var(--color-border-light, rgba(0,0,0,0.06));
  font-style: italic;
}

/* ── Edit form ── */
.form-submit-error {
  margin-top: var(--spacing-2);
  padding: 0.6rem 0.85rem;
  background: rgba(254, 242, 242, 0.9);
  color: #dc2626;
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
  font-size: var(--font-size-sm);
  font-weight: 500;
}

/* ── Loading skeleton ── */
.loading-state {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  padding: var(--spacing-3);
}

.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}

.skeleton--avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
}

.skeleton--line {
  height: 20px;
  width: 100%;
}

.skeleton--short {
  width: 60%;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Responsive ── */
@media (max-width: 600px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .stats-row .stat-item:last-child {
    grid-column: span 2;
  }
}

.tier-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.tier-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.tier-select {
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  font-size: 0.85rem;
  font-family: inherit;
  background: white;
  color: var(--color-text-primary);
  cursor: pointer;
  width: 100%;

  &:focus {
    outline: none;
    border-color: var(--brand-primary);
  }
}
</style>
