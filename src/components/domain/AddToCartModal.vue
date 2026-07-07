<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Product } from '@/types'
import { formatRupiah } from '@/utils/formatters'
import { useAddOnStore } from '@/stores/addOn'
import { useMemberTierStore } from '@/stores/memberTier'
import { useTransactionStore } from '@/stores/transaction'

interface Props {
  isOpen: boolean
  product: Product | null
  is_customer_member?: boolean
}

interface AddOnWithQuantity {
  addOnId: string
  addOnName: string
  quantity: number
  price: number
  subtotal: number
}

interface Emits {
  close: []
  addToCart: [productId: string, quantity: number, selectedAddOns: AddOnWithQuantity[]]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const addOnStore = useAddOnStore()
const memberTierStore = useMemberTierStore()
const transactionStore = useTransactionStore()

// State
const quantity = ref(1)
const selectedAddOns = ref<Map<string, number>>(new Map())
const searchQuery = ref('')

// Computed
const tierDiscount = computed(() => {
  if (!props.product) return null
  const activeMember = transactionStore.selectedCustomerIsMember &&
    transactionStore.selectedCustomerMemberStatus === 'active'
  if (!activeMember || !transactionStore.selectedCustomerTier) return null

  if (transactionStore.memberDailyUsageLoading) return null

  const remaining = transactionStore.memberRemainingQuota
  if (remaining !== null && remaining <= 0) return null

  const result = memberTierStore.computeDiscount(
    { id: props.product.id, price: props.product.price, categoryName: props.product.categoryName },
    transactionStore.selectedCustomerTier
  )
  return result.discountAmount > 0 ? result : null
})

const productPrice = computed(() => {
  if (!props.product) return 0
  return tierDiscount.value ? tierDiscount.value.finalPrice : Number(props.product.price) || 0
})

// Hanya tampilkan addons yang linked ke produk ini (via product_addons)
const availableAddOns = computed(() => {
  const productAddOnIds = new Set((props.product?.addOns || []).map((a: any) => a.id))
  if (productAddOnIds.size === 0) return []
  return addOnStore.activeAddOns.filter(a => productAddOnIds.has(a.id))
})

const filteredAddOns = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return availableAddOns.value
  return availableAddOns.value.filter(a =>
    a.name.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q)
  )
})

const totalAddOnPrice = computed(() => {
  let total = 0
  selectedAddOns.value.forEach((qty, id) => {
    const addon = addOnStore.getAddOnById(id)
    if (addon) total += Number(addon.price) * qty
  })
  return total
})

const subtotal = computed(() => {
  const price = productPrice.value
  const addOnsTotal = totalAddOnPrice.value
  const qty = Number(quantity.value) || 1
  return (price + addOnsTotal) * qty
})

const addOnsForCart = computed<AddOnWithQuantity[]>(() => {
  const result: AddOnWithQuantity[] = []
  selectedAddOns.value.forEach((qty, id) => {
    const addon = addOnStore.getAddOnById(id)
    if (addon) {
      result.push({
        addOnId: addon.id,
        addOnName: addon.name,
        quantity: qty,
        price: addon.price,
        subtotal: addon.price * qty * quantity.value,
      })
    }
  })
  return result
})

// Methods
const toggleAddOn = (id: string) => {
  if (selectedAddOns.value.has(id)) {
    selectedAddOns.value.delete(id)
  } else {
    selectedAddOns.value.set(id, 1)
  }
}

const increaseAddOnQty = (id: string) => {
  selectedAddOns.value.set(id, (selectedAddOns.value.get(id) || 1) + 1)
}

const decreaseAddOnQty = (id: string) => {
  const cur = selectedAddOns.value.get(id) || 1
  if (cur > 1) {
    selectedAddOns.value.set(id, cur - 1)
  }
}

const decreaseQty = () => { if (quantity.value > 1) quantity.value-- }
const increaseQty = () => { quantity.value++ }

const handleAddToCart = () => {
  if (!props.product) return
  emit('addToCart', props.product.id, quantity.value, addOnsForCart.value)
  handleClose()
}

const handleClose = () => {
  quantity.value = 1
  selectedAddOns.value.clear()
  searchQuery.value = ''
  emit('close')
}

watch(() => props.isOpen, async (isOpen) => {
  if (isOpen) {
    if (addOnStore.activeAddOns.length === 0) {
      await addOnStore.fetchAddOns()
    }
  }
})
</script>

