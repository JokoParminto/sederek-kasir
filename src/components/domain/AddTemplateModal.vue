<script setup lang="ts">
import { ref, watch } from 'vue'

interface FormData {
  type: 'customer' | 'barista'
  templateName: string
  paperSize: '58mm' | '80mm' | '100mm'
  autoPrint: number
  copies: number
}

interface Props {
  isOpen: boolean
}

interface Emits {
  save: [config: FormData]
  close: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Form state with default values
const formData = ref<FormData>({
  type: 'customer',
  templateName: '',
  paperSize: '80mm',
  autoPrint: 0,
  copies: 1
})

const formError = ref('')

// Reset form when modal opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    formData.value = {
      type: 'customer',
      templateName: '',
      paperSize: '80mm',
      autoPrint: 0,
      copies: 1
    }
    formError.value = ''
  }
})

// Handle close
const handleClose = () => {
  emit('close')
}

// Handle save with validation
const handleSave = () => {
  formError.value = ''

  // Validation
  if (!formData.value.templateName.trim()) {
    formError.value = 'Nama template harus diisi'
    return
  }

  if (!formData.value.type) {
    formError.value = 'Pilih jenis struk terlebih dahulu'
    return
  }

  if (formData.value.autoPrint < 0 || formData.value.autoPrint > 60) {
    formError.value = 'Auto print harus antara 0-60 detik'
    return
  }

  if (formData.value.copies < 1 || formData.value.copies > 99) {
    formError.value = 'Jumlah salinan harus antara 1-99'
    return
  }

  // Emit save event
  emit('save', { ...formData.value })
  
  // Close modal after save
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="sheet-overlay" @click.self="handleClose">
      <div class="add-template-sheet">
        <!-- Header -->
        <div class="form-header">
          <h2>Buat Template Baru</h2>
          <button class="btn-close" @click="handleClose"><AppIcon name="x" :size="16" /></button>
        </div>

        <!-- Body (scrollable) -->
        <form @submit.prevent="handleSave" class="form-body">
          <!-- Error Message -->
          <div v-if="formError" class="form-error-message">
            <AppIcon name="warning" :size="14" /> {{ formError }}
          </div>

          <!-- 1. Type Receipt (Radio) -->
          <div class="form-group">
            <label class="form-label">Jenis Struk</label>
            <div class="radio-options">
              <label class="radio-label">
                <input v-model="formData.type" type="radio" value="customer" />
                <span>Customer Receipt</span>
              </label>
              <label class="radio-label">
                <input v-model="formData.type" type="radio" value="barista" />
                <span>Barista Ticket</span>
              </label>
            </div>
          </div>

          <!-- 2. Template Name (Text Input) -->
          <div class="form-group">
            <label class="form-label">Nama Template</label>
            <input
              v-model="formData.templateName"
              type="text"
              class="form-input"
              placeholder="Contoh: Template Standard"
              required
            />
          </div>

          <!-- 3. Paper Size (Dropdown) -->
          <div class="form-group">
            <label class="form-label">Ukuran Kertas</label>
            <select v-model="formData.paperSize" class="form-input form-select">
              <option value="58mm">58mm</option>
              <option value="80mm">80mm</option>
              <option value="100mm">100mm</option>
            </select>
          </div>

          <!-- 4. Auto Print (Number Input) -->
          <div class="form-group">
            <label class="form-label">Auto Print (detik)</label>
            <input
              v-model.number="formData.autoPrint"
              type="text" inputmode="numeric"
              min="0"
              max="60"
              class="form-input"
              placeholder="0"
            />
          </div>

          <!-- 5. Copies (Number Input) -->
          <div class="form-group">
            <label class="form-label">Jumlah Salinan</label>
            <input
              v-model.number="formData.copies"
              type="text" inputmode="numeric"
              min="1"
              max="99"
              class="form-input"
              placeholder="1"
            />
          </div>
        </form>

        <!-- Footer -->
        <div class="form-footer">
          <button type="button" class="btn-cancel" @click="handleClose">
            Batal
          </button>
          <button type="button" class="btn-submit" @click="handleSave">
            Simpan
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Sheet Overlay - Backdrop */
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1500;
  padding: 0;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Sheet Content */
.add-template-sheet {
  background: white;
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.15);
  border: none;
  width: 100%;
  max-width: 100%;
  height: auto;
  max-height: 90dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  -webkit-overflow-scrolling: touch;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Header */
.form-header {
  padding: 1rem;
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

/* Close Button */
.btn-close {
  background: rgba(239, 68, 68, 0.1);
  border: none;
  min-width: 44px;
  min-height: 44px;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  font-size: 1.2rem;
  cursor: pointer;
  color: #dc2626;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  flex-shrink: 0;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
}

/* Body */
.form-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Error Message */
.form-error-message {
  padding: 0.75rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #dc2626;
  font-size: 0.8rem;
  font-weight: 600;
}

/* Form Group */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

/* Form Label */
.form-label {
  font-weight: 600;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  letter-spacing: 0.01em;
}

/* Form Input */
.form-input {
  padding: 0.65rem 0.85rem;
  border: 1px solid rgba(123, 47, 190, 0.15);
  border-radius: 10px;
  font-size: 0.85rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: white;
  font-family: inherit;
  color: var(--color-text-primary);

  &:focus {
    outline: none;
    border-color: var(--brand-primary);
    background: rgba(240, 253, 244, 0.5);
    box-shadow: 0 4px 12px rgba(123, 47, 190, 0.1);
  }

  &::placeholder {
    color: var(--color-text-hint);
  }
}

/* Dropdown Select */
.form-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2310b981' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.85rem center;
  padding-right: 2.5rem;
  cursor: pointer;
}

/* Radio Options */
.radio-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Radio Label */
.radio-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--color-text-primary);
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  border: 1px solid transparent;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: transparent;

  input[type="radio"] {
    cursor: pointer;
    width: 20px;
    height: 20px;
    margin: 0;
    appearance: none;
    border: 2px solid #cbd5e1;
    border-radius: 50%;
    background: white;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      border-color: var(--brand-primary);
      box-shadow: 0 0 0 3px rgba(123, 47, 190, 0.1);
    }

    &:checked {
      border-color: var(--brand-primary);
      background: var(--brand-primary);
      box-shadow: inset 0 0 0 3px white;
    }
  }

  &:hover {
    background: rgba(123, 47, 190, 0.05);
    border-color: rgba(123, 47, 190, 0.15);
  }

  /* Highlight parent label ketika radio di-select */
  &:has(input[type="radio"]:checked) {
    background: rgba(123, 47, 190, 0.15);
    border-color: rgba(123, 47, 190, 0.3);
    font-weight: 500;
  }
}

