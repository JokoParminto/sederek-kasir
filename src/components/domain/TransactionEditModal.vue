<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { transactionApi } from '@/services/api/transaction.api'
import BaseModal from '@/components/base/BaseModal.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'

NProgress.configure({ showSpinner: false })

interface Props {
  isOpen: boolean
  transaction: any
  shift: any
  onClose: () => void
  onSave: (updatedTransaction: any) => void
}

const props = defineProps<Props>()

const isLoading = ref(false)
const error = ref('')
const items = ref<any[]>([])
const discount = ref<any>({ type: 'nominal', value: 0 })
const paymentMethod = ref('cash')
const notes = ref('')

const isShiftActive = computed(() => props.shift?.status === 'active')
const isEditable = computed(() => isShiftActive.value)

const subtotal = computed(() =>
  items.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
)

const discountAmount = computed(() => {
  if (discount.value.type === 'percentage') return (subtotal.value * discount.value.value) / 100
  return discount.value.value
})

const total = computed(() => subtotal.value - discountAmount.value)

watch(
  () => props.isOpen,
  (newVal) => { if (newVal && props.transaction) loadTransactionData() }
)

const loadTransactionData = () => {
  if (!props.transaction) return
  items.value = (props.transaction.items || []).map((item: any) => ({
    id: item.id,
    product_id: item.productId || item.product_id,
    product_name: item.productName || item.product_name,
    price: item.price || item.product_price,
    quantity: item.quantity,
    discount: { type: item.discount?.type || 'nominal', value: item.discount?.value || 0 },
    add_ons: item.addOns || [],
    notes: item.notes || '',
  }))
  const globalDiscount = props.transaction.globalDiscount || props.transaction.discount_global
  discount.value = {
    type: globalDiscount?.type === 'percentage' ? 'percentage' : 'nominal',
    value: globalDiscount?.value || 0,
  }
  paymentMethod.value = props.transaction.paymentMethod || props.transaction.payment_method || 'cash'
  notes.value = props.transaction.notes || ''
  error.value = ''
}

const validateForm = (): boolean => {
  if (items.value.length === 0) { error.value = 'Minimal harus ada 1 item'; return false }
  for (const item of items.value) {
    if (!item.product_id) { error.value = 'Product ID harus diisi'; return false }
    if (!item.quantity || item.quantity <= 0) { error.value = 'Quantity harus lebih dari 0'; return false }
    if (!item.price || item.price <= 0) { error.value = 'Harga harus lebih dari 0'; return false }
  }
  return true
}

const handleSave = async () => {
  if (!validateForm()) return
  try {
    NProgress.start()
    isLoading.value = true
    error.value = ''
    const updatedTransaction = await transactionApi.updateTransaction(props.transaction.id, {
      items: items.value,
      discount: discount.value,
      payment_method: paymentMethod.value as any,
      notes: notes.value,
    })
    props.onSave(updatedTransaction)
    props.onClose()
  } catch (err: any) {
    error.value = err?.response?.data?.error?.message || err.message || 'Gagal mengupdate transaksi'
  } finally {
    isLoading.value = false
    NProgress.done()
  }
}

const handleClose = () => {
  error.value = ''
  props.onClose()
}

const addItem = () => {
  items.value.push({
    product_id: '', product_name: '', price: 0, quantity: 1,
    discount: { type: 'nominal', value: 0 }, add_ons: [], notes: '',
  })
}

const removeItem = (index: number) => items.value.splice(index, 1)
</script>

