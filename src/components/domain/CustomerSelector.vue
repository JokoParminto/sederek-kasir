<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import BaseBottomSheet from '@/components/base/BaseBottomSheet.vue'
import type { Customer } from '@/types'

interface Props {
  modelValue: boolean
  customers: Customer[]
  selectedCustomerId: string | null
  selectedCustomer?: Customer | null
  total?: number
  isLoading?: boolean
  isDisabled?: boolean
  isLoadingMore?: boolean
  hasMore?: boolean
  loadMoreError?: string
  isCovered?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  total: 0,
  isLoading: false,
  isDisabled: false,
  isLoadingMore: false,
  hasMore: false,
  loadMoreError: '',
  isCovered: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  select: [customerId: string | null]
  addNew: []
  open: []
  loadMore: []
  retry: []
  search: [query: string]
  edit: [customer: Customer]
}>()

const showSheet = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})
const searchQuery = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)
const scrollAreaRef = ref<HTMLElement | null>(null)
const sentinelRef = ref<HTMLElement | null>(null)

const activeCustomer = computed(() =>
  props.customers.find(customer => customer.id === props.selectedCustomerId)
    ?? (props.selectedCustomer?.id === props.selectedCustomerId ? props.selectedCustomer : null)
)

const loadedLabel = computed(() => {
  const total = Math.max(props.total, props.customers.length)
  return `${props.customers.length} dari ${total} customer`
})

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(searchQuery, (query) => {
  if (!showSheet.value) return
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => emit('search', query.trim()), 300)
})

let observer: IntersectionObserver | null = null
const setupObserver = () => {
  observer?.disconnect()
  if (!showSheet.value || props.isCovered || !sentinelRef.value || !scrollAreaRef.value) return

  observer = new IntersectionObserver(
    entries => {
      if (entries[0]?.isIntersecting && props.hasMore && !props.isLoading && !props.isLoadingMore) {
        emit('loadMore')
      }
    },
    { root: scrollAreaRef.value, rootMargin: '160px 0px', threshold: 0.01 }
  )
  observer.observe(sentinelRef.value)
}

watch(
  () => [showSheet.value, props.isCovered, props.customers.length, props.hasMore] as const,
  () => nextTick(setupObserver)
)

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) return
  if (searchTimer) {
    clearTimeout(searchTimer)
    searchTimer = null
  }
  searchQuery.value = ''
  observer?.disconnect()
})

onUnmounted(() => {
  observer?.disconnect()
  if (searchTimer) clearTimeout(searchTimer)
})

const openSheet = () => {
  if (props.isDisabled) return
  searchQuery.value = ''
  showSheet.value = true
  emit('open')
  nextTick(() => {
    searchInputRef.value?.focus()
    setupObserver()
  })
}

const closeSheet = () => {
  if (searchTimer) {
    clearTimeout(searchTimer)
    searchTimer = null
  }
  showSheet.value = false
  searchQuery.value = ''
  observer?.disconnect()
}

const handleSelect = (customerId: string | null) => {
  emit('select', customerId)
  closeSheet()
}

const handleAdd = () => {
  emit('addNew')
}

const handleEdit = (customer: Customer) => {
  emit('edit', customer)
}
</script>

