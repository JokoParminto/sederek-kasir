<script setup lang="ts">
import { ref, computed } from 'vue'
import { printerApi, type Printer } from '@/services/api/printer/printer.api'
import { bluetoothPrinter, type BTDevice } from '@/services/bluetooth-printer.service'

interface Props {
  isOpen: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  save: [printer: Printer]
  error: [error: string]
}>()

const isSubmitting = ref(false)
const formError = ref('')
const currentStep = ref<'type' | 'details'>('type')

const btDevices = ref<BTDevice[]>([])
const btScanning = ref(false)
const btError = ref('')

const scanBtDevices = async () => {
  btError.value = ''
  btScanning.value = true
  try {
    btDevices.value = await bluetoothPrinter.getPairedDevices()
    if (!btDevices.value.length) btError.value = 'Tidak ada perangkat Bluetooth yang dipasangkan. Pasangkan printer dulu di Pengaturan Android.'
  } catch (e: any) {
    btError.value = e?.message || 'Gagal memindai perangkat Bluetooth'
  } finally {
    btScanning.value = false
  }
}

const selectBtDevice = (device: BTDevice) => {
  formData.value.device_path = device.address
  if (!formData.value.name.trim()) formData.value.name = device.name
}

// Step 1: Select printer type
const selectedType = ref<'receipt' | 'label' | 'a4' | 'network' | null>(null)

const printerTypeOptions = [
  { value: 'receipt', icon: 'receipt', label: 'Receipt Printer', description: 'Untuk struk dan nota' },
  { value: 'label', icon: 'tag', label: 'Label Printer', description: 'Untuk barcode & label' },
  { value: 'a4', icon: 'file-text', label: 'A4 Printer', description: 'Untuk laporan & dokumen' },
  { value: 'network', icon: 'globe', label: 'Network Printer', description: 'Printer jaringan' },
]

// Step 2: Form details
const formData = ref({
  name: '',
  description: '',
  printer_type: 'receipt' as 'receipt' | 'label' | 'a4' | 'network',
  connection_type: 'usb' as 'usb' | 'network' | 'bluetooth',
  ip_address: '',
  port_number: 9100,
  device_path: '',
  paper_width: 80,
  paper_height: 200,
  dpi: 203,
  font_size: 12,
  status: 'active' as 'active' | 'inactive' | 'offline',
  is_default: false,
  auto_print: false,
})

const connectionTypes = [
  { value: 'usb', icon: 'usb', label: 'USB' },
  { value: 'network', icon: 'wifi', label: 'Network' },
  { value: 'bluetooth', icon: 'bluetooth', label: 'Bluetooth' },
]

const defaultPaperSizes = {
  receipt: { width: 80, height: 200 },
  label: { width: 4, height: 6 },
  a4: { width: 8.5, height: 11 },
  network: { width: 8.5, height: 11 },
}

const defaultDPI = {
  receipt: 203,
  label: 300,
  a4: 600,
  network: 300,
}

const selectPrinterType = (type: 'receipt' | 'label' | 'a4' | 'network') => {
  selectedType.value = type
  formData.value.printer_type = type
  formData.value.connection_type = type === 'label' ? 'network' : 'usb'
  
  const size = defaultPaperSizes[type]
  formData.value.paper_width = size.width
  formData.value.paper_height = size.height
  formData.value.dpi = defaultDPI[type]
  
  currentStep.value = 'details'
}

const goBackToType = () => {
  currentStep.value = 'type'
  formError.value = ''
}

const validateForm = () => {
  if (!formData.value.name.trim()) {
    formError.value = 'Nama printer harus diisi'
    return false
  }

  if (formData.value.connection_type === 'network') {
    if (!formData.value.ip_address.trim()) {
      formError.value = 'IP address harus diisi untuk koneksi network'
      return false
    }
    if (!formData.value.port_number || formData.value.port_number < 1 || formData.value.port_number > 65535) {
      formError.value = 'Port harus antara 1-65535'
      return false
    }
  }

  if (formData.value.connection_type === 'usb' && !formData.value.device_path.trim()) {
    formError.value = 'Device path harus diisi untuk koneksi USB'
    return false
  }

  if (formData.value.connection_type === 'bluetooth' && !formData.value.device_path.trim()) {
    formError.value = 'Device address harus diisi untuk koneksi Bluetooth'
    return false
  }

  return true
}

