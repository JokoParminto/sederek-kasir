<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click="handleBackdropClick">
        <div class="modal-content" @click.stop>
          <!-- Header -->
          <div class="modal-header">
            <h2>Tambah Add-on untuk {{ productName }}</h2>
            <button class="btn-close" @click="$emit('close')"><AppIcon name="x" :size="16" /></button>
          </div>

          <!-- Body -->
          <div class="modal-body">
            <!-- Search & Quick Select -->
            <div class="search-addon">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Cari add-on..."
                class="search-input"
              />
              <button class="btn-quick-select" @click="selectAllAddOns" title="Pilih Semua">
                ✓ Semua
              </button>
              <button class="btn-quick-deselect" @click="deselectAllAddOns" title="Batal Semua">
                <AppIcon name="x" :size="13" /> Batal
              </button>
            </div>

            <!-- Add-ons List -->
            <div class="addons-list">
              <div v-if="filteredAddOns.length === 0" class="no-addons">
                Tidak ada add-on yang tersedia
              </div>

              <div v-else class="addon-items">
                <div v-for="addOn in filteredAddOns" :key="addOn.id" class="addon-item">
                  <div class="addon-checkbox-group">
                    <input
                      :id="`addon-${addOn.id}`"
                      type="checkbox"
                      :checked="isAddOnSelected(addOn.id)"
                      @change="toggleAddOn(addOn)"
                      class="addon-checkbox"
                    />
                    <label :for="`addon-${addOn.id}`" class="addon-label">
                      <span class="addon-name">{{ addOn.name }}</span>
                      <span class="addon-price">{{ formatRupiah(addOn.price) }}</span>
                    </label>
                  </div>

                  <!-- Quantity Selector -->
                  <div v-if="isAddOnSelected(addOn.id)" class="qty-selector">
                    <button class="btn-qty-minus" @click="decreaseAddOnQty(addOn.id)">−</button>
                    <input
                      type="text"
                      class="qty-input"
                      :value="getAddOnQty(addOn.id)"
                      @change="handleAddOnQtyChange(addOn.id, $event)"
                      readonly
                    />
                    <button class="btn-qty-plus" @click="increaseAddOnQty(addOn.id)">+</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Total Add-ons Summary (Fixed) -->
          <div class="addons-summary">
            <div class="summary-row">
              <span class="label">Total Add-on:</span>
              <span class="price">{{ formatRupiah(totalAddOnsPrice) }}</span>
            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button class="btn-cancel" @click="$emit('close')">
              Batal
            </button>
            <button class="btn-confirm" @click="handleConfirm">
              Simpan Add-on
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { formatRupiah } from '@/utils/formatters'
import { useAddOnStore } from '@/stores/addOn'
import type { AddOn } from '@/types'
import type { CartItemAddOn } from '@/types/transaction'
import { useModal } from '@/composables/useModal'

interface Props {
  isOpen: boolean
  productName: string
  itemId: string
  currentAddOns?: CartItemAddOn[]
}

interface Emits {
  close: []
  confirm: [addOns: CartItemAddOn[]]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const addOnStore = useAddOnStore()

// Local state
const selectedAddOns = ref<Map<string, number>>(new Map())
const searchQuery = ref('')

// Fetch add-ons on component mount
onMounted(async () => {

  await addOnStore.fetchAddOns()

})

const availableAddOns = computed(() => addOnStore.activeAddOns)

const filteredAddOns = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  if (!query) {
    return availableAddOns.value
  }
  return availableAddOns.value.filter(addOn =>
    addOn.name.toLowerCase().includes(query)
  )
})

const totalAddOnsPrice = computed(() => {
  let total = 0
  selectedAddOns.value.forEach((qty, addOnId) => {
    const addOn = addOnStore.getAddOnById(addOnId)
    if (addOn) {
      total += addOn.price * qty
    }
  })
  return total
})

const isAddOnSelected = (addOnId: string): boolean => {
  return selectedAddOns.value.has(addOnId)
}