<template>
  <div v-if="activeCustomer" class="selected-chip" :class="{ disabled: isDisabled }">
    <button class="chip-main" :disabled="isDisabled" @click="openSheet">
      <div class="chip-avatar">{{ activeCustomer.name.charAt(0).toUpperCase() }}</div>
      <span class="chip-name">{{ activeCustomer.name }}</span>
      <span
        v-if="activeCustomer.is_member && activeCustomer.member_status === 'active'"
        class="chip-tier-badge"
        :class="`chip-tier-badge--${activeCustomer.member_type}`"
      >{{ activeCustomer.member_type?.toUpperCase() ?? 'MEMBER' }}</span>
      <span class="chip-change">Ganti</span>
    </button>
    <button v-if="!isDisabled" class="chip-clear" title="Hapus pilihan" @click="handleSelect(null)">
      <AppIcon name="x" :size="14" />
    </button>
    <AppIcon v-else name="lock" :size="13" class="chip-lock" />
  </div>

  <button v-else class="pick-button" :disabled="isDisabled" @click="openSheet">
    <AppIcon name="search" :size="16" class="pick-icon" />
    <span class="pick-label">Pilih Customer <span class="pick-hint">(Opsional)</span></span>
    <AppIcon v-if="isDisabled" name="lock" :size="13" class="pick-lock" />
  </button>

  <BaseBottomSheet
    v-model="showSheet"
    size="full"
    sheet-class="customer-picker-sheet"
    body-class="customer-picker-body"
    :close-on-overlay="!isCovered"
    :close-on-escape="!isCovered"
    :is-inert="isCovered"
    :z-index="10000"
    @close="closeSheet"
  >
    <template #header>
      <div class="sheet-heading">
        <div class="sheet-title-row">
          <span class="sheet-title-icon"><AppIcon name="users" :size="20" /></span>
          <div>
            <h2>Pilih Customer</h2>
            <p>{{ loadedLabel }}</p>
          </div>
        </div>
      </div>
    </template>

    <div class="sheet-content">
      <div class="sheet-toolbar">
        <div class="search-wrapper">
          <AppIcon name="search" :size="18" class="search-icon" />
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="search"
            class="search-input"
            placeholder="Cari nama atau nomor HP..."
          />
          <button v-if="searchQuery" class="clear-search" title="Hapus pencarian" @click="searchQuery = ''">
            <AppIcon name="x" :size="16" />
          </button>
        </div>
        <button class="add-customer" @click="handleAdd">
          <AppIcon name="user-plus" :size="18" />
          <span>Customer Baru</span>
        </button>
      </div>

      <div ref="scrollAreaRef" class="customer-scroll">
        <div v-if="isLoading && customers.length === 0" class="customer-grid" aria-label="Memuat customer">
          <div v-for="index in 10" :key="index" class="customer-card skeleton-card">
            <span class="skeleton skeleton-avatar"></span>
            <span class="skeleton-copy">
              <span class="skeleton skeleton-name"></span>
              <span class="skeleton skeleton-phone"></span>
            </span>
          </div>
        </div>

        <template v-else>
          <div v-if="customers.length > 0" class="customer-grid">
            <button
              class="customer-card no-customer-card"
              :class="{ selected: selectedCustomerId === null }"
              @click="handleSelect(null)"
            >
              <span class="walk-in-icon"><AppIcon name="user" :size="20" /></span>
              <span class="customer-copy">
                <strong>Tanpa customer</strong>
                <small>Gunakan transaksi walk-in</small>
              </span>
              <AppIcon v-if="selectedCustomerId === null" name="check-circle" :size="20" class="selected-check" />
            </button>

            <article
              v-for="customer in customers"
              :key="customer.id"
              class="customer-card"
              :class="{ selected: customer.id === selectedCustomerId }"
            >
              <button class="customer-select" @click="handleSelect(customer.id)">
                <span class="customer-avatar">{{ customer.name.charAt(0).toUpperCase() }}</span>
                <span class="customer-copy">
                  <span class="customer-name-row">
                    <strong>{{ customer.name }}</strong>
                    <span
                      v-if="customer.member_type"
                      class="member-badge"
                      :class="[
                        `member-badge--${customer.member_type}`,
                        { 'member-badge--inactive': customer.member_status !== 'active' },
                      ]"
                    >{{ customer.member_type.toUpperCase() }}</span>
                  </span>
                  <small>{{ customer.phone_number || 'Tidak ada nomor HP' }}</small>
                  <span v-if="customer.member_type && customer.member_status !== 'active'" class="member-status">
                    {{ customer.member_status === 'pending' ? 'Pending' : 'Nonaktif' }}
                  </span>
                </span>
                <AppIcon v-if="customer.id === selectedCustomerId" name="check-circle" :size="20" class="selected-check" />
              </button>
              <button class="customer-edit" title="Edit customer" @click="handleEdit(customer)">
                <AppIcon name="edit" :size="18" />
              </button>
            </article>
          </div>

          <div v-else class="empty-state">
            <span class="empty-icon"><AppIcon name="users" :size="32" /></span>
            <h3>{{ searchQuery ? 'Customer tidak ditemukan' : 'Belum ada customer' }}</h3>
            <p v-if="searchQuery">Tidak ada hasil untuk “{{ searchQuery }}”.</p>
            <p v-else>Tambahkan customer pertama untuk mulai menyimpan data pelanggan.</p>
            <div class="empty-actions">
              <button v-if="searchQuery" class="secondary-action" @click="searchQuery = ''">Hapus Pencarian</button>
              <button class="primary-action" @click="handleAdd"><AppIcon name="plus" :size="17" /> Tambah Customer</button>
            </div>
          </div>
        </template>

        <div ref="sentinelRef" class="load-sentinel">
          <div v-if="isLoadingMore" class="load-state">
            <AppIcon name="loader" :size="18" class="spin" /> Memuat customer...
          </div>
          <div v-else-if="loadMoreError" class="load-error">
            <span>{{ loadMoreError }}</span>
            <button @click="emit('retry')">Coba Lagi</button>
          </div>
          <div v-else-if="customers.length > 0 && !hasMore" class="list-end">Semua customer sudah ditampilkan</div>
        </div>
      </div>
    </div>
  </BaseBottomSheet>
