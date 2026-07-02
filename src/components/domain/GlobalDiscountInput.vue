<script setup lang="ts">
import { ref, watch } from 'vue'
import { formatRupiah } from '@/utils/formatters'
import type { Discount } from '@/types'

interface Props {
  discount: Discount
  subtotal: number
}

interface Emits {
  apply: [discount: Discount]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const showModal = ref(false)
const discountType = ref<'percentage' | 'amount'>(props.discount.type)
const discountValue = ref(props.discount.value)
const discountAmountDisplay = ref('')

const openModal = () => {
  discountType.value = props.discount.type
  discountValue.value = props.discount.value
  discountAmountDisplay.value = discountType.value === 'amount' && discountValue.value
    ? formatRupiah(discountValue.value)
    : ''
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const handleDiscountAmountInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const rawValue = input.value.replace(/\D/g, '')
  discountValue.value = rawValue ? parseInt(rawValue, 10) : 0
  discountAmountDisplay.value = rawValue ? formatRupiah(parseInt(rawValue, 10)) : ''
}

watch(discountType, (type) => {
  if (type === 'amount') {
    discountAmountDisplay.value = discountValue.value ? formatRupiah(discountValue.value) : ''
  } else {
    discountAmountDisplay.value = ''
    if (discountValue.value > 100) discountValue.value = 0
  }
})

const handleApply = () => {
  emit('apply', {
    type: discountType.value,
    value: discountValue.value || 0,
  })
  closeModal()
}

const handleClear = () => {
  emit('apply', { type: 'percentage', value: 0 })
  closeModal()
}
</script>

<template>
  <!-- Chip Trigger -->
  <button class="discount-chip" @click="openModal">
    <span class="chip-icon">💸</span>
    <span class="chip-label">Disc Global</span>
    <span v-if="discount.value > 0" class="chip-value">
      {{ discount.type === 'percentage' ? discount.value + '%' : 'Rp' + discount.value.toLocaleString() }}
    </span>
    <span v-else class="chip-empty">—</span>
    <button
      v-if="discount.value > 0"
      class="chip-clear"
      @click.stop="handleClear"
    >
      <AppIcon name="x" :size="12" />
    </button>
  </button>

  <!-- Modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
        <div class="modal-card">
          <!-- Header -->
          <div class="modal-header">
            <span class="modal-title">💸 Diskon Global</span>
            <button class="btn-close" @click="closeModal">
              <AppIcon name="x" :size="18" />
            </button>
          </div>

          <!-- Body -->
          <div class="modal-body">
            <!-- Type toggle -->
            <div class="type-row">
              <label class="type-btn" :class="{ active: discountType === 'percentage' }">
                <input v-model="discountType" type="radio" value="percentage" />
                <span>% Persen</span>
              </label>
              <label class="type-btn" :class="{ active: discountType === 'amount' }">
                <input v-model="discountType" type="radio" value="amount" />
                <span>Rp Nominal</span>
              </label>
            </div>

            <!-- Input -->
            <div class="input-row">
              <span class="input-prefix">{{ discountType === 'percentage' ? '%' : 'Rp' }}</span>
              <input
                v-if="discountType === 'percentage'"
                v-model.number="discountValue"
                type="text"
                inputmode="numeric"
                class="discount-input"
                placeholder="0 – 100"
                :max="100"
                min="0"
                @keyup.enter="handleApply"
              />
              <input
                v-else
                :value="discountAmountDisplay"
                type="text"
                class="discount-input"
                placeholder="0"
                @input="handleDiscountAmountInput"
                @keyup.enter="handleApply"
              />
            </div>

