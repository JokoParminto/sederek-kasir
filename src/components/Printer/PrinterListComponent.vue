<script setup lang="ts">
import { ref } from 'vue'
import { printerApi, type Printer } from '@/services/api/printer/printer.api'
import PrinterStatusBadge from './PrinterStatusBadge.vue'
import PrinterTypeIcon from './PrinterTypeIcon.vue'

interface Props {
  printers: Printer[]
}

defineProps<Props>()

const emit = defineEmits<{
  edit: [printer: Printer]
  delete: [printerId: string]
  error: [error: string]
}>()

const loadingDelete = ref<string | null>(null)
const confirmDeleteId = ref<string | null>(null)

const handleEdit = (printer: Printer) => {
  emit('edit', printer)
}

const confirmDelete = (printerId: string) => {
  confirmDeleteId.value = printerId
}

const cancelDelete = () => {
  confirmDeleteId.value = null
}

const handleDelete = async (printerId: string) => {
  try {
    loadingDelete.value = printerId
    await printerApi.deletePrinter(printerId)
    emit('delete', printerId)
    confirmDeleteId.value = null
  } catch (error: any) {
    emit('error', error?.response?.data?.message || 'Gagal menghapus printer')
  } finally {
    loadingDelete.value = null
  }
}

const handleTestPrint = async (printerId: string) => {
  try {
    await printerApi.createPrintJob({
      printer_id: printerId,
      job_type: 'test',
      content: { test: 'print' },
      status: 'pending',
      retry_count: 0
    })
    emit('error', 'Test print berhasil dikirim')
  } catch (error: any) {
    emit('error', error?.response?.data?.message || 'Gagal mengirim test print')
  }
}
</script>

<template>
  <div class="printer-list">
    <div v-if="printers.length === 0" class="empty-state">
      <AppIcon name="printer" :size="40" class="empty-icon" />
      <p class="empty-text">Belum ada printer</p>
      <p class="empty-hint">Tambahkan printer baru untuk memulai</p>
    </div>

    <div v-else class="printer-grid">
      <div v-for="printer in printers" :key="printer.id" class="printer-card">
        <!-- Card Header -->
        <div class="card-header">
          <div class="printer-info-header">
            <PrinterTypeIcon :type="printer.printer_type" />
            <div class="printer-name-section">
              <h3 class="printer-name">{{ printer.name }}</h3>
              <p class="printer-description">{{ printer.description || 'No description' }}</p>
            </div>
          </div>
          <PrinterStatusBadge :status="printer.status" />
        </div>

        <!-- Card Body -->
        <div class="card-body">
          <div class="info-row">
            <span class="info-label">Type:</span>
            <span class="info-value">{{ printer.printer_type }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Connection:</span>
            <span class="info-value">
              <span v-if="printer.connection_type === 'network'">
                <AppIcon name="wifi" :size="13" /> {{ printer.ip_address }}:{{ printer.port_number }}
              </span>
              <span v-else-if="printer.connection_type === 'usb'">
                <AppIcon name="usb" :size="13" /> {{ printer.device_path || 'USB Device' }}
              </span>
              <span v-else>
                <AppIcon name="bluetooth" :size="13" /> {{ printer.connection_type }}
              </span>
            </span>
          </div>
          <div class="info-row">
            <span class="info-label">Paper:</span>
            <span class="info-value">
              {{ printer.paper_width }}cm × {{ printer.paper_height }}cm @ {{ printer.dpi }}DPI
            </span>
          </div>
          <div class="info-row">
            <span class="info-label">Settings:</span>
            <span class="info-value">
              <span v-if="printer.is_default" class="badge badge-default">Default</span>
              <span v-if="printer.auto_print" class="badge badge-auto">Auto Print</span>
            </span>
          </div>
        </div>

        <!-- Card Footer - Actions -->
        <div class="card-footer">
          <button
            class="btn-action btn-test"
            @click="handleTestPrint(printer.id)"
            title="Test print"
          >
            <AppIcon name="printer" :size="14" /> Test Print
          </button>
          <button
            class="btn-action btn-edit"
            @click="handleEdit(printer)"
            title="Edit printer"
          >
            <AppIcon name="edit" :size="14" /> Edit
          </button>
          <button
            class="btn-action btn-delete"
            @click="confirmDelete(printer.id)"
            title="Delete printer"
          >
            <AppIcon name="trash" :size="14" /> Delete
          </button>
        </div>

        <!-- Delete Confirmation -->
        <div v-if="confirmDeleteId === printer.id" class="confirm-delete-overlay">
          <div class="confirm-delete-box">
            <p class="confirm-text">Hapus printer "{{ printer.name }}"?</p>
            <div class="confirm-buttons">
              <button
                class="btn-confirm-cancel"
                @click="cancelDelete"
                :disabled="loadingDelete === printer.id"
              >
                Batal
              </button>
              <button
                class="btn-confirm-delete"
                @click="handleDelete(printer.id)"
                :disabled="loadingDelete === printer.id"
              >
                <AppIcon v-if="loadingDelete === printer.id" name="loader" :size="13" :spin="true" />
                {{ loadingDelete === printer.id ? 'Deleting...' : 'Hapus' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.printer-list {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-secondary);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: var(--spacing-3);
  opacity: 0.5;
}

.empty-text {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: var(--spacing-2);
}

.empty-hint {
  font-size: 0.9rem;
  opacity: 0.7;
}

.printer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--spacing-3);
  padding: var(--spacing-3);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

.printer-card {
  background: white;
  border-radius: 12px;
  border: 1px solid rgba(123, 47, 190, 0.12);
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  position: relative;

  &:hover {
    box-shadow: 0 8px 24px rgba(123, 47, 190, 0.12);
    transform: translateY(-4px);
    border-color: rgba(123, 47, 190, 0.2);
  }
}

.card-header {
  padding: var(--spacing-3);
  border-bottom: 1px solid rgba(123, 47, 190, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-2);
}

.printer-info-header {
  display: flex;
  gap: var(--spacing-2);
  flex: 1;
  min-width: 0;
}

.printer-name-section {
  flex: 1;
  min-width: 0;
}

.printer-name {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text-primary);
  word-break: break-word;
}