</template>

<style scoped>
.pick-button,
.selected-chip {
  width: 100%;
  min-height: 42px;
  border: 1px solid var(--brand-border-primary);
  border-radius: 10px;
  background: var(--color-surface-0);
}

.pick-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.pick-button:hover:not(:disabled) { background: var(--brand-primary-pale); }
.pick-button:disabled { cursor: not-allowed; opacity: 0.5; }
.pick-icon, .pick-lock { flex-shrink: 0; color: var(--color-primary); }
.pick-label { flex: 1; text-align: left; font-size: 12px; font-weight: 600; }
.pick-hint { color: var(--color-text-tertiary); font-weight: 400; }

.selected-chip { display: flex; align-items: stretch; overflow: hidden; background: var(--brand-primary-pale); }
.selected-chip.disabled { opacity: 0.7; }
.chip-main { min-width: 0; flex: 1; display: flex; align-items: center; gap: 8px; padding: 6px 10px; border: 0; background: transparent; cursor: pointer; }
.chip-avatar, .customer-avatar, .walk-in-icon {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--brand-gradient-primary);
  color: var(--color-on-primary);
  font-weight: 700;
}
.chip-avatar { width: 28px; height: 28px; font-size: 12px; }
.chip-name { min-width: 0; flex: 1; overflow: hidden; color: var(--color-primary-dark); font-size: 12px; font-weight: 700; text-align: left; text-overflow: ellipsis; white-space: nowrap; }
.chip-change { color: var(--color-primary); font-size: 11px; font-weight: 600; }
.chip-tier-badge, .member-badge { border-radius: 999px; font-size: 10px; font-weight: 700; line-height: 1; }
.chip-tier-badge { padding: 4px 7px; background: #f0fdf4; color: #15803d; }
.chip-tier-badge--akamsi { background: #eff6ff; color: #1d4ed8; }
.chip-tier-badge--vip { background: #fdf4ff; color: #7e22ce; }
.chip-clear { width: 40px; border: 0; border-left: 1px solid var(--brand-border-primary); background: transparent; color: var(--color-danger); cursor: pointer; }
.chip-lock { align-self: center; margin: 0 12px; }

.sheet-heading { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.sheet-title-row { display: flex; align-items: center; gap: 12px; }
.sheet-title-icon { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 12px; background: var(--brand-primary-pale); color: var(--color-primary); }
.sheet-heading h2 { margin: 0; color: var(--color-text-primary); font-family: var(--font-family-body); font-size: 18px; font-weight: 700; }
.sheet-heading p { margin: 2px 0 0; color: var(--color-text-tertiary); font-size: 12px; }

.sheet-content { height: 100%; min-height: 0; display: flex; flex-direction: column; background: var(--color-surface-1); }
.sheet-toolbar { flex: 0 0 auto; display: flex; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--color-border-light); background: var(--color-surface-0); }
.search-wrapper { min-width: 0; flex: 1; position: relative; display: flex; align-items: center; }
.search-icon { position: absolute; left: 14px; color: var(--color-text-tertiary); pointer-events: none; }
.search-input { width: 100%; height: 48px; padding: 0 44px; border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-surface-1); color: var(--color-text-primary); font-family: var(--font-family-body); font-size: 14px; }
.search-input:focus { outline: 2px solid var(--brand-overlay-primary-20); border-color: var(--color-primary); background: var(--color-surface-0); }
.clear-search { position: absolute; right: 4px; width: 40px; height: 40px; display: grid; place-items: center; border: 0; background: transparent; color: var(--color-text-tertiary); cursor: pointer; }
.add-customer { height: 48px; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 0 18px; border: 0; border-radius: 12px; background: var(--brand-gradient-primary); box-shadow: var(--brand-shadow-primary); color: var(--color-on-primary); font-family: var(--font-family-body); font-size: 13px; font-weight: 700; cursor: pointer; }

.customer-scroll { min-height: 0; flex: 1; overflow-y: auto; overscroll-behavior: contain; padding: 14px 16px calc(20px + env(safe-area-inset-bottom)); }
.customer-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; }
.customer-card { min-width: 0; min-height: 72px; display: flex; align-items: stretch; position: relative; overflow: hidden; border: 1px solid var(--color-border-light); border-radius: 12px; background: var(--color-surface-0); box-shadow: var(--shadow-1); transition: border-color 150ms ease, background 150ms ease, box-shadow 150ms ease; }
.customer-card:hover { border-color: var(--brand-border-primary); box-shadow: var(--shadow-2); }
.customer-card.selected { border-color: var(--color-primary); background: var(--brand-primary-pale); box-shadow: 0 0 0 1px var(--brand-overlay-primary-15); }
.customer-card.selected::before { content: ''; position: absolute; inset: 0 auto 0 0; width: 4px; background: var(--color-primary); }
.customer-select, .no-customer-card { min-width: 0; flex: 1; display: flex; align-items: center; gap: 12px; padding: 12px 12px 12px 16px; border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; }
.no-customer-card { width: 100%; font-family: var(--font-family-body); }
.customer-avatar, .walk-in-icon { width: 42px; height: 42px; font-size: 15px; }
.walk-in-icon { background: var(--color-surface-2); color: var(--color-text-secondary); }
.customer-copy { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 3px; }
.customer-copy strong { min-width: 0; overflow: hidden; color: var(--color-text-primary); font-size: 14px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.customer-copy small { overflow: hidden; color: var(--color-text-tertiary); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.customer-name-row { min-width: 0; display: flex; align-items: center; gap: 7px; }
.customer-name-row strong { flex: 0 1 auto; }
.member-badge { flex: 0 0 auto; padding: 4px 7px; border: 1px solid #bbf7d0; background: #f0fdf4; color: #15803d; }
.member-badge--akamsi { border-color: #bfdbfe; background: #eff6ff; color: #1d4ed8; }
.member-badge--vip { border-color: #e9d5ff; background: #fdf4ff; color: #7e22ce; }
.member-badge--inactive { filter: grayscale(0.65); opacity: 0.68; }
.member-status { color: var(--color-warning); font-size: 10px; font-weight: 600; }
.selected-check { flex: 0 0 auto; color: var(--color-primary); }
.customer-edit { flex: 0 0 48px; width: 48px; display: grid; place-items: center; border: 0; border-left: 1px solid var(--color-border-light); background: transparent; color: var(--color-primary); cursor: pointer; }
.customer-edit:hover { background: var(--brand-overlay-primary-10); }

.skeleton-card { padding: 14px 16px; gap: 12px; }
.skeleton { display: block; border-radius: 8px; background: linear-gradient(90deg, var(--color-surface-2), var(--color-surface-3), var(--color-surface-2)); background-size: 200% 100%; animation: shimmer 1.3s infinite; }
.skeleton-avatar { width: 42px; height: 42px; border-radius: 50%; }
.skeleton-copy { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 8px; }
.skeleton-name { width: 60%; height: 12px; }
.skeleton-phone { width: 42%; height: 9px; }

.empty-state { min-height: 260px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 16px; text-align: center; }
.empty-icon { width: 64px; height: 64px; display: grid; place-items: center; border-radius: 20px; background: var(--brand-primary-pale); color: var(--color-primary); }
.empty-state h3 { margin: 16px 0 6px; color: var(--color-text-primary); font-size: 16px; }
.empty-state p { max-width: 420px; margin: 0; color: var(--color-text-tertiary); font-size: 13px; }
.empty-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 18px; }
.empty-actions button { min-height: 44px; padding: 0 16px; border-radius: 10px; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
.secondary-action { border: 1px solid var(--color-border); background: var(--color-surface-0); color: var(--color-text-secondary); }
.primary-action { display: flex; align-items: center; gap: 7px; border: 0; background: var(--brand-gradient-primary); color: var(--color-on-primary); }

.load-sentinel { min-height: 44px; display: flex; align-items: center; justify-content: center; margin-top: 8px; }
.load-state, .list-end { display: flex; align-items: center; gap: 8px; color: var(--color-text-tertiary); font-size: 12px; }
.load-error { display: flex; align-items: center; gap: 10px; color: var(--color-danger); font-size: 12px; }
.load-error button { min-height: 36px; padding: 0 12px; border: 1px solid currentColor; border-radius: 8px; background: transparent; color: inherit; cursor: pointer; }
.spin { animation: spin 0.8s linear infinite; }

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes shimmer { to { background-position: -200% 0; } }

:global(.customer-picker-sheet) { width: 100%; max-width: 100%; border-radius: 22px 22px 0 0; }
:global(.customer-picker-body) { min-height: 0; padding: 0; overflow: hidden; gap: 0; }

@media (min-width: 768px) {
  .customer-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .no-customer-card { grid-column: 1 / -1; }
  .sheet-toolbar { padding: 12px 24px; }
  .customer-scroll { padding: 16px 24px calc(24px + env(safe-area-inset-bottom)); }
}

@media (min-width: 1280px) {
  .customer-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (max-width: 480px) {
  .sheet-toolbar { flex-direction: column; }
  .add-customer { width: 100%; }
  .sheet-heading h2 { font-size: 16px; }
  .sheet-title-icon { width: 36px; height: 36px; }
  .customer-scroll { padding-inline: 12px; }
}
</style>
