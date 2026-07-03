<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCustomerStore } from '@/stores/customer'
import { customerApi } from '@/services/api/customer.api'
import type { Customer } from '@/types'
import { DEFAULT_AVATAR } from '@/utils/constants'
import { useModal } from '@/composables/useModal'

interface Props {
  isOpen: boolean
  customer?: Customer | null
}

interface Emits {
  (e: 'close'): void
  (e: 'submit'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const customerStore = useCustomerStore()

const isEdit = computed(() => !!props.customer)

// Form data
const form = ref({
  name: '',
  phone_number: '',
  avatar_url: DEFAULT_AVATAR,
  member_type: null as 'umum' | 'akamsi' | 'vip' | null,
  member_status: 'inactive' as 'active' | 'pending' | 'inactive',
})

// Error state
const phoneError = ref('')
const isSubmitting = ref(false)
const submitError = ref<string | null>(null)

// Watch for customer changes (edit mode)
watch(() => props.customer, (customer) => {
  if (customer) {
    form.value = {
      name: customer.name,
      phone_number: customer.phone_number,
      avatar_url: customer.avatar_url || DEFAULT_AVATAR,
      member_type: customer.member_type ?? null,
      member_status: customer.member_status ?? 'inactive',
    }
  } else {
    form.value = {
      name: '',
      phone_number: '',
      avatar_url: DEFAULT_AVATAR,
      member_type: null,
      member_status: 'inactive',
    }
  }
  phoneError.value = ''
}, { immediate: true })

const validatePhoneNumber = (): boolean => {
  const phone = form.value.phone_number.trim()

  if (phone && !/^\d+$/.test(phone)) {
    phoneError.value = 'Nomor telepon hanya boleh berisi angka'
    return false
  }

  if (phone) {
    const excludeId = isEdit.value && props.customer ? props.customer.id : undefined
    if (!customerStore.isPhoneNumberUnique(phone, excludeId)) {
      phoneError.value = 'Nomor telepon sudah terdaftar'
      return false
    }
  }

  phoneError.value = ''
  return true
}

const handleSubmit = async () => {
  if (!validatePhoneNumber()) {
    return
  }

  try {
    isSubmitting.value = true
    submitError.value = null

    const customerData = {
      name: form.value.name.trim(),
      phone_number: form.value.phone_number.trim(),
      avatar_url: form.value.avatar_url || DEFAULT_AVATAR,
      member_type: form.value.member_type,
      member_status: form.value.member_status,
    }

    if (isEdit.value && props.customer) {
      // Update

      const updated = await customerApi.updateCustomer(props.customer.id, customerData)
      customerStore.updateCustomer(props.customer.id, updated)

    } else {
      // Create

      const created = await customerApi.createCustomer(customerData)
      customerStore.addCustomer(created)

    }

    emit('submit')
    emit('close')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menyimpan customer'
    submitError.value = message

  } finally {
    isSubmitting.value = false
  }
}

const handleClose = () => {
  phoneError.value = ''
  emit('close')
}

const { handleBackdropClick } = useModal(handleClose)

const handlePhoneInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  // Filter hanya angka, hapus karakter yang bukan digit
  const filteredValue = input.value.replace(/\D/g, '')
  form.value.phone_number = filteredValue

  if (phoneError.value) {
    validatePhoneNumber()
  }
}
</script>

<template>
  <div v-if="isOpen">
    <div class="modal-overlay" @click="handleBackdropClick">
        <div class="modal-content">
          <!-- Header -->
          <div class="modal-header">
            <h2>Kelola Customer</h2>
            <button class="btn-close" @click="handleClose"><AppIcon name="x" :size="16" /></button>
          </div>

