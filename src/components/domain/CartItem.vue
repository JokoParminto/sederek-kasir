<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { TransactionItem, Discount, CartItemAddOn } from '@/types'
import { useDiscount } from '@/composables/useDiscount'
import { formatRupiah } from '@/utils/formatters'
import { useTransactionStore } from '@/stores/transaction'
import AddOnSelectorModal from './AddOnSelectorModal.vue'

interface Props {
  item: TransactionItem
}

interface Emits {
  updateQuantity: [payload: { itemId: string; quantity: number }]
  remove: [itemId: string]
  applyDiscount: [payload: { itemId: string; discount: Discount }]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { validateItemDiscount, formatDiscount } = useDiscount()
const transactionStore = useTransactionStore()

const showDiscountModal = ref(false)
const discountType = ref<'percentage' | 'amount'>('percentage')
const discountValue = ref(0)
const discountAmountDisplay = ref('')
const showAddOnModal = ref(false)

const isPaid = computed(() => props.item.paymentStatus === 'paid')

const itemTotal = computed(() => props.item.price * props.item.quantity)

const totalAddOnsPrice = computed(() => {
  return (props.item.addOns || []).reduce((sum, addon) => sum + (addon.price * addon.quantity), 0)
})

const totalWithAddOns = computed(() => itemTotal.value + totalAddOnsPrice.value)

const discountAmount = computed(() => {
  if (props.item.discount.type === 'percentage') {
    return Math.round((totalWithAddOns.value * props.item.discount.value) / 100)
  } else {
    return props.item.discount.value
  }
})

const itemSubtotal = computed(() => totalWithAddOns.value - discountAmount.value)

const memberSavings = computed(() => {
  if (props.item.is_member_price && props.item.originalPrice && props.item.memberPrice) {
    return (props.item.originalPrice - props.item.memberPrice) * props.item.quantity
  }
  return 0
})

const handleQuantityChange = (delta: number) => {
  const newQuantity = Math.max(1, props.item.quantity + delta)
  emit('updateQuantity', { itemId: props.item.id, quantity: newQuantity })
}

const handleApplyDiscount = () => {
  const newDiscount: Discount = {
    type: discountType.value,
    value: discountValue.value,
  }

  const validation = validateItemDiscount(props.item, newDiscount)
  if (validation.valid) {
    emit('applyDiscount', { itemId: props.item.id, discount: newDiscount })
    showDiscountModal.value = false
    discountValue.value = 0
    discountAmountDisplay.value = ''
  }
}

const handleRemoveDiscount = () => {
  emit('applyDiscount', { itemId: props.item.id, discount: { type: 'percentage', value: 0 } })
}

const handleDiscountAmountInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const rawValue = input.value.replace(/\D/g, '')
  discountValue.value = rawValue ? parseInt(rawValue, 10) : 0
  discountAmountDisplay.value = rawValue
    ? formatRupiah(parseInt(rawValue, 10))
    : ''
}

watch(discountType, (type) => {
  if (type === 'amount') {
    discountAmountDisplay.value = discountValue.value
      ? formatRupiah(discountValue.value)
      : ''
  } else {
    discountAmountDisplay.value = ''
  }
})

watch(showDiscountModal, (isOpen) => {
  if (!isOpen) return
  discountType.value = props.item.discount.type
  discountValue.value = props.item.discount.value
  if (discountType.value === 'amount') {
    discountAmountDisplay.value = discountValue.value
      ? formatRupiah(discountValue.value)
      : ''
  } else {
    discountAmountDisplay.value = ''
  }
})

const hasAddOns = computed(() => {
  return (props.item.addOns || []).length > 0
})

const handleOpenAddOnModal = () => {
  showAddOnModal.value = true
}

const handleAddOnModalClose = () => {
  showAddOnModal.value = false
}

const handleAddOnConfirm = (addOns: CartItemAddOn[], notes: string) => {
  const existing = [...(props.item.addOns || [])]
  existing.forEach(addon => {
    transactionStore.removeAddOnFromItem(props.item.id, addon.addOnId)
  })
  addOns.forEach(addon => {
    transactionStore.addAddOnToItem(props.item.id, addon)
  })
  transactionStore.updateItemNotes(props.item.id, notes)
  showAddOnModal.value = false
}

const handleDeleteAddOn = (addOnId: string) => {
  transactionStore.removeAddOnFromItem(props.item.id, addOnId)
}
</script>

