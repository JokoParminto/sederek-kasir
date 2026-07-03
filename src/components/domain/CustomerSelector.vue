<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue'
import type { Customer } from '@/types'
import { formatPhoneNumber } from '@/utils/formatters'

interface Props {
  customers: Customer[]
  selectedCustomerId: string | null
  isLoading?: boolean
  isDisabled?: boolean
  isCreating?: boolean
  isLoadingMore?: boolean
  hasMore?: boolean
}

interface Emits {
  select: [customerId: string | null]
  addNew: [customer: Omit<Customer, 'id' | 'last_transaction'>]
  open: []
  loadMore: []
  search: [query: string]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const showModal   = ref(false)
const showAddForm = ref(false)
const searchQuery = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)
const listBodyRef = ref<HTMLElement | null>(null)
const sentinelRef = ref<HTMLElement | null>(null)
const newCustomer = ref({ name: '', phone_number: '' })
const prevCustomerCount = ref(0)

// Tutup form hanya setelah API selesai — sukses = customers bertambah
watch(() => props.isCreating, (cur, prev) => {
  if (prev === true && cur === false) {
    if (props.customers.length > prevCustomerCount.value) {
      newCustomer.value = { name: '', phone_number: '' }
      showAddForm.value = false
      searchQuery.value = ''
    }
  }
})

// Server-side search — debounced 300ms
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(searchQuery, (query) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => emit('search', query), 300)
})

// Infinite scroll — IntersectionObserver on sentinel inside list-body
let observer: IntersectionObserver | null = null

const setupObserver = () => {
  observer?.disconnect()
  if (!sentinelRef.value || !listBodyRef.value) return
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && props.hasMore && !props.isLoadingMore) {
        emit('loadMore')
      }
    },
    { root: listBodyRef.value, threshold: 0.1 }
  )
  observer.observe(sentinelRef.value)
}

onMounted(setupObserver)
onUnmounted(() => {
  observer?.disconnect()
  if (searchTimer) clearTimeout(searchTimer)
})

const selectedCustomer = computed(() =>
  props.customers.find(c => c.id === props.selectedCustomerId)
)

const openModal = () => {
  if (props.isDisabled) return
  emit('open')
  showModal.value = true
  showAddForm.value = false
  searchQuery.value = ''
  nextTick(() => {
    searchInputRef.value?.focus()
    setupObserver()
  })
}

const closeModal = () => {
  showModal.value = false
  showAddForm.value = false
  searchQuery.value = ''
  newCustomer.value = { name: '', phone_number: '' }
}

const handleSelectCustomer = (customerId: string | null) => {
  emit('select', customerId)
  closeModal()
}

const handlePhoneNumberInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  newCustomer.value.phone_number = input.value.replace(/\D/g, '')
}

const handleAddCustomer = () => {
  if (!newCustomer.value.name.trim() || props.isCreating) return
  prevCustomerCount.value = props.customers.length
  emit('addNew', {
    name: newCustomer.value.name.trim(),
    phone_number: newCustomer.value.phone_number
      ? formatPhoneNumber(newCustomer.value.phone_number)
      : '',
    avatar_url: '',
    is_member: false,
    total_spending: 0,
    created_at: new Date(),
    updated_at: new Date(),
  })
  // TIDAK tutup form di sini — watch isCreating yang handle
}
</script>