<template>
  <Transition name="modal-fade">
    <div v-if="isOpen" class="modal-overlay" @click="handleClose">
      <div class="modal-container" @click.stop>

        <!-- Header -->
        <div class="modal-header">
          <h2 class="modal-title">{{ product?.name || 'Produk' }}</h2>
          <button class="btn-close" @click="handleClose">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="modal-body">

          <!-- LEFT: product info + quantity -->
          <div class="body-left">
            <!-- Product Image & Price -->
            <div class="product-section">
              <div v-if="product?.image" class="product-image">
                <img :src="product.image" :alt="product.name" />
              </div>
              <div v-else class="product-image placeholder"><AppIcon name="menu" :size="28" /></div>
              <div class="product-details">
                <p class="price-label">Harga Satuan</p>
                <p class="price">{{ formatRupiah(productPrice) }}</p>
                <p v-if="tierDiscount" class="member-badge">
                  Hemat {{ formatRupiah(tierDiscount.discountAmount) }} · {{ transactionStore.selectedCustomerTier?.toUpperCase() }}
                </p>
              </div>
            </div>

            <!-- Quantity Selector -->
            <div class="section">
              <h3 class="section-title">Jumlah</h3>
              <div class="quantity-control">
                <button class="qty-btn" @click="decreaseQty" :disabled="quantity <= 1">−</button>
                <span class="qty-display">{{ quantity }}</span>
                <button class="qty-btn" @click="increaseQty">+</button>
              </div>
            </div>
          </div>

          <!-- RIGHT: add-ons (full height, own scroll) -->
          <div class="body-right">
            <div class="section-header">
              <h3 class="section-title">Pilihan Tambahan</h3>
              <span v-if="selectedAddOns.size > 0" class="addon-count-badge">{{ selectedAddOns.size }} dipilih</span>
            </div>

            <div v-if="addOnStore.isLoading" class="addons-loading">
              <span class="loading-dot"></span>
              <span class="loading-dot"></span>
              <span class="loading-dot"></span>
            </div>

            <template v-else>
              <!-- Search -->
              <div v-if="availableAddOns.length > 4" class="search-container">
                <input
                  v-model="searchQuery"
                  type="text"
                  class="search-input"
                  placeholder="Cari add-on..."
                />
              </div>

              <div v-if="availableAddOns.length === 0" class="empty-addons">
                <span>Belum ada add-on tersedia</span>
              </div>

              <div v-else-if="filteredAddOns.length === 0" class="empty-addons">
                Tidak ada add-on cocok dengan "{{ searchQuery }}"
              </div>

              <div v-else class="addons-list">
                <div
                  v-for="addon in filteredAddOns"
                  :key="addon.id"
                  class="addon-item"
                  :class="{ 'addon-item--selected': selectedAddOns.has(addon.id) }"
                  @click="toggleAddOn(addon.id)"
                >
                  <div class="addon-checkbox-wrap">
                    <div class="addon-checkbox" :class="{ checked: selectedAddOns.has(addon.id) }">
                      <svg v-if="selectedAddOns.has(addon.id)" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                    <div class="addon-info">
                      <span class="addon-name">{{ addon.name }}</span>
                      <span v-if="addon.description" class="addon-desc">{{ addon.description }}</span>
                    </div>
                  </div>

                  <div class="addon-right">
                    <span class="addon-price">+{{ formatRupiah(addon.price) }}</span>
                    <div v-if="selectedAddOns.has(addon.id)" class="addon-qty" @click.stop>
                      <button class="addon-qty-btn" @click.stop="decreaseAddOnQty(addon.id)">−</button>
                      <span class="addon-qty-val">{{ selectedAddOns.get(addon.id) }}</span>
                      <button class="addon-qty-btn" @click.stop="increaseAddOnQty(addon.id)">+</button>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>

        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <div class="subtotal-row">
            <span class="subtotal-label">Subtotal</span>
            <span class="subtotal-amount">{{ formatRupiah(subtotal) }}</span>
          </div>
          <div class="button-group">
            <button class="btn btn-secondary" @click="handleClose">Batal</button>
            <button class="btn btn-primary" @click="handleAddToCart">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              Tambah ke Keranjang
            </button>
          </div>
        </div>

      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem;
  z-index: 1000;
}

.modal-container {
  background: var(--color-surface-primary, white);
  width: 100%;
  max-width: 600px;
  max-height: 92dvh;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

/* ── Header ── */
.modal-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-border-light, rgba(123, 47, 190, 0.08));
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.modal-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.btn-close {
  background: rgba(123, 47, 190, 0.06);
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  transition: all 0.2s;

  &:hover {
    background: rgba(123, 47, 190, 0.12);
    color: var(--color-text-primary);
  }
}