const handleSubmit = async () => {
  formError.value = ''
  
  if (!validateForm()) {
    return
  }

  try {
    isSubmitting.value = true
    const result = await printerApi.createPrinter({
      name: formData.value.name,
      description: formData.value.description,
      printer_type: formData.value.printer_type,
      connection_type: formData.value.connection_type,
      ip_address: formData.value.ip_address || undefined,
      port_number: formData.value.port_number || undefined,
      device_path: formData.value.device_path || undefined,
      paper_width: formData.value.paper_width,
      paper_height: formData.value.paper_height,
      dpi: formData.value.dpi,
      font_size: formData.value.font_size,
      status: formData.value.status,
      is_default: formData.value.is_default,
      auto_print: formData.value.auto_print,
    })

    emit('save', result.data)
    resetForm()
    emit('close')
  } catch (error: any) {
    const message = error?.response?.data?.message || 'Terjadi kesalahan saat menyimpan printer'
    formError.value = message
    emit('error', message)
  } finally {
    isSubmitting.value = false
  }
}

const resetForm = () => {
  currentStep.value = 'type'
  selectedType.value = null
  formError.value = ''
  formData.value = {
    name: '',
    description: '',
    printer_type: 'receipt',
    connection_type: 'usb',
    ip_address: '',
    port_number: 9100,
    device_path: '',
    paper_width: 80,
    paper_height: 200,
    dpi: 203,
    font_size: 12,
    status: 'active',
    is_default: false,
    auto_print: false,
  }
}

const handleClose = () => {
  resetForm()
  emit('close')
}

const sheetHeight = computed(() => {
  if (currentStep.value === 'type') {
    return 'auto'
  }
  return 'auto'
})
</script>

