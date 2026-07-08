<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click="handleBackdropClick">
        <div class="modal-content" @click.stop>

          <!-- Header -->
          <div class="modal-header">
            <div class="header-left">
              <span class="header-title">Pilih Add-On</span>
              <span class="product-chip">{{ productName }}</span>
            </div>
            <div class="header-right">
              <span v-if="selectedAddOns.size > 0" class="selected-badge">{{ selectedAddOns.size }} dipilih</span>
              <button class="btn-close" @click="$emit('close')">
                <AppIcon name="x" :size="16" />
              </button>
            </div>
          </div>

          <!-- Body -->
          <div class="modal-body">

            <!-- Search + Toggle All -->
            <div class="search-row">
              <div class="search-wrapper">
                <AppIcon name="search" :size="14" class="search-icon" />
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Cari add-on..."
                  class="search-input"
                />
                <button v-if="searchQuery" class="btn-clear-search" @click="searchQuery = ''">
                  <AppIcon name="x" :size="12" />
                </button>
              </div>
              <button
                v-if="filteredAddOns.length > 0"
                class="btn-toggle-all"
                :class="{ active: allSelected }"
                @click="toggleAll"
              >
                {{ allSelected ? 'Batal' : 'Semua' }}
              </button>
            </div>

            <!-- Add-ons List -->
            <div v-if="filteredAddOns.length === 0" class="empty-state">
              {{ searchQuery ? `Tidak ada add-on cocok "${searchQuery}"` : 'Tidak ada add-on tersedia' }}
            </div>

            <div v-else class="addons-list">
              <div
                v-for="addOn in filteredAddOns"
                :key="addOn.id"
                class="addon-item"
                :class="{ selected: isSelected(addOn.id) }"
                @click="toggle(addOn.id)"
              >
                <!-- Custom Checkbox -->
                <div class="addon-check" :class="{ checked: isSelected(addOn.id) }">
                  <svg v-if="isSelected(addOn.id)" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>

                <!-- Info -->
                <div class="addon-info">
                  <span class="addon-name">{{ addOn.name }}</span>
                  <span v-if="addOn.description" class="addon-desc">{{ addOn.description }}</span>
                </div>

                <!-- Price + Qty -->
                <div class="addon-right">
                  <span class="addon-price-badge">+{{ formatRupiah(addOn.price) }}</span>
                  <div v-if="isSelected(addOn.id)" class="qty-stepper" @click.stop>
                    <button class="qty-btn" @click.stop="decQty(addOn.id)">−</button>
                    <input
                      class="qty-val"
                      type="text"
                      inputmode="numeric"
                      :value="getQty(addOn.id)"
                      @change="setQty(addOn.id, $event)"
                      @focus="($event.target as HTMLInputElement).select()"
                    />
                    <button class="qty-btn" @click.stop="incQty(addOn.id)">+</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Catatan -->
            <div class="notes-section">
              <label class="notes-label">Catatan Item</label>
              <textarea
                v-model="itemNotes"
                class="notes-input"
                placeholder="Contoh: tanpa es, ekstra pedas..."
                rows="2"
              />
            </div>

          </div>

          <!-- Summary Bar -->
          <div v-if="selectedAddOns.size > 0" class="summary-bar">
            <span class="summary-label">Total Add-On</span>
            <span class="summary-price">{{ formatRupiah(totalPrice) }}</span>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button class="btn-cancel" @click="$emit('close')">Batal</button>
            <button class="btn-confirm" @click="handleConfirm">
              <AppIcon name="check" :size="14" />
              Simpan{{ selectedAddOns.size > 0 ? ` (${selectedAddOns.size})` : '' }}
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { formatRupiah } from '@/utils/formatters'
import { useAddOnStore } from '@/stores/addOn'
import { useProductStore } from '@/stores/product'
import type { CartItemAddOn } from '@/types/transaction'
import { useModal } from '@/composables/useModal'

interface Props {
  isOpen: boolean
  productName: string
  productId: string
  itemId: string
  currentAddOns?: CartItemAddOn[]
  currentNotes?: string
}

interface Emits {
  close: []
  confirm: [addOns: CartItemAddOn[], notes: string]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const addOnStore = useAddOnStore()
const productStore = useProductStore()

const selectedAddOns = ref<Map<string, number>>(new Map())
const searchQuery = ref('')
const itemNotes = ref('')

const productLinkedAddOnIds = computed(() => {
  const product = productStore.getProductById(props.productId)
  if (!product?.addOns?.length) return null
  return new Set((product.addOns as any[]).map((a: any) => a.id))
})

const availableAddOns = computed(() => {
  const ids = productLinkedAddOnIds.value
  if (!ids) return addOnStore.activeAddOns
  return addOnStore.activeAddOns.filter(a => ids.has(a.id))
})

const filteredAddOns = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return availableAddOns.value
  return availableAddOns.value.filter(a =>
    a.name.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q)
  )
})