<template>
  <div class="cart-item">
    <!-- Row 1: nama produk + harga satuan + delete -->
    <div class="item-header">
      <h4 class="product-name">{{ item.productName }}</h4>
      <div class="price-unit-group">
        <span v-if="item.is_member_price" class="price-original-crossed">{{ formatRupiah(item.originalPrice) }}</span>
        <span class="price-unit" :class="{ 'price-unit--member': item.is_member_price }">@ {{ formatRupiah(item.price) }}</span>
      </div>
      <span v-if="isPaid" class="paid-badge">PAID</span>
      <button class="btn-delete" @click.stop="$emit('remove', item.id)" title="Hapus" :disabled="isPaid">
        <AppIcon name="trash" :size="13" />
      </button>
    </div>

    <!-- Row 2: qty controls + total + action icon buttons -->
    <div class="qty-actions-row">
      <div class="quantity-controls">
        <button class="btn-qty" @click.stop="handleQuantityChange(-1)" :disabled="isPaid">−</button>
        <span class="qty-value">{{ item.quantity }}</span>
        <button class="btn-qty" @click.stop="handleQuantityChange(1)" :disabled="isPaid">+</button>
      </div>
      <span class="line-total">= {{ formatRupiah(itemTotal) }}</span>
      <div class="item-action-btns">
        <button class="btn-icon-action btn-discount" @click.stop="showDiscountModal = true" :disabled="isPaid" title="Diskon item">
          <AppIcon name="percent" :size="12" />
        </button>
        <button class="btn-icon-action btn-addon" @click.stop="handleOpenAddOnModal" :disabled="isPaid" title="Add-on">
          <AppIcon name="settings" :size="12" />
        </button>
      </div>
    </div>

    <!-- Extras: add-ons + notes + member discount info + per-item discount + subtotal -->
    <div v-if="hasAddOns || item.notes || item.discount.value > 0 || item.is_member_price" class="extras-section">
      <div v-for="addon in item.addOns" :key="addon.addOnId" class="extra-item addon">
        <AppIcon name="promo" :size="11" class="extra-icon" />
        <span class="extra-name">{{ addon.addOnName }}</span>
        <span class="extra-value">+{{ formatRupiah(addon.price * addon.quantity) }}</span>
        <button class="btn-remove-extra" @click.stop="handleDeleteAddOn(addon.addOnId)" :disabled="isPaid">
          <AppIcon name="x" :size="11" />
        </button>
      </div>
      <div v-if="item.notes" class="extra-item notes">
        <AppIcon name="file-text" :size="11" class="extra-icon" />
        <span class="extra-name">{{ item.notes }}</span>
      </div>
      <div v-if="item.is_member_price && memberSavings > 0" class="extra-item member-discount">
        <AppIcon name="star" :size="11" class="extra-icon" />
        <span class="extra-name">Diskon Member</span>
        <span class="extra-value">hemat {{ formatRupiah(memberSavings) }}</span>
      </div>
      <div v-if="item.discount.value > 0" class="extra-item discount">
        <AppIcon name="tag" :size="11" class="extra-icon" />
        <span class="extra-name">Disc {{ formatDiscount(item.discount) }}</span>
        <span class="extra-value">−{{ formatRupiah(discountAmount) }}</span>
        <button class="btn-remove-extra" @click.stop="handleRemoveDiscount" :disabled="isPaid">
          <AppIcon name="x" :size="11" />
        </button>
      </div>
      <div v-if="hasAddOns || item.discount.value > 0" class="subtotal-row">
        <span class="subtotal-label">Sub</span>
        <span class="subtotal-value">{{ formatRupiah(itemSubtotal) }}</span>
      </div>
    </div>

    <!-- Discount Modal -->
    <Teleport to="body">
      <div v-if="showDiscountModal" class="modal-overlay" @click.self="showDiscountModal = false">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>{{ item.discount.value > 0 ? 'Ubah Diskon' : 'Tambah Diskon' }}</h3>
            <button class="btn-modal-close" @click.stop="showDiscountModal = false"><AppIcon name="x" :size="16" /></button>
          </div>

          <div class="modal-body">
            <div class="discount-type-selector">
              <label class="radio-label">
                <input v-model="discountType" type="radio" value="percentage" />
                <span>Persentase (%)</span>
              </label>
              <label class="radio-label">
                <input v-model="discountType" type="radio" value="amount" />
                <span>Nominal (Rp)</span>
              </label>
            </div>

            <input
              v-if="discountType === 'percentage'"
              v-model.number="discountValue"
              type="text" inputmode="numeric"
              class="input-discount"
              placeholder="Masukkan nilai persen"
              :max="100"
              min="0"
              autofocus
            />
            <input
              v-else
              :value="discountAmountDisplay"
              type="text"
              class="input-discount"
              placeholder="Rp 0"
              @input="handleDiscountAmountInput"
              autofocus
            />
          </div>

          <div class="modal-footer">
            <button class="btn-modal-cancel" @click.stop="showDiscountModal = false">
              Batal
            </button>
            <button class="btn-modal-apply" @click.stop="handleApplyDiscount">
              Terapkan
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Add-on Selector Modal -->
    <AddOnSelectorModal
      :is-open="showAddOnModal"
      :product-name="item.productName"
      :product-id="item.productId"
      :item-id="item.id"
      :current-add-ons="item.addOns"
      :current-notes="item.notes"
      @close="handleAddOnModalClose"
      @confirm="handleAddOnConfirm"
    />
  </div>
