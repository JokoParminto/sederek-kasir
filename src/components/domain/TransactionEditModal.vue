<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { transactionApi } from '@/services/api/transaction.api'
import { paymentMethodApi } from '@/services/api/paymentMethod.api'
import BaseModal from '@/components/base/BaseModal.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'

NProgress.configure({ showSpinner: false })

interface Props {
  isOpen: boolean
  transaction: any
  shift: any
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  save: [updatedTransaction: any]
}>()

const isLoading    = ref(false)
const error        = ref('')
const items        = ref<any[]>([])
const discount     = ref<any>({ type: 'amount', value: 0 })
const paymentMethod   = ref('cash')
const paymentMethodId = ref<string | null>(null)
const notes        = ref('')
const paymentMethods  = ref<Array<{ id: string; name: string; icon: string }>>([])
const deleteConfirmIndex = ref<number | null>(null)

const isShiftActive = computed(() => props.shift?.status === 'active')
const isEditable    = computed(() => isShiftActive.value)

const subtotal = computed(() =>
  items.value.reduce((sum, item) => sum + (item.price * item.quantity), 0)
)

const discountAmount = computed(() => {
  if (discount.value.type === 'percentage')
    return Math.round((subtotal.value * discount.value.value) / 100)
  return discount.value.value || 0
})

const total = computed(() => Math.max(0, subtotal.value - discountAmount.value))

const loadPaymentMethods = async () => {
  try {
    const res = await paymentMethodApi.getPaymentMethods()
    paymentMethods.value = res.data
  } catch (err) {
    console.error('[TransactionEditModal] Gagal load payment methods:', err)
  }
}

const loadTransactionData = () => {
  if (!props.transaction) return
  items.value = (props.transaction.items || []).map((item: any) => ({
    id:           item.id,
    product_id:   item.productId || item.product_id,
    product_name: item.productName || item.product_name,
    price:        item.price || item.product_price || 0,
    quantity:     item.quantity || 1,
    discount:     { type: 'amount', value: item.discount?.value || 0 },
    add_ons:      item.addOns || item.add_ons || [],
    notes:        item.notes || '',
  }))

  const g = props.transaction.globalDiscount || props.transaction.discount_global
  discount.value = {
    type:  g?.type === 'percentage' ? 'percentage' : 'amount',
    value: g?.value || 0,
  }

  const pm = props.transaction.paymentMethod || props.transaction.payment_method || 'cash'
  paymentMethod.value   = pm
  paymentMethodId.value = props.transaction.paymentMethodId || props.transaction.payment_method_id || null
  notes.value  = props.transaction.notes || ''
  error.value  = ''
  deleteConfirmIndex.value = null
}

watch(() => props.isOpen, (open) => {
  if (open && props.transaction) {
    loadTransactionData()
    loadPaymentMethods()
  }
}, { immediate: true })

const onPaymentMethodChange = (name: string) => {
  paymentMethod.value   = name
  const found = paymentMethods.value.find(m => m.name === name)
  paymentMethodId.value = found?.id || null
}

const validateForm = (): boolean => {
  if (items.value.length === 0) { error.value = 'Minimal harus ada 1 item'; return false }
  for (const item of items.value) {
    if (!item.product_id)          { error.value = 'Product ID tidak boleh kosong'; return false }
    if (!item.quantity || item.quantity <= 0) { error.value = 'Qty harus > 0'; return false }
    if (!item.price    || item.price    <= 0) { error.value = 'Harga harus > 0'; return false }
  }
  return true
}

const handleSave = async () => {
  if (!validateForm()) return
  try {
    NProgress.start()
    isLoading.value = true
    error.value = ''
    const updated = await transactionApi.updateTransaction(props.transaction.id, {
      items:          items.value,
      discount:       discount.value,
      payment_method: paymentMethod.value as any,
      notes:          notes.value,
    })
    emit('save', updated)
    emit('close')
  } catch (err: any) {
    error.value = err?.response?.data?.error?.message || err.message || 'Gagal mengupdate transaksi'
  } finally {
    isLoading.value = false
    NProgress.done()
  }
}