const getAddOnQty = (addOnId: string): number => {
  return selectedAddOns.value.get(addOnId) || 0
}

const toggleAddOn = (addOn: AddOn) => {
  if (selectedAddOns.value.has(addOn.id)) {
    selectedAddOns.value.delete(addOn.id)
  } else {
    selectedAddOns.value.set(addOn.id, 1)
  }
}

const increaseAddOnQty = (addOnId: string) => {
  const current = selectedAddOns.value.get(addOnId) || 0
  selectedAddOns.value.set(addOnId, current + 1)
}

const decreaseAddOnQty = (addOnId: string) => {
  const current = selectedAddOns.value.get(addOnId) || 0
  if (current > 1) {
    selectedAddOns.value.set(addOnId, current - 1)
  }
}

const handleAddOnQtyChange = (addOnId: string, event: Event) => {
  const target = event.target as HTMLInputElement
  const qty = parseInt(target.value, 10)
  if (qty > 0) {
    selectedAddOns.value.set(addOnId, qty)
  }
}

const handleConfirm = () => {
  const addOns: CartItemAddOn[] = []
  selectedAddOns.value.forEach((qty, addOnId) => {
    const addOn = addOnStore.getAddOnById(addOnId)
    if (addOn) {
      const subtotal = addOn.price * qty
      addOns.push({
        id: addOn.id,
        addOnId: addOn.id,
        addOnName: addOn.name,
        price: addOn.price,
        quantity: qty,
        subtotal: subtotal,
      })
    }
  })


  emit('confirm', addOns)
}

const { handleBackdropClick } = useModal(() => emit('close'))

const selectAllAddOns = () => {
  filteredAddOns.value.forEach(addOn => {
    if (!selectedAddOns.value.has(addOn.id)) {
      selectedAddOns.value.set(addOn.id, 1)
    }
  })
}

const deselectAllAddOns = () => {
  selectedAddOns.value.clear()
}

// Initialize with current add-ons when modal opens
watch(
  () => props.isOpen,
  async (newVal) => {
    if (newVal) {
      // Fetch add-ons if not already loaded
      if (addOnStore.activeAddOns.length === 0) {

        await addOnStore.fetchAddOns()
      }

      // Load current add-ons if any
      if (props.currentAddOns) {
        selectedAddOns.value.clear()
        props.currentAddOns.forEach(addOn => {
          selectedAddOns.value.set(addOn.addOnId, addOn.quantity)
        })
      }
    } else if (!newVal) {
      selectedAddOns.value.clear()
      searchQuery.value = ''  // Clear search when modal closes
    }
  }
)
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2001;
  padding: var(--spacing-4);
}

.modal-content {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 4px 16px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.5);
  width: 100%;
  max-width: 500px;
  height: 550px;
  max-height: 90dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  /* Responsive height untuk small screens */
  @media (max-width: 640px) {
    height: 500px;
  }
}

.modal-header {
  padding: var(--spacing-4);
  border-bottom: 1px solid rgba(123, 47, 190, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;

  h2 {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--color-text-primary);
  }
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: color 0.3s;

  &:hover {
    color: var(--color-text-primary);
  }
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  padding: var(--spacing-4);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
  min-height: 0;  /* Allow flex item to shrink below content size */
}

.search-addon {
  display: flex;
  gap: var(--spacing-2);
  align-items: center;
}

.search-input {
  flex: 1;
  padding: var(--spacing-2) var(--spacing-3);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.85rem;
  background: white;
  color: var(--color-text-primary);
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(123, 47, 190, 0.1);
  }

  &::placeholder {
    color: var(--color-text-secondary);
  }
}

.btn-quick-select,
.btn-quick-deselect {
  padding: var(--spacing-2) var(--spacing-3);
  border: 1px solid rgba(123, 47, 190, 0.3);
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-quick-select {
  background: rgba(123, 47, 190, 0.1);
  color: var(--color-primary);
  border-color: rgba(123, 47, 190, 0.3);

  &:hover {
    background: rgba(123, 47, 190, 0.15);
    border-color: rgba(123, 47, 190, 0.5);
  }

  &:active {
    transform: scale(0.98);
  }
}

.btn-quick-deselect {
  background: rgba(239, 68, 68, 0.05);
  color: #dc2626;
  border-color: rgba(239, 68, 68, 0.2);

  &:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
  }

  &:active {
    transform: scale(0.98);
  }
}