<template>
  <!-- Backdrop -->
  <Transition name="fade">
    <div v-if="props.isOpen" class="backdrop" @click="handleClose" />
  </Transition>

  <!-- Bottom Sheet -->
  <Transition name="slide-up">
    <div v-if="props.isOpen" class="bottom-sheet" :style="{ height: sheetHeight }">
      <div class="sheet-header">
        <div class="drag-handle" />
        <h2 v-if="currentStep === 'type'" class="sheet-title">Pilih Tipe Printer</h2>
        <h2 v-else class="sheet-title">Detail Printer</h2>
        <button class="btn-close" @click="handleClose"><AppIcon name="x" :size="16" /></button>
      </div>

      <div class="sheet-content">
        <!-- Step 1: Select Printer Type -->
        <div v-if="currentStep === 'type'" class="step-type">
          <p class="step-description">Pilih tipe printer yang ingin Anda tambahkan</p>
          
          <div class="printer-type-grid">
            <button
              v-for="option in printerTypeOptions"
              :key="option.value"
              :class="['type-card', { 'type-card--selected': selectedType === option.value }]"
              @click="selectPrinterType(option.value as any)"
            >
              <div class="type-icon"><AppIcon :name="option.icon" :size="22" /></div>
              <div class="type-info">
                <h3 class="type-label">{{ option.label }}</h3>
                <p class="type-description">{{ option.description }}</p>
              </div>
              <div v-if="selectedType === option.value" class="checkmark">✓</div>
            </button>
          </div>
        </div>

        <!-- Step 2: Printer Details Form -->
        <div v-else-if="currentStep === 'details'" class="step-details">
          <!-- Error Message -->
          <div v-if="formError" class="error-banner">
            <AppIcon name="warning" :size="16" class="error-icon" />
            <span class="error-message">{{ formError }}</span>
          </div>

          <!-- Basic Info -->
          <div class="form-section">
            <h3 class="section-title">Informasi Dasar</h3>
            
            <div class="form-group">
              <label class="form-label">Nama Printer *</label>
              <input
                v-model="formData.name"
                type="text"
                class="form-input"
                placeholder="Contoh: Printer Kasir 1"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Deskripsi</label>
              <input
                v-model="formData.description"
                type="text"
                class="form-input"
                placeholder="Deskripsi printer (opsional)"
              />
            </div>
          </div>

          <!-- Connection Settings -->
          <div class="form-section">
            <h3 class="section-title">Koneksi</h3>
            
            <div class="form-group">
              <label class="form-label">Tipe Koneksi *</label>
              <div class="connection-options">
                <button
                  v-for="option in connectionTypes"
                  :key="option.value"
                  :class="['connection-btn', { 'connection-btn--active': formData.connection_type === option.value }]"
                  @click="formData.connection_type = option.value as any"
                >
                  <AppIcon :name="option.icon" :size="18" class="connection-icon" />
                  <span class="connection-label">{{ option.label }}</span>
                </button>
              </div>
            </div>

            <!-- Network Settings -->
            <template v-if="formData.connection_type === 'network'">
              <div class="form-group">
                <label class="form-label">IP Address *</label>
                <input
                  v-model="formData.ip_address"
                  type="text"
                  class="form-input"
                  placeholder="192.168.1.100"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Port Number *</label>
                <input
                  v-model.number="formData.port_number"
                  type="text" inputmode="numeric"
                  class="form-input"
                  placeholder="9100"
                />
              </div>
            </template>

            <!-- USB Settings -->
            <template v-else-if="formData.connection_type === 'usb'">
              <div class="form-group">
                <label class="form-label">Device Path *</label>
                <input v-model="formData.device_path" type="text" class="form-input" placeholder="/dev/ttyUSB0" />
              </div>
            </template>

            <!-- Bluetooth Settings -->
            <template v-else-if="formData.connection_type === 'bluetooth'">
              <div class="form-group">
                <label class="form-label">Perangkat Bluetooth *</label>
                <div v-if="btError" class="bt-error">{{ btError }}</div>
                <div v-if="btDevices.length" class="bt-device-list">
                  <button
                    v-for="device in btDevices"
                    :key="device.address"
                    :class="['bt-device-item', { 'bt-device-item--selected': formData.device_path === device.address }]"
                    @click="selectBtDevice(device)"
                    type="button"
                  >
                    <AppIcon name="bluetooth" :size="16" />
                    <div class="bt-device-info">
                      <span class="bt-device-name">{{ device.name }}</span>
                      <span class="bt-device-addr">{{ device.address }}</span>
                    </div>
                    <AppIcon v-if="formData.device_path === device.address" name="check" :size="14" class="bt-check" />
                  </button>
                </div>
                <button class="btn-bt-scan" :disabled="btScanning" @click="scanBtDevices" type="button">
                  <AppIcon v-if="btScanning" name="loader" :size="14" :spin="true" />
                  <AppIcon v-else name="bluetooth" :size="14" />
                  {{ btScanning ? 'Memindai...' : btDevices.length ? 'Pindai Ulang' : 'Pindai Perangkat' }}
                </button>
                <input
                  v-model="formData.device_path"
                  type="text"
                  class="form-input form-input--mt"
                  placeholder="Atau ketik MAC address: 00:1A:7B:8C:9D:EF"
                />
              </div>
            </template>
          </div>

          <!-- Paper Settings -->
          <div class="form-section">
            <h3 class="section-title">Pengaturan Kertas & Resolusi</h3>
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Lebar (mm)</label>
                <input
                  v-model.number="formData.paper_width"
                  type="text" inputmode="numeric"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Tinggi (mm)</label>
                <input
                  v-model.number="formData.paper_height"
                  type="text" inputmode="numeric"
                  class="form-input"
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">DPI</label>
                <input
                  v-model.number="formData.dpi"
                  type="text" inputmode="numeric"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Font Size</label>
                <input
                  v-model.number="formData.font_size"
                  type="text" inputmode="numeric"
                  class="form-input"
                />
              </div>
            </div>
          </div>

          <!-- Additional Settings -->
          <div class="form-section">
            <h3 class="section-title">Pengaturan Tambahan</h3>
            
            <label class="checkbox-label">
              <input v-model="formData.is_default" type="checkbox" class="checkbox-input" />
              <span class="checkbox-text">Jadikan printer default</span>
            </label>

            <label class="checkbox-label">
              <input v-model="formData.auto_print" type="checkbox" class="checkbox-input" />
              <span class="checkbox-text">Otomatis print ketika transaksi selesai</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="sheet-footer">
        <button
          v-if="currentStep === 'details'"
          class="btn btn-secondary"
          @click="goBackToType"
          :disabled="isSubmitting"
        >
          ← Kembali
        </button>
        <button
          v-if="currentStep === 'type'"
          class="btn btn-secondary"
          @click="handleClose"
        >
          Batal
        </button>
        <button
          v-if="currentStep === 'details'"
          class="btn btn-primary"
          @click="handleSubmit"
          :disabled="isSubmitting"
        >
          <AppIcon v-if="isSubmitting" name="loader" :size="14" :spin="true" />
          {{ isSubmitting ? 'Menyimpan...' : 'Simpan Printer' }}
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

