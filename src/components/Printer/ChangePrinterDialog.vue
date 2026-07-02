<script setup lang="ts">
import { ref, computed } from 'vue'

interface Printer {
  id: string
  name: string
  status: 'connected' | 'disconnected' | 'error'
  paperSize: string
  printerType: string
}

interface Props {
  isOpen: boolean
  currentPrinterId?: string
}

interface Emits {
  (e: 'select', printer: Printer): void
  (e: 'close'): void
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: false,
  currentPrinterId: undefined
})

const emit = defineEmits<Emits>()

// Sample printer data (Phase 2: will be replaced with API)
const availablePrinters = ref<Printer[]>([
  {
    id: '1',
    name: 'EPSON TM-T82',
    status: 'connected',
    paperSize: '80mm',
    printerType: 'Receipt'
  },
  {
    id: '2',
    name: 'XPRINTER XP-58',
    status: 'connected',
    paperSize: '58mm',
    printerType: 'Barista Ticket'
  },
  {
    id: '3',
    name: 'HP LaserJet Pro',
    status: 'connected',
    paperSize: '210x297mm',
    printerType: 'A4'
  },
  {
    id: '4',
    name: 'Brother Network',
    status: 'disconnected',
    paperSize: '210x297mm',
    printerType: 'Network'
  }
])

// Local state
const selectedPrinterId = ref<string>(props.currentPrinterId || '')

// Computed
const selectedPrinter = computed(() => {
  return availablePrinters.value.find(p => p.id === selectedPrinterId.value)
})

const getStatusBadge = (status: string) => {
  return status === 'connected' ? '🟢' : status === 'disconnected' ? '🔴' : '🟡'
}

// Methods
const handleSelect = (printer: Printer) => {
  selectedPrinterId.value = printer.id
}

const handleConfirm = () => {
  if (selectedPrinter.value) {
    emit('select', selectedPrinter.value)
  }
}

const handleCancel = () => {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="isOpen" class="dialog-overlay" @click="handleCancel">
        <div class="dialog-content" @click.stop>
          <!-- Dialog Header -->
          <div class="dialog-header">
            <h2 class="dialog-title">Pilih Printer</h2>
            <button class="close-button" @click="handleCancel"><AppIcon name="x" :size="16" /></button>
          </div>

          <!-- Dialog Divider -->
          <div class="dialog-divider"></div>

          <!-- Printers List -->
          <div class="printers-list">
            <div
              v-for="printer in availablePrinters"
              :key="printer.id"
              :class="['printer-item', { 'is-selected': selectedPrinterId === printer.id }]"
              @click="handleSelect(printer)"
            >
              <!-- Selection Checkbox -->
              <div class="selection-checkbox">
                <input
                  type="radio"
                  :id="`printer-${printer.id}`"
                  :value="printer.id"
                  v-model="selectedPrinterId"
                  class="radio-input"
                />
              </div>

              <!-- Printer Info -->
              <div class="printer-info">
                <div class="printer-name">
                  🖨 {{ printer.name }}
                </div>
                <div class="printer-details">
                  <span class="status-badge">
                    {{ getStatusBadge(printer.status) }} {{ printer.status === 'connected' ? 'Connected' : 'Disconnected' }}
                  </span>
                  <span class="printer-type">{{ printer.printerType }}</span>
                  <span class="paper-size">{{ printer.paperSize }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Dialog Divider -->
          <div class="dialog-divider"></div>

          <!-- Dialog Actions -->
          <div class="dialog-actions">
            <button class="btn-cancel" @click="handleCancel">
              Batal
            </button>
            <button
              class="btn-confirm"
              :disabled="!selectedPrinter"
              @click="handleConfirm"
            >
              Pilih
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1500;
  animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.dialog-content {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 500px;
  max-height: 80dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Dialog Header */
.dialog-header {
  padding: var(--spacing-4);
  border-bottom: 1px solid rgba(123, 47, 190, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.dialog-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: var(--color-text-primary);
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
}

/* Dialog Divider */
.dialog-divider {
  height: 1px;
  background: rgba(123, 47, 190, 0.1);
}

/* Printers List */
.printers-list {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  padding: var(--spacing-2);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);

  /* Scrollbar styling */
  scrollbar-width: thin;
  scrollbar-color: rgba(123, 47, 190, 0.2) transparent;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(123, 47, 190, 0.2);
    border-radius: 4px;

    &:hover {
      background: rgba(123, 47, 190, 0.3);
    }
  }
}

/* Printer Item */
.printer-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3);
  border: 1px solid rgba(123, 47, 190, 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  background: rgba(255, 255, 255, 0.5);

  &:hover {
    background: rgba(123, 47, 190, 0.03);
    border-color: rgba(123, 47, 190, 0.2);
  }

  &.is-selected {
    background: linear-gradient(135deg, rgba(123, 47, 190, 0.08) 0%, rgba(52, 211, 153, 0.04) 100%);
    border-color: rgba(123, 47, 190, 0.3);
    box-shadow: 0 4px 12px rgba(123, 47, 190, 0.1);
  }
}

/* Selection Checkbox */
.selection-checkbox {
  flex-shrink: 0;
}

.radio-input {
  cursor: pointer;
  width: 20px;
  height: 20px;
  accent-color: var(--color-primary);
}

/* Printer Info */
.printer-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

.printer-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  word-break: break-word;
}