<template>
  <!-- State: ada pilihan → chip dengan tombol hapus pisah -->
  <div v-if="selectedCustomer" class="selected-chip" :class="{ disabled: isDisabled }">
    <button class="chip-main" @click="openModal" :disabled="isDisabled">
      <div class="chip-avatar">{{ selectedCustomer.name.charAt(0).toUpperCase() }}</div>
      <span class="chip-name">{{ selectedCustomer.name }}</span>
      <span
        v-if="selectedCustomer.is_member && selectedCustomer.member_status === 'active'"
        class="chip-tier-badge"
        :class="`chip-tier-badge--${selectedCustomer.member_type}`"
      >{{ selectedCustomer.member_type?.toUpperCase() ?? 'MEMBER' }}</span>
      <span class="chip-change">Ganti</span>
    </button>
    <button v-if="!isDisabled" class="chip-clear" @click="handleSelectCustomer(null)" title="Hapus pilihan">
      <AppIcon name="x" :size="14" />
    </button>
    <AppIcon v-if="isDisabled" name="lock" :size="13" class="chip-lock" />
  </div>

  <!-- State: kosong → button pick -->
  <button
    v-else
    class="pick-button"
    @click="openModal"
    :disabled="isDisabled"
  >
    <AppIcon name="search" :size="14" class="pick-icon" />
    <span class="pick-label">Pilih Customer <span class="pick-hint">(Opsional)</span></span>
    <AppIcon v-if="isDisabled" name="lock" :size="13" class="pick-lock" />
  </button>

  <!-- Modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-card">

          <!-- Header -->
          <div class="modal-header">
            <h3 class="modal-title">
              <AppIcon v-if="showAddForm" name="user-plus" :size="16" />
              <AppIcon v-else name="users" :size="16" />
              {{ showAddForm ? 'Tambah Customer Baru' : 'Pilih Customer' }}
            </h3>
            <button class="btn-modal-close" @click="closeModal">
              <AppIcon name="x" :size="18" />
            </button>
          </div>

          <!-- Add Form -->
          <div v-if="showAddForm" class="add-form">
            <div class="field-group">
              <label class="field-label">Nama Customer <span class="required">*</span></label>
              <input
                v-model="newCustomer.name"
                type="text"
                class="input-field"
                placeholder="Masukkan nama customer"
                @keyup.enter="handleAddCustomer"
                autofocus
              />
            </div>
            <div class="field-group">
              <label class="field-label">No. HP <span class="optional">(Opsional)</span></label>
              <input
                :value="newCustomer.phone_number"
                type="text"
                inputmode="numeric"
                class="input-field"
                placeholder="Contoh: 08123456789"
                @input="handlePhoneNumberInput"
                @keyup.enter="handleAddCustomer"
              />
            </div>
            <div class="form-actions">
              <button class="btn-form-cancel" @click="showAddForm = false" :disabled="isCreating">Batal</button>
              <button class="btn-form-save" @click="handleAddCustomer" :disabled="!newCustomer.name.trim() || isCreating">
                <template v-if="isCreating">
                  <AppIcon name="loader" :size="14" class="spin" /> Menyimpan...
                </template>
                <template v-else>
                  <AppIcon name="check" :size="14" /> Simpan
                </template>
              </button>
            </div>
          </div>

          <!-- Customer List -->
          <template v-else>
            <!-- Search + Add -->
            <div class="list-toolbar">
              <div class="search-wrapper">
                <AppIcon name="search" :size="14" class="search-icon" />
                <input
                  ref="searchInputRef"
                  v-model="searchQuery"
                  type="text"
                  class="search-input"
                  placeholder="Cari nama atau no. HP..."
                />
                <button v-if="searchQuery" class="btn-clear-search" @click="searchQuery = ''">
                  <AppIcon name="x" :size="12" />
                </button>
              </div>
              <button class="btn-add-new" @click="showAddForm = true">
                <AppIcon name="plus" :size="14" /> Baru
              </button>
            </div>

            <!-- Hapus pilihan -->
            <div v-if="selectedCustomerId" class="selected-bar">
              <span class="selected-label">
                <AppIcon name="check-circle" :size="13" />
                {{ selectedCustomer?.name }}
              </span>
              <button class="btn-remove" @click="handleSelectCustomer(null)">
                <AppIcon name="x" :size="13" /> Hapus
              </button>
            </div>

            <!-- List -->
            <div ref="listBodyRef" class="list-body">
              <div v-if="!isLoading && customers.length === 0" class="empty-state">
                <AppIcon name="users" :size="28" class="empty-icon" />
                <p>Tidak ada customer ditemukan</p>
              </div>
              <button
                v-for="customer in customers"
                :key="customer.id"
                class="customer-item"
                :class="{ active: customer.id === selectedCustomerId }"
                @click="handleSelectCustomer(customer.id)"
              >
                <div class="customer-avatar">{{ customer.name.charAt(0).toUpperCase() }}</div>
                <div class="customer-info">
                  <div class="customer-name-row">
                    <span class="customer-name">{{ customer.name }}</span>
                    <span v-if="customer.is_member && customer.member_status === 'active'" class="member-badge" :class="`member-badge--${customer.member_type}`">
                      {{ customer.member_type?.toUpperCase() ?? 'MEMBER' }}
                    </span>
                    <span v-else-if="customer.member_type && customer.member_status !== 'active'" class="member-badge member-badge--pending">
                      {{ customer.member_type?.toUpperCase() }} (pending)
                    </span>
                  </div>
                  <span v-if="customer.phone_number" class="customer-phone">{{ customer.phone_number }}</span>
                </div>
                <AppIcon v-if="customer.id === selectedCustomerId" name="check" :size="16" class="check-icon" />
              </button>

              <!-- Infinite scroll sentinel -->
              <div ref="sentinelRef" class="load-sentinel">
                <div v-if="isLoadingMore" class="load-more-spinner">
                  <AppIcon name="loader" :size="16" class="spin" />
                </div>
              </div>
            </div>
          </template>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── State: kosong — pick button ── */