/* Backdrop */
.backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
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

/* Bottom Sheet */
.bottom-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  max-height: 90dvh;
  overflow: hidden;
}

/* Sheet Header */
.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  position: relative;
}

.drag-handle {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
}

.sheet-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  flex: 1;
  text-align: center;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: background 0.2s ease;
}

.btn-close:hover {
  background: #f5f5f5;
}

/* Content Area */
.sheet-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  padding: 20px;
}

.sheet-content::-webkit-scrollbar {
  width: 6px;
}

.sheet-content::-webkit-scrollbar-track {
  background: transparent;
}

.sheet-content::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 3px;
}

/* Step: Type Selection */
.step-description {
  color: #666;
  margin-bottom: 20px;
  font-size: 14px;
}

.printer-type-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.type-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.type-card:hover {
  border-color: rgba(123, 47, 190, 0.3);
  background: rgba(123, 47, 190, 0.02);
}

.type-card--selected {
  border-color: var(--brand-primary);
  background: rgba(123, 47, 190, 0.08);
}

.type-icon {
  font-size: 32px;
  min-width: 48px;
  text-align: center;
}

.type-info {
  flex: 1;
  text-align: left;
}

.type-label {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 4px 0;
}

.type-description {
  font-size: 13px;
  color: #999;
  margin: 0;
}

.checkmark {
  position: absolute;
  top: 8px;
  right: 8px;
  background: var(--brand-primary);
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
}

/* Step: Details */
.step-details {
  padding-bottom: 20px;
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 8px;
  margin-bottom: 20px;
}

.error-icon {
  font-size: 18px;
}

.error-message {
  font-size: 14px;
  color: #c33;
}

/* Form Sections */
.form-section {
  margin-bottom: 24px;
}

.form-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #666;
  letter-spacing: 0.5px;
  margin: 0 0 12px 0;
}

/* Form Groups */
.form-group {
  margin-bottom: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #333;
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  transition: border-color 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--brand-primary);
  box-shadow: 0 0 0 3px rgba(123, 47, 190, 0.1);
}

/* Connection Options */
.connection-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.connection-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
  color: #666;
}

.connection-btn:hover {
  border-color: rgba(123, 47, 190, 0.3);
}

.connection-btn--active {
  border-color: var(--brand-primary);
  background: rgba(123, 47, 190, 0.08);
  color: var(--brand-primary);
  font-weight: 500;
}

.connection-icon {
  font-size: 20px;
}

.connection-label {
  white-space: nowrap;
}

/* Checkboxes */
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  cursor: pointer;
  user-select: none;
}

.checkbox-input {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--brand-primary);
}

.checkbox-text {
  font-size: 14px;
  color: #333;
}

/* Footer */
.sheet-footer {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid #f0f0f0;
  background: #f8fafb;
}

/* Buttons */
.btn {
  flex: 1;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(123, 47, 190, 0.3);
}

.btn-secondary {
  background: white;
  color: #333;
  border: 1px solid #ddd;
}

.btn-secondary:hover:not(:disabled) {
  background: #f9f9f9;
  border-color: #999;
}

/* Responsive */
@media (max-width: 640px) {
  .bottom-sheet {
    max-height: 100dvh;
  }

  .sheet-content {
    padding: 16px;
  }

  .connection-options {
    grid-template-columns: 1fr 1fr 1fr;
  }
}

/* Bluetooth picker */
.bt-error {
  font-size: 0.8rem;
  color: #dc2626;
  margin-bottom: 8px;
  padding: 6px 10px;
  background: #fef2f2;
  border-radius: 6px;
}

.bt-device-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.bt-device-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s;
}

.bt-device-item--selected {
  border-color: var(--brand-primary, #7b2fbe);
  background: #faf5ff;
}

.bt-device-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.bt-device-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: #1a1a1a;
}

.bt-device-addr {
  font-size: 0.72rem;
  color: #888;
  font-family: monospace;
}

.bt-check {
  color: var(--brand-primary, #7b2fbe);
}

.btn-bt-scan {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1.5px dashed #a78bfa;
  border-radius: 8px;
  background: #faf5ff;
  color: var(--brand-primary, #7b2fbe);
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  width: 100%;
  justify-content: center;
  margin-bottom: 8px;
  transition: background 0.15s;
}

.btn-bt-scan:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-bt-scan:hover:not(:disabled) {
  background: #f3e8ff;
}

.form-input--mt {
  margin-top: 8px;
}
</style>