/* Footer */
.form-footer {
  position: sticky;
  bottom: 0;
  padding: 1.5rem;
  border-top: 1px solid rgba(123, 47, 190, 0.08);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  flex-shrink: 0;
  background: white;
  z-index: 10;
}

/* Cancel Button */
.btn-cancel {
  flex: 1;
  padding: 0.65rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.05);
  color: var(--color-text-secondary);
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 0.01em;

  &:hover {
    background: rgba(0, 0, 0, 0.08);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
}

/* Submit Button */
.btn-submit {
  flex: 1.5;
  padding: 0.65rem;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  color: white;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 16px rgba(123, 47, 190, 0.3);
  letter-spacing: 0.01em;

  &:hover {
    background: linear-gradient(135deg, var(--brand-primary-dark) 0%, var(--brand-primary-darker) 100%);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(123, 47, 190, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
}

/* Responsive - Mobile */
@media (max-width: 767px) {
  .form-header {
    padding: 0.75rem;

    h2 {
      font-size: 0.9rem;
    }
  }

  .btn-close {
    width: 32px;
    height: 32px;
    font-size: 1rem;
  }

  .form-body {
    padding: 0.75rem;
    gap: 1.25rem;
  }

  .form-footer {
    padding: 1rem;
    gap: 0.5rem;
  }

  .form-label {
    font-size: 0.7rem;
  }

  .form-input {
    padding: 0.6rem 0.75rem;
    font-size: 0.8rem;
  }

  .radio-label {
    font-size: 0.8rem;
    padding: 0.5rem 0.6rem;
  }

  .btn-cancel,
  .btn-submit {
    padding: 0.6rem;
    font-size: 0.75rem;
  }
}
</style>