.printer-description {
  margin: 0;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-top: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-body {
  padding: var(--spacing-3);
  flex: 1;
}

.info-row {
  display: flex;
  justify-content: space-between;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-2);
  font-size: 0.85rem;

  &:last-child {
    margin-bottom: 0;
  }
}

.info-label {
  font-weight: 600;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.info-value {
  color: var(--color-text-primary);
  text-align: right;
  flex: 1;
  word-break: break-word;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-right: 0.5rem;

  &.badge-default {
    background: rgba(123, 47, 190, 0.15);
    color: var(--color-primary-700);
  }

  &.badge-auto {
    background: rgba(59, 130, 246, 0.15);
    color: #1e40af;
  }
}

.card-footer {
  padding: var(--spacing-3);
  border-top: 1px solid rgba(123, 47, 190, 0.08);
  display: flex;
  gap: var(--spacing-2);
}



.confirm-delete-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  z-index: 100;
  animation: fadeIn 0.2s;
}

.confirm-delete-box {
  background: white;
  padding: var(--spacing-3);
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  text-align: center;
}

.confirm-text {
  margin: 0 0 var(--spacing-3) 0;
  font-weight: 600;
  color: var(--color-text-primary);
}

.confirm-buttons {
  display: flex;
  gap: var(--spacing-2);
}



@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Responsive */
@media (max-width: 768px) {
  .printer-grid {
    grid-template-columns: 1fr;
    padding: var(--spacing-2);
    gap: var(--spacing-2);
  }

  .card-header {
    flex-direction: column;
  }

  .printer-info-header {
    width: 100%;
  }

  .card-footer {
    flex-direction: column;
  }


}

@media (max-width: 1024px) {
  .printer-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
}
</style>