</template>

<style scoped>
/* ── Cart Item Container ── */
.cart-item {
  background: white;
  border: 1px solid rgba(123, 47, 190, 0.1);
  border-radius: 8px;
  padding: 0.4rem 0.45rem;
  margin-bottom: 0.2rem;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:hover { border-color: rgba(123, 47, 190, 0.22); }
  &:last-child { margin-bottom: 0; }
}

/* ── Row 1: nama + harga satuan + delete ── */
.item-header {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  min-height: 28px;
}

.product-name {
  flex: 1;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.2;
  display: flex;
  align-items: center;
  gap: 0.2rem;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.price-unit-group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

.price-original-crossed {
  font-size: 0.6rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-decoration: line-through;
  opacity: 0.6;
  white-space: nowrap;
}

.price-unit {
  flex-shrink: 0;
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--brand-primary);
  white-space: nowrap;
}

.price-unit--member {
  color: #16a34a;
}

.paid-badge {
  flex-shrink: 0;
  font-size: 0.6rem;
  font-weight: 800;
  color: #0f766e;
  background: rgba(20, 184, 166, 0.12);
  border: 1px solid rgba(20, 184, 166, 0.25);
  padding: 0.1rem 0.4rem;
  border-radius: 99px;
  letter-spacing: 0.04em;
}

.btn-delete {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  color: var(--color-text-tertiary);
  opacity: 0.45;
  transition: opacity 0.15s, background 0.15s, color 0.15s;
  -webkit-tap-highlight-color: transparent;

  &:hover:not(:disabled) { opacity: 1; background: rgba(239,68,68,0.08); color: #dc2626; }
  &:active:not(:disabled) { transform: scale(0.9); }
  &:disabled { opacity: 0.2; cursor: not-allowed; }
}

/* ── Row 2: qty + total + action buttons ── */
.qty-actions-row {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin-top: 0.22rem;
}

.quantity-controls {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  border: 1px solid rgba(123, 47, 190, 0.18);
  border-radius: 6px;
  overflow: hidden;
  background: rgba(123, 47, 190, 0.03);
}

.btn-qty {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 700;
  color: var(--brand-primary);
  line-height: 1;
  transition: background 0.12s ease;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;

  &:hover:not(:disabled) { background: rgba(123,47,190,0.1); }
  &:active:not(:disabled) { background: rgba(123,47,190,0.18); }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
}

.qty-value {
  min-width: 22px;
  text-align: center;
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--brand-primary);
  user-select: none;
}

.line-total {
  flex: 1;
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--color-text-primary);
  white-space: nowrap;
}

.item-action-btns {
  display: flex;
  gap: 0.2rem;
  flex-shrink: 0;
}

.btn-icon-action {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;

  &:active:not(:disabled) { transform: scale(0.88); }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
}

.btn-icon-action.btn-discount {
  background: rgba(245,158,11,0.07);
  border: 1px solid rgba(245,158,11,0.22);
  color: #b45309;
  &:hover:not(:disabled) { background: rgba(245,158,11,0.15); }
}

.btn-icon-action.btn-addon {
  background: rgba(123,47,190,0.06);
  border: 1px solid rgba(123,47,190,0.18);
  color: var(--brand-primary);
  &:hover:not(:disabled) { background: rgba(123,47,190,0.12); }
}

/* ── Extras: addons + discount + subtotal ── */
.extras-section {
  margin-top: 0.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
}

.extra-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.3rem;
  border-radius: 4px;
  font-size: 0.63rem;
  font-weight: 600;
}

.extra-item.addon {
  background: rgba(168,85,247,0.06);
  border: 1px solid rgba(168,85,247,0.14);
  color: #7c3aed;
}

