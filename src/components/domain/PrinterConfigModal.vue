<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { Capacitor } from '@capacitor/core'
import { type FormDataPrinter } from '@/services/printer.service'
import { useToast } from '@/composables/useToast'

interface FormData extends FormDataPrinter {}

interface Props {
  isOpen: boolean
  initialData?: FormData
  printerId?: string
}

interface Emits {
  save: [config: FormData]
  close: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { error: showError } = useToast()

const isNative = Capacitor.isNativePlatform()
const isEditMode = computed(() => !!props.printerId)
const btDevices = ref<{ name: string; address: string }[]>([])
const isScanningBt = ref(false)
const btScanError = ref('')

const defaultForm = (): FormData => ({
  type: 'customer',
  printerName: '',
  description: '',
  paperSize: 80,
  autoPrint: false,
  copies: 1,
  fontSize: 12,
  connectionType: 'network',
  ipAddress: '',
  portNumber: undefined,
  devicePath: undefined,
})

const formData = ref<FormData>(defaultForm())
const validationError = ref('')

// Prevents connectionType watcher from resetting paperSize during initial load from API
let _initializingForm = false

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    _initializingForm = true
    formData.value = props.initialData ? { ...props.initialData } : defaultForm()
    validationError.value = ''
    btDevices.value = []
    btScanError.value = ''
    // nextTick runs after connectionType watcher flushes, then clears the flag
    nextTick(() => { _initializingForm = false })
  }
})

watch(() => formData.value.connectionType, (type) => {
  // Skip auto-reset when populating form from API data (edit mode)
  if (_initializingForm) return
  btDevices.value = []
  btScanError.value = ''
  if (type !== 'bluetooth') formData.value.devicePath = undefined
  // BT thermal printers are 58mm; network/USB printers default to 80mm
  formData.value.paperSize = type === 'bluetooth' ? 58 : 80
})

const scanBtDevices = async () => {
  btScanError.value = ''
  btDevices.value = []
  if (!isNative) {
    btScanError.value = 'Scan Bluetooth hanya tersedia di aplikasi Android. Buka via APK di tablet.'
    return
  }
  isScanningBt.value = true
  try {
    const { bluetoothPrinter } = await import('@/services/bluetooth-printer.service')
    const devices = await bluetoothPrinter.getPairedDevices()
    if (devices.length === 0) {
      btScanError.value = 'Tidak ada perangkat Bluetooth dipasangkan. Pasangkan printer di Pengaturan Android terlebih dahulu.'
    } else {
      btDevices.value = devices
    }
  } catch (e: any) {
    btScanError.value = e?.message || 'Gagal memindai perangkat Bluetooth'
  } finally {
    isScanningBt.value = false
  }
}

const selectBtDevice = (device: { name: string; address: string }) => {
  formData.value.printerName = device.name || device.address
  formData.value.devicePath = device.address
  btDevices.value = []
}

const handleClose = () => emit('close')

const handleSave = () => {
  validationError.value = ''

  if (formData.value.connectionType === 'bluetooth' && !formData.value.devicePath) {
    validationError.value = 'Pilih perangkat Bluetooth terlebih dahulu — klik "Pindai Perangkat Bluetooth"'
    return
  }
  if (!formData.value.printerName.trim()) {
    validationError.value = 'Nama printer harus diisi'
    return
  }
  if (formData.value.copies < 1 || formData.value.copies > 99) {
    showError('Jumlah salinan harus antara 1–99')
    return
  }

  emit('save', formData.value)
  emit('close')
}


