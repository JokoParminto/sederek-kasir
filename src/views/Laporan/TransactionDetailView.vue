<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCustomerStore } from '@/stores/customer'
import { useProductStore } from '@/stores/product'
import { useToast } from '@/composables/useToast'
import { transactionApi } from '@/services/api/transaction.api'
import { formatRupiah, formatDateTimeJakarta } from '@/utils/formatters'
import { useSwipeNavigation } from '@/composables/useSwipeNavigation'
import type { Transaction } from '@/types'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseBadge from '@/components/base/BaseBadge.vue'
import StatusBadge from '@/components/base/StatusBadge.vue'
import BaseBottomSheet from '@/components/base/BaseBottomSheet.vue'
import BaseRadio from '@/components/base/BaseRadio.vue'
import QuantityStepper from '@/components/base/QuantityStepper.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'

const route = useRoute()
const router = useRouter()
const customerStore = useCustomerStore()
const productStore = useProductStore()
const { error: showError } = useToast()

const transaction = ref<Transaction | null>(null)
const isLoading = ref(false)

useSwipeNavigation({ onSwipeLeft: () => router.back() })

onMounted(async () => {
  try {
    isLoading.value = true
    const transactionId = route.params.transactionId as string
    const data = await transactionApi.getTransaction(transactionId)
    transaction.value = data
    if (customerStore.customers.length === 0) {
      await customerStore.fetchCustomers()
    }
  } catch (err) {
    showError('Gagal memuat detail transaksi')
  } finally {
    isLoading.value = false
  }
})

const getCustomerName = (customerId: string | null): string => {
  if (!customerId) return 'Walk In'
  const customer = customerStore.getCustomerById(customerId)
  return customer ? customer.name : (transaction.value?.customerName || 'Walk In')
}

const getPaymentMethodLabel = (method: string): string => {
  const labels: Record<string, string> = {
    cash: 'Tunai', qris: 'QRIS', transfer: 'Transfer', split: 'Split',
  }
  return labels[method] || method
}

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    paid: 'Lunas', completed: 'Selesai', cancelled: 'Dibatalkan',
    open: 'Belum Lunas', partial_paid: 'Sebagian Lunas', draft: 'Draft',
  }
  return labels[status] || status
}

const getStatusVariant = (status: string): 'success' | 'danger' | 'info' | 'warning' | 'neutral' => {
  const map: Record<string, 'success' | 'danger' | 'info' | 'warning' | 'neutral'> = {
    paid: 'success', completed: 'success',
    cancelled: 'danger',
    open: 'info',
    partial_paid: 'warning',
    draft: 'neutral', hold: 'neutral',
  }
  return map[status] || 'neutral'
}

const showEditModal = ref(false)
const editData = ref<any>(null)
const isSaving = ref(false)
const saveError = ref('')

const calcDiscount = (value: number, type: string, base: number): number => {
  if (!value) return 0
  return type === 'percentage' ? Math.round(base * value / 100) : value
}

const getItemDiscountAmount = (item: any): number => {
  const itemBase = Number(item.quantity) * Number(item.price) +
    (item.addOns || []).reduce((s: number, a: any) => s + Number(a.subtotal), 0)
  return calcDiscount(item.discount?.value || 0, item.discount?.type || 'amount', itemBase)
}

const editSummary = computed(() => {
  if (!editData.value) return { subtotal: 0, itemDiscount: 0, globalDiscount: 0, total: 0 }
  const items = editData.value.items || []
  const subtotal = items.reduce((sum: number, item: any) => {
    const itemBase = Number(item.quantity) * Number(item.price)
    const addOnsTotal = (item.addOns || []).reduce((s: number, a: any) => s + Number(a.subtotal), 0)
    return sum + itemBase + addOnsTotal
  }, 0)
  const itemDiscount = items.reduce((sum: number, item: any) => {
    const itemBase = Number(item.quantity) * Number(item.price) +
      (item.addOns || []).reduce((s: number, a: any) => s + Number(a.subtotal), 0)
    return sum + calcDiscount(item.discount?.value || 0, item.discount?.type || 'amount', itemBase)
  }, 0)
  const globalDiscount = calcDiscount(
    editData.value.globalDiscount?.value || 0,
    editData.value.globalDiscount?.type || 'amount',
    subtotal - itemDiscount
  )
  return { subtotal, itemDiscount, globalDiscount, total: Math.max(0, subtotal - itemDiscount - globalDiscount) }
})