.extra-item.notes {
  background: rgba(59,130,246,0.05);
  border: 1px solid rgba(59,130,246,0.15);
  color: #1d4ed8;

  .extra-name {
    white-space: normal;
    overflow: visible;
    text-overflow: unset;
    font-weight: 500;
    font-style: italic;
  }
}

.extra-item.member-discount {
  background: rgba(22,163,74,0.07);
  border: 1px solid rgba(22,163,74,0.2);
  color: #15803d;
}

.extra-item.discount {
  background: rgba(245,158,11,0.06);
  border: 1px solid rgba(245,158,11,0.14);
  color: #d97706;
}

.extra-icon { flex-shrink: 0; }
.extra-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.extra-value { font-weight: 700; flex-shrink: 0; }

.btn-remove-extra {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  opacity: 0.45;
  border-radius: 3px;
  flex-shrink: 0;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;

  &:hover:not(:disabled) { opacity: 1; }
  &:active:not(:disabled) { transform: scale(0.85); }
  &:disabled { cursor: not-allowed; }
}

/* Subtotal (hanya muncul kalau ada extras/discount) */
.subtotal-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.18rem;
  margin-top: 0.05rem;
  border-top: 1px solid rgba(123,47,190,0.08);
}

.subtotal-label {
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.subtotal-value {
  font-size: 0.76rem;
  font-weight: 900;
  color: var(--brand-primary);
}

/* ── Tablet landscape: touch target lebih besar ── */
@media (min-width: 960px) and (max-width: 1279px) {
  .cart-item {
    padding: 0.45rem 0.5rem;
    margin-bottom: 0.25rem;
  }

  .btn-qty {
    width: 36px;
    height: 36px;
    font-size: 1.1rem;
  }

  .qty-value {
    min-width: 26px;
    font-size: 0.78rem;
  }

  .btn-icon-action {
    width: 36px;
    height: 36px;
  }

  .btn-delete {
    width: 32px;
    height: 32px;
  }

  .product-name {
    font-size: 0.8rem;
  }

  .price-unit {
    font-size: 0.7rem;
  }

  .line-total {
    font-size: 0.78rem;
  }

  .qty-actions-row {
    margin-top: 0.28rem;
    gap: 0.35rem;
  }
}

/* ── Mobile ── */
@media (max-width: 767px) {
  .cart-item {
    padding: 0.35rem 0.4rem;
    margin-bottom: 0.18rem;
  }

  .btn-qty {
    width: 32px;
    height: 32px;
  }

  .btn-icon-action {
    width: 32px;
    height: 32px;
  }
}

/* ── Modal Styles ── */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1rem;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 340px;
  width: 100%;
  overflow: hidden;
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUp {
  from {
    transform: translateY(30px) scale(0.95);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

.modal-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(123, 47, 190, 0.15);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(123, 47, 190, 0.03);

  h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-text-primary);
    font-family: var(--font-family-body);
  }
}

.btn-modal-close {
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  color: var(--color-text-secondary);
  width: 30px;
  height: 30px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.06);
    color: var(--color-text-primary);
  }
}

.modal-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.discount-type-selector {
  display: flex;
  gap: 1rem;
}

.radio-label {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.8rem;
  border: 2px solid rgba(123, 47, 190, 0.2);
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  transition: all 0.2s ease;
  background: white;

  &:hover {
    border-color: rgba(123, 47, 190, 0.4);
    background: rgba(123, 47, 190, 0.05);
  }

  input[type="radio"] {
    cursor: pointer;
    accent-color: var(--brand-primary);
    width: 18px;
    height: 18px;
  }

  input[type="radio"]:checked + span {
    color: var(--brand-primary);
  }
}

.input-discount {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid rgba(123, 47, 190, 0.2);
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: var(--brand-primary);
    box-shadow: 0 0 0 3px rgba(123, 47, 190, 0.1);
  }

  &::placeholder {
    color: var(--color-text-secondary);
    opacity: 0.5;
  }
}

.modal-footer {
  padding: 1rem 1.25rem;
  border-top: 1px solid rgba(123, 47, 190, 0.15);
  display: flex;
  gap: 0.75rem;
  background: rgba(249, 250, 251, 0.5);
}

.btn-modal-cancel {
  flex: 1;
  padding: 0.6rem;
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.08);
  }
}

.btn-modal-apply {
  flex: 1;
  padding: 0.6rem;
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  border: none;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  color: white;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(123, 47, 190, 0.25);

  &:hover {
    filter: brightness(1.08);
    box-shadow: 0 4px 12px rgba(123, 47, 190, 0.35);
  }

  &:active {
    transform: scale(0.98);
  }
}

</style>