          <!-- Form -->
          <form @submit.prevent="handleSubmit" class="modal-body">
            <div class="form-group">
              <label class="form-label">Nama Lengkap</label>
              <input
                v-model="form.name"
                type="text"
                class="form-input"
                placeholder="Contoh: Andi Wijaya"
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label">Nomor Telepon</label>
              <input
                :value="form.phone_number"
                type="text"
                class="form-input"
                :class="{ 'form-input--error': phoneError }"
                placeholder="Contoh: 081234567890"
                required
                @input="handlePhoneInput"
                @blur="validatePhoneNumber"
              />
              <p v-if="phoneError" class="form-error">{{ phoneError }}</p>
              <p v-else class="form-hint">Nomor telepon harus unik untuk setiap customer</p>
            </div>

            <div class="form-group">
              <label class="form-label">Avatar (Emoji)</label>
              <input
                v-model="form.avatar_url"
                type="text"
                class="form-input"
                placeholder="Contoh: 👤 atau 😊"
                maxlength="2"
              />
              <p class="form-hint">Default: {{ DEFAULT_AVATAR }}</p>
            </div>

            <!-- Member Tier -->
            <div class="form-group">
              <label class="form-label">Tipe Member</label>
              <select v-model="form.member_type" class="form-input">
                <option :value="null">Bukan Member</option>
                <option value="umum">Umum</option>
                <option value="akamsi">Akamsi</option>
                <option value="vip">VIP</option>
              </select>
            </div>

            <div v-if="form.member_type" class="form-group">
              <label class="form-label">Status Member</label>
              <select v-model="form.member_status" class="form-input">
                <option value="pending">Pending (belum verifikasi)</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
              <p class="form-hint">Aktif = member mendapat potongan harga saat transaksi</p>
            </div>

            <!-- Error Message -->
            <div v-if="submitError" class="error-message">
              <AppIcon name="warning" :size="14" /> {{ submitError }}
            </div>

            <!-- Footer Actions -->
            <div class="modal-footer">
              <button type="button" class="btn-cancel" @click="handleClose" :disabled="isSubmitting">
                Batal
              </button>
              <button type="submit" class="btn-submit" :disabled="isSubmitting">
                {{ isSubmitting ? 'Menyimpan...' : (isEdit ? 'Update' : 'Simpan') }}
              </button>
            </div>
          </form>
        </div>
      </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: static;
  background: transparent;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: auto;
  padding: 0;
  flex: 1;
}

.modal-content {
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
}

.modal-header {
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
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-label {
  font-weight: 600;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  letter-spacing: 0.01em;
}

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

  &--error {
    border-color: #dc2626;
    background: rgba(254, 242, 242, 0.5);

    &:focus {
      border-color: #dc2626;
      background: rgba(254, 242, 242, 0.5);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.1);
    }
  }
}

.form-hint {
  margin-top: 0.35rem;
  font-size: 0.7rem;
  color: var(--color-text-secondary);
}

.form-error {
  margin-top: 0.35rem;
  font-size: 0.7rem;
  color: #dc2626;
  font-weight: 600;
}

.error-message {
  padding: 0.6rem 0.75rem;
  background: rgba(254, 242, 242, 0.9);
  color: #dc2626;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.modal-footer {
  position: sticky;
  bottom: 0;
  padding: 1.5rem;
  border-top: 1px solid rgba(123, 47, 190, 0.08);
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
  background: white;
  z-index: 10;
}

.btn-cancel,
.btn-submit {
  flex: 1;
  padding: 0.75rem;
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
}

.btn-submit {
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(123, 47, 190, 0.3);

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, var(--brand-primary-dark) 0%, var(--brand-primary-darker) 100%);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(123, 47, 190, 0.4);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

/* Responsive - Mobile */
@media (max-width: 480px) {
  .modal-header h2 {
    font-size: 0.9rem;
  }

  .form-label {
    font-size: 0.7rem;
  }

  .form-input {
    font-size: 0.8rem;
    padding: 0.6rem 0.75rem;
  }

  .btn-cancel,
  .btn-submit {
    font-size: 0.75rem;
    padding: 0.6rem;
  }
}
</style>
