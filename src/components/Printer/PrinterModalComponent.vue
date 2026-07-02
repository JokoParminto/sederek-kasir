<script setup lang="ts">
import { ref, computed } from 'vue'
import { printerApi, type Printer } from '@/services/api/printer/printer.api'

interface Props {
  printer?: Printer | null
}

const props = withDefaults(defineProps<Props>(), {
  printer: null
})

const emit = defineEmits<{
  close: []
  save: [printer: Printer]
  error: [error: string]
}>()

const isSubmitting = ref(false)
const formError = ref('')

const formData = ref({
  name: props.printer?.name || '',
  description: props.printer?.description || '',
  printer_type: (props.printer?.printer_type || 'receipt') as 'receipt' | 'label' | 'a4' | 'network',
  connection_type: (props.printer?.connection_type || 'usb') as 'usb' | 'network' | 'bluetooth',
  ip_address: props.printer?.ip_address || '',
  port_number: props.printer?.port_number || 9100,
  device_path: props.printer?.device_path || '',
  paper_width: props.printer?.paper_width || 8.0,
  paper_height: props.printer?.paper_height || 10.0,
  dpi: props.printer?.dpi || 203,
  font_size: props.printer?.font_size || 12,
  status: (props.printer?.status || 'active') as 'active' | 'inactive' | 'offline',
  is_default: props.printer?.is_default || false,
  auto_print: props.printer?.auto_print || false,
})

const isEdit = computed(() => !!props.printer)

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

  formError.value = ''
  return true
}

const handleSubmit = async () => {
  if (!validateForm()) return

  try {
    isSubmitting.value = true
    formError.value = ''

    let result
    if (isEdit.value) {
      result = await printerApi.updatePrinter(props.printer!.id, {
        name: formData.value.name,
        description: formData.value.description,
        ip_address: formData.value.ip_address,
        port_number: formData.value.port_number,
        device_path: formData.value.device_path,
        paper_width: formData.value.paper_width,
        paper_height: formData.value.paper_height,
        dpi: formData.value.dpi,
        font_size: formData.value.font_size,
        status: formData.value.status,
        is_default: formData.value.is_default,
        auto_print: formData.value.auto_print,
      })
    } else {
      result = await printerApi.createPrinter({
        name: formData.value.name,
        description: formData.value.description,
        printer_type: formData.value.printer_type,
        connection_type: formData.value.connection_type,
        ip_address: formData.value.ip_address,
        port_number: formData.value.port_number,
        device_path: formData.value.device_path,
        paper_width: formData.value.paper_width,
        paper_height: formData.value.paper_height,
        dpi: formData.value.dpi,
        font_size: formData.value.font_size,
        status: formData.value.status,
        is_default: formData.value.is_default,
        auto_print: formData.value.auto_print,
      })
    }

    emit('save', result.data)
  } catch (error: any) {
    const message = error?.response?.data?.message || 'Terjadi kesalahan saat menyimpan printer'
    formError.value = message
    emit('error', message)
  } finally {
    isSubmitting.value = false
  }
}

const handleClose = () => {
  emit('close')
}
</script>