.printer-details {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-weight: 500;
  padding: 0.2rem 0.6rem;
  background: rgba(123, 47, 190, 0.1);
  border-radius: 4px;
}

.printer-type {
  padding: 0.2rem 0.6rem;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 4px;
  font-weight: 500;
  color: #1e40af;
}

.paper-size {
  padding: 0.2rem 0.6rem;
  background: rgba(245, 158, 11, 0.1);
  border-radius: 4px;
  font-weight: 500;
  color: #92400e;
}

/* Dialog Actions */
.dialog-actions {
  padding: var(--spacing-4);
  border-top: 1px solid rgba(123, 47, 190, 0.08);
  display: flex;
  gap: var(--spacing-3);
  justify-content: flex-end;
  flex-shrink: 0;
}

.btn-cancel,
.btn-confirm {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 44px;
}

.btn-cancel {
  background: rgba(123, 47, 190, 0.08);
  color: var(--color-text-secondary);
  border: 1px solid rgba(123, 47, 190, 0.1);

  &:hover {
    background: rgba(123, 47, 190, 0.12);
    border-color: rgba(123, 47, 190, 0.2);
  }

  &:active {
    transform: scale(0.98);
  }
}

.btn-confirm {
  background: linear-gradient(135deg, rgba(123, 47, 190, 0.15) 0%, rgba(52, 211, 153, 0.08) 100%);
  color: var(--color-primary-700);
  border: 1px solid rgba(123, 47, 190, 0.2);

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(123, 47, 190, 0.2) 0%, rgba(52, 211, 153, 0.12) 100%);
    box-shadow: 0 4px 12px rgba(123, 47, 190, 0.15);
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

/* Animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(40px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Responsive */
@media (max-width: 768px) {
  .dialog-content {
    width: 95%;
    max-height: 90dvh;
  }

  .dialog-header {
    padding: var(--spacing-3);
  }

  .dialog-title {
    font-size: 1.1rem;
  }

  .printers-list {
    padding: var(--spacing-2);
  }

  .printer-item {
    padding: var(--spacing-2);
  }

  .printer-name {
    font-size: 0.95rem;
  }

  .printer-details {
    font-size: 0.8rem;
    gap: 0.5rem;
  }

  .dialog-actions {
    padding: var(--spacing-3);
    gap: var(--spacing-2);
  }

  .btn-cancel,
  .btn-confirm {
    flex: 1;
    padding: 0.65rem 1rem;
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .dialog-content {
    width: 98%;
  }

  .dialog-header {
    padding: var(--spacing-2);
  }

  .dialog-title {
    font-size: 1rem;
  }

  .close-button {
    width: 28px;
    height: 28px;
    font-size: 1.3rem;
  }

  .printer-item {
    gap: var(--spacing-2);
  }

  .printer-name {
    font-size: 0.9rem;
  }

  .printer-details {
    font-size: 0.75rem;
  }
}
</style>
