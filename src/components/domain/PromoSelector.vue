<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { promoApi } from '@/services/api/promo.api'
import type { Promo } from '@/services/api/promo.api'
import { formatRupiah } from '@/utils/formatters'

interface Emits {
  select: [promo: Promo | null]
}

const emit = defineEmits<Emits>()

const promos = ref<Promo[]>([])
const selectedPromoId = ref<string | null>(null)
const isLoading = ref(false)
const showModal = ref(false)

const selectedPromo = computed(() =>
  promos.value.find(p => p.id === selectedPromoId.value) || null
)

const activePromos = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return promos.value.filter(promo => {
    const startDate = new Date(promo.start_date)
    const endDate = new Date(promo.end_date)
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)
    return promo.status === 'active' && today >= startDate && today <= endDate
  })
})

const fetchPromos = async () => {
  try {
    isLoading.value = true
    const response = await promoApi.getActivePromos()
    promos.value = response.data
  } catch {
    promos.value = []
  } finally {
    isLoading.value = false
  }
}

const openModal = () => {
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const handleSelectPromo = (promo: Promo | null) => {
  selectedPromoId.value = promo?.id ?? null
  emit('select', promo)
  closeModal()
}

const formatDiscount = (promo: Promo) => {
  if (promo.discount_type === 'percentage') return `${promo.discount_value}%`
  return formatRupiah(promo.discount_value)
}

onMounted(() => fetchPromos())
</script>

<template>
  <!-- Chip Trigger -->
  <div class="promo-selector">
    <div
      class="selector-display"
      :class="{ 'has-value': selectedPromo }"
      @click="openModal"
    >
      <span class="inline-label"><AppIcon name="promo" :size="13" /> Promo:</span>
      <span v-if="isLoading" class="placeholder">Loading...</span>
      <span v-else-if="selectedPromo" class="selected-value">
        {{ selectedPromo.name }}
        <span class="discount-badge">{{ formatDiscount(selectedPromo) }}</span>
      </span>
      <span v-else class="placeholder">Pilih promo</span>
      <button
        v-if="selectedPromo"
        class="chip-clear"
        @click.stop="handleSelectPromo(null)"
      >
        <AppIcon name="x" :size="12" />
      </button>
      <span v-else class="open-icon">›</span>
    </div>

    <!-- Selected promo info bar -->
    <Transition name="fade">
      <div v-if="selectedPromo" class="promo-info">
        <AppIcon name="check-circle" :size="14" class="info-icon" />
        <span class="info-text">
          Diskon {{ formatDiscount(selectedPromo) }} diterapkan
          <span v-if="selectedPromo.max_discount" class="max-discount">
            (Maks. {{ formatRupiah(selectedPromo.max_discount) }})
          </span>
        </span>
        <button class="btn-clear" @click="handleSelectPromo(null)" title="Hapus promo">
          <AppIcon name="x" :size="13" />
        </button>
      </div>
    </Transition>
  </div>

  <!-- Modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
        <div class="modal-card">
          <!-- Header -->
          <div class="modal-header">
            <span class="modal-title">
              <AppIcon name="promo" :size="16" /> Pilih Promo
            </span>
            <button class="btn-close" @click="closeModal">
              <AppIcon name="x" :size="18" />
            </button>
          </div>

          <!-- List -->
          <div class="modal-list">
            <!-- No promo option -->
            <div
              class="promo-item"
              :class="{ active: !selectedPromo }"
              @click="handleSelectPromo(null)"
            >
              <span class="item-label">Tidak ada promo</span>
              <AppIcon v-if="!selectedPromo" name="check" :size="14" class="item-check" />
            </div>

            <!-- Loading -->
            <div v-if="isLoading" class="list-empty">
              <span class="empty-text">Memuat...</span>
            </div>

            <!-- Empty -->
            <div v-else-if="activePromos.length === 0" class="list-empty">
              <AppIcon name="inbox" :size="28" class="empty-icon" />
              <span class="empty-text">Tidak ada promo aktif</span>
            </div>

            <!-- Promo items -->
            <div
              v-for="promo in activePromos"
              :key="promo.id"
              class="promo-item"
              :class="{ active: selectedPromoId === promo.id }"
              @click="handleSelectPromo(promo)"
            >
              <div class="item-content">
                <span class="item-label">{{ promo.name }}</span>
                <span class="item-discount">{{ formatDiscount(promo) }}</span>
              </div>
              <div class="item-meta-row">
                <span v-if="promo.min_transaction" class="item-meta">
                  Min. {{ formatRupiah(promo.min_transaction) }}
                </span>
                <span v-if="promo.description" class="item-desc">{{ promo.description }}</span>
              </div>
              <AppIcon v-if="selectedPromoId === promo.id" name="check" :size="14" class="item-check" />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Chip trigger */
.promo-selector {
  display: flex;
  flex-direction: column;
}

.selector-display {
  display: flex;
  align-items: center;
  padding: 0.45rem 0.6rem;
  background: white;
  border: 1.5px solid rgba(123, 47, 190, 0.2);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;
  font-size: 0.7rem;
  gap: 0.4rem;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;

  @media (hover: hover) {
    &:hover {
      border-color: rgba(123, 47, 190, 0.4);
      background: rgba(123, 47, 190, 0.02);
    }
  }

  &.has-value {
    border-color: rgba(251, 191, 36, 0.4);
    background: rgba(251, 191, 36, 0.05);
  }
}

.inline-label {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  white-space: nowrap;
  flex-shrink: 0;
}

.placeholder {
  color: var(--color-text-secondary);
  font-size: 0.65rem;
  flex: 1;
}

.selected-value {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--color-text-primary);
  font-weight: 600;
  font-size: 0.7rem;
  flex: 1;
}