</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="sheet-overlay" @click.self="handleClose">
      <div class="printer-config-sheet">
        <!-- Header -->
        <div class="form-header">
          <h2>Ubah Konfigurasi Printer</h2>
          <button class="btn-close" @click="handleClose"><AppIcon name="x" :size="16" /></button>
        </div>

        <!-- Body (scrollable) -->
        <form @submit.prevent="handleSave" class="form-body">

          <!-- Validation error -->
          <div v-if="validationError" class="validation-error">{{ validationError }}</div>

          <!-- 1. Type Receipt -->
          <div class="form-group">
            <label class="form-label">Jenis Struk</label>
            <!-- Read-only in edit mode -->
            <div v-if="isEditMode" class="printer-display">
              <span class="printer-name">
                {{ formData.type === 'customer' ? 'Customer Receipt' : formData.type === 'kitchen' ? 'Kitchen Ticket' : 'Barista Ticket' }}
              </span>
            </div>
            <div v-else class="radio-options">
              <label class="radio-label">
                <input v-model="formData.type" type="radio" value="customer" />
                <span>Customer Receipt</span>
              </label>
              <label class="radio-label">
                <input v-model="formData.type" type="radio" value="barista" />
                <span>Barista Ticket</span>
              </label>
              <label class="radio-label">
                <input v-model="formData.type" type="radio" value="kitchen" />
                <span>Kitchen Ticket</span>
              </label>
            </div>
          </div>

          <!-- 2. Nama Printer -->
          <div class="form-group">
            <label class="form-label">Nama Printer</label>
            <input
              v-model="formData.printerName"
              type="text"
              class="form-input"
              placeholder="Contoh: Epson TM-T82"
            />
            <span class="input-hint">Contoh: Epson TM-T82, Canon PIXMA</span>
          </div>

           <!-- 3. Paper Size (Number Input) -->
           <div class="form-group">
             <label class="form-label">Lebar Kertas (mm)</label>
             <input
               v-model.number="formData.paperSize"
               type="text" inputmode="numeric"
               min="10"
               max="500"
               class="form-input"
               placeholder="80"
             />
           </div>

          <!-- 4. Auto Print -->
          <div class="form-group form-group-inline">
            <label class="form-label">Auto Print</label>
            <label class="toggle-label">
              <input v-model="formData.autoPrint" type="checkbox" class="toggle-input" />
              <span class="toggle-text">{{ formData.autoPrint ? 'Aktif' : 'Nonaktif' }}</span>
            </label>
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

            <!-- 6. Description (Text Area) -->
            <div class="form-group">
              <label class="form-label">Deskripsi</label>
              <textarea
                v-model="formData.description"
                class="form-input form-textarea"
                placeholder="Deskripsi printer"
                rows="2"
              ></textarea>
            </div>

            <!-- 7. Font Size (Number Input) -->
            <div class="form-group">
              <label class="form-label">Ukuran Font</label>
              <input
                v-model.number="formData.fontSize"
                type="text" inputmode="numeric"
                min="8"
                max="24"
                class="form-input"
                placeholder="12"
              />
            </div>

            <!-- 8. Connection Type -->
            <div class="form-group">
              <label class="form-label">Tipe Koneksi</label>
              <select v-model="formData.connectionType" class="form-input form-select">
                <option value="network">Network (LAN/WiFi)</option>
                <option value="usb">USB</option>
                <option value="bluetooth">Bluetooth</option>
              </select>
            </div>

            <!-- 9. IP Address + Port (hanya jika network) -->
            <template v-if="formData.connectionType === 'network'">
              <div class="form-group">
                <label class="form-label">IP Address</label>
                <input
                  v-model="formData.ipAddress"
                  type="text"
                  class="form-input"
                  placeholder="192.168.1.100"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Port</label>
                <input
                  v-model.number="formData.portNumber"
                  type="text" inputmode="numeric"
                  min="1"
                  max="65535"
                  class="form-input"
                  placeholder="9100"
                />
              </div>
            </template>

            <!-- 10. BT Scanner (bluetooth selected) -->
            <template v-if="formData.connectionType === 'bluetooth'">
              <div class="form-group">
                <label class="form-label">Perangkat Bluetooth</label>
                <div v-if="formData.devicePath" class="bt-selected">
                  <div class="bt-selected-info">
                    <span class="bt-selected-icon">🖨️</span>
                    <div>
                      <div class="bt-selected-name">{{ formData.printerName }}</div>
                      <div class="bt-selected-addr">{{ formData.devicePath }}</div>
                    </div>
                  </div>
                  <button type="button" class="bt-btn-rescan" :disabled="isScanningBt" @click="scanBtDevices">
                    {{ isScanningBt ? '...' : 'Ganti' }}
                  </button>
                </div>
                <template v-else>
                  <button type="button" class="bt-scan-btn" :disabled="isScanningBt" @click="scanBtDevices">
                    <span v-if="isScanningBt" class="bt-spinner" />
                    <span v-else>🔍</span>
                    {{ isScanningBt ? 'Memindai...' : 'Pindai Perangkat Bluetooth' }}
                  </button>
                  <span class="input-hint">Pastikan printer sudah dipasangkan di Pengaturan Bluetooth Android</span>
                </template>
                <div v-if="btScanError" class="bt-scan-error">{{ btScanError }}</div>
                <div v-if="btDevices.length > 0" class="bt-device-list">
                  <button
                    v-for="device in btDevices"
                    :key="device.address"
                    type="button"
                    class="bt-device-item"
                    @click="selectBtDevice(device)"
                  >
                    <span class="bt-device-icon">🖨️</span>
                    <div class="bt-device-meta">
                      <span class="bt-device-name">{{ device.name || 'Perangkat Tidak Dikenal' }}</span>
                      <span class="bt-device-addr">{{ device.address }}</span>
                    </div>
                  </button>
                </div>
              </div>
            </template>
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
.printer-config-sheet {
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

  &:focus {
    outline: none;
    border-color: var(--brand-primary);
    background-color: rgba(240, 253, 244, 0.5);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2310b981' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.85rem center;
  }
}