const openEditModal = () => {
  if (!transaction.value) return
  saveError.value = ''
  editData.value = {
    id: transaction.value.id,
    status: transaction.value.status || 'completed',
    items: (transaction.value.items || []).map((item: any) => ({
      id: item.id,
      productId: item.productId || item.product_id,
      productName: item.productName || item.product_name,
      price: item.price,
      quantity: item.quantity,
      discount: item.discount || { type: 'amount', value: 0 },
      addOns: item.addOns || [],
      selectedAddonId: null,  // per-item
    })),
    globalDiscount: transaction.value.globalDiscount || { type: 'amount', value: 0 },
  }
  showEditModal.value = true
}

const getAvailableAddOnsForItem = (itemIndex: number): any[] => {
  if (!editData.value || itemIndex < 0 || itemIndex >= editData.value.items.length) return []
  const item = editData.value.items[itemIndex]
  const product = productStore.getProductById(item.productId)
  if (!product?.addOns) return []
  return product.addOns.filter((addon: any) =>
    !item.addOns.some((existing: any) => existing.addOnId === addon.id)
  )
}

const addAddonToItem = (itemIndex: number) => {
  if (!editData.value || itemIndex < 0 || itemIndex >= editData.value.items.length) return
  const item = editData.value.items[itemIndex]
  if (!item.selectedAddonId) return
  const product = productStore.getProductById(item.productId)
  if (!product?.addOns) return
  const selectedAddon = product.addOns.find((a: any) => a.id === item.selectedAddonId)
  if (!selectedAddon) return
  if (!item.addOns) item.addOns = []
  if (item.addOns.some((addon: any) => addon.addOnId === selectedAddon.id)) {
    showError('Add-on sudah ada di item ini')
    return
  }
  item.addOns.push({
    addOnId: selectedAddon.id,
    addOnName: selectedAddon.name,
    price: selectedAddon.price || 0,
    quantity: 1,
    subtotal: selectedAddon.price || 0,
  })
  item.selectedAddonId = null
}

const closeEditModal = () => {
  showEditModal.value = false
  editData.value = null
  saveError.value = ''
}

