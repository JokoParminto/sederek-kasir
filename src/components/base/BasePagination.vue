<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  currentPage: number
  totalItems: number
  itemsPerPage: number
  loading?: boolean
  disabled?: boolean
  showLimitSelector?: boolean
  limitOptions?: number[]
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  disabled: false,
  showLimitSelector: true,
  limitOptions: () => [10, 20, 50],
})

const emit = defineEmits<{
  'update:currentPage': [page: number]
  'update:itemsPerPage': [limit: number]
}>()

const totalPages = computed(() => {
  return Math.ceil(props.totalItems / props.itemsPerPage) || 1
})

const visiblePageNumbers = computed(() => {
  const total = totalPages.value
  const current = props.currentPage
  const maxVisible = typeof window !== 'undefined'
    ? window.innerWidth < 768 ? 3 : 7
    : 7

  if (total <= maxVisible) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages: (number | string)[] = []

  pages.push(1)

  const rangeStart = Math.max(2, current - Math.floor((maxVisible - 3) / 2))
  const rangeEnd = Math.min(total - 1, rangeStart + (maxVisible - 4))

  if (rangeEnd === total - 1) {
    for (let i = Math.max(2, rangeEnd - (maxVisible - 4)); i <= rangeEnd; i++) {
      if (i > 1) pages.push(i)
    }
  } else {
    for (let i = rangeStart; i <= rangeEnd; i++) {
      if (i > 1) pages.push(i)
    }
    if (rangeEnd < total - 1) {
      pages.push('...')
    }
  }

  if (total > 1 && !pages.includes(total)) {
    pages.push(total)
  }

  return pages
})

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    emit('update:currentPage', page)
  }
}
</script>

<template>
  <div v-if="totalItems > 0" class="base-pagination">
    <!-- Previous Button -->
    <button
      class="pagination-btn pagination-btn--prev"
      :disabled="currentPage === 1 || disabled || loading"
      @click="goToPage(currentPage - 1)"
      :title="`Go to page ${Math.max(1, currentPage - 1)}`"
    >
      <span class="pagination-btn__text">← Prev</span>
      <span class="pagination-btn__icon">‹</span>
    </button>

    <!-- Page Numbers - Dynamic Display -->
    <div class="pagination-pages">
      <button
        v-for="page in visiblePageNumbers"
        :key="`page-${page}`"
        :class="['pagination-page', {
          active: currentPage === page,
          'pagination-page--ellipsis': page === '...'
        }]"
        :disabled="page === '...' || disabled || loading"
        @click="page !== '...' && goToPage(page as number)"
        :title="`Go to page ${page}`"
      >
        {{ page }}
      </button>
    </div>

    <!-- Next Button -->
    <button
      class="pagination-btn pagination-btn--next"
      :disabled="currentPage === totalPages || disabled || loading"
      @click="goToPage(currentPage + 1)"
      :title="`Go to page ${Math.min(totalPages, currentPage + 1)}`"
    >
      <span class="pagination-btn__text">Next →</span>
      <span class="pagination-btn__icon">›</span>
    </button>

    <!-- Items Per Page Selector -->
    <div v-if="showLimitSelector" class="pagination-limit">
      <label>Items per page:</label>
      <select
        :value="itemsPerPage"
        @change="e => emit('update:itemsPerPage', Number((e.target as HTMLSelectElement).value))"
        class="limit-select"
        :disabled="disabled || loading"
      >
        <option v-for="limit in limitOptions" :key="limit" :value="limit">
          {{ limit }}
        </option>
      </select>
    </div>

    <!-- Page Info - Always shows -->
    <div class="pagination-info">
      <span class="pagination-info__text">
        Page <strong>{{ currentPage }}</strong> of <strong>{{ totalPages }}</strong> |
        <strong>{{ totalItems }}</strong> items
      </span>
    </div>
  </div>
</template>

<style scoped>
.base-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  background: transparent;
  flex-wrap: nowrap;
}

.pagination-btn {
  padding: 0.4rem 0.75rem;
  border: 1px solid rgba(123, 47, 190, 0.2);
  background: linear-gradient(135deg, #f0fdf4 0%, #f0fdfa 100%);
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.8rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  min-height: 2rem;
  white-space: nowrap;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(123, 47, 190, 0.08);
  color: var(--brand-primary-dark);
}

.pagination-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #dcfce7 0%, #ccfbf1 100%);
  border-color: var(--brand-primary);
  color: var(--brand-primary-darker);
  box-shadow: 0 4px 12px rgba(123, 47, 190, 0.2);
  transform: translateY(-2px);
}

