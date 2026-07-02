<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseTableHeader from './BaseTableHeader.vue'
import type { Column } from './BaseTableHeader.vue'
import BaseTableRow from './BaseTableRow.vue'
import BaseTablePagination from './BaseTablePagination.vue'

interface Props {
  columns: Column[]
  data: any[]
  rowKey?: string
  
  // Pagination
  itemsPerPage?: number
  currentPage?: number
  
  // Sorting
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  
  // Styling
  variant?: 'default' | 'minimal'
  striped?: boolean
  hoverable?: boolean
  
  // Responsive & Height Management
  breakpoint?: 'sm' | 'md' | 'lg'
  fillHeight?: boolean  // If true, height: 100% to fill parent
  hidePaginationOnSinglePage?: boolean  // Hide pagination if only 1 page
}

const props = withDefaults(defineProps<Props>(), {
  rowKey: 'id',
  itemsPerPage: 10,
  currentPage: 1,
  sortBy: '',
  sortDir: 'asc',
  variant: 'default',
  striped: true,
  hoverable: true,
  breakpoint: 'md',
  fillHeight: true,  // Default: fill parent height
  hidePaginationOnSinglePage: true
})

const emit = defineEmits<{
  'update:sortBy': [column: string]
  'update:sortDir': [direction: 'asc' | 'desc']
  'update:currentPage': [page: number]
  'row-click': [row: any]
}>()

const localSortBy = ref(props.sortBy)
const localSortDir = ref(props.sortDir)
const localCurrentPage = ref(props.currentPage)

// Watch props for external changes
watch(() => props.sortBy, (val) => {
  localSortBy.value = val
})

watch(() => props.sortDir, (val) => {
  localSortDir.value = val
})

watch(() => props.currentPage, (val) => {
  localCurrentPage.value = val
})

// Sorted data
const sortedData = computed(() => {
  if (!localSortBy.value || props.data.length === 0) {
    return props.data
  }

  const sorted = [...props.data]
  const column = props.columns.find(c => c.key === localSortBy.value)
  if (!column?.sortable) return sorted

  sorted.sort((a, b) => {
    const aVal = a[localSortBy.value]
    const bVal = b[localSortBy.value]

    // Handle null/undefined
    if (aVal == null && bVal == null) return 0
    if (aVal == null) return 1
    if (bVal == null) return -1

    // Sort logic
    let comparison = 0
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      comparison = aVal.localeCompare(bVal)
    } else if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal
    } else if (aVal instanceof Date && bVal instanceof Date) {
      comparison = aVal.getTime() - bVal.getTime()
    } else {
      comparison = String(aVal).localeCompare(String(bVal))
    }

    return localSortDir.value === 'asc' ? comparison : -comparison
  })

  return sorted
})

// Paginated data
const totalPages = computed(() => {
  return Math.ceil(sortedData.value.length / props.itemsPerPage) || 1
})

const paginatedData = computed(() => {
  const start = (localCurrentPage.value - 1) * props.itemsPerPage
  const end = start + props.itemsPerPage
  return sortedData.value.slice(start, end)
})

// Handlers
const handleSortBy = (column: string) => {
  localSortBy.value = column
  emit('update:sortBy', column)
}

const handleSortDir = (direction: 'asc' | 'desc') => {
  localSortDir.value = direction
  emit('update:sortDir', direction)
}

const handlePageChange = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    localCurrentPage.value = page
    emit('update:currentPage', page)
  }
}

const tableClasses = computed(() => [
  'base-data-table',
  `variant--${props.variant}`,
  {
    'striped': props.striped,
    'hoverable': props.hoverable
  }
])

const tableContainerClasses = computed(() => [
  'table-container',
  {
    'fill-height': props.fillHeight
  }
])

const isEmpty = computed(() => props.data.length === 0)

