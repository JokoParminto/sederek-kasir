<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PrinterRoutingCard from '@/components/domain/PrinterRoutingCard.vue'
import PrinterConfigModal from '@/components/domain/PrinterConfigModal.vue'
import AddPrinterModal from '@/components/domain/AddPrinterModal.vue'
import ConfirmDeleteModal from '@/components/domain/ConfirmDeleteModal.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import { printerService, type UiPrinter, type FormDataPrinter } from '@/services/printer.service'
import { printerApi } from '@/services/api/printer/printer.api'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const { success: showSuccess, error: showError } = useToast()

// Loading state
const isLoading = ref(false)
const loadError = ref<string | null>(null)

// Modal state for printer config
const isConfigModalOpen = ref(false)
const selectedPrinter = ref<UiPrinter | null>(null)

const uiPrinterToFormData = (printer: UiPrinter): FormDataPrinter => ({
  type: printer.type,
  printerName: printer.printerName,
  description: printer.description,
  paperSize: printer.paperSize,
  autoPrint: printer.autoPrint,
  copies: printer.copies,
  fontSize: printer.fontSize,
  connectionType: printer.connectionType,
  ipAddress: printer.ipAddress ?? undefined,
  portNumber: printer.portNumber ?? undefined,
  devicePath: printer.devicePath ?? undefined,
})

// Modal state for add printer
const isAddPrinterModalOpen = ref(false)

// Modal state for delete confirmation
const isDeleteModalOpen = ref(false)
const printerToDelete = ref<Printer | null>(null)
const isDeleteLoading = ref(false)

// Use UiPrinter type from service (already has all needed fields)
type Printer = UiPrinter

const printers = ref<Printer[]>([])
const previewContents = ref<Record<string, any>>({})  // printer.id → preview_content

// Handlers
const handleChangePrinter = (printer: UiPrinter) => {
  selectedPrinter.value = printer
  isConfigModalOpen.value = true
}

const handleConfigSave = async (config: FormDataPrinter) => {
  if (!selectedPrinter.value) return
  const printerId = selectedPrinter.value.id  // capture before emit('close') nulls selectedPrinter

  try {
    await printerService.updatePrinter(printerId, config)

    // Update print_copies on routing (best effort, non-blocking)
    const printType = config.type === 'customer' ? 'customer_receipt' : 'barista_ticket'
    printerApi.updatePrinterRouting(printType, { print_copies: config.copies } as any).catch(() => {})

    // Re-fetch from server so local state always matches DB (device_path, ip_address, etc.)
    await loadPrinters()

    showSuccess(`${config.printerName} berhasil diperbarui`)
  } catch (error: any) {
    const errorMessage = error.response?.data?.error?.message || 'Gagal memperbarui konfigurasi printer'
    showError(errorMessage)
  }
}

const handleConfigClose = () => {
  isConfigModalOpen.value = false
  selectedPrinter.value = null
}

const handleOpenAddPrinter = () => {
  isAddPrinterModalOpen.value = true
}

const handleAddPrinterSave = (newPrinter: UiPrinter) => {
  printers.value.push(newPrinter)
}

const handleAddPrinterClose = () => {
  isAddPrinterModalOpen.value = false
}

const handleDeletePrinter = (printer: Printer) => {
  printerToDelete.value = printer
  isDeleteModalOpen.value = true
}

const handleDeleteConfirm = async () => {
  if (!printerToDelete.value) return

  isDeleteLoading.value = true
  try {
    await printerService.deletePrinter(printerToDelete.value.id)

    // Remove from local array
    printers.value = printers.value.filter(p => p.id !== printerToDelete.value?.id)

    // Close modal
    isDeleteModalOpen.value = false
    const printerName = printerToDelete.value.printerName
    printerToDelete.value = null


    
    // Show success toast
    showSuccess(`${printerName} berhasil dihapus`)
  } catch (error: any) {

    const errorMessage = error.response?.data?.error?.message || 'Gagal menghapus printer'
    showError(errorMessage)
  } finally {
    isDeleteLoading.value = false
  }
}

const handleDeleteCancel = () => {
  isDeleteModalOpen.value = false
  printerToDelete.value = null
}

const handleEditLayout = (printerId: string, type: 'customer' | 'barista') => {

  // NEW: Navigate to edit layout view with printerId as route param
  // This enables per-printer template customization
  if (type === 'customer') {
    router.push({ name: 'print-layout-receipt', params: { printerId } })
  } else if (type === 'barista') {
    router.push({ name: 'print-layout-barista', params: { printerId } })
  }
}

