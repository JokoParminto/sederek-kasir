<script setup lang="ts">
import { computed } from 'vue'
import BasePagination from './BasePagination.vue'

interface Props {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
}

const props = withDefaults(defineProps<Props>(), {
  currentPage: 1,
  itemsPerPage: 10
})

const emit = defineEmits<{
  'update:currentPage': [page: number]
}>()

const startItem = computed(() => {
  return (props.currentPage - 1) * props.itemsPerPage + 1
})

const endItem = computed(() => {
  return Math.min(props.currentPage * props.itemsPerPage, props.totalItems)
})

const handlePageChange = (page: number) => {
  emit('update:currentPage', page)
}
</script>

<template>
  <div class="table-pagination">
    <BasePagination
      :current-page="currentPage"
      :total-items="totalItems"
      :items-per-page="itemsPerPage"
      @update:current-page="handlePageChange"
    />

    <div class="pagination-info">
      <span v-if="totalItems > 0">
        Showing <strong>{{ startItem }}</strong> to <strong>{{ endItem }}</strong> 
        of <strong>{{ totalItems }}</strong> items
      </span>
      <span v-else class="no-items">No items to display</span>
    </div>
  </div>
</template>

<style scoped>
.table-pagination {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-top: 1px solid rgba(123, 47, 190, 0.08);
  background: linear-gradient(135deg, rgba(123, 47, 190, 0.02) 0%, rgba(52, 211, 153, 0.02) 100%);
  flex-shrink: 0;
}

.pagination-info {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  text-align: center;

  strong {
    font-weight: 600;
    color: var(--color-text-primary);
  }
}

.no-items {
  color: var(--color-text-tertiary);
  font-style: italic;
}

/* Responsive: Mobile */
@media (max-width: 767px) {
  .table-pagination {
    padding: 1rem;
    gap: 0.75rem;
  }

  .pagination-info {
    font-size: 0.75rem;
  }
}

/* Responsive: Tablet — single row, minimal padding */
@media (min-width: 768px) and (max-width: 1023px) {
  .table-pagination {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 0.25rem 0.6rem;
    gap: 0.5rem;
  }

  .pagination-info {
    font-size: 0.68rem;
    white-space: nowrap;
    flex-shrink: 0;
    color: var(--color-text-tertiary);
  }
}
</style>
