<script setup lang="ts">
import { ref, watch } from 'vue'
import { Capacitor } from '@capacitor/core'
import { printerService, type FormDataPrinter } from '@/services/printer.service'
import { useToast } from '@/composables/useToast'
import BaseBottomSheet from '@/components/base/BaseBottomSheet.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'

interface Props {
  isOpen: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  save: [config: any]
  close: []
}>()

const { success: showSuccess, error: showError } = useToast()

const isNative = Capacitor.isNativePlatform()
const btDevices = ref<{ name: string; address: string }[]>([])
const isScanningBt = ref(false)
const btScanError = ref('')

const formData = ref<FormDataPrinter>({
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

const formError = ref('')
const isSubmitting = ref(false)

watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    formData.value = {
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
    }
    formError.value = ''
    isSubmitting.value = false
    btDevices.value = []
    btScanError.value = ''
  }
})

watch(() => formData.value.connectionType, (type) => {
  btDevices.value = []
  btScanError.value = ''
  formData.value.devicePath = undefined
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

const handleSave = async () => {
  formError.value = ''

  if (formData.value.connectionType === 'bluetooth' && !formData.value.devicePath) {
    formError.value = 'Pilih perangkat Bluetooth terlebih dahulu — klik "Pindai Perangkat Bluetooth"'
    return
  }
  if (!formData.value.printerName.trim()) {
    formError.value = 'Nama printer harus diisi'
    return
  }
  if (formData.value.copies < 1 || formData.value.copies > 99) {
    formError.value = 'Jumlah salinan harus antara 1–99'
    return
  }

  isSubmitting.value = true
  try {
    const newPrinter = await printerService.createPrinter(formData.value)
    showSuccess(`${formData.value.printerName} berhasil ditambahkan`)
    emit('save', newPrinter)
    emit('close')
  } catch (error: any) {
    const msg = error.response?.data?.error?.message || 'Gagal menambahkan printer'
    showError(msg)
    formError.value = msg
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <BaseBottomSheet
    :modelValue="isOpen"
    title="Tambah Printer Baru"
    size="large"
    @close="handleClose"
  >
    <form @submit.prevent="handleSave">
      <BaseAlert
        v-if="formError"
        type="error"
        :description="formError"
        @close="formError = ''"
      />

      <!-- Jenis Struk -->
      <div class="form-group">
        <label class="form-label">Jenis Struk</label>
        <div class="radio-options">
          <label class="radio-label" :class="{ selected: formData.type === 'customer' }">
            <input v-model="formData.type" type="radio" value="customer" />
            <span>Customer Receipt</span>
          </label>
          <label class="radio-label" :class="{ selected: formData.type === 'barista' }">
            <input v-model="formData.type" type="radio" value="barista" />
            <span>Barista Ticket</span>
          </label>
          <label class="radio-label" :class="{ selected: formData.type === 'kitchen' }">
            <input v-model="formData.type" type="radio" value="kitchen" />
            <span>Kitchen Ticket</span>
          </label>
        </div>
      </div>

      <!-- Nama Printer -->
      <div class="form-group">
        <label class="form-label">Nama Printer</label>
        <input
          v-model="formData.printerName"
          type="text"
          class="form-input"
          placeholder="Contoh: Epson TM-T82"
          required
        />
      </div>

      <!-- Grid: Paper Size + Font Size -->
      <div class="form-row-2">
        <div class="form-group">
          <label class="form-label">Lebar Kertas (mm)</label>
          <input v-model.number="formData.paperSize" type="text" inputmode="numeric" min="10" max="500" class="form-input" placeholder="80" />
        </div>
        <div class="form-group">
          <label class="form-label">Ukuran Font</label>
          <input v-model.number="formData.fontSize" type="text" inputmode="numeric" min="8" max="24" class="form-input" placeholder="12" />
        </div>
      </div>

      <!-- Grid: Auto Print + Copies -->
      <div class="form-row-2">
        <div class="form-group form-group-inline">
          <label class="form-label">Auto Print</label>
          <label class="toggle-label">
            <input v-model="formData.autoPrint" type="checkbox" class="toggle-input" />
            <span>{{ formData.autoPrint ? 'Aktif' : 'Nonaktif' }}</span>
          </label>
        </div>
        <div class="form-group">
          <label class="form-label">Jumlah Salinan</label>
          <input v-model.number="formData.copies" type="text" inputmode="numeric" min="1" max="99" class="form-input" placeholder="1" />
        </div>
      </div>

      <!-- Koneksi -->
      <div class="form-group">
        <label class="form-label">Tipe Koneksi</label>
        <select v-model="formData.connectionType" class="form-input">
          <option value="network">Network (LAN/WiFi)</option>
          <option value="usb">USB</option>
          <option value="bluetooth">Bluetooth</option>
        </select>
      </div>

      <!-- IP + Port (hanya jika network) -->
      <template v-if="formData.connectionType === 'network'">
        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label">IP Address</label>
            <input v-model="formData.ipAddress" type="text" class="form-input" placeholder="192.168.1.100" />
          </div>
          <div class="form-group">
            <label class="form-label">Port</label>
            <input v-model.number="formData.portNumber" type="text" inputmode="numeric" min="1" max="65535" class="form-input" placeholder="9100" />
          </div>
        </div>
      </template>

      <!-- BT Scanner (bluetooth selected) -->
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
              <AppIcon v-else name="bluetooth" :size="15" />
              {{ isScanningBt ? 'Memindai...' : 'Pindai Perangkat Bluetooth' }}
            </button>
            <span class="optional">Pastikan printer sudah dipasangkan di Pengaturan Bluetooth Android</span>
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

      <!-- Deskripsi -->
      <div class="form-group">
        <label class="form-label">Deskripsi <span class="optional">(opsional)</span></label>
        <textarea v-model="formData.description" class="form-input" rows="2" placeholder="Deskripsi printer"></textarea>
      </div>
    </form>

    <template #footer>
      <BaseButton variant="secondary" :disabled="isSubmitting" @click="handleClose">Batal</BaseButton>
      <BaseButton variant="primary" :loading="isSubmitting" :disabled="isSubmitting" @click="handleSave">
        Simpan
      </BaseButton>
    </template>
  </BaseBottomSheet>
</template>

<style scoped>
form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-3);
}

.form-label {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-secondary);
  letter-spacing: 0.04em;
}

.optional {
  font-weight: 400;
  text-transform: none;
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
}

.form-input {
  padding: var(--spacing-2) var(--spacing-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-family: inherit;
  background: var(--color-surface-0);
  color: var(--color-text-primary);
  transition: border-color var(--transition-duration-short) var(--transition-standard);
  width: 100%;
  resize: vertical;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(123, 47, 190, 0.1);
}

.radio-options {
  display: flex;
  gap: var(--spacing-3);
  flex-wrap: wrap;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  cursor: pointer;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  transition: all var(--transition-duration-short) var(--transition-standard);
  background: var(--color-surface-0);
  flex: 1;
}

.radio-label input[type="radio"] {
  cursor: pointer;
  accent-color: var(--color-primary);
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.radio-label.selected {
  background: rgba(123, 47, 190, 0.08);
  border-color: var(--color-primary);
  font-weight: 600;
}

.radio-label:hover {
  border-color: rgba(123, 47, 190, 0.3);
}

.form-group-inline {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  cursor: pointer;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  font-weight: 500;
}

.toggle-input {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--color-primary);
}

/* BT Scanner */
.bt-scan-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  border: 1.5px dashed var(--color-primary);
  border-radius: var(--radius-sm);
  background: rgba(123, 47, 190, 0.04);
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  transition: background 0.15s ease;
}

.bt-scan-btn:hover:not(:disabled) { background: rgba(123, 47, 190, 0.09); }
.bt-scan-btn:disabled { opacity: 0.5; cursor: default; }

.bt-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(123, 47, 190, 0.25);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: bt-spin 0.6s linear infinite;
  flex-shrink: 0;
}
@keyframes bt-spin { to { transform: rotate(360deg); } }

.bt-scan-error {
  font-size: var(--font-size-xs);
  color: #dc2626;
  padding: var(--spacing-1) 0;
}

.bt-device-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  margin-top: var(--spacing-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.bt-device-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-2) var(--spacing-3);
  background: var(--color-surface-0);
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s ease;
  -webkit-tap-highlight-color: transparent;
}

.bt-device-item:hover { background: rgba(123, 47, 190, 0.06); }
.bt-device-item + .bt-device-item { border-top: 1px solid var(--color-border-light); }

.bt-device-icon { font-size: 1.2rem; flex-shrink: 0; }

.bt-device-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.bt-device-name {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.bt-device-addr {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-family: monospace;
}

.bt-selected {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  background: rgba(123, 47, 190, 0.06);
}

.bt-selected-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  flex: 1;
  min-width: 0;
}

.bt-selected-icon { font-size: 1.2rem; flex-shrink: 0; }

.bt-selected-name {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bt-selected-addr {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-family: monospace;
}

.bt-btn-rescan {
  padding: 4px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-0);
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  flex-shrink: 0;
}

.bt-btn-rescan:hover { background: var(--color-surface-2); }
</style>