const handleClose = () => { error.value = ''; emit('close') }

const requestDeleteItem = (index: number) => { deleteConfirmIndex.value = index }
const cancelDelete       = () => { deleteConfirmIndex.value = null }
const confirmDeleteItem  = () => {
  if (deleteConfirmIndex.value !== null) {
    items.value.splice(deleteConfirmIndex.value, 1)
    deleteConfirmIndex.value = null
  }
}

const addItem = () => {
  items.value.push({
    product_id: '', product_name: 'Item Baru', price: 0, quantity: 1,
    discount: { type: 'amount', value: 0 }, add_ons: [], notes: '',
  })
}

const formatRp = (val: number) => val.toLocaleString('id-ID')
</script>

<template>
  <BaseModal :modelValue="isOpen" size="lg" @close="handleClose">
    <template #header>
      <div class="modal-header-content">
        <h3 class="modal-title">Edit Transaksi</h3>
        <span class="trx-number">{{ transaction?.transactionNumber }}</span>
        <p class="shift-status" :class="isShiftActive ? 'status-active' : 'status-locked'">
          <AppIcon :name="isShiftActive ? 'check-circle' : 'lock'" :size="13" />
          {{ isShiftActive ? 'Shift aktif — data dapat diubah' : 'Shift ditutup — data tidak dapat diubah' }}
        </p>
      </div>
    </template>

    <!-- Error -->
    <BaseAlert v-if="error" type="error" :description="error" @close="error = ''" />

    <!-- Delete confirm overlay -->
    <div v-if="deleteConfirmIndex !== null" class="delete-confirm-bar">
      <span>Hapus <strong>{{ items[deleteConfirmIndex]?.product_name || `Item ${deleteConfirmIndex + 1}` }}</strong>?</span>
      <div class="delete-confirm-actions">
        <BaseButton variant="ghost" size="sm" @click="cancelDelete">Batal</BaseButton>
        <BaseButton variant="danger" size="sm" @click="confirmDeleteItem">Hapus</BaseButton>
      </div>
    </div>

    <!-- Items -->
    <div class="section">
      <h4 class="section-title">Item</h4>

      <div v-for="(item, index) in items" :key="item.id || index" class="item-card">
        <!-- Item header -->
        <div class="item-card-header">
          <div class="item-header-left">
            <span class="item-index">{{ index + 1 }}</span>
            <span class="item-name-label">{{ item.product_name || 'Item' }}</span>
          </div>
          <BaseButton
            v-if="isEditable"
            variant="ghost"
            size="sm"
            class="btn-remove"
            @click="requestDeleteItem(index)"
          >
            <AppIcon name="trash" :size="13" />
          </BaseButton>
        </div>

        <!-- Fields -->
        <div class="item-fields">
          <div class="form-group span-full">
            <label class="form-label">Nama Produk</label>
            <input
              v-model="item.product_name"
              type="text"
              class="form-input"
              :disabled="!isEditable"
              placeholder="Nama produk"
            />
          </div>
          <div class="form-group">
            <label class="form-label">Qty</label>
            <input
              v-model.number="item.quantity"
              type="text" inputmode="numeric"
              class="form-input"
              :disabled="!isEditable"
              min="1"
            />
          </div>
          <div class="form-group">
            <label class="form-label">Harga (Rp)</label>
            <input
              v-model.number="item.price"
              type="text" inputmode="numeric"
              class="form-input"
              :disabled="!isEditable"
              min="0"
            />
          </div>
          <div class="form-group">
            <label class="form-label">Subtotal</label>
            <div class="subtotal-display">Rp {{ formatRp(item.price * item.quantity) }}</div>
          </div>
          <div class="form-group span-full">
            <label class="form-label">Catatan Item</label>
            <input
              v-model="item.notes"
              type="text"
              class="form-input"
              :disabled="!isEditable"
              placeholder="Catatan untuk item ini (opsional)"
            />
          </div>
        </div>

        <!-- Add-ons (readonly display) -->
        <div v-if="item.add_ons?.length" class="addons-list">
          <span class="addons-label">Add-ons:</span>
          <span
            v-for="(ao, ai) in item.add_ons"
            :key="ai"
            class="addon-chip"
          >
            {{ ao.addOnName || ao.name }} ×{{ ao.quantity }}
            <span v-if="ao.price"> +Rp {{ formatRp(ao.price) }}</span>
          </span>
        </div>
      </div>

      <BaseButton v-if="isEditable" variant="secondary" size="sm" @click="addItem">
        + Tambah Item
      </BaseButton>
    </div>

    <!-- Summary & Payment -->
    <div class="section">
      <h4 class="section-title">Ringkasan & Pembayaran</h4>

      <div class="summary-rows">
        <div class="summary-row">
          <span class="summary-label">Subtotal</span>
          <span class="summary-value">Rp {{ formatRp(subtotal) }}</span>
        </div>

        <!-- Discount -->
        <div class="summary-row">
          <div class="discount-field">
            <label class="form-label">Diskon</label>
            <div class="discount-inputs">
              <select v-model="discount.type" class="form-input-sm" :disabled="!isEditable">
                <option value="amount">Rp</option>
                <option value="percentage">%</option>
              </select>
              <input
                v-model.number="discount.value"
                type="text" inputmode="numeric"
                class="form-input-sm"
                :disabled="!isEditable"
                min="0"
                :placeholder="discount.type === 'percentage' ? '0–100' : '0'"
              />
            </div>
          </div>
          <span class="summary-value discount-value">−Rp {{ formatRp(discountAmount) }}</span>
        </div>

        <div class="summary-divider"></div>

        <div class="summary-row total-row">
          <span class="summary-label total-label">Total</span>
          <span class="total-value">Rp {{ formatRp(total) }}</span>
        </div>
      </div>

      <!-- Payment method from API -->
      <div class="form-group">
        <label class="form-label">Metode Pembayaran</label>
        <select
          :value="paymentMethod"
          class="form-input"
          :disabled="!isEditable"
          @change="onPaymentMethodChange(($event.target as HTMLSelectElement).value)"
        >
          <option
            v-for="pm in paymentMethods"
            :key="pm.id || pm.name"
            :value="pm.name"
          >
            {{ pm.icon }} {{ pm.name }}
          </option>
          <!-- Tampilkan current value jika tidak ada di list (method lama/custom) -->
          <option
            v-if="paymentMethod && !paymentMethods.some(m => m.name === paymentMethod)"
            :value="paymentMethod"
          >{{ paymentMethod }}</option>
        </select>
      </div>

      <!-- Notes -->
      <div class="form-group">
        <label class="form-label">Catatan Transaksi</label>
        <textarea
          v-model="notes"
          class="form-input"
          :disabled="!isEditable"
          placeholder="Catatan tambahan (opsional)"
          rows="2"
        ></textarea>
      </div>
    </div>

    <template #footer>
      <BaseButton variant="secondary" :disabled="isLoading" @click="handleClose">Batal</BaseButton>
      <BaseButton
        v-if="isEditable"
        variant="primary"
        :loading="isLoading"
        :disabled="isLoading"
        @click="handleSave"
      >
        Simpan Perubahan
      </BaseButton>
      <BaseButton v-else variant="secondary" disabled>
        <AppIcon name="lock" :size="14" /> Tidak Bisa Diubah
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.modal-header-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.modal-title {
  font-size: var(--font-size-xl);
  font-weight: 700;
  margin: 0;
  color: var(--color-text-primary);
}

