<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseBottomSheet from '@/components/base/BaseBottomSheet.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseTextField from '@/components/base/BaseTextField.vue'
import type { Customer } from '@/types'
import { DEFAULT_AVATAR } from '@/utils/constants'

type CustomerFormPayload = Pick<
  Customer,
  'name' | 'phone_number' | 'avatar_url' | 'is_member' | 'total_spending' | 'member_type' | 'member_status'
>

interface Props {
  isOpen: boolean
  customer?: Customer | null
  isSubmitting?: boolean
  submitError?: string
  zIndex?: number
}

const props = withDefaults(defineProps<Props>(), {
  customer: null,
  isSubmitting: false,
  submitError: '',
  zIndex: 10000,
})

const emit = defineEmits<{
  close: []
  save: [payload: CustomerFormPayload]
}>()

const form = ref({
  name: '',
  phone_number: '',
  avatar_url: DEFAULT_AVATAR,
  member_type: null as Customer['member_type'],
  member_status: 'inactive' as NonNullable<Customer['member_status']>,
})
const formError = ref('')

const sheetOpen = computed({
  get: () => props.isOpen,
  set: (value: boolean) => {
    if (!value && !props.isSubmitting) emit('close')
  },
})

const resetForm = () => {
  form.value = {
    name: props.customer?.name ?? '',
    phone_number: (props.customer?.phone_number ?? '').replace(/\D/g, ''),
    avatar_url: props.customer?.avatar_url || DEFAULT_AVATAR,
    member_type: props.customer?.member_type ?? null,
    member_status: props.customer?.member_status ?? 'inactive',
  }
  formError.value = ''
}

watch(() => [props.isOpen, props.customer] as const, ([isOpen]) => {
  if (isOpen) resetForm()
}, { immediate: true })

const selectMemberType = (memberType: Customer['member_type']) => {
  form.value.member_type = memberType
  if (memberType === null) form.value.member_status = 'inactive'
}

const handleSubmit = () => {
  formError.value = ''
  if (!form.value.name.trim()) {
    formError.value = 'Nama customer harus diisi'
    return
  }

  const memberType = form.value.member_type
  const memberStatus = memberType ? form.value.member_status : 'inactive'
  emit('save', {
    name: form.value.name.trim(),
    phone_number: form.value.phone_number.trim(),
    avatar_url: form.value.avatar_url.trim() || DEFAULT_AVATAR,
    is_member: memberType !== null && memberStatus === 'active',
    total_spending: props.customer?.total_spending ?? 0,
    member_type: memberType,
    member_status: memberStatus,
  })
}
</script>

<template>
  <BaseBottomSheet
    v-model="sheetOpen"
    size="large"
    :title="customer ? 'Edit Customer' : 'Tambah Customer'"
    :close-on-overlay="!isSubmitting"
    :show-close="!isSubmitting"
    :z-index="zIndex"
  >
    <form @submit.prevent="handleSubmit">
      <BaseTextField
        v-model="form.name"
        label="Nama Lengkap"
        placeholder="Contoh: Andi Wijaya"
        :error="formError"
        required
      />
      <BaseTextField
        :model-value="form.phone_number"
        label="Nomor Telepon"
        placeholder="Contoh: 081234567890"
        @update:model-value="(value) => { form.phone_number = value.replace(/\D/g, '') }"
      />
      <BaseTextField
        v-model="form.avatar_url"
        label="Avatar (Emoji)"
        placeholder="Contoh: 👤"
        :maxlength="2"
      />

      <div class="member-section">
        <label class="member-section-label">Tipe Member</label>
        <div class="tier-pills">
          <button
            v-for="option in [{ value: null, label: 'Non-Member', icon: '-' }, { value: 'umum', label: 'Umum', icon: 'U' }, { value: 'akamsi', label: 'Akamsi', icon: 'A' }, { value: 'vip', label: 'VIP', icon: '*' }]"
            :key="String(option.value)"
            type="button"
            class="tier-pill"
            :class="[`tier-pill--${option.value ?? 'none'}`, { 'tier-pill--active': form.member_type === option.value }]"
            @click="selectMemberType(option.value as Customer['member_type'])"
          >
            <span class="tier-pill-icon">{{ option.icon }}</span>
            <span class="tier-pill-label">{{ option.label }}</span>
          </button>
        </div>

        <div v-if="form.member_type" class="status-row">
          <span class="status-row-label">Status:</span>
          <div class="status-pills">
            <button
              v-for="status in [{ value: 'active', label: 'Aktif' }, { value: 'pending', label: 'Pending' }, { value: 'inactive', label: 'Nonaktif' }]"
              :key="status.value"
              type="button"
              class="status-pill"
              :class="[`status-pill--val-${status.value}`, { 'status-pill--selected': form.member_status === status.value }]"
              @click="form.member_status = status.value as NonNullable<Customer['member_status']>"
            >{{ status.label }}</button>
          </div>
        </div>
      </div>

      <div v-if="submitError" class="form-submit-error">{{ submitError }}</div>
    </form>

    <template #footer>
      <BaseButton variant="secondary" type="button" :disabled="isSubmitting" @click="emit('close')">
        Batal
      </BaseButton>
      <BaseButton variant="primary" :loading="isSubmitting" @click="handleSubmit">
        {{ customer ? 'Update' : 'Simpan' }}
      </BaseButton>
    </template>
  </BaseBottomSheet>