<template>
  <BaseModal :modelValue="isOpen" size="lg" @close="handleClose">
    <template #header>
      <div>
        <h3 class="modal-title">Edit Transaksi #{{ transaction?.transactionNumber }}</h3>
        <p v-if="!isShiftActive" class="shift-status shift-status--locked">
          <AppIcon name="lock" :size="13" /> Shift sudah ditutup — data tidak dapat diubah
        </p>
        <p v-else class="shift-status shift-status--active">
          <AppIcon name="check-circle" :size="13" /> Shift masih aktif — data dapat diubah
        </p>
      </div>
    </template>

    <!-- Error -->
    <BaseAlert
      v-if="error"
      type="error"
      :description="error"
      @close="error = ''"
    />

    <!-- Items -->
    <div class="section">
      <h4 class="section-title">Item</h4>
      <div v-for="(item, index) in items" :key="index" class="item-card">
        <div class="item-card-header">
          <span class="item-number">Item {{ index + 1 }}</span>
          <BaseButton v-if="isEditable" variant="ghost" size="sm" @click="removeItem(index)">
            <AppIcon name="trash" :size="13" /> Hapus
          </BaseButton>
        </div>
        <div class="item-fields">
          <div class="form-group full-width">
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
            <input v-model.number="item.quantity" type="text" inputmode="numeric" class="form-input" :disabled="!isEditable" min="1" />
          </div>
          <div class="form-group">
            <label class="form-label">Harga</label>
            <input v-model.number="item.price" type="text" inputmode="numeric" class="form-input" :disabled="!isEditable" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">Subtotal</label>
            <div class="subtotal-display">Rp {{ (item.price * item.quantity).toLocaleString('id-ID') }}</div>
          </div>
        </div>
      </div>
      <BaseButton v-if="isEditable" variant="secondary" size="sm" @click="addItem">
        + Tambah Item
      </BaseButton>
    </div>

    <!-- Summary -->
    <div class="section">
      <h4 class="section-title">Ringkasan</h4>
      <div class="summary-rows">
        <div class="summary-row">
          <span class="summary-label">Subtotal</span>
          <span class="summary-value">Rp {{ subtotal.toLocaleString('id-ID') }}</span>
        </div>
        <div class="summary-row">
          <div class="discount-field">
            <label class="form-label">Diskon</label>
            <div class="discount-inputs">
              <select v-model="discount.type" class="form-input-sm" :disabled="!isEditable">
                <option value="nominal">Rp</option>
                <option value="percentage">%</option>
              </select>
              <input
                v-model.number="discount.value"
                type="text" inputmode="numeric"
                class="form-input-sm"
                :disabled="!isEditable"
                min="0"
                :placeholder="discount.type === 'percentage' ? '0-100' : '0'"
              />
            </div>
          </div>
          <span class="summary-value discount-value">-Rp {{ discountAmount.toLocaleString('id-ID') }}</span>
        </div>
        <div class="summary-divider"></div>
        <div class="summary-row total-row">
          <span class="summary-label">Total</span>
          <span class="total-value">Rp {{ total.toLocaleString('id-ID') }}</span>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Metode Pembayaran</label>
        <select v-model="paymentMethod" class="form-input" :disabled="!isEditable">
          <option value="cash">Tunai</option>
          <option value="card">Kartu Kredit</option>
          <option value="transfer">Transfer</option>
          <option value="both">Tunai + Kartu</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Catatan</label>
        <textarea
          v-model="notes"
          class="form-input"
          :disabled="!isEditable"
          placeholder="Catatan tambahan (opsional)"
          rows="3"
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
      <BaseButton v-else variant="secondary" disabled><AppIcon name="lock" :size="14" /> Tidak Bisa Diubah</BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.modal-title {
  font-size: var(--font-size-xl);
  font-weight: 700;
  margin: 0 0 var(--spacing-1) 0;
  color: var(--color-text-primary);
}

.shift-status {
  font-size: var(--font-size-sm);
  font-weight: 500;
  margin: 0;
}

.shift-status--locked { color: var(--color-danger); }
.shift-status--active { color: var(--color-success); }

/* Sections */
.section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  padding-bottom: var(--spacing-4);
  border-bottom: 1px solid var(--color-border-light);
}

.section:last-child { border-bottom: none; padding-bottom: 0; }

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

.item-number {
  font-weight: 600;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.item-fields {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-3);
}

.item-fields .full-width { grid-column: 1 / -1; }

/* Form */
.form-group { display: flex; flex-direction: column; gap: var(--spacing-1); }

.form-label {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-secondary);
  letter-spacing: 0.04em;
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

.subtotal-display {
  padding: var(--spacing-2) var(--spacing-3);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
}

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
  padding: var(--spacing-2) 0;
  font-size: var(--font-size-base);
}

.total-row {
  padding-top: var(--spacing-3);
}

.summary-label {
  color: var(--color-text-secondary);
  font-weight: 500;
}

.summary-value {
  font-weight: 600;
  color: var(--color-text-primary);
}

.discount-value { color: var(--color-danger); }

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
  margin: var(--spacing-2) 0;
}

/* Discount inputs inline */
.discount-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.discount-inputs {
  display: flex;
  gap: var(--spacing-2);
}

.form-input-sm {
  padding: var(--spacing-2) var(--spacing-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-family: inherit;
  background: var(--color-surface-0);
  color: var(--color-text-primary);
}

.form-input-sm:first-child { width: 72px; }
.form-input-sm:last-child { flex: 1; }

.form-input-sm:disabled {
  background: var(--color-bg-secondary);
  color: var(--color-text-disabled);
}

/* Responsive */
@media (max-width: 640px) {
  .item-fields { grid-template-columns: 1fr 1fr; }
}
</style>