.pick-button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.85rem;
  background: transparent;
  border: 1.5px dashed rgba(123, 47, 190, 0.25);
  border-radius: 10px;
  cursor: pointer;
  min-height: 40px;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  transition: border-color 0.15s ease, background-color 0.15s ease;

  &:active:not(:disabled) {
    background: rgba(123, 47, 190, 0.04);
    border-color: rgba(123, 47, 190, 0.45);
  }

  @media (hover: hover) {
    &:hover:not(:disabled) {
      border-color: rgba(123, 47, 190, 0.4);
      background: rgba(123, 47, 190, 0.02);
    }
  }

  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.pick-icon { opacity: 0.45; flex-shrink: 0; }

.pick-label {
  flex: 1;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-align: left;
}

.pick-hint { opacity: 0.65; font-weight: 400; }
.pick-lock { opacity: 0.4; flex-shrink: 0; }

/* ── State: ada pilihan — chip ── */
.selected-chip {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0;
  background: rgba(123, 47, 190, 0.06);
  border: 1.5px solid rgba(123, 47, 190, 0.25);
  border-radius: 10px;
  min-height: 40px;
  overflow: hidden;

  &.disabled { opacity: 0.7; }
}

.chip-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.6rem;
  background: none;
  border: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;

  &:active:not(:disabled) { background: rgba(123, 47, 190, 0.08); }
  &:disabled { cursor: not-allowed; }
}

.chip-avatar {
  width: 26px;
  height: 26px;
  min-width: 26px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  color: white;
  font-weight: 700;
  font-size: 0.72rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.chip-name {
  font-weight: 700;
  font-size: 0.8rem;
  color: var(--color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
  text-align: left;
}

.chip-star { opacity: 0.75; flex-shrink: 0; color: #d97706; }
.chip-tier-badge {
  font-size: 0.6rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 99px;
  flex-shrink: 0;
  background: #f0fdf4;
  color: #15803d;
  border: 1px solid #bbf7d0;
}
.chip-tier-badge--umum   { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
.chip-tier-badge--akamsi { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
.chip-tier-badge--vip    { background: #fdf4ff; color: #7e22ce; border-color: #e9d5ff; }

.chip-change {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--color-primary);
  opacity: 0.55;
  flex-shrink: 0;
  white-space: nowrap;
}

.chip-clear {
  width: 36px;
  height: 100%;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-left: 1px solid rgba(123, 47, 190, 0.15);
  cursor: pointer;
  color: var(--color-text-secondary);
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;

  &:active { background: rgba(239, 68, 68, 0.08); color: #dc2626; }
}

.chip-lock { opacity: 0.4; padding: 0 0.5rem; flex-shrink: 0; }

/* ── Modal Overlay ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: env(safe-area-inset-top, 16px) 16px env(safe-area-inset-bottom, 16px) 16px;
}

.modal-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.2), 0 8px 24px rgba(123, 47, 190, 0.12);
  width: 100%;
  max-width: 420px;
  max-height: min(560px, calc(100dvh - env(safe-area-inset-top, 16px) - env(safe-area-inset-bottom, 16px) - 32px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Modal Header ── */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.1rem 0.85rem;
  border-bottom: 1px solid rgba(123, 47, 190, 0.1);
  flex-shrink: 0;
}

.modal-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;

  &:active { background: rgba(0, 0, 0, 0.1); }
}

/* ── Toolbar (search + add) ── */
.list-toolbar {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 0.85rem 0.5rem;
  flex-shrink: 0;
}

.search-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.6rem;
  opacity: 0.45;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 0.55rem 2rem 0.55rem 2rem;
  border: 1.5px solid rgba(123, 47, 190, 0.15);
  border-radius: 9px;
  font-size: 0.85rem;
  font-family: var(--font-family-body);
  background: rgba(123, 47, 190, 0.02);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:focus {
    outline: none;
    border-color: var(--color-primary);
    background: white;
    box-shadow: 0 0 0 3px rgba(123, 47, 190, 0.1);
  }

  &::placeholder { color: var(--color-text-hint); }
}

.btn-clear-search {
  position: absolute;
  right: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-hint);
  display: flex;
  align-items: center;
  padding: 0.2rem;
  border-radius: 4px;
  -webkit-tap-highlight-color: transparent;

  &:active { color: var(--color-text-primary); }
}

.btn-add-new {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.55rem 0.8rem;
  background: rgba(123, 47, 190, 0.08);
  color: var(--brand-primary);
  border: 1.5px solid rgba(123, 47, 190, 0.2);
  border-radius: 9px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  transition: background-color 0.15s ease;

  &:active { background: rgba(123, 47, 190, 0.15); }
}

/* ── Selected bar ── */
.selected-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0.85rem 0.35rem;
  padding: 0.4rem 0.7rem;
  background: rgba(123, 47, 190, 0.06);
  border: 1px solid rgba(123, 47, 190, 0.18);
  border-radius: 8px;
  flex-shrink: 0;
}

.selected-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-primary);
}