<template>
  <div class="modal-header">
    <h2 class="modal-title">{{ isEdit ? 'Edit Printer' : 'Tambah Printer Baru' }}</h2>
    <button class="modal-close" @click="handleClose"><AppIcon name="x" :size="16" /></button>
  </div>

  <form @submit.prevent="handleSubmit" class="modal-form">
    <!-- Name -->
    <div class="form-group">
      <label class="form-label">Nama Printer *</label>
      <input
        v-model="formData.name"
        type="text"
        class="form-input"
        placeholder="Contoh: Receipt Printer 1"
        required
      />
    </div>

    <!-- Description -->
    <div class="form-group">
      <label class="form-label">Deskripsi</label>
      <textarea
        v-model="formData.description"
        class="form-input form-textarea"
        placeholder="Deskripsi printer (opsional)"
        rows="2"
      ></textarea>
    </div>

    <!-- Printer Type (disable on edit) -->
    <div v-if="!isEdit" class="form-group">
      <label class="form-label">Jenis Printer *</label>
      <select v-model="formData.printer_type" class="form-input" required>
        <option value="receipt">Receipt Printer</option>
        <option value="label">Label Printer</option>
        <option value="a4">A4 Printer</option>
        <option value="network">Network Printer</option>
      </select>
    </div>

    <!-- Connection Type (disable on edit) -->
    <div v-if="!isEdit" class="form-group">
      <label class="form-label">Tipe Koneksi *</label>
      <select v-model="formData.connection_type" class="form-input" required>
        <option value="usb">USB</option>
        <option value="network">Network</option>
        <option value="bluetooth">Bluetooth</option>
      </select>
    </div>

    <!-- IP Address (show if network) -->
    <div v-if="formData.connection_type === 'network'" class="form-group">
      <label class="form-label">IP Address *</label>
      <input
        v-model="formData.ip_address"
        type="text"
        class="form-input"
        placeholder="Contoh: 192.168.1.100"
      />
    </div>

    <!-- Port Number (show if network) -->
    <div v-if="formData.connection_type === 'network'" class="form-group">
      <label class="form-label">Port *</label>
      <input
        v-model.number="formData.port_number"
        type="text" inputmode="numeric"
        class="form-input"
        placeholder="Contoh: 9100"
        min="1"
        max="65535"
      />
    </div>

    <!-- Device Path (show if USB) -->
    <div v-if="formData.connection_type === 'usb'" class="form-group">
      <label class="form-label">Device Path *</label>
      <input
        v-model="formData.device_path"
        type="text"
        class="form-input"
        placeholder="Contoh: /dev/ttyUSB0 atau COM3"
      />
    </div>

    <!-- Paper Size -->
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Lebar Kertas (cm)</label>
        <input
          v-model.number="formData.paper_width"
          type="text" inputmode="numeric"
          class="form-input"
          placeholder="Contoh: 8"
          step="0.1"
          min="1"
        />
      </div>
      <div class="form-group">
        <label class="form-label">Tinggi Kertas (cm)</label>
        <input
          v-model.number="formData.paper_height"
          type="text" inputmode="numeric"
          class="form-input"
          placeholder="Contoh: 10"
          step="0.1"
          min="1"
        />
      </div>
    </div>

    <!-- DPI and Font Size -->
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">DPI</label>
        <input
          v-model.number="formData.dpi"
          type="text" inputmode="numeric"
          class="form-input"
          placeholder="Contoh: 203"
          min="100"
          max="600"
        />
      </div>
      <div class="form-group">
        <label class="form-label">Font Size</label>
        <input
          v-model.number="formData.font_size"
          type="text" inputmode="numeric"
          class="form-input"
          placeholder="Contoh: 12"
          min="8"
          max="24"
        />
      </div>
    </div>

    <!-- Checkboxes -->
    <div class="form-group checkboxes">
      <label class="checkbox-label">
        <input v-model="formData.is_default" type="checkbox" />
        <span>Jadikan Printer Default</span>
      </label>
      <label class="checkbox-label">
        <input v-model="formData.auto_print" type="checkbox" />
        <span>Auto Print setelah Transaksi</span>
      </label>
    </div>

    <!-- Error Message -->
    <div v-if="formError" class="form-error">
      {{ formError }}
    </div>

    <!-- Buttons -->
    <div class="form-footer">
      <button type="button" class="btn-cancel" @click="handleClose" :disabled="isSubmitting">
        Batal
      </button>
      <button type="submit" class="btn-submit" :disabled="isSubmitting">
        <AppIcon v-if="isSubmitting" name="loader" :size="13" :spin="true" />
        {{ isSubmitting ? 'Menyimpan...' : isEdit ? 'Update' : 'Simpan' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.modal-header {
  padding: var(--spacing-4);
  border-bottom: 1px solid rgba(123, 47, 190, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.2s;

  &:hover {
    color: var(--color-text-primary);
    transform: scale(1.2);
  }
}

.modal-form {
  padding: var(--spacing-4);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  max-height: calc(90dvh - 100px);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.form-input {
  padding: 0.6rem var(--spacing-3);
  border: 1px solid rgba(123, 47, 190, 0.12);
  border-radius: 8px;
  font-size: 0.9rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(123, 47, 190, 0.1);
    background: white;
  }

  &:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }
}

.form-textarea {
  resize: vertical;
  min-height: 60px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-2);
}

.checkboxes {
  padding: var(--spacing-3);
  background: rgba(123, 47, 190, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(123, 47, 190, 0.1);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  cursor: pointer;
  font-size: 0.9rem;
  margin: 0;

  input[type='checkbox'] {
    cursor: pointer;
    width: 18px;
    height: 18px;
  }

  &:not(:last-child) {
    margin-bottom: var(--spacing-2);
  }
}

.form-error {
  padding: var(--spacing-2) var(--spacing-3);
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #991b1b;
  font-size: 0.85rem;
  font-weight: 500;
}

.form-footer {
  display: flex;
  gap: var(--spacing-2);
  padding-top: var(--spacing-2);
  border-top: 1px solid rgba(123, 47, 190, 0.08);
}

.btn-cancel,
.btn-submit {
  flex: 1;
  padding: 0.7rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 44px;
}

.btn-cancel {
  background: #e5e7eb;
  color: #374151;

  &:hover:not(:disabled) {
    background: #d1d5db;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-submit {
  background: linear-gradient(135deg, rgba(123, 47, 190, 0.15) 0%, rgba(52, 211, 153, 0.08) 100%);
  color: var(--color-primary-700);
  border: 1px solid rgba(123, 47, 190, 0.2);

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, rgba(123, 47, 190, 0.2) 0%, rgba(52, 211, 153, 0.12) 100%);
    box-shadow: 0 6px 16px rgba(123, 47, 190, 0.2);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

@media (max-width: 640px) {
  .modal-header {
    padding: var(--spacing-3);
  }

  .modal-form {
    padding: var(--spacing-3);
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