/* Textarea */
.form-textarea {
  resize: vertical;
  font-family: inherit;
  line-height: 1.4;
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

/* Printer Display */
.printer-display {
  padding: 0.75rem 0.85rem;
  border: 1px solid rgba(123, 47, 190, 0.15);
  border-radius: 10px;
  background: rgba(240, 253, 244, 0.3);
  display: flex;
  align-items: center;

  .printer-name {
    font-size: 0.85rem;
    color: var(--color-text-primary);
    font-weight: 500;
  }
}

/* Inline group (label + toggle on same row) */
.form-group-inline {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

/* Toggle */
.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.toggle-input {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--brand-primary);
}

.toggle-text {
  font-size: 0.85rem;
  color: var(--color-text-primary);
  font-weight: 500;
}

/* Input hint */
.input-hint {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  font-style: italic;
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

/* Validation error */
.validation-error {
  padding: 0.6rem 0.85rem;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 10px;
  color: #dc2626;
  font-size: 0.8rem;
  font-weight: 500;
}

/* BT Scanner */
.bt-scan-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 0.85rem;
  border: 1.5px dashed var(--brand-primary, #7B2FBE);
  border-radius: 10px;
  background: rgba(123, 47, 190, 0.04);
  color: var(--brand-primary, #7B2FBE);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  font-family: inherit;
  transition: background 0.15s ease;
}

.bt-scan-btn:hover:not(:disabled) { background: rgba(123, 47, 190, 0.09); }
.bt-scan-btn:disabled { opacity: 0.5; cursor: default; }

.bt-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(123, 47, 190, 0.25);
  border-top-color: #7B2FBE;
  border-radius: 50%;
  animation: bt-spin 0.6s linear infinite;
  flex-shrink: 0;
}
@keyframes bt-spin { to { transform: rotate(360deg); } }

.bt-scan-error {
  font-size: 0.75rem;
  color: #dc2626;
  padding: 0.25rem 0;
}

.bt-device-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 0.5rem;
  border: 1px solid rgba(123, 47, 190, 0.15);
  border-radius: 10px;
  overflow: hidden;
}

.bt-device-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.85rem;
  background: white;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s ease;
  -webkit-tap-highlight-color: transparent;
}

.bt-device-item:hover { background: rgba(123, 47, 190, 0.06); }
.bt-device-item + .bt-device-item { border-top: 1px solid rgba(123, 47, 190, 0.08); }

.bt-device-icon { font-size: 1.2rem; flex-shrink: 0; }

.bt-device-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.bt-device-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-primary, #111827);
}

.bt-device-addr {
  font-size: 0.72rem;
  color: #6b7280;
  font-family: monospace;
}

.bt-selected {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.65rem 0.85rem;
  border: 1.5px solid #7B2FBE;
  border-radius: 10px;
  background: rgba(123, 47, 190, 0.06);
}

.bt-selected-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.bt-selected-icon { font-size: 1.2rem; flex-shrink: 0; }

.bt-selected-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-primary, #111827);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bt-selected-addr {
  font-size: 0.72rem;
  color: #6b7280;
  font-family: monospace;
}

.bt-btn-rescan {
  padding: 4px 10px;
  border: 1px solid rgba(123, 47, 190, 0.3);
  border-radius: 7px;
  background: white;
  font-size: 0.75rem;
  font-weight: 600;
  color: #7B2FBE;
  cursor: pointer;
  flex-shrink: 0;
  font-family: inherit;
}

.bt-btn-rescan:hover { background: rgba(123, 47, 190, 0.08); }
.bt-btn-rescan:disabled { opacity: 0.5; cursor: default; }

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

  .printer-display {
    padding: 0.6rem 0.75rem;

    .printer-name {
      font-size: 0.8rem;
    }
  }

  .btn-cancel,
  .btn-submit {
    padding: 0.6rem;
    font-size: 0.75rem;
  }
}
</style>