// Load printers + their preview content
const loadPrinters = async () => {
  isLoading.value = true
  loadError.value = null
  try {
    printers.value = await printerService.getAllPrinters()

    // Load routing data to populate print_copies on each printer (non-blocking)
    printerApi.getPrinterRouting()
      .then(res => {
        const routings: Array<any> = res.data?.data || []
        for (const routing of routings) {
          const printer = printers.value.find(p => p.id === routing.printer_id)
          if (printer && routing.print_copies != null) {
            printer.copies = routing.print_copies
          }
        }
      })
      .catch(() => {})

    // Fetch preview content for each printer (non-blocking)
    for (const printer of printers.value) {
      printerApi.getPrinterTemplate(printer.id)
        .then(res => {
          const data = res.data?.data
          if (data?.preview_content) {
            previewContents.value[printer.id] = data.preview_content
          }
        })
        .catch(() => {})
    }
  } catch (error: any) {
    const status = error.response?.status
    const msg = error.response?.data?.error?.message || error.response?.data?.message
    if (status === 401) {
      loadError.value = 'Sesi habis. Silakan login ulang.'
    } else if (status === 403) {
      loadError.value = 'Akses ditolak. Silakan logout dan login kembali untuk memperbarui izin.'
    } else if (status) {
      loadError.value = `Error ${status}: ${msg || 'Gagal memuat daftar printer'}`
    } else {
      loadError.value = msg || `Gagal terhubung ke server (${error.message || 'network error'})`
    }
    printers.value = []
  } finally {
    isLoading.value = false
  }
}

onMounted(loadPrinters)
</script>

<template>
  <div class="print-layout-view">

    <!-- Page Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Printer Management</h1>
        <p class="page-subtitle">Kelola printer dan template cetak untuk struk dan tiket barista</p>
      </div>
      <BaseButton variant="primary" size="sm" :disabled="isLoading" @click="handleOpenAddPrinter">
        + Tambah Printer
      </BaseButton>
    </div>

    <!-- Main Content -->
    <div class="page-content">
      <!-- Error -->
      <div v-if="loadError" class="error-row">
        <BaseAlert
          type="error"
          :description="loadError"
          :closable="false"
        />
        <BaseButton variant="secondary" size="sm" @click="loadPrinters">
          Coba Lagi
        </BaseButton>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Memuat data printer...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="printers.length === 0" class="empty-state">
        <AppIcon name="printer" :size="40" class="empty-icon" />
        <p class="empty-title">Belum ada printer terdaftar</p>
        <p class="empty-desc">Klik tombol <strong>+ Tambah Printer</strong> di atas untuk mendaftarkan printer pertama</p>
      </div>

      <!-- Cards Grid -->
      <div v-else class="routing-cards-grid">
        <PrinterRoutingCard
          v-for="printer in printers"
          :key="printer.id"
          :type="printer.type"
          :icon="printer.icon"
          :title="printer.title"
          :printer-name="printer.printerName"
          :status="printer.status"
          :paper-size="printer.paperSize"
          :auto-print="printer.autoPrint"
          :copies="printer.copies"
          :preview-content="previewContents[printer.id] || null"
          :connection-type="printer.connectionType"
          @change-printer="() => handleChangePrinter(printer)"
          @edit-layout="() => handleEditLayout(printer.id, printer.type)"
          @delete="() => handleDeletePrinter(printer)"
        />
      </div>
    </div>

      <!-- Printer Config Modal -->
      <PrinterConfigModal
        :is-open="isConfigModalOpen"
        :initial-data="selectedPrinter ? uiPrinterToFormData(selectedPrinter) : undefined"
        :printer-id="selectedPrinter?.id"
        @save="handleConfigSave"
        @close="handleConfigClose"
      />

     <!-- Add Printer Modal -->
     <AddPrinterModal
       :is-open="isAddPrinterModalOpen"
       @save="handleAddPrinterSave"
       @close="handleAddPrinterClose"
     />

     <!-- Delete Confirmation Modal -->
     <ConfirmDeleteModal
       :is-open="isDeleteModalOpen"
       :item-name="printerToDelete?.printerName"
       :is-loading="isDeleteLoading"
       title="Delete Printer"
       message="Are you sure you want to delete this printer? This action cannot be undone."
       @confirm="handleDeleteConfirm"
       @cancel="handleDeleteCancel"
     />

   </div>
 </template>

<style scoped>
.print-layout-view {
  padding: var(--spacing-4);
  min-height: 100vh;
  background: var(--color-bg-secondary);
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-6);
}


.page-content {
  max-width: 1000px;
}

.error-row {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-4);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 360px;
  gap: var(--spacing-3);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.loading-state p {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 360px;
  gap: var(--spacing-3);
  text-align: center;
}

.empty-icon { font-size: 3.5rem; opacity: 0.25; }

.empty-title {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.empty-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin: 0;
  max-width: 300px;
}

.routing-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: var(--spacing-4);
  align-items: start;
}

@media (max-width: 767px) {
  .routing-cards-grid { grid-template-columns: 1fr; }
}

@media (max-width: 767px) {
  .print-layout-view { padding: var(--spacing-3); }
  .page-header { flex-direction: column; align-items: flex-start; }

  .page-header {
    padding: var(--spacing-3);
    margin-bottom: var(--spacing-3);
  }

  .routing-cards-grid {
    gap: var(--spacing-3);
  }
}

</style>
