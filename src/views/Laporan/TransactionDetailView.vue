<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCustomerStore } from '@/stores/customer'
import { useProductStore } from '@/stores/product'
import { useToast } from '@/composables/useToast'
import { transactionApi } from '@/services/api/transaction.api'
import { printCustomerReceipt } from '@/services/customer-receipt.service'
import { formatRupiah, formatDateTimeJakarta } from '@/utils/formatters'
import { useSwipeNavigation } from '@/composables/useSwipeNavigation'
import type { Transaction } from '@/types'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import StatusBadge from '@/components/base/StatusBadge.vue'
import BaseBottomSheet from '@/components/base/BaseBottomSheet.vue'
import BaseRadio from '@/components/base/BaseRadio.vue'
import QuantityStepper from '@/components/base/QuantityStepper.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'

const route = useRoute()
const router = useRouter()
const customerStore = useCustomerStore()
const productStore = useProductStore()
const { success: showSuccess, error: showError } = useToast()

const transaction = ref<Transaction | null>(null)
const isLoading = ref(false)
const isPrinting = ref(false)

useSwipeNavigation({ onSwipeLeft: () => router.back() })

onMounted(async () => {
  try {
    isLoading.value = true
    const transactionId = route.params.transactionId as string
    const [data] = await Promise.all([
      transactionApi.getTransaction(transactionId),
      customerStore.customers.length === 0 ? customerStore.fetchCustomers() : Promise.resolve(),
      productStore.fetchProducts(),
    ])
    transaction.value = data
  } catch {
    showError('Gagal memuat detail transaksi')
  } finally {
    isLoading.value = false
  }
})

const getCustomerName = (customerId: string | null): string => {
  if (!customerId) return 'Walk In'
  const customer = customerStore.getCustomerById(customerId)
  return customer?.name || transaction.value?.customerName || 'Walk In'
}

const getPaymentMethodLabel = (method: string): string => {
  const labels: Record<string, string> = {
    cash: 'Tunai', qris: 'QRIS', transfer: 'Transfer',
    debit: 'Debit', credit: 'Kredit', split: 'Split',
  }
  return labels[method?.toLowerCase()] || method || '—'
}

const getPaymentMethodClass = (method: string) => {
  const map: Record<string, string> = {
    cash: 'pm-cash', qris: 'pm-qris', transfer: 'pm-transfer',
    debit: 'pm-debit', credit: 'pm-credit', split: 'pm-split',
  }
  return map[method?.toLowerCase()] || 'pm-cash'
}

const handlePrintReceipt = async () => {
  if (!transaction.value || isPrinting.value) return
  try {
    isPrinting.value = true
    await printCustomerReceipt(transaction.value, {
      customerNameFallback: getCustomerName(transaction.value.customerId),
    })
    showSuccess('Struk berhasil dicetak ulang')
  } catch (error: any) {
    showError(error?.message || 'Gagal mencetak ulang struk')
  } finally {
    isPrinting.value = false
  }
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
    open: 'info', partial_paid: 'warning',
    draft: 'neutral', hold: 'neutral',
  }
  return map[status] || 'neutral'
}

const canEdit = computed(() =>
  ['paid', 'completed', 'partial_paid', 'open'].includes(transaction.value?.status || '')
)

const getItemDiscountAmount = (item: any): number => {
  if (!item?.discount?.value) return 0
  const itemBase = Number(item.quantity || 1) * Number(item.price || 0) +
    (item.addOns || []).reduce((s: number, a: any) => s + Number(a.subtotal || 0), 0)
  return item.discount.type === 'percentage'
    ? Math.round(itemBase * item.discount.value / 100)
    : item.discount.value
}

// ─── Edit sheet ────────────────────────────────────────────────────────────
const showEditModal    = ref(false)
const editData         = ref<any>(null)
const isSaving         = ref(false)
const saveError        = ref('')
const showCancelConfirm = ref(false)