/* ── Body — default 2-kolom (kiri: produk, kanan: addons) ── */
.modal-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: row;
  overflow: hidden;
  padding: 0;
  gap: 0;
}

.body-left {
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1rem;
  border-right: 1px solid var(--color-border-light, rgba(123, 47, 190, 0.08));
  justify-content: center;
}

.body-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(123, 47, 190, 0.2) transparent;
}

/* ── Product Section ── */
.product-section {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.product-image {
  width: 72px;
  height: 72px;
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(135deg, var(--brand-primary) 0%, #a78bfa 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 2rem;

  img { width: 100%; height: 100%; object-fit: cover; }
}

.product-details {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.price-label {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--color-text-tertiary);
  letter-spacing: 0.05em;
  margin: 0;
}

.price {
  font-size: 1.4rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}

.member-badge {
  font-size: 0.68rem;
  font-weight: 600;
  color: #f59e0b;
  margin: 0;
}

/* ── Section ── */
.section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-title {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  letter-spacing: 0.07em;
}

.addon-count-badge {
  font-size: 0.68rem;
  font-weight: 700;
  background: var(--brand-primary);
  color: white;
  padding: 0.15rem 0.5rem;
  border-radius: 99px;
}

/* ── Quantity ── */
.quantity-control {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.qty-btn {
  width: 44px;
  height: 44px;
  border: 1px solid rgba(123, 47, 190, 0.2);
  background: rgba(123, 47, 190, 0.06);
  color: var(--brand-primary);
  border-radius: 10px;
  font-weight: 700;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover:not(:disabled) {
    background: rgba(123, 47, 190, 0.12);
    border-color: rgba(123, 47, 190, 0.35);
  }

  &:active:not(:disabled) { transform: scale(0.95); }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
}

.qty-display {
  min-width: 48px;
  height: 44px;
  text-align: center;
  border: 1px solid rgba(123, 47, 190, 0.2);
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text-primary);
  background: var(--color-surface-primary, white);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Search ── */
.search-container { }

.search-input {
  width: 100%;
  min-height: 40px;
  padding: 0.6rem 0.9rem;
  border: 1px solid rgba(123, 47, 190, 0.15);
  border-radius: 8px;
  font-size: 0.85rem;
  color: var(--color-text-primary);
  background: var(--color-surface-primary, white);
  transition: border-color 0.2s;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: var(--brand-primary);
    box-shadow: 0 0 0 3px rgba(123, 47, 190, 0.1);
  }

  &::placeholder { color: var(--color-text-hint); }
}

/* ── Add-ons List ── */
.addons-loading {
  display: flex;
  gap: 6px;
  padding: 0.75rem;
  justify-content: center;
}

.loading-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--brand-primary);
  animation: dotPulse 1.2s ease-in-out infinite;
  will-change: opacity, transform;

  &:nth-child(2) { animation-delay: 0.2s; }
  &:nth-child(3) { animation-delay: 0.4s; }
}

@keyframes dotPulse {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1); }
}

.empty-addons {
  text-align: center;
  padding: 1.5rem;
  color: var(--color-text-tertiary);
  font-size: 0.85rem;
  background: var(--color-surface-secondary, rgba(123, 47, 190, 0.03));
  border-radius: 10px;
}

.addons-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.addon-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.65rem 0.75rem;
  border: 1px solid rgba(123, 47, 190, 0.1);
  border-radius: 10px;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: all 0.15s;
  background: var(--color-surface-primary, white);
  user-select: none;

  &:hover {
    border-color: rgba(123, 47, 190, 0.25);
    background: rgba(123, 47, 190, 0.03);
  }

  &.addon-item--selected {
    border-color: var(--brand-primary);
    background: rgba(123, 47, 190, 0.04);
  }
}

.addon-checkbox-wrap {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex: 1;
  min-width: 0;
}

.addon-checkbox {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(123, 47, 190, 0.3);
  border-radius: 5px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  background: white;

  &.checked {
    background: var(--brand-primary);
    border-color: var(--brand-primary);
  }
}

.addon-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.addon-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.addon-desc {
  font-size: 0.72rem;
  color: var(--color-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.addon-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.35rem;
  flex-shrink: 0;
}

.addon-price {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--brand-primary);
  white-space: nowrap;
}

.addon-qty {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: white;
  border: 1px solid rgba(123, 47, 190, 0.2);
  border-radius: 6px;
  padding: 2px 4px;
}