const handleSaveEdit = async () => {
  if (!editData.value || !transaction.value) return
  try {
    isSaving.value = true
    saveError.value = ''

    // Cancel flow — skip item update
    if (editData.value.status === 'cancelled') {
      await transactionApi.cancelTransaction(transaction.value.id)
    } else {
      // Transform to BE format
      const toNominalType = (t: string): 'percentage' | 'nominal' => t === 'amount' ? 'nominal' : t as 'percentage'

      const transformedItems = editData.value.items.map((item: any) => ({
        product_id: item.productId,
        product_name: item.productName,
        price: Number(item.price),
        quantity: Number(item.quantity),
        ...(item.discount?.value > 0 && {
          discount: {
            type: toNominalType(item.discount.type),
            value: item.discount.value,
          }
        }),
        add_ons: (item.addOns || []).map((a: any) => ({
          add_on_id: a.addOnId,
          quantity: a.quantity || 1,
          price: Number(a.price),
        })),
      }))

      const globalDiscountPayload = editData.value.globalDiscount?.value > 0
        ? {
            type: toNominalType(editData.value.globalDiscount.type),
            value: editData.value.globalDiscount.value,
          }
        : undefined

      await transactionApi.updateTransaction(transaction.value.id, {
        items: transformedItems,
        discount: globalDiscountPayload,
      })
    }

    // Reload
    const data = await transactionApi.getTransaction(route.params.transactionId as string)
    transaction.value = data
    closeEditModal()
  } catch (err: any) {
    saveError.value = err?.response?.data?.error?.message || err?.message || 'Gagal menyimpan perubahan'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="page">
    <div class="container">

      <!-- Loading -->
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Memuat detail transaksi...</p>
      </div>

      <!-- Content -->
      <template v-if="!isLoading && transaction">
        <!-- Header -->
        <div class="page-header">
          <BaseButton variant="ghost" size="sm" @click="() => router.back()">← Kembali</BaseButton>
          <div class="header-content">
            <h1 class="page-title">Detail Transaksi</h1>
            <p class="page-subtitle">{{ transaction.transactionNumber }}</p>
          </div>
          <BaseButton
            v-if="transaction.status === 'completed' || transaction.status === 'paid'"
            variant="secondary"
            size="sm"
            @click="openEditModal"
          >
            <AppIcon name="edit" :size="13" /> Edit
          </BaseButton>
        </div>

        <!-- Info Card -->
        <BaseCard>
          <div class="info-grid">
            <div class="info-row">
              <span class="info-label">No. Transaksi</span>
              <span class="info-value">{{ transaction.transactionNumber }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Tanggal & Waktu</span>
              <span class="info-value">{{ formatDateTimeJakarta(transaction.paidAt || transaction.createdAt) }} WIB</span>
            </div>
            <div class="info-row">
              <span class="info-label">Customer</span>
              <span class="info-value">{{ transaction.customerName || getCustomerName(transaction.customerId) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Metode Pembayaran</span>
              <BaseBadge variant="primary" size="sm">{{ getPaymentMethodLabel(transaction.paymentMethod) }}</BaseBadge>
            </div>
            <div class="info-row">
              <span class="info-label">Status</span>
              <StatusBadge
                :status="transaction.status"
                :label="getStatusLabel(transaction.status)"
                :variant="getStatusVariant(transaction.status)"
              />
            </div>
          </div>
        </BaseCard>

        <!-- Items Card -->
        <BaseCard>
          <template #header>
            <h2 class="card-title">Detail Item ({{ transaction.items.length }})</h2>
          </template>
          <div class="items-list">
            <div v-for="item in transaction.items" :key="item.id" class="item-detail">
              <div class="item-header">
                <div class="item-info">
                  <p class="item-name">{{ item.productName }}</p>
                  <p class="item-meta">{{ item.quantity }}x @ {{ formatRupiah(Number(item.price)) }}</p>
                </div>
                <div class="item-amount">{{ formatRupiah(Number(item.subtotal)) }}</div>
              </div>
              <div v-if="item.addOns && item.addOns.length > 0" class="item-addons">
                <div v-for="addon in item.addOns" :key="addon.addOnId" class="addon">
                  <span class="addon-name">+ {{ addon.addOnName }}</span>
                  <span class="addon-price">{{ formatRupiah(Number(addon.subtotal)) }}</span>
                </div>
              </div>
              <div v-if="item.discount.value > 0" class="item-discount">
                <span class="discount-label">
                  Diskon {{ item.discount.type === 'percentage' ? item.discount.value + '%' : formatRupiah(Number(item.discount.value)) }}
                </span>
                <span class="discount-value">-{{ formatRupiah(getItemDiscountAmount(item)) }}</span>
              </div>
            </div>
          </div>
        </BaseCard>

        <!-- Summary Card -->
        <BaseCard>
          <div class="summary-rows">
            <div class="summary-row">
              <span class="summary-label">Subtotal</span>
              <span class="summary-value">{{ formatRupiah(Number(transaction.subtotal)) }}</span>
            </div>
            <div v-if="transaction.itemDiscounts > 0" class="summary-row discount">
              <span class="summary-label">Diskon Item</span>
              <span class="summary-value">-{{ formatRupiah(Number(transaction.itemDiscounts)) }}</span>
            </div>
            <div v-if="transaction.globalDiscountAmount > 0" class="summary-row discount">
              <span class="summary-label">Diskon Transaksi</span>
              <span class="summary-value">-{{ formatRupiah(Number(transaction.globalDiscountAmount)) }}</span>
            </div>
            <div class="summary-row total">
              <span class="summary-label">Total Bayar</span>
              <span class="summary-value total-value">{{ formatRupiah(Number(transaction.total)) }}</span>
            </div>
          </div>
        </BaseCard>
      </template>

      <!-- Edit Bottom Sheet -->
      <BaseBottomSheet
        v-model="showEditModal"
        title="Edit Transaksi"
        size="large"
        @close="closeEditModal"
      >
        <template v-if="editData">
          <!-- Error -->
          <BaseAlert
            v-if="saveError"
            type="error"
            :description="saveError"
            @close="saveError = ''"
          />

          <!-- Status -->
          <div class="edit-section">
            <h3 class="section-title">Status Transaksi</h3>
            <div class="radios-row">
              <BaseRadio v-model="editData.status" value="completed" label="Selesai" name="edit-status" />
              <BaseRadio v-model="editData.status" value="cancelled" label="Batalkan Transaksi" name="edit-status" />
            </div>
            <p v-if="editData.status === 'cancelled'" class="cancel-warning">
              <AppIcon name="warning" :size="14" /> Transaksi akan dibatalkan dan tidak dapat dikembalikan
            </p>
          </div>

          <!-- Items (hidden when cancelling) -->
          <template v-if="editData.status !== 'cancelled'">
            <div class="edit-section">
              <h3 class="section-title">Item Transaksi</h3>
              <div class="items-edit-list">
                <div v-for="(item, index) in (editData.items as any[])" :key="item.id" class="item-edit-card">
                  <!-- Item Header: name + qty stepper + delete -->
                  <div class="item-edit-header">
                    <div class="item-edit-info">
                      <p class="item-edit-name">{{ item.productName }}</p>
                      <p class="item-edit-price">@ {{ formatRupiah(Number(item.price)) }}</p>
                    </div>
                    <div class="item-edit-controls">
                      <QuantityStepper v-model="item.quantity" :min="1" :max="99" />
                      <BaseButton variant="ghost" size="sm" @click="editData.items.splice(index, 1)"><AppIcon name="trash" :size="14" /></BaseButton>
                    </div>
                  </div>

                  <!-- Subtotal preview -->
                  <div class="item-subtotal-preview">
                    <span class="item-subtotal-label">Subtotal item</span>
                    <span class="item-subtotal-value">{{ formatRupiah(Number(item.price) * Number(item.quantity)) }}</span>
                  </div>

                  <!-- Existing Add-ons -->
                  <div v-if="item.addOns && item.addOns.length > 0" class="addons-edit-list">
                    <div v-for="(addon, addonIndex) in item.addOns" :key="addon.addOnId" class="addon-edit-row">
                      <span class="addon-name">+ {{ addon.addOnName }}</span>
                      <span class="addon-price">{{ formatRupiah(Number(addon.subtotal)) }}</span>
                      <BaseButton variant="ghost" size="sm" @click="item.addOns.splice(addonIndex, 1)"><AppIcon name="x" :size="13" /></BaseButton>
                    </div>
                  </div>

                  <!-- Add Add-on (per-item selectedAddonId) -->
                  <div v-if="getAvailableAddOnsForItem(index).length > 0" class="add-addon-form">
                    <select v-model="item.selectedAddonId" class="addon-select">
                      <option value="">-- Pilih Add-on --</option>
                      <option
                        v-for="addon in getAvailableAddOnsForItem(index)"
                        :key="addon.id"
                        :value="addon.id"
                      >
                        {{ addon.name }} ({{ formatRupiah(Number(addon.price) || 0) }})
                      </option>
                    </select>
                    <BaseButton
                      variant="primary"
                      size="sm"
                      :disabled="!item.selectedAddonId"
                      @click="addAddonToItem(index)"
                    >
                      + Tambah
                    </BaseButton>
                  </div>

                  <!-- Item Discount -->
                  <div class="item-discount-edit">
                    <p class="discount-section-label">Diskon Item</p>
                    <div class="radios-row">
                      <BaseRadio
                        v-model="item.discount.type"
                        value="amount"
                        label="Nominal"
                        :name="`discount-type-${index}`"
                      />
                      <BaseRadio
                        v-model="item.discount.type"
                        value="percentage"
                        label="Persen"
                        :name="`discount-type-${index}`"
                      />
                    </div>
                    <div class="discount-input-row">
                      <input
                        v-model.number="item.discount.value"
                        type="text" inputmode="numeric"
                        min="0"
                        class="input-field"
                        :placeholder="`Diskon ${item.discount.type === 'percentage' ? '%' : 'Rp'}`"
                      />
                      <BaseButton
                        variant="danger"
                        size="sm"
                        @click="item.discount.value = 0; item.discount.type = 'amount'"
                      >
                        Hapus
                      </BaseButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Global Discount -->
            <div class="edit-section">
              <h3 class="section-title">Diskon Global Transaksi</h3>
              <div class="radios-row">
                <BaseRadio v-model="editData.globalDiscount.type" value="amount" label="Nominal" name="global-discount-type" />
                <BaseRadio v-model="editData.globalDiscount.type" value="percentage" label="Persen" name="global-discount-type" />
              </div>
              <div class="discount-input-row">
                <input
                  v-model.number="editData.globalDiscount.value"
                  type="text" inputmode="numeric"
                  min="0"
                  class="input-field"
                  :placeholder="`Diskon ${editData.globalDiscount.type === 'percentage' ? '%' : 'Rp'}`"
                />
                <BaseButton
                  variant="danger"
                  size="sm"
                  @click="editData.globalDiscount.value = 0; editData.globalDiscount.type = 'amount'"
                >
                  Hapus
                </BaseButton>
              </div>
            </div>

            <!-- Edit Summary -->
            <div class="edit-summary">
              <div class="calc-row">
                <span class="calc-label">Subtotal</span>
                <span class="calc-value">{{ formatRupiah(editSummary.subtotal) }}</span>
              </div>
              <div v-if="editSummary.itemDiscount > 0" class="calc-row discount">
                <span class="calc-label">Diskon Item</span>
                <span class="calc-value">-{{ formatRupiah(editSummary.itemDiscount) }}</span>
              </div>
              <div v-if="editSummary.globalDiscount > 0" class="calc-row discount">
                <span class="calc-label">Diskon Global</span>
                <span class="calc-value">-{{ formatRupiah(editSummary.globalDiscount) }}</span>
              </div>
              <div class="calc-row total">
                <span class="calc-label">Total Bayar</span>
                <span class="calc-value total-value">{{ formatRupiah(editSummary.total) }}</span>
              </div>
            </div>
          </template>
        </template>

        <template #footer>
          <div class="sheet-footer">
            <BaseButton variant="secondary" :fullWidth="true" :disabled="isSaving" @click="closeEditModal">
              Batal
            </BaseButton>
            <BaseButton
              v-if="editData?.status !== 'cancelled'"
              variant="primary"
              :fullWidth="true"
              :loading="isSaving"
              :disabled="isSaving || !editData?.items?.length"
              @click="handleSaveEdit"
            >
              Simpan Perubahan
            </BaseButton>
            <BaseButton
              v-else
              variant="danger"
              :fullWidth="true"
              :loading="isSaving"
              :disabled="isSaving"
              @click="handleSaveEdit"
            >
              Batalkan Transaksi
            </BaseButton>
          </div>
        </template>
      </BaseBottomSheet>

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
  gap: var(--spacing-3);
}

/* Header */
.page-header {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-3);
}

.header-content {
  flex: 1;
}


/* Info grid inside BaseCard */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--spacing-4);
}

.info-row {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.info-label {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-tertiary);
  letter-spacing: 0.05em;
}

.info-value {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-primary);
}