// Show pagination only if not hidden and data exists and multiple pages
const showPagination = computed(() => {
  if (isEmpty.value) return false
  if (props.hidePaginationOnSinglePage && totalPages.value === 1) return false
  return true
})
</script>

<template>
  <div :class="tableContainerClasses">
    <!-- Table wrapper with flex grow -->
    <div class="table-wrapper">
      <table :class="tableClasses">
        <!-- Header -->
        <BaseTableHeader
          :columns="columns"
          :sort-by="localSortBy"
          :sort-dir="localSortDir"
          show-actions-header
          @update:sort-by="handleSortBy"
          @update:sort-dir="handleSortDir"
        />

        <!-- Body -->
        <tbody class="table-body">
          <BaseTableRow
            v-for="(row, index) in paginatedData"
            :key="`${row[rowKey]}-${index}`"
            :row="row"
            :columns="columns"
            :row-index="index"
            @click="emit('row-click', row)"
          >
            <template #actions>
              <slot name="actions" :row="row" />
            </template>

            <!-- Cell slots -->
            <template v-for="column in columns" :key="`cell-${column.key}`" #[`cell-${column.key}`]="{ row: cellRow, value }">
              <slot :name="`cell-${column.key}`" :row="cellRow" :value="value">
                {{ value }}
              </slot>
            </template>
          </BaseTableRow>
        </tbody>
      </table>

      <!-- Empty state (inside wrapper so flex layout works) -->
      <div v-if="isEmpty" class="empty-state">
        <slot name="empty">
          <div class="empty-content">
            <AppIcon name="inbox" :size="40" class="empty-icon" />
            <p class="empty-text">No data available</p>
          </div>
        </slot>
      </div>
    </div>

    <!-- Pagination wrapper (flex-shrink: 0, always at bottom) -->
    <div v-if="showPagination" class="pagination-wrapper">
      <BaseTablePagination
        :current-page="localCurrentPage"
        :total-pages="totalPages"
        :total-items="sortedData.length"
        :items-per-page="itemsPerPage"
        @update:current-page="handlePageChange"
      />
    </div>
  </div>
</template>

<style scoped>
.table-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  background: white;
  border-radius: var(--radius-lg, 12px);
  overflow: hidden;
  border: 1px solid rgba(123, 47, 190, 0.08);
  box-shadow: 0 4px 16px rgba(123, 47, 190, 0.04);
  /* Allow parent to control height via flex */
  flex: 1;
}

/* Fill parent height if fillHeight prop is true */
.table-container.fill-height {
  height: 100%;
}

.table-wrapper {
  flex: 1;
  overflow-x: hidden;  /* CRITICAL: Don't allow horizontal scroll - columns should fit */
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  display: flex;
  flex-direction: column;
}

.base-data-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  table-layout: fixed;  /* CRITICAL: Respect column widths, don't overflow */

  &.striped tbody tr:nth-child(odd) {
    background: rgba(240, 253, 244, 0.3);
  }

  &.hoverable tbody tr:hover {
    background: rgba(240, 253, 244, 0.5);
  }
}

.table-body {
  display: table-row-group;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 3rem 2rem;
  color: var(--color-text-secondary);
  min-height: 200px;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.empty-icon {
  font-size: 3rem;
  opacity: 0.5;
}

.empty-text {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 500;
}

.pagination-wrapper {
  flex-shrink: 0;
  border-top: 1px solid rgba(123, 47, 190, 0.08);
}

/* Responsive: Mobile */
@media (max-width: 767px) {
  .table-container {
    border: none;
    border-radius: 0;
    box-shadow: none;
  }

  .empty-state {
    min-height: 150px;
    padding: 2rem 1rem;
  }
}

/* Responsive: Tablet */
@media (min-width: 768px) and (max-width: 1023px) {
  .empty-state {
    min-height: 180px;
  }
}

/* Responsive: Desktop */
@media (min-width: 1024px) {
  .empty-state {
    min-height: 250px;
  }
}
</style>