const editSummary = computed(() => {
  if (!editData.value) return { subtotal: 0, itemDiscount: 0, globalDiscount: 0, total: 0 }
  const items = editData.value.items || []
  const subtotal = items.reduce((sum: number, item: any) => {
    const base   = Number(item.quantity) * Number(item.price)
    const addons = (item.addOns || []).reduce((s: number, a: any) =>
      s + Number(a.price || 0) * Number(a.quantity || 1), 0)
    return sum + base + addons
  }, 0)
  const itemDiscount = items.reduce((sum: number, item: any) => {
    if (!item.discount?.value) return sum
    const base = Number(item.quantity) * Number(item.price) +
      (item.addOns || []).reduce((s: number, a: any) => s + Number(a.price || 0) * Number(a.quantity || 1), 0)
    return sum + (item.discount.type === 'percentage'
      ? Math.round(base * item.discount.value / 100)
      : Number(item.discount.value))
  }, 0)
  const afterItem = subtotal - itemDiscount
  const gd = editData.value.globalDiscount
  const globalDiscount = gd?.value
    ? (gd.type === 'percentage' ? Math.round(afterItem * gd.value / 100) : Number(gd.value))
    : 0
  return { subtotal, itemDiscount, globalDiscount, total: Math.max(0, afterItem - globalDiscount) }
})

const openEditModal = () => {
  if (!transaction.value) return
  saveError.value     = ''
  showCancelConfirm.value = false
  editData.value = {
    items: (transaction.value.items || []).map((item: any) => ({
      id:              item.id,
      productId:       item.productId || item.product_id,
      productName:     item.productName || item.product_name,
      price:           Number(item.price),
      quantity:        Number(item.quantity),
      notes:           item.notes || '',
      discount:        { type: item.discount?.type || 'amount', value: Number(item.discount?.value || 0) },
      addOns:          (item.addOns || []).map((a: any) => ({
        addOnId:   a.addOnId,
        addOnName: a.addOnName,
        price:     Number(a.price || 0),
        quantity:  Number(a.quantity || 1),
      })),
      selectedAddonId: null,
    })),
    globalDiscount: {
      type:  transaction.value.globalDiscount?.type  || 'amount',
      value: Number(transaction.value.globalDiscount?.value || 0),
    },
  }
  showEditModal.value = true
}

const getAvailableAddOnsForItem = (itemIndex: number): any[] => {
  const item = editData.value?.items?.[itemIndex]
  if (!item) return []
  const product = productStore.getProductById(item.productId)
  if (!product?.addOns) return []
  return product.addOns.filter((addon: any) =>
    !item.addOns.some((e: any) => e.addOnId === addon.id)
  )
}

const addAddonToItem = (itemIndex: number) => {
  const item = editData.value?.items?.[itemIndex]
  if (!item?.selectedAddonId) return
  const product      = productStore.getProductById(item.productId)
  const selectedAddon = product?.addOns?.find((a: any) => a.id === item.selectedAddonId)
  if (!selectedAddon) return
  if (item.addOns.some((a: any) => a.addOnId === selectedAddon.id)) {
    showError('Add-on sudah ada di item ini')
    return
  }
  item.addOns.push({
    addOnId:   selectedAddon.id,
    addOnName: selectedAddon.name,
    price:     Number(selectedAddon.price || 0),
    quantity:  1,
  })
  item.selectedAddonId = null
}

const closeEditModal = () => {
  showEditModal.value     = false
  showCancelConfirm.value = false
  editData.value          = null
  saveError.value         = ''
}