.addon-qty-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--brand-primary);
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover { background: rgba(123, 47, 190, 0.1); }
}

.addon-qty-val {
  min-width: 20px;
  text-align: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

/* ── Footer ── */
.modal-footer {
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--color-border-light, rgba(123, 47, 190, 0.08));
  flex-shrink: 0;
  background: var(--color-surface-primary, white);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.subtotal-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.65rem 0.9rem;
  background: rgba(123, 47, 190, 0.04);
  border-radius: 8px;
}

.subtotal-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  letter-spacing: 0.05em;
}

.subtotal-amount {
  font-size: 1.2rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.button-group {
  display: flex;
  gap: 0.75rem;
}

.btn {
  flex: 1;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.btn-primary {
  flex: 2;
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(123, 47, 190, 0.3);

  &:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(123, 47, 190, 0.4); }
  &:active { transform: translateY(0); }
}

.btn-secondary {
  background: rgba(123, 47, 190, 0.07);
  color: var(--brand-primary);
  border: 1px solid rgba(123, 47, 190, 0.15);

  &:hover { background: rgba(123, 47, 190, 0.12); }
  &:active { transform: scale(0.98); }
}

/* ── Transitions ── */
.modal-fade-enter-active, .modal-fade-leave-active {
  transition: opacity 0.25s ease;
  will-change: opacity;
}
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }

.modal-fade-enter-active .modal-container {
  animation: scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  will-change: transform, opacity;
}
.modal-fade-leave-active .modal-container {
  animation: scaleOut 0.2s ease-in;
  will-change: transform, opacity;
}

@keyframes scaleIn {
  from { transform: scale(0.94); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
@keyframes scaleOut {
  from { transform: scale(1); opacity: 1; }
  to { transform: scale(0.94); opacity: 0; }
}

/* ── Portrait / layar sempit (max-width ≤ 600px) — stack ke 1 kolom ── */
@media (max-width: 600px) {
  .modal-container { max-width: 100%; border-radius: 12px; }
  .modal-body {
    flex-direction: column;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }
  .body-left { width: 100%; border-right: none; border-bottom: 1px solid var(--color-border-light, rgba(123, 47, 190, 0.08)); }
  .body-right { overflow-y: unset; }
}

/* ── MatePad SE 11" landscape (1280×800) — tinggi cukup tapi tetap perlu compact ── */
@media (min-width: 1280px) and (max-height: 850px) {
  .modal-header { padding: 0.65rem 1.25rem; }
  .modal-title { font-size: 0.95rem; }

  .body-left { gap: 1rem; padding: 1rem 1.25rem; }
  .body-right { padding: 0.85rem 1rem; gap: 0.6rem; }

  .product-image { width: 60px; height: 60px; }
  .price { font-size: 1.1rem; }
  .qty-btn { width: 38px; height: 38px; }
  .qty-display { height: 38px; }

  .modal-footer { padding: 0.65rem 1.25rem; gap: 0.5rem; }
  .subtotal-row { padding: 0.45rem 0.85rem; }
  .btn { min-height: 40px; }

  .addon-item { padding: 0.55rem 0.75rem; }
  .section-title { font-size: 0.75rem; }
}

/* ── Compact: layar kecil (max-height ≤ 600px) — Tab A9 landscape ── */
@media (max-height: 600px) {
  .modal-header { padding: 0.55rem 1rem; }
  .modal-title { font-size: 0.9rem; }
  .btn-close { width: 30px; height: 30px; }

  .body-left { gap: 0.85rem; padding: 0.85rem 1rem; }
  .body-right { padding: 0.75rem 0.9rem; gap: 0.5rem; }

  .product-image { width: 52px; height: 52px; }
  .price { font-size: 1.05rem; }
  .qty-btn { width: 36px; height: 36px; font-size: 1rem; }
  .qty-display { height: 36px; font-size: 0.95rem; min-width: 40px; }

  .modal-footer { padding: 0.55rem 1rem; gap: 0.4rem; }
  .subtotal-row { padding: 0.4rem 0.75rem; }
  .subtotal-label { font-size: 0.72rem; }
  .subtotal-amount { font-size: 0.95rem; }
  .btn { min-height: 36px; padding: 0.5rem 0.75rem; font-size: 0.8rem; }

  .addon-item { padding: 0.5rem 0.65rem; }
  .addon-name { font-size: 0.8rem; }
  .addon-price { font-size: 0.75rem; }
  .section-title { font-size: 0.7rem; }
}
</style>