.trx-number {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-tertiary);
  font-family: monospace;
}

.shift-status {
  font-size: var(--font-size-xs);
  font-weight: 600;
  margin: 0.25rem 0 0 0;
  display: flex;
  align-items: center;
  gap: 0.3rem;

  &.status-locked { color: var(--color-danger); }
  &.status-active { color: var(--color-success); }
}

/* Delete confirm bar */
.delete-confirm-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-3);
  padding: var(--spacing-2) var(--spacing-3);
  background: rgba(220, 38, 38, 0.08);
  border: 1px solid rgba(220, 38, 38, 0.2);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-danger);
  margin-bottom: var(--spacing-3);
}

.delete-confirm-actions {
  display: flex;
  gap: var(--spacing-2);
}

/* Sections */
.section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  padding-bottom: var(--spacing-4);
  border-bottom: 1px solid var(--color-border-light);

  &:last-child { border-bottom: none; padding-bottom: 0; }
}

.section-title {
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

/* Item card */
.item-card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  padding: var(--spacing-3);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.item-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.item-index {
  width: 22px;
  height: 22px;
  background: var(--brand-primary);
  color: #fff;
  border-radius: 50%;
  font-size: 0.7rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.item-name-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.btn-remove { color: var(--color-danger); }

/* Item fields grid */
.item-fields {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-3);
}

.item-fields .span-full { grid-column: 1 / -1; }

/* Add-ons */
.addons-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-1);
  padding-top: var(--spacing-2);
  border-top: 1px dashed var(--color-border-light);
}