const handleSaveEdit = async () => {
  if (!editData.value || !transaction.value) return
  try {
    isSaving.value  = true
    saveError.value = ''

    const transformedItems = editData.value.items.map((item: any) => ({
      product_id:   item.productId,
      product_name: item.productName,
      price:        Number(item.price),
      quantity:     Number(item.quantity),
      notes:        item.notes || undefined,
      ...(item.discount?.value > 0 && {
        discount: { type: item.discount.type as 'amount' | 'percentage', value: Number(item.discount.value) }
      }),
      add_ons: (item.addOns || []).map((a: any) => ({
        add_on_id: a.addOnId,
        quantity:  Number(a.quantity) || 1,
        price:     Number(a.price),
      })),
    }))

    const globalDiscountPayload = editData.value.globalDiscount?.value > 0
      ? { type: editData.value.globalDiscount.type as 'amount' | 'percentage', value: Number(editData.value.globalDiscount.value) }
      : undefined

    await transactionApi.updateTransaction(transaction.value.id, {
      items:    transformedItems,
      discount: globalDiscountPayload,
    })

    const fresh = await transactionApi.getTransaction(route.params.transactionId as string)
    transaction.value = fresh
    closeEditModal()
  } catch (err: any) {
    saveError.value = err?.response?.data?.error?.message || err?.message || 'Gagal menyimpan perubahan'
  } finally {
    isSaving.value = false
  }
}