const allSelected = computed(() =>
  filteredAddOns.value.length > 0 &&
  filteredAddOns.value.every(a => selectedAddOns.value.has(a.id))
)

const totalPrice = computed(() => {
  let total = 0
  selectedAddOns.value.forEach((qty, id) => {
    const a = addOnStore.getAddOnById(id)
    if (a) total += a.price * qty
  })
  return total
})

const isSelected = (id: string) => selectedAddOns.value.has(id)
const getQty = (id: string) => selectedAddOns.value.get(id) ?? 1

const toggle = (id: string) => {
  if (selectedAddOns.value.has(id)) selectedAddOns.value.delete(id)
  else selectedAddOns.value.set(id, 1)
}

const toggleAll = () => {
  if (allSelected.value) {
    filteredAddOns.value.forEach(a => selectedAddOns.value.delete(a.id))
  } else {
    filteredAddOns.value.forEach(a => {
      if (!selectedAddOns.value.has(a.id)) selectedAddOns.value.set(a.id, 1)
    })
  }
}

const incQty = (id: string) => selectedAddOns.value.set(id, (selectedAddOns.value.get(id) ?? 1) + 1)
const decQty = (id: string) => {
  const cur = selectedAddOns.value.get(id) ?? 1
  if (cur > 1) selectedAddOns.value.set(id, cur - 1)
}
const setQty = (id: string, e: Event) => {
  const v = parseInt((e.target as HTMLInputElement).value, 10)
  if (v > 0) selectedAddOns.value.set(id, v)
  else (e.target as HTMLInputElement).value = String(getQty(id))
}

const handleConfirm = () => {
  const addOns: CartItemAddOn[] = []
  selectedAddOns.value.forEach((qty, id) => {
    const a = addOnStore.getAddOnById(id)
    if (a) addOns.push({ id: a.id, addOnId: a.id, addOnName: a.name, price: a.price, quantity: qty, subtotal: a.price * qty })
  })
  emit('confirm', addOns, itemNotes.value.trim())
}

const { handleBackdropClick } = useModal(() => emit('close'))

watch(() => props.isOpen, async (open) => {
  if (!open) {
    selectedAddOns.value.clear()
    searchQuery.value = ''
    itemNotes.value = ''
    return
  }
  if (addOnStore.activeAddOns.length === 0) await addOnStore.fetchAddOns()
  selectedAddOns.value.clear()
  props.currentAddOns?.forEach(a => selectedAddOns.value.set(a.addOnId, a.quantity))
  itemNotes.value = props.currentNotes ?? ''
})
</script>

<style scoped>
/* ── Overlay ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2001;
  padding: var(--spacing-4);
}

/* ── Container ── */
.modal-content {
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.25), 0 4px 16px rgba(123, 47, 190, 0.15);
  width: 100%;
  max-width: 480px;
  max-height: 88dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* ── Header ── */
.modal-header {
  background: var(--brand-gradient-primary);
  padding: var(--spacing-3) var(--spacing-4);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-3);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.header-title {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.75);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.product-chip {
  font-size: var(--font-size-base);
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 240px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  flex-shrink: 0;
}

.selected-badge {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: var(--font-size-xs);
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  white-space: nowrap;
}

.btn-close {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #fff;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  flex-shrink: 0;

  &:hover { background: rgba(255, 255, 255, 0.25); }
}

/* ── Body ── */
.modal-body {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  padding: var(--spacing-3) var(--spacing-4);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(123, 47, 190, 0.2) transparent;
}

/* ── Search Row ── */
.search-row {
  display: flex;
  gap: var(--spacing-2);
  align-items: center;
  flex-shrink: 0;
}

.search-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 9px;
  color: var(--color-text-secondary);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 7px 30px 7px 30px;
  border: 1.5px solid var(--color-border);
  border-radius: 10px;
  font-size: var(--font-size-sm);
  background: rgba(123, 47, 190, 0.03);
  color: var(--color-text-primary);
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: var(--brand-primary);
    background: #fff;
    box-shadow: 0 0 0 3px rgba(123, 47, 190, 0.1);
  }
  &::placeholder { color: var(--color-text-hint); }
}

.btn-clear-search {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-secondary);
  padding: 2px;
  display: flex;
  align-items: center;
  border-radius: 50%;
  &:hover { color: var(--color-text-primary); }
}

.btn-toggle-all {
  padding: 7px 12px;
  border: 1.5px solid rgba(123, 47, 190, 0.25);
  border-radius: 10px;
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  background: rgba(123, 47, 190, 0.06);
  color: var(--brand-primary);
  transition: all 0.2s;

  &:hover { background: rgba(123, 47, 190, 0.12); }

  &.active {
    background: rgba(239, 68, 68, 0.06);
    border-color: rgba(239, 68, 68, 0.25);
    color: #dc2626;
  }
}

/* ── Empty ── */
.empty-state {
  text-align: center;
  padding: 1.5rem;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-sm);
  background: rgba(123, 47, 190, 0.03);
  border-radius: 10px;
}