</template>

<style scoped>
.member-section { display: flex; flex-direction: column; gap: 0.6rem; }
.member-section-label { font-size: 0.72rem; font-weight: 600; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
.tier-pills { display: flex; gap: 0.4rem; }
.tier-pill { display: flex; flex: 1; flex-direction: column; align-items: center; gap: 0.2rem; padding: 0.55rem 0.35rem; border: 1.5px solid #e2e8f0; border-radius: 10px; background: #fff; cursor: pointer; font-family: inherit; }
.tier-pill-icon { color: #94a3b8; font-size: 0.95rem; font-weight: 700; line-height: 1; }
.tier-pill-label { color: #94a3b8; font-size: 0.68rem; font-weight: 600; }
.tier-pill--active.tier-pill--none { border-color: #94a3b8; background: #f1f5f9; }
.tier-pill--active.tier-pill--none :is(.tier-pill-icon, .tier-pill-label) { color: #475569; }
.tier-pill--active.tier-pill--umum { border-color: #16a34a; background: #f0fdf4; }
.tier-pill--active.tier-pill--umum :is(.tier-pill-icon, .tier-pill-label) { color: #15803d; }
.tier-pill--active.tier-pill--akamsi { border-color: #2563eb; background: #eff6ff; }
.tier-pill--active.tier-pill--akamsi :is(.tier-pill-icon, .tier-pill-label) { color: #1d4ed8; }
.tier-pill--active.tier-pill--vip { border-color: #7c3aed; background: #fdf4ff; }
.tier-pill--active.tier-pill--vip :is(.tier-pill-icon, .tier-pill-label) { color: #7c3aed; }
.status-row { display: flex; align-items: center; gap: 0.6rem; padding: 0.45rem 0.7rem; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; }
.status-row-label { color: var(--color-text-secondary); font-size: 0.7rem; font-weight: 600; white-space: nowrap; }
.status-pills { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.status-pill { padding: 0.25rem 0.65rem; border: 1.5px solid #e2e8f0; border-radius: 99px; background: #fff; color: #94a3b8; cursor: pointer; font-family: inherit; font-size: 0.7rem; font-weight: 600; }
.status-pill--selected.status-pill--val-active { border-color: #86efac; background: #dcfce7; color: #15803d; }
.status-pill--selected.status-pill--val-pending { border-color: #fde68a; background: #fef9c3; color: #92400e; }
.status-pill--selected.status-pill--val-inactive { border-color: #cbd5e1; background: #f1f5f9; color: #475569; }
.form-submit-error { padding: 0.6rem 0.85rem; border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; background: rgba(254, 242, 242, 0.9); color: #dc2626; font-size: var(--font-size-sm); font-weight: 500; }

@media (max-width: 480px) {
  .tier-pill-label { font-size: 0.62rem; }
  .status-row { align-items: flex-start; flex-direction: column; }
}
</style>