const handleCancelTransaction = async () => {
  if (!transaction.value) return
  try {
    isSaving.value  = true
    saveError.value = ''
    await transactionApi.cancelTransaction(transaction.value.id)
    const fresh = await transactionApi.getTransaction(route.params.transactionId as string)
    transaction.value = fresh
    closeEditModal()
  } catch (err: any) {
    saveError.value = err?.response?.data?.error?.message || err?.message || 'Gagal membatalkan transaksi'
    showCancelConfirm.value = false
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="page">

    <!-- Sticky header -->
    <div class="sticky-header">
      <BaseButton variant="ghost" size="sm" @click="() => router.back()">← Kembali</BaseButton>
      <div class="header-center">
        <h1 class="page-title">Detail Transaksi</h1>
        <span v-if="transaction" class="page-subtitle">{{ transaction.transactionNumber }}</span>
      </div>
      <div v-if="transaction" class="header-actions">
        <BaseButton
          variant="primary"
          size="sm"
          :loading="isPrinting"
          :disabled="isPrinting"
          @click="handlePrintReceipt"
        >
          <AppIcon name="printer" :size="13" /> Cetak Ulang
        </BaseButton>
        <BaseButton
          v-if="canEdit"
          variant="secondary"
          size="sm"
          @click="openEditModal"
        >
          <AppIcon name="edit" :size="13" /> Edit
        </BaseButton>
      </div>
      <div v-else class="header-spacer"></div>
    </div>

    <div class="container">

      <!-- Loading -->
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Memuat detail transaksi...</p>
      </div>

      <template v-if="!isLoading && transaction">

        <!-- Info Card -->
        <BaseCard>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Tanggal & Waktu</span>
              <span class="info-value">{{ formatDateTimeJakarta(transaction.paidAt || transaction.createdAt) }} WIB</span>
            </div>
            <div class="info-item">
              <span class="info-label">Customer</span>
              <span class="info-value">{{ transaction.customerName || getCustomerName(transaction.customerId) }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Kasir</span>
              <span class="info-value">{{ transaction.cashierName || '—' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Metode Bayar</span>
              <span class="pm-chip" :class="getPaymentMethodClass(transaction.paymentMethod)">
                {{ getPaymentMethodLabel(transaction.paymentMethod) }}
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">Status</span>
              <StatusBadge
                :status="transaction.status"
                :label="getStatusLabel(transaction.status)"
                :variant="getStatusVariant(transaction.status)"
              />
            </div>
            <div v-if="transaction.notes" class="info-item span-full">
              <span class="info-label">Catatan</span>
              <span class="info-value notes-value">{{ transaction.notes }}</span>
            </div>
          </div>
        </BaseCard>

        <!-- Items Card -->
        <BaseCard>
          <template #header>
            <div class="card-header-row">
              <h2 class="card-title">Item Pesanan</h2>
              <span class="item-count-chip">{{ (transaction.items || []).length }} item</span>
            </div>
          </template>

          <div class="items-list">
            <div
              v-for="item in (transaction.items || [])"
              :key="item.id"
              class="item-row"
            >
              <div class="item-main">
                <div class="item-info">
                  <p class="item-name">{{ item.productName }}</p>
                  <p class="item-meta">{{ item.quantity }}× @ {{ formatRupiah(Number(item.price)) }}</p>
                </div>
                <span class="item-subtotal">{{ formatRupiah(Number(item.subtotal)) }}</span>
              </div>

              <!-- Add-ons -->
              <div v-if="item.addOns?.length" class="item-addons">
                <div v-for="addon in item.addOns" :key="addon.addOnId" class="addon-row">
                  <span class="addon-name">+ {{ addon.addOnName }}</span>
                  <span class="addon-price">{{ formatRupiah(Number(addon.subtotal || 0)) }}</span>
                </div>
              </div>

              <!-- Item discount -->
              <div v-if="item.discount?.value > 0" class="item-discount-badge">
                <span>Diskon {{ item.discount.type === 'percentage' ? item.discount.value + '%' : formatRupiah(Number(item.discount.value)) }}</span>
                <span>−{{ formatRupiah(getItemDiscountAmount(item)) }}</span>
              </div>

              <!-- Notes per item -->
              <p v-if="item.notes" class="item-notes">📝 {{ item.notes }}</p>
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
            <div v-if="Number(transaction.itemDiscounts) > 0" class="summary-row is-discount">
              <span class="summary-label">Diskon Item</span>
              <span class="summary-value">−{{ formatRupiah(Number(transaction.itemDiscounts)) }}</span>
            </div>
            <div v-if="Number(transaction.globalDiscountAmount) > 0" class="summary-row is-discount">
              <span class="summary-label">Diskon Transaksi</span>
              <span class="summary-value">−{{ formatRupiah(Number(transaction.globalDiscountAmount)) }}</span>
            </div>
            <div class="summary-row is-total">
              <span class="summary-label">Total Bayar</span>
              <span class="summary-value total-value">{{ formatRupiah(Number(transaction.total)) }}</span>
            </div>
          </div>
        </BaseCard>

      </template>
    </div>

    <!-- Edit Bottom Sheet -->
    <BaseBottomSheet
      v-model="showEditModal"
      title="Edit Transaksi"
      size="large"
      @close="closeEditModal"
    >
      <template v-if="editData">
        <BaseAlert v-if="saveError" type="error" :description="saveError" @close="saveError = ''" />

        <!-- Cancel confirm overlay -->
        <div v-if="showCancelConfirm" class="cancel-confirm-box">
          <p class="cancel-confirm-title">
            <AppIcon name="warning" :size="16" /> Batalkan transaksi ini?
          </p>
          <p class="cancel-confirm-desc">Tindakan ini tidak dapat dikembalikan. Data transaksi akan ditandai sebagai dibatalkan.</p>
          <div class="cancel-confirm-actions">
            <BaseButton variant="secondary" size="sm" :disabled="isSaving" @click="showCancelConfirm = false">
              Tidak, kembali
            </BaseButton>
            <BaseButton variant="danger" size="sm" :loading="isSaving" :disabled="isSaving" @click="handleCancelTransaction">
              Ya, batalkan
            </BaseButton>
          </div>
        </div>

        <template v-else>
          <!-- Items -->
          <div class="edit-section">
            <h3 class="section-title">Item Transaksi</h3>
            <div class="items-edit-list">
              <div
                v-for="(item, index) in (editData.items as any[])"
                :key="item.id || index"
                class="item-edit-card"
              >
                <!-- Header: name + qty + delete -->
                <div class="item-edit-header">
                  <div class="item-edit-info">
                    <p class="item-edit-name">{{ item.productName }}</p>
                    <p class="item-edit-price">@ {{ formatRupiah(Number(item.price)) }}</p>
                  </div>
                  <div class="item-edit-controls">
                    <QuantityStepper v-model="item.quantity" :min="1" :max="99" />
                    <BaseButton variant="ghost" size="sm" @click="editData.items.splice(index, 1)">
                      <AppIcon name="trash" :size="14" />
                    </BaseButton>
                  </div>
                </div>

                <!-- Subtotal preview -->
                <div class="subtotal-preview">
                  <span>Subtotal item</span>
                  <span>{{ formatRupiah(Number(item.price) * Number(item.quantity)) }}</span>
                </div>

                <!-- Notes per item -->
                <div class="form-group">
                  <label class="field-label">Catatan item</label>
                  <input
                    v-model="item.notes"
                    type="text"
                    class="input-field"
                    placeholder="Catatan untuk item ini (opsional)"
                  />
                </div>

                <!-- Add-ons list with qty stepper -->
                <div v-if="item.addOns?.length" class="addons-edit-list">
                  <div v-for="(addon, ai) in item.addOns" :key="addon.addOnId" class="addon-edit-row">
                    <span class="addon-name">{{ addon.addOnName }}</span>
                    <QuantityStepper v-model="addon.quantity" :min="1" :max="20" />
                    <span class="addon-price">{{ formatRupiah(Number(addon.price) * Number(addon.quantity)) }}</span>
                    <BaseButton variant="ghost" size="sm" @click="item.addOns.splice(ai, 1)">
                      <AppIcon name="x" :size="13" />
                    </BaseButton>
                  </div>
                </div>

                <!-- Add addon form (hanya kalau produk punya add-on) -->
                <div v-if="getAvailableAddOnsForItem(index).length > 0" class="add-addon-form">
                  <select v-model="item.selectedAddonId" class="addon-select">
                    <option value="">-- Pilih Add-on --</option>
                    <option
                      v-for="addon in getAvailableAddOnsForItem(index)"
                      :key="addon.id"
                      :value="addon.id"
                    >{{ addon.name }} ({{ formatRupiah(Number(addon.price) || 0) }})</option>
                  </select>
                  <BaseButton
                    variant="primary"
                    size="sm"
                    :disabled="!item.selectedAddonId"
                    @click="addAddonToItem(index)"
                  >+ Tambah</BaseButton>
                </div>

                <!-- Item discount -->
                <div class="item-discount-edit">
                  <p class="field-label">Diskon Item</p>
                  <div class="radios-row">
                    <BaseRadio v-model="item.discount.type" value="amount" label="Nominal" :name="`dtype-${index}`" />
                    <BaseRadio v-model="item.discount.type" value="percentage" label="Persen" :name="`dtype-${index}`" />
                  </div>
                  <div class="discount-input-row">
                    <input
                      v-model.number="item.discount.value"
                      type="text" inputmode="numeric"
                      class="input-field"
                      :placeholder="`Diskon ${item.discount.type === 'percentage' ? '%' : 'Rp'}`"
                    />
                    <BaseButton
                      variant="danger" size="sm"
                      @click="item.discount.value = 0; item.discount.type = 'amount'"
                    >Hapus</BaseButton>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Global Discount -->
          <div class="edit-section">
            <h3 class="section-title">Diskon Global</h3>
            <div class="radios-row">
              <BaseRadio v-model="editData.globalDiscount.type" value="amount" label="Nominal" name="gdtype" />
              <BaseRadio v-model="editData.globalDiscount.type" value="percentage" label="Persen" name="gdtype" />
            </div>
            <div class="discount-input-row">
              <input
                v-model.number="editData.globalDiscount.value"
                type="text" inputmode="numeric"
                class="input-field"
                :placeholder="`Diskon ${editData.globalDiscount.type === 'percentage' ? '%' : 'Rp'}`"
              />
              <BaseButton
                variant="danger" size="sm"
                @click="editData.globalDiscount.value = 0; editData.globalDiscount.type = 'amount'"
              >Hapus</BaseButton>
            </div>
          </div>

          <!-- Edit summary -->
          <div class="edit-summary">
            <div class="calc-row">
              <span class="calc-label">Subtotal</span>
              <span class="calc-value">{{ formatRupiah(editSummary.subtotal) }}</span>
            </div>
            <div v-if="editSummary.itemDiscount > 0" class="calc-row is-discount">
              <span class="calc-label">Diskon Item</span>
              <span class="calc-value">−{{ formatRupiah(editSummary.itemDiscount) }}</span>
            </div>
            <div v-if="editSummary.globalDiscount > 0" class="calc-row is-discount">
              <span class="calc-label">Diskon Global</span>
              <span class="calc-value">−{{ formatRupiah(editSummary.globalDiscount) }}</span>
            </div>
            <div class="calc-row is-total">
              <span class="calc-label">Total Bayar</span>
              <span class="calc-value total-value">{{ formatRupiah(editSummary.total) }}</span>
            </div>
          </div>
        </template>
      </template>

      <template #footer>
        <div class="sheet-footer">
          <BaseButton variant="secondary" :fullWidth="true" :disabled="isSaving" @click="closeEditModal">
            Tutup
          </BaseButton>
          <template v-if="!showCancelConfirm">
            <BaseButton
              variant="danger"
              :fullWidth="true"
              :disabled="isSaving"
              @click="showCancelConfirm = true"
            >
              Batalkan Transaksi
            </BaseButton>
            <BaseButton
              variant="primary"
              :fullWidth="true"
              :loading="isSaving"
              :disabled="isSaving || !editData?.items?.length"
              @click="handleSaveEdit"
            >
              Simpan Perubahan
            </BaseButton>
          </template>
        </div>
      </template>
    </BaseBottomSheet>

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

.header-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.page-title {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.2;
}

.page-subtitle {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-family: monospace;
  font-weight: 600;
}

.header-spacer { width: 64px; }

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

/* Container */
.container {
  max-width: 900px;
  margin: 0 auto;
  padding: var(--spacing-4);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

/* Info grid */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--spacing-4);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);

  &.span-full { grid-column: 1 / -1; }
}

.info-label {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-tertiary);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.info-value {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-primary);
}

.notes-value {
  font-size: var(--font-size-sm);
  font-weight: 400;
  color: var(--color-text-secondary);
  font-style: italic;
}

/* Payment method chip */
.pm-chip {
  display: inline-flex;
  align-self: flex-start;
  font-size: 0.7rem;
  font-weight: 700;
  border-radius: 99px;
  padding: 0.2rem 0.65rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;

  &.pm-cash     { background: rgba(34, 197, 94, 0.12);  color: #15803d; }
  &.pm-qris     { background: rgba(99, 102, 241, 0.12); color: #4338ca; }
  &.pm-transfer { background: rgba(14, 165, 233, 0.12); color: #0369a1; }
  &.pm-debit    { background: rgba(249, 115, 22, 0.12); color: #c2410c; }
  &.pm-credit   { background: rgba(236, 72, 153, 0.12); color: #be185d; }
  &.pm-split    { background: rgba(168, 85, 247, 0.12); color: #7e22ce; }
}

/* Card header */
.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.item-count-chip {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: 99px;
  padding: 0.15rem 0.6rem;
  font-weight: 600;
}

/* Items list */
.items-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.item-row {
  padding: var(--spacing-3);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.item-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-2);
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
  margin: 0.15rem 0 0 0;
}

.item-subtotal {
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--brand-primary-dark);
  flex-shrink: 0;
}

.item-addons {
  padding-top: var(--spacing-2);
  border-top: 1px dashed var(--color-border-light);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.addon-row {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-sm);
}

.addon-name  { color: var(--color-text-tertiary); font-style: italic; }
.addon-price { color: var(--brand-primary-dark); font-weight: 600; }

.item-discount-badge {
  display: flex;
  justify-content: space-between;
  padding: var(--spacing-1) var(--spacing-2);
  background: rgba(245, 158, 11, 0.08);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  color: #b45309;
  font-weight: 600;
}

.item-notes {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-style: italic;
  margin: 0;
  padding: var(--spacing-1) 0;
}

/* Summary */
.summary-rows {
  display: flex;
  flex-direction: column;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-3) 0;
  border-bottom: 1px solid var(--color-border-light);

  &:last-child { border-bottom: none; }

  &.is-discount {
    padding: var(--spacing-2) var(--spacing-3);
    margin: var(--spacing-1) 0;
    background: rgba(245, 158, 11, 0.06);
    border-radius: var(--radius-sm);
    border-bottom: none;
  }

  &.is-total {
    padding-top: var(--spacing-4);
    border-top: 2px solid var(--color-border);
    border-bottom: none;
  }
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
  & p { font-size: var(--font-size-sm); margin: 0; }
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--brand-primary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* Edit sheet */
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

.subtotal-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-2) var(--spacing-3);
  background: rgba(27, 107, 58, 0.05);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);

  span:last-child {
    font-weight: 700;
    color: var(--brand-primary-dark);
  }
}

/* Cancel confirm box */
.cancel-confirm-box {
  background: rgba(239, 68, 68, 0.06);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-md);
  padding: var(--spacing-4);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.cancel-confirm-title {
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-danger);
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.cancel-confirm-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0;
}

.cancel-confirm-actions {
  display: flex;
  gap: var(--spacing-2);
  justify-content: flex-end;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.field-label {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-tertiary);
  letter-spacing: 0.04em;
  text-transform: uppercase;
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

.addon-edit-row .addon-name { flex: 1; color: var(--color-text-secondary); }
.addon-edit-row .addon-price { color: var(--brand-primary-dark); font-weight: 600; }

.add-addon-form {
  display: flex;
  gap: var(--spacing-2);
  padding: var(--spacing-2);
  background: rgba(27, 107, 58, 0.04);
  border-radius: var(--radius-sm);
  border: 1px dashed rgba(27, 107, 58, 0.2);
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

  &:focus {
    outline: none;
    border-color: var(--brand-primary);
    box-shadow: 0 0 0 3px rgba(27, 107, 58, 0.12);
  }
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

  &:focus {
    outline: none;
    border-color: var(--brand-primary);
    box-shadow: 0 0 0 3px rgba(27, 107, 58, 0.12);
  }
}

/* Edit summary */
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
  border-bottom: 1px solid var(--color-border-light);

  &:last-child { border-bottom: none; }

  &.is-discount {
    padding: var(--spacing-1) var(--spacing-2);
    background: rgba(245, 158, 11, 0.08);
    border-radius: var(--radius-xs);
    color: #b45309;
    border-bottom: none;
    margin: var(--spacing-1) 0;
  }

  &.is-total {
    padding-top: var(--spacing-3);
    border-top: 2px solid var(--color-border);
    border-bottom: none;
  }
}

.calc-label { font-weight: 500; color: var(--color-text-secondary); font-size: var(--font-size-sm); }
.calc-value { font-weight: 700; color: var(--color-text-primary); }

.calc-row.is-total .calc-label { font-weight: 700; font-size: var(--font-size-base); }
.calc-row.is-total .calc-value { font-size: var(--font-size-xl); }

/* Sheet footer */
.sheet-footer {
  display: flex;
  gap: var(--spacing-3);
  width: 100%;
  & > :deep(*) { flex: 1; }
}

/* Responsive */
@media (max-width: 640px) {
  .sticky-header { padding: var(--spacing-2) var(--spacing-3); }
  .container { padding: var(--spacing-3); }
  .info-grid { grid-template-columns: 1fr 1fr; }
}
</style>
