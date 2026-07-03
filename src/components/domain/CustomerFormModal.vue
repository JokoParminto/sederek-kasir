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

    const memberType = form.value.member_type
    const memberStatus = form.value.member_status
    const customerData = {
      name: form.value.name.trim(),
      phone_number: form.value.phone_number.trim(),
      avatar_url: form.value.avatar_url || DEFAULT_AVATAR,
      is_member: memberType !== null && memberStatus === 'active',
      total_spending: 0,
      member_type: memberType,
      member_status: memberStatus,
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
            <div class="member-section">
              <label class="member-section-label">Tipe Member</label>
              <div class="tier-pills">
                <button type="button"
                  v-for="opt in [{ value: null, label: 'Non', icon: '—' }, { value: 'umum', label: 'Umum', icon: 'U' }, { value: 'akamsi', label: 'Akamsi', icon: 'A' }, { value: 'vip', label: 'VIP', icon: '★' }]"
                  :key="String(opt.value)"
                  class="tier-pill"
                  :class="[`tier-pill--${opt.value ?? 'none'}`, { 'tier-pill--active': form.member_type === opt.value }]"
                  @click="form.member_type = opt.value as any"
                >
                  <span class="tier-pill-icon">{{ opt.icon }}</span>
                  <span class="tier-pill-label">{{ opt.label }}</span>
                </button>
              </div>

              <div v-if="form.member_type" class="status-row">
                <span class="status-row-label">Status:</span>
                <div class="status-pills">
                  <button type="button"
                    v-for="s in [{ value: 'active', label: 'Aktif' }, { value: 'pending', label: 'Pending' }, { value: 'inactive', label: 'Nonaktif' }]"
                    :key="s.value"
                    class="status-pill"
                    :class="[`status-pill--${s.value}`, { 'status-pill--active': form.member_status === s.value }]"
                    @click="form.member_status = s.value as any"
                  >{{ s.label }}</button>
                </div>
              </div>
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

.member-section {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.member-section-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.tier-pills {
  display: flex;
  gap: 0.4rem;
}
.tier-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  padding: 0.55rem 0.5rem;
  border-radius: 10px;
  border: 1.5px solid #e2e8f0;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  flex: 1;
  font-family: inherit;
}
.tier-pill:hover { border-color: #94a3b8; background: #f8fafc; }
.tier-pill-icon {
  font-size: 0.85rem;
  font-weight: 700;
  line-height: 1;
  color: #94a3b8;
}
.tier-pill-label {
  font-size: 0.65rem;
  font-weight: 600;
  color: #94a3b8;
}
.tier-pill--active.tier-pill--none { border-color: #94a3b8; background: #f1f5f9; }
.tier-pill--active.tier-pill--none .tier-pill-icon,
.tier-pill--active.tier-pill--none .tier-pill-label { color: #475569; }
.tier-pill--active.tier-pill--umum { border-color: #16a34a; background: #f0fdf4; }
.tier-pill--active.tier-pill--umum .tier-pill-icon,
.tier-pill--active.tier-pill--umum .tier-pill-label { color: #15803d; }
.tier-pill--active.tier-pill--akamsi { border-color: #2563eb; background: #eff6ff; }
.tier-pill--active.tier-pill--akamsi .tier-pill-icon,
.tier-pill--active.tier-pill--akamsi .tier-pill-label { color: #1d4ed8; }
.tier-pill--active.tier-pill--vip { border-color: #7c3aed; background: #fdf4ff; }
.tier-pill--active.tier-pill--vip .tier-pill-icon,
.tier-pill--active.tier-pill--vip .tier-pill-label { color: #7c3aed; }
.status-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.7rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}
.status-row-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  white-space: nowrap;
}
.status-pills { display: flex; gap: 0.3rem; flex-wrap: wrap; }
.status-pill {
  padding: 0.25rem 0.65rem;
  border-radius: 99px;
  font-size: 0.7rem;
  font-weight: 600;
  border: 1.5px solid #e2e8f0;
  background: #fff;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  color: #94a3b8;
  font-family: inherit;
}
.status-pill:hover { background: #f1f5f9; }
.status-pill--active.status-pill--active   { background: #dcfce7; color: #15803d; border-color: #86efac; }
.status-pill--active.status-pill--pending  { background: #fef9c3; color: #92400e; border-color: #fde68a; }
.status-pill--active.status-pill--inactive { background: #f1f5f9; color: #475569; border-color: #cbd5e1; }

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