/* Card header */
.card-title {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

/* Items list */
.items-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.item-detail {
  padding: var(--spacing-3);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light);
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.item-name {
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.item-meta {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin: 0.2rem 0 0 0;
}

.item-amount {
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--brand-primary-dark);
}

.item-addons {
  margin-top: var(--spacing-2);
  padding-top: var(--spacing-2);
  border-top: 1px solid var(--color-border-light);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.addon {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-sm);
}

.addon-name { color: var(--color-text-tertiary); font-style: italic; }
.addon-price { color: var(--brand-primary-dark); font-weight: 600; }

.item-discount {
  display: flex;
  justify-content: space-between;
  margin-top: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  background: rgba(245, 158, 11, 0.08);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
}

.discount-label { color: #b45309; font-weight: 600; }
.discount-value { color: #b45309; font-weight: 700; }

/* Summary */
.summary-rows {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-3) 0;
  border-bottom: 1px solid var(--color-border-light);
}

.summary-row:last-child { border-bottom: none; }

.summary-row.discount {
  padding: var(--spacing-2) var(--spacing-3);
  background: rgba(245, 158, 11, 0.06);
  border-radius: var(--radius-sm);
  border-bottom: none;
  margin: var(--spacing-1) 0;
}

.summary-row.total {
  padding-top: var(--spacing-4);
  border-top: 2px solid var(--color-border);
  border-bottom: none;
}

.summary-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: 500;
}

.summary-value {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-primary);
}