/* ── Addon List ── */
.addons-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.addon-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0.7rem;
  border: 1.5px solid var(--color-border);
  border-radius: 12px;
  cursor: pointer;
  background: #fff;
  transition: all 0.15s;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;

  &:hover {
    border-color: rgba(123, 47, 190, 0.3);
    background: rgba(123, 47, 190, 0.02);
  }

  &.selected {
    border-color: var(--brand-primary);
    background: rgba(123, 47, 190, 0.05);
    box-shadow: 0 0 0 1px rgba(123, 47, 190, 0.12);
  }
}

/* ── Custom Checkbox ── */
.addon-check {
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
    box-shadow: 0 2px 6px rgba(123, 47, 190, 0.35);
  }
}

/* ── Addon Info ── */
.addon-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.addon-name {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.addon-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Addon Right ── */
.addon-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.3rem;
  flex-shrink: 0;
}

.addon-price-badge {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--brand-primary);
  background: rgba(123, 47, 190, 0.08);
  padding: 2px 8px;
  border-radius: 20px;
  white-space: nowrap;
}

/* ── Qty Stepper ── */
.qty-stepper {
  display: flex;
  align-items: center;
  background: #fff;
  border: 1.5px solid rgba(123, 47, 190, 0.22);
  border-radius: 20px;
  overflow: hidden;
}

.qty-btn {
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  color: var(--brand-primary);
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s;

  &:hover { background: rgba(123, 47, 190, 0.1); }
  &:active { background: rgba(123, 47, 190, 0.18); }
}

.qty-val {
  width: 28px;
  border: none;
  background: transparent;
  text-align: center;
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-text-primary);
  padding: 0;
  &:focus { outline: none; }
}

/* ── Notes ── */
.notes-section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.notes-label {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-secondary);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.notes-input {
  width: 100%;
  padding: 0.55rem 0.75rem;
  border: 1.5px solid var(--color-border);
  border-radius: 10px;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  background: rgba(123, 47, 190, 0.02);
  resize: none;
  font-family: var(--font-family-body);
  transition: border-color 0.2s;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: var(--brand-primary);
    background: #fff;
    box-shadow: 0 0 0 3px rgba(123, 47, 190, 0.1);
  }
  &::placeholder { color: var(--color-text-hint); }
}

/* ── Summary Bar ── */
.summary-bar {
  padding: 10px var(--spacing-4);
  background: linear-gradient(135deg, rgba(123, 47, 190, 0.07) 0%, rgba(88, 28, 135, 0.04) 100%);
  border-top: 1px solid rgba(123, 47, 190, 0.12);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.summary-label {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
}

.summary-price {
  font-size: var(--font-size-lg);
  font-weight: 800;
  color: var(--brand-primary);
}

/* ── Footer ── */
.modal-footer {
  padding: var(--spacing-3) var(--spacing-4);
  border-top: 1px solid rgba(123, 47, 190, 0.08);
  display: flex;
  gap: var(--spacing-2);
  flex-shrink: 0;
}

.btn-cancel {
  padding: 10px var(--spacing-4);
  border: 1.5px solid var(--color-border);
  border-radius: 10px;
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  color: var(--color-text-secondary);
  transition: all 0.2s;
  touch-action: manipulation;

  &:hover {
    border-color: rgba(123, 47, 190, 0.3);
    color: var(--color-text-primary);
  }
}

.btn-confirm {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px var(--spacing-4);
  border: none;
  border-radius: 10px;
  font-size: var(--font-size-sm);
  font-weight: 700;
  cursor: pointer;
  background: var(--brand-gradient-primary);
  color: #fff;
  box-shadow: 0 4px 12px rgba(123, 47, 190, 0.3);
  transition: all 0.2s;
  touch-action: manipulation;
  min-height: 42px;

  &:hover {
    background: var(--brand-gradient-dark);
    box-shadow: 0 6px 16px rgba(123, 47, 190, 0.4);
    transform: translateY(-1px);
  }
  &:active { transform: translateY(0); }
}

/* ── Animation ── */
@keyframes slideUp {
  from { transform: scale(0.94) translateY(16px); opacity: 0; }
  to   { transform: scale(1) translateY(0); opacity: 1; }
}

.modal-enter-active, .modal-leave-active { transition: opacity 0.22s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

/* ── Mobile ── */
@media (max-width: 520px) {
  .modal-content { max-width: 95vw; }
  .product-chip { max-width: 160px; }
}

/* ── Compact height (tablet landscape) ── */
@media (max-height: 600px) {
  .modal-header { padding: 0.6rem var(--spacing-4); }
  .modal-body { padding: 0.65rem var(--spacing-4); gap: 0.6rem; }
  .modal-footer { padding: 0.6rem var(--spacing-4); }
  .addon-item { padding: 0.45rem 0.6rem; }
  .btn-cancel, .btn-confirm { min-height: 36px; }
}
</style>