.addons-label {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  flex-shrink: 0;
}

.addon-chip {
  font-size: 0.65rem;
  background: rgba(27, 107, 58, 0.08);
  color: var(--brand-primary);
  border: 1px solid rgba(27, 107, 58, 0.15);
  border-radius: 99px;
  padding: 0.15rem 0.5rem;
  font-weight: 600;
}

/* Form */
.form-group { display: flex; flex-direction: column; gap: var(--spacing-1); }

.form-label {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-secondary);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.form-input {
  width: 100%;
  padding: var(--spacing-2) var(--spacing-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-family: inherit;
  background: var(--color-surface-0);
  color: var(--color-text-primary);
  transition: border-color var(--transition-duration-short) var(--transition-standard);
  resize: vertical;

  &:focus {
    outline: none;
    border-color: var(--brand-primary);
    box-shadow: 0 0 0 3px rgba(27, 107, 58, 0.12);
  }

  &:disabled {
    background: var(--color-bg-secondary);
    color: var(--color-text-disabled);
    cursor: not-allowed;
  }
}

.subtotal-display {
  padding: var(--spacing-2) var(--spacing-3);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  font-weight: 700;
  color: var(--brand-primary);
  font-size: var(--font-size-sm);
}

/* Summary */
.summary-rows {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  padding: var(--spacing-3);
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-1) 0;
  font-size: var(--font-size-sm);
}

.summary-label { color: var(--color-text-secondary); font-weight: 500; }
.total-label   { font-weight: 700; font-size: var(--font-size-base); color: var(--color-text-primary); }
.summary-value { font-weight: 600; color: var(--color-text-primary); }
.discount-value { color: var(--color-danger); }

.total-row { padding-top: var(--spacing-2); }

.total-value {
  font-size: var(--font-size-xl);
  font-weight: 800;
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.summary-divider {
  height: 1px;
  background: var(--color-border-light);
  margin: var(--spacing-1) 0;
}

/* Discount inline */
.discount-field { display: flex; flex-direction: column; gap: var(--spacing-1); }
.discount-inputs { display: flex; gap: var(--spacing-2); }

.form-input-sm {
  padding: var(--spacing-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-family: inherit;
  background: var(--color-surface-0);
  color: var(--color-text-primary);

  &:first-child { width: 68px; }
  &:last-child  { flex: 1; }

  &:focus {
    outline: none;
    border-color: var(--brand-primary);
    box-shadow: 0 0 0 3px rgba(27, 107, 58, 0.12);
  }

  &:disabled {
    background: var(--color-bg-secondary);
    color: var(--color-text-disabled);
  }
}

/* Responsive */
@media (max-width: 640px) {
  .item-fields { grid-template-columns: 1fr 1fr; }
  .delete-confirm-bar { flex-direction: column; align-items: flex-start; }
}
</style>