            <!-- Preview -->
            <div v-if="discountValue > 0" class="preview-row">
              <span class="preview-label">Potongan</span>
              <span class="preview-value">
                <template v-if="discountType === 'percentage'">
                  {{ formatRupiah(Math.round(props.subtotal * discountValue / 100)) }}
                </template>
                <template v-else>
                  {{ formatRupiah(discountValue) }}
                </template>
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="modal-actions">
            <button class="btn-clear-all" @click="handleClear">Hapus Diskon</button>
            <button class="btn-apply" @click="handleApply">Terapkan</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Chip Trigger */
.discount-chip {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.6rem;
  background: rgba(255, 251, 235, 0.5);
  border: 1px solid rgba(245, 158, 11, 0.15);
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
  font-size: 0.75rem;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;

  @media (hover: hover) {
    &:hover {
      background: rgba(255, 251, 235, 0.8);
      border-color: rgba(245, 158, 11, 0.3);
    }
  }
}

.chip-icon { font-size: 0.9rem; opacity: 0.8; }

.chip-label {
  font-weight: 600;
  color: var(--color-text-secondary);
  font-size: 0.7rem;
  letter-spacing: 0.02em;
}

.chip-value {
  margin-left: auto;
  font-weight: 700;
  color: #d97706;
  font-size: 0.8rem;
}

.chip-empty {
  margin-left: auto;
  color: var(--color-text-hint);
  font-size: 0.75rem;
}

.chip-clear {
  background: none;
  border: none;
  color: #dc2626;
  cursor: pointer;
  padding: 0 0.25rem;
  opacity: 0.7;
  transition: opacity 0.15s ease;
  -webkit-tap-highlight-color: transparent;

  @media (hover: hover) {
    &:hover { opacity: 1; }
  }
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.modal-card {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 360px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  animation: modalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem 0.75rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.modal-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.btn-close {
  background: rgba(0, 0, 0, 0.06);
  border: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  -webkit-tap-highlight-color: transparent;
}

.modal-body {
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

/* Type toggle */
.type-row {
  display: flex;
  gap: 0.5rem;
}

.type-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.6rem 0.75rem;
  border: 1.5px solid rgba(245, 158, 11, 0.2);
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
  -webkit-tap-highlight-color: transparent;

  input { display: none; }

  &.active {
    border-color: #f59e0b;
    background: rgba(245, 158, 11, 0.08);
    color: #d97706;
  }
}

/* Input */
.input-row {
  display: flex;
  align-items: center;
  border: 1.5px solid rgba(245, 158, 11, 0.25);
  border-radius: 10px;
  overflow: hidden;
  transition: border-color 0.15s ease;

  &:focus-within {
    border-color: #f59e0b;
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.12);
  }
}

.input-prefix {
  padding: 0 0.75rem;
  font-size: 0.9rem;
  font-weight: 700;
  color: #d97706;
  background: rgba(245, 158, 11, 0.06);
  border-right: 1px solid rgba(245, 158, 11, 0.15);
  height: 100%;
  display: flex;
  align-items: center;
  align-self: stretch;
}

.discount-input {
  flex: 1;
  padding: 0.65rem 0.75rem;
  border: none;
  outline: none;
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text-primary);
  text-align: right;
  background: transparent;

  &::placeholder {
    color: var(--color-text-hint);
    font-weight: 400;
  }
}

/* Preview */
.preview-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  background: rgba(245, 158, 11, 0.06);
  border-radius: 8px;
  border: 1px solid rgba(245, 158, 11, 0.15);
}

.preview-label {
  font-size: 0.72rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.preview-value {
  font-size: 0.85rem;
  font-weight: 700;
  color: #d97706;
}

/* Actions */
.modal-actions {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem 1.25rem;
}

.btn-clear-all {
  flex: 1;
  padding: 0.65rem;
  border: 1.5px solid rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  background: white;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background-color 0.15s ease;

  @media (hover: hover) {
    &:hover { background: #f9fafb; }
  }
}

.btn-apply {
  flex: 2;
  padding: 0.65rem;
  border: none;
  border-radius: 10px;
  background: #f59e0b;
  color: white;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background-color 0.15s ease;

  @media (hover: hover) {
    &:hover { background: #d97706; }
  }
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

@keyframes modalSlideIn {
  from { transform: scale(0.95) translateY(10px); opacity: 0; }
  to   { transform: scale(1) translateY(0);        opacity: 1; }
}
</style>