.pagination-btn:active:not(:disabled) {
  transform: translateY(0px);
  box-shadow: 0 2px 6px rgba(123, 47, 190, 0.15);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: linear-gradient(135deg, #f3f4f6 0%, #f0fdf4 100%);
}

.pagination-btn__text {
  display: none;
}

@media (min-width: 1024px) {
  .pagination-btn__text {
    display: inline;
  }
}

.pagination-btn__icon {
  display: inline;
}

@media (min-width: 1024px) {
  .pagination-btn__icon {
    display: none;
  }
}

.pagination-pages {
  display: flex;
  gap: 0.3rem;
  flex-wrap: nowrap;
  justify-content: center;
  flex: 1;
  align-items: center;
  min-width: 0;
}

.pagination-page {
  min-width: 2rem;
  height: 2rem;
  padding: 0;
  border: 1px solid rgba(123, 47, 190, 0.15);
  background: linear-gradient(135deg, #ffffff 0%, #f9fdfb 100%);
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.78rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--brand-primary-dark);
  box-shadow: 0 1px 2px rgba(123, 47, 190, 0.05);
  flex-shrink: 0;
}

.pagination-page:hover:not(:disabled) {
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  border-color: rgba(123, 47, 190, 0.4);
  box-shadow: 0 3px 8px rgba(123, 47, 190, 0.12);
  transform: translateY(-1px);
}

.pagination-page.active {
  background: linear-gradient(135deg, var(--brand-primary) 0%, #a78bfa 100%);
  border-color: var(--brand-primary);
  color: white;
  box-shadow: 0 4px 12px rgba(123, 47, 190, 0.25);
  font-weight: 700;
}

.pagination-page.active:hover {
  box-shadow: 0 6px 16px rgba(123, 47, 190, 0.3);
  transform: translateY(-2px);
}

.pagination-page:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: linear-gradient(135deg, #f3f4f6 0%, #f0f0f0 100%);
}

.pagination-page--ellipsis {
  cursor: default;
  background: transparent;
  border: none;
  box-shadow: none;
}

.pagination-page--ellipsis:hover {
  background: transparent;
  border: none;
  transform: none;
}

.pagination-limit {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.5rem;
  background: linear-gradient(135deg, rgba(123, 47, 190, 0.05) 0%, rgba(52, 211, 153, 0.02) 100%);
  border-radius: 6px;
  flex-shrink: 0;
  border: 1px solid rgba(123, 47, 190, 0.1);
}

.pagination-limit label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--brand-primary-dark);
  white-space: nowrap;
  letter-spacing: 0.4px;
}

.limit-select {
  padding: 0.25rem 1.4rem 0.25rem 0.5rem;
  border: 1px solid rgba(123, 47, 190, 0.2);
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
  color: #1f2937;
  min-height: 1.75rem;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2310b981' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.4rem center;
}

.limit-select:hover:not(:disabled) {
  border-color: var(--brand-primary);
  background-color: rgba(123, 47, 190, 0.04);
  box-shadow: 0 3px 10px rgba(123, 47, 190, 0.15);
}

.limit-select:focus {
  outline: none;
  border-color: var(--brand-primary);
  box-shadow: 0 0 0 4px rgba(123, 47, 190, 0.2), 0 3px 10px rgba(123, 47, 190, 0.15);
  background-color: rgba(123, 47, 190, 0.02);
}

.limit-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: #f3f4f6;
}

.pagination-info {
  font-size: 0.72rem;
  color: #6b7280;
  white-space: nowrap;
  font-weight: 500;
  flex-shrink: 0;
}

/* Hide label text on tablet/mobile, just show the select */
@media (max-width: 1023px) {
  .pagination-limit label {
    display: none;
  }
}

/* Tablet Landscape (768px–1023px): icon-only buttons, compact height, no redundant info */
@media (min-width: 768px) and (max-width: 1023px) {
  .base-pagination {
    padding: 0.3rem 0.6rem;
    gap: 0.3rem;
  }

  .pagination-btn {
    min-height: 1.75rem;
    padding: 0.3rem 0.55rem;
    font-size: 0.8rem;
  }

  .pagination-page {
    min-width: 1.75rem;
    height: 1.75rem;
    font-size: 0.75rem;
  }

  .pagination-pages {
    gap: 0.25rem;
  }

  .pagination-info {
    display: none;
  }

  .pagination-limit {
    padding: 0.2rem 0.4rem;
  }

  .limit-select {
    min-height: 1.5rem;
    font-size: 0.72rem;
    padding: 0.15rem 1.2rem 0.15rem 0.4rem;
  }
}

@media (max-width: 767px) {
  .base-pagination {
    flex-wrap: wrap;
    gap: 0.4rem;
    padding: 0.5rem 0.6rem;
  }

  .pagination-pages {
    order: 2;
    flex: 1;
  }

  .pagination-btn {
    flex-shrink: 0;
  }

  .pagination-info {
    width: 100%;
    text-align: center;
    order: 3;
    font-size: 0.7rem;
  }
}
</style>