.addons-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.no-addons {
  text-align: center;
  padding: var(--spacing-8) var(--spacing-4);
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}

.addon-items {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  max-height: 300px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  padding-right: var(--spacing-2);

  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(123, 47, 190, 0.05);
    border-radius: 10px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(123, 47, 190, 0.25);
    border-radius: 10px;

    &:hover {
      background: rgba(123, 47, 190, 0.4);
    }
  }
}

.addon-item {
  padding: var(--spacing-3);
  background: rgba(240, 253, 244, 0.4);
  border: 1px solid rgba(123, 47, 190, 0.1);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-3);
  transition: all 0.2s ease;

  &:hover {
    background: rgba(240, 253, 244, 0.6);
    border-color: rgba(123, 47, 190, 0.2);
  }
}

.addon-checkbox-group {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  flex: 1;
}

.addon-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--color-primary);
}

.addon-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-4);
  flex: 1;
  cursor: pointer;
  user-select: none;
}

.addon-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

.addon-price {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-primary);
  white-space: nowrap;
}

.qty-selector {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  background: white;
  border: 1px solid rgba(123, 47, 190, 0.2);
  border-radius: 6px;
  padding: var(--spacing-1);
}

.btn-qty-minus,
.btn-qty-plus {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--color-primary);
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 4px;

  &:hover {
    background: rgba(123, 47, 190, 0.1);
  }

  &:active {
    background: rgba(123, 47, 190, 0.2);
  }
}

.qty-input {
  width: 35px;
  border: none;
  background: transparent;
  text-align: center;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-primary);
  padding: 0.2rem;

  &:focus {
    outline: none;
  }
}

.addons-summary {
  background: rgba(123, 47, 190, 0.05);
  border-top: 1px solid rgba(123, 47, 190, 0.1);
  border-bottom: 1px solid rgba(123, 47, 190, 0.1);
  padding: 0.75rem 1rem;
  flex-shrink: 0;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-primary);

  .label {
    color: var(--color-text-secondary);
    font-weight: 500;
  }

  .price {
    color: var(--color-primary);
    font-size: 0.9rem;
  }
}

.modal-footer {
  position: sticky;
  bottom: 0;
  padding: 1rem;
  border-top: 1px solid rgba(123, 47, 190, 0.08);
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  flex-shrink: 0;
  background: white;
  z-index: 10;
}

.btn-cancel,
.btn-confirm {
  padding: 0.65rem 1.25rem;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 0.01em;
}

.btn-cancel {
  background: rgba(0, 0, 0, 0.05);
  color: var(--color-text-primary);
  border: 1px solid rgba(123, 47, 190, 0.1);

  &:hover {
    background: rgba(0, 0, 0, 0.08);
    border-color: rgba(123, 47, 190, 0.2);
  }

  &:active {
    transform: scale(0.98);
  }
}

.btn-confirm {
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(123, 47, 190, 0.3);

  &:hover {
    background: linear-gradient(135deg, var(--brand-primary-dark) 0%, var(--brand-primary-darker) 100%);
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(123, 47, 190, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
}

/* Animations */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-content {
  animation: modalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes modalSlideIn {
  from {
    transform: scale(0.95) translateY(10px);
    opacity: 0;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

@media (max-width: 480px) {
  .modal-content {
    max-width: 95vw;
    max-height: 85dvh;
  }

  .modal-header {
    padding: 1.2rem;

    h2 {
      font-size: 0.9rem;
    }
  }

  .modal-body {
    padding: 1.2rem;
  }

  .addon-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .addon-label {
    width: 100%;
  }

  .qty-selector {
    width: 100%;
    justify-content: center;
  }
}
</style>