.total-value {
  font-size: var(--font-size-2xl);
  font-weight: 800;
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
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

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Edit Sheet */
.edit-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  padding: var(--spacing-3);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light);
}

.section-title {
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.radios-row {
  display: flex;
  gap: var(--spacing-2);
  flex-wrap: wrap;
}

.items-edit-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.item-edit-card {
  padding: var(--spacing-3);
  background: var(--color-surface-0);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.item-edit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-2);
}

.item-edit-info { flex: 1; }

.item-edit-name {
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.item-edit-price {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin: 0.15rem 0 0 0;
}

.item-edit-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  flex-shrink: 0;
}

.item-subtotal-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-2) var(--spacing-3);
  background: rgba(123, 47, 190, 0.04);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
}

.item-subtotal-label { color: var(--color-text-tertiary); }
.item-subtotal-value { font-weight: 700; color: var(--brand-primary-dark); }

.cancel-warning {
  font-size: var(--font-size-sm);
  color: var(--color-danger);
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-sm);
  padding: var(--spacing-2) var(--spacing-3);
  margin: 0;
}

.discount-section-label {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-tertiary);
  letter-spacing: 0.04em;
  margin: 0;
}

.addons-edit-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  padding: var(--spacing-2);
  background: rgba(245, 158, 11, 0.05);
  border-radius: var(--radius-sm);
}