.btn-remove {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: rgba(239, 68, 68, 0.06);
  color: #dc2626;
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;

  &:active { background: rgba(239, 68, 68, 0.14); }
}

/* ── Customer List ── */
.list-body {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  padding: 0 0.5rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem 1rem;
  color: var(--color-text-secondary);
  font-size: 0.82rem;

  p { margin: 0; }
}

.empty-icon { opacity: 0.25; }

.load-sentinel {
  height: 1px;
  width: 100%;
}

.load-more-spinner {
  display: flex;
  justify-content: center;
  padding: 0.5rem 0;
  color: var(--color-primary);
  opacity: 0.6;
}

.customer-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.75rem;
  background: white;
  border: 1.5px solid rgba(123, 47, 190, 0.07);
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  width: 100%;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  transition: background-color 0.12s ease, border-color 0.12s ease;

  &:active { background: rgba(123, 47, 190, 0.06); }

  &.active {
    background: rgba(123, 47, 190, 0.06);
    border-color: var(--color-primary);
    border-width: 1.5px;
  }
}

.customer-avatar {
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(123, 47, 190, 0.15) 0%, rgba(123, 47, 190, 0.08) 100%);
  color: var(--color-primary);
  font-weight: 700;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.customer-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.customer-name-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.customer-name {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.1rem 0.45rem;
  border-radius: 99px;
  font-size: 0.62rem;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
  background: rgba(234, 179, 8, 0.12);
  color: #92400e;
  border: 1px solid rgba(234, 179, 8, 0.3);
}
.member-badge--umum   { background: #f0fdf4; color: #15803d; border-color: #bbf7d0; }
.member-badge--akamsi { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
.member-badge--vip    { background: #fdf4ff; color: #7e22ce; border-color: #e9d5ff; }
.member-badge--pending { background: #f8fafc; color: #94a3b8; border-color: #e2e8f0; }

.customer-phone {
  font-size: 0.73rem;
  color: var(--color-text-secondary);
}

.check-icon {
  color: var(--color-primary);
  flex-shrink: 0;
}

/* ── Add Form ── */
.add-form {
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.required { color: #ef4444; }
.optional { font-weight: 400; color: var(--color-text-hint); }

.input-field {
  padding: 0.65rem 0.85rem;
  border: 1.5px solid rgba(123, 47, 190, 0.15);
  border-radius: 9px;
  font-size: 0.88rem;
  font-family: var(--font-family-body);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  background: white;

  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(123, 47, 190, 0.1);
  }

  &::placeholder { color: var(--color-text-hint); font-weight: 400; }
}

.form-actions {
  display: flex;
  gap: 0.6rem;
  padding-top: 0.25rem;
}

.btn-form-cancel {
  flex: 1;
  padding: 0.65rem;
  background: rgba(0, 0, 0, 0.04);
  color: var(--color-text-secondary);
  border: 1.5px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;

  &:active { background: rgba(0, 0, 0, 0.08); }
}

.btn-form-save {
  flex: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.65rem;
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;

  &:active:not(:disabled) { opacity: 0.88; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.spin {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Transition (sama dengan modal-content pattern) ── */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-card {
  animation: modalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes modalSlideIn {
  from { transform: scale(0.95) translateY(10px); opacity: 0; }
  to   { transform: scale(1) translateY(0); opacity: 1; }
}

/* ── Tablet compact ── */
@media (min-width: 960px) and (max-width: 1279px) {
  .modal-card { max-width: 380px; }
  .customer-item { padding: 0.55rem 0.65rem; }
  .customer-avatar { width: 32px; height: 32px; min-width: 32px; font-size: 0.85rem; }
  .customer-name { font-size: 0.8rem; }
  .customer-phone { font-size: 0.68rem; }
}
</style>