.discount-badge {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  color: white;
  padding: 0.12rem 0.35rem;
  border-radius: 5px;
  font-size: 0.6rem;
  font-weight: 800;
  flex-shrink: 0;
}

.chip-clear {
  background: none;
  border: none;
  color: #dc2626;
  cursor: pointer;
  padding: 0 0.25rem;
  opacity: 0.7;
  -webkit-tap-highlight-color: transparent;
  transition: opacity 0.15s ease;

  @media (hover: hover) {
    &:hover { opacity: 1; }
  }
}

.open-icon {
  color: var(--color-text-secondary);
  font-size: 1rem;
  margin-left: auto;
  flex-shrink: 0;
  line-height: 1;
}

/* Selected info bar */
.promo-info {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.45rem;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.08) 0%, rgba(245, 158, 11, 0.04) 100%);
  border: 1px solid rgba(251, 191, 36, 0.25);
  border-radius: 6px;
  margin-top: 0.3rem;
}

.info-icon { flex-shrink: 0; }

.info-text {
  flex: 1;
  font-size: 0.62rem;
  color: var(--color-text-primary);
  font-weight: 600;
  line-height: 1.2;
}

.max-discount {
  font-size: 0.58rem;
  color: var(--color-text-secondary);
  font-weight: 500;
  margin-left: 0.2rem;
}

.btn-clear {
  background: rgba(239, 68, 68, 0.1);
  border: none;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  cursor: pointer;
  color: #dc2626;
  display: flex;
  align-items: center;
  justify-content: center;
  -webkit-tap-highlight-color: transparent;
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.modal-card {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  max-height: 75dvh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  animation: modalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem 0.75rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.btn-close {
  background: rgba(0, 0, 0, 0.06);
  border: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  -webkit-tap-highlight-color: transparent;
}

/* List */
.modal-list {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  flex: 1;
}

.promo-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.8rem 1.25rem;
  cursor: pointer;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  transition: background-color 0.12s ease;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  position: relative;

  &:last-child { border-bottom: none; }

  @media (hover: hover) {
    &:hover { background: rgba(123, 47, 190, 0.04); }
  }

  &.active {
    background: rgba(123, 47, 190, 0.07);
  }
}

.item-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex: 1;
}

.item-label {
  font-size: 0.8rem;
  color: var(--color-text-primary);
  font-weight: 600;
  flex: 1;
}

.item-discount {
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  color: white;
  padding: 0.15rem 0.45rem;
  border-radius: 6px;
  font-size: 0.65rem;
  font-weight: 700;
  white-space: nowrap;
}

.item-meta-row {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  flex: 1;
}

.item-meta {
  font-size: 0.65rem;
  color: var(--color-text-secondary);
}

.item-desc {
  font-size: 0.65rem;
  color: var(--color-text-secondary);
  line-height: 1.3;
}

.item-check {
  color: var(--brand-primary);
  flex-shrink: 0;
  margin-left: auto;
}

.list-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  gap: 0.5rem;
}

.empty-icon { opacity: 0.4; }

.empty-text {
  font-size: 0.78rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }

@keyframes modalSlideIn {
  from { transform: scale(0.95) translateY(10px); opacity: 0; }
  to   { transform: scale(1) translateY(0);        opacity: 1; }
}
</style>