.addon-edit-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--font-size-sm);
}

.add-addon-form {
  display: flex;
  gap: var(--spacing-2);
  padding: var(--spacing-2);
  background: rgba(123, 47, 190, 0.04);
  border-radius: var(--radius-sm);
  border: 1px dashed rgba(123, 47, 190, 0.25);
}

.addon-select {
  flex: 1;
  padding: var(--spacing-2) var(--spacing-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-family: inherit;
  background: var(--color-surface-0);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: border-color var(--transition-duration-short) var(--transition-standard);
}

.addon-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(123, 47, 190, 0.1);
}

.item-discount-edit {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  background: rgba(245, 158, 11, 0.05);
  border-radius: var(--radius-sm);
  border: 1px solid rgba(245, 158, 11, 0.15);
}

.discount-input-row {
  display: flex;
  gap: var(--spacing-2);
}

.input-field {
  flex: 1;
  padding: var(--spacing-2) var(--spacing-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-family: inherit;
  background: var(--color-surface-0);
  color: var(--color-text-primary);
  transition: border-color var(--transition-duration-short) var(--transition-standard);
}

.input-field:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(123, 47, 190, 0.1);
}

/* Edit Summary */
.edit-summary {
  padding: var(--spacing-3);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light);
  display: flex;
  flex-direction: column;
}

.calc-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-2) 0;
  font-size: var(--font-size-base);
  border-bottom: 1px solid var(--color-border-light);
}

.calc-row:last-child { border-bottom: none; }

.calc-row.discount {
  padding: var(--spacing-2) var(--spacing-2);
  background: rgba(245, 158, 11, 0.08);
  border-radius: var(--radius-xs);
  color: #b45309;
  border-bottom: none;
  margin: var(--spacing-1) 0;
}

.calc-row.total {
  padding-top: var(--spacing-3);
  border-top: 2px solid var(--color-border);
  border-bottom: none;
}

.calc-label { font-weight: 500; color: var(--color-text-secondary); }
.calc-value { font-weight: 700; color: var(--color-text-primary); }

/* Sheet footer */
.sheet-footer {
  display: flex;
  gap: var(--spacing-3);
  width: 100%;
}

.sheet-footer > :deep(*) { flex: 1; }

/* Tablet Landscape (768px-1023px) — Samsung Tab A9 */
@media (min-width: 768px) and (max-width: 1023px) {
  .page { padding: var(--spacing-2); }
  .container { gap: var(--spacing-2); }
  .page-header { padding: var(--spacing-2); gap: var(--spacing-2); }
  .detail-sections { gap: var(--spacing-2); }
  .detail-section { padding: var(--spacing-2); }
}
</style>
