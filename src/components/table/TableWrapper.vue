<script setup lang="ts">
import { ref, computed, watch } from 'vue'

// TypeScript Interfaces
export interface Column {
  key: string
  label: string
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  render?: (value: any, row: any) => any
}

export interface TableWrapperProps {
  columns: Column[]
  data: any[]
  rowKey?: string
  sortable?: boolean
  selectable?: boolean
  showRowNumbers?: boolean
  loading?: boolean
  emptyMessage?: string
}

const props = withDefaults(defineProps<TableWrapperProps>(), {
  rowKey: 'id',
  sortable: true,
  selectable: true,
  showRowNumbers: true,
  loading: false,
  emptyMessage: 'No data available',
})

const emit = defineEmits<{
  sort: [column: string, direction: 'asc' | 'desc' | null]
  'select-rows': [ids: string[]]
}>()

// State
const selectedRows = ref<Set<string>>(new Set())
const sortColumn = ref<string | null>(null)
const sortDirection = ref<'asc' | 'desc' | null>(null)

// Computed
const allRowKeys = computed(() =>
  props.data.map(row => String(row[props.rowKey]))
)

const isAllSelected = computed(
  () => allRowKeys.value.length > 0 && allRowKeys.value.every(key => selectedRows.value.has(key))
)

const isIndeterminate = computed(
  () => selectedRows.value.size > 0 && selectedRows.value.size < allRowKeys.value.length
)

// Methods
const toggleAllSelection = () => {
  if (isAllSelected.value) {
    selectedRows.value.clear()
  } else {
    allRowKeys.value.forEach(key => selectedRows.value.add(key))
  }
  emit('select-rows', Array.from(selectedRows.value))
}

const toggleRowSelection = (rowKey: string) => {
  if (selectedRows.value.has(rowKey)) {
    selectedRows.value.delete(rowKey)
  } else {
    selectedRows.value.add(rowKey)
  }
  emit('select-rows', Array.from(selectedRows.value))
}

const handleHeaderClick = (column: Column) => {
  if (!column.sortable && !props.sortable) return

  if (sortColumn.value === column.key) {
    // Cycle: asc → desc → null
    if (sortDirection.value === 'asc') {
      sortDirection.value = 'desc'
    } else if (sortDirection.value === 'desc') {
      sortColumn.value = null
      sortDirection.value = null
    }
  } else {
    sortColumn.value = column.key
    sortDirection.value = 'asc'
  }

  emit('sort', sortColumn.value || '', sortDirection.value || null)
}

const getSortIcon = (column: Column): string => {
  if (sortColumn.value !== column.key) return '⇅'
  return sortDirection.value === 'asc' ? '▲' : '▼'
}

const getRowNumber = (index: number): number => {
  return index + 1
}

const getCellValue = (row: any, column: Column): any => {
  if (column.render) {
    return column.render(row[column.key], row)
  }
  return row[column.key]
}

const getColumnWidth = (column: Column): string => {
  return column.width || 'auto'
}

// Watch selected rows and clear when data changes
watch(() => props.data, () => {
  const currentKeys = new Set(allRowKeys.value)
  selectedRows.value.forEach(key => {
    if (!currentKeys.has(key)) {
      selectedRows.value.delete(key)
    }
  })
})
</script>

<template>
  <div class="table-wrapper-container">
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="data.length === 0" class="empty-state">
      <AppIcon name="inbox" :size="40" class="empty-icon" />
      <p>{{ emptyMessage }}</p>
    </div>

    <!-- Table -->
    <div v-else class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <!-- Checkbox Column -->
            <th v-if="selectable" class="col-checkbox">
              <input
                type="checkbox"
                :checked="isAllSelected"
                :indeterminate="isIndeterminate"
                @change="toggleAllSelection"
                class="table-checkbox"
                aria-label="Select all rows"
              />
            </th>

            <!-- Row Number Column -->
            <th v-if="showRowNumbers" class="col-number">#</th>

            <!-- Data Columns -->
            <th
              v-for="column in columns"
              :key="column.key"
              :class="[
                'col-header',
                `col-align-${column.align || 'left'}`,
                {
                  'col-sortable': column.sortable !== false && sortable,
                  'col-active': sortColumn === column.key,
                }
              ]"
              :style="{ width: getColumnWidth(column) }"
              @click="handleHeaderClick(column)"
            >
              <div class="header-content">
                <span>{{ column.label }}</span>
                <span v-if="column.sortable !== false && sortable" class="sort-icon">
                  {{ getSortIcon(column) }}
                </span>
              </div>
            </th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="(row, index) in data"
            :key="row[rowKey]"
            :class="[
              'data-row',
              { 'row-selected': selectedRows.has(String(row[rowKey])) }
            ]"
          >
            <!-- Checkbox Column -->
            <td v-if="selectable" class="col-checkbox">
              <input
                type="checkbox"
                :checked="selectedRows.has(String(row[rowKey]))"
                @change="toggleRowSelection(String(row[rowKey]))"
                class="table-checkbox"
                :aria-label="`Select row ${index + 1}`"
              />
            </td>

            <!-- Row Number Column -->
            <td v-if="showRowNumbers" class="col-number">
              {{ getRowNumber(index) }}
            </td>

            <!-- Data Columns -->
            <td
              v-for="column in columns"
              :key="column.key"
              :class="[
                'col-data',
                `col-align-${column.align || 'left'}`,
              ]"
              :style="{ width: getColumnWidth(column) }"
            >
              <slot :name="`cell-${column.key}`" :row="row" :column="column">
                {{ getCellValue(row, column) }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
/* Container */
.table-wrapper-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

/* Loading State */
.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem;
  color: var(--color-text-secondary, #6b7280);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(123, 47, 190, 0.2);
  border-top-color: var(--color-primary-500, var(--brand-primary));
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Empty State */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 3rem 2rem;
  color: var(--color-text-secondary, #6b7280);
  min-height: 200px;
}

.empty-icon {
  font-size: 3rem;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
  font-size: var(--font-size-base);
}

/* Table Wrapper */
.table-wrapper {
  flex: 1;
  overflow-x: auto;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;

  /* Custom Scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 4px;

    &:hover {
      background: #9ca3af;
    }
  }
}

/* Table */
.data-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  table-layout: auto;
}

/* Header */
.data-table thead {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.data-table th {
  padding: 1.25rem;
  text-align: left;
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: #1f2937;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: transparent;
  user-select: none;
}

/* Column Specific */
.col-checkbox,
.col-number {
  width: 50px;
  text-align: center;
}

.col-checkbox input,
.col-number input {
  cursor: pointer;
}

.col-align-center {
  text-align: center;
}

.col-align-right {
  text-align: right;
}

/* Sortable Header */
.col-sortable {
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(123, 47, 190, 0.1);
    color: var(--color-primary-500, var(--brand-primary));
  }
}

.col-active {
  color: var(--color-primary-600, var(--brand-primary-dark));
  background: rgba(123, 47, 190, 0.12);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: space-between;
}

.sort-icon {
  font-size: var(--font-size-xs);
  font-weight: 900;
  color: #6b7280;
  opacity: 1;
  flex-shrink: 0;
  margin-left: 6px;
  display: inline-block;
}

.col-active .sort-icon {
  color: var(--color-primary-500, var(--brand-primary));
}

/* Body Rows */
.data-table tbody tr {
  border-bottom: 1px solid rgba(123, 47, 190, 0.08);
  background: white;
  transition: all 0.2s ease;
}

.data-row {
  &:hover {
    background: rgba(123, 47, 190, 0.04);
  }

  &.row-selected {
    background: rgba(123, 47, 190, 0.08);

    &:hover {
      background: rgba(123, 47, 190, 0.12);
    }
  }
}

/* Cells */
.data-table td {
  padding: 1.25rem;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary, #111827);
  text-align: left;
}

.col-data {
  &.col-align-center {
    text-align: center;
  }

  &.col-align-right {
    text-align: right;
  }
}

/* Checkbox Input */
.table-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  -webkit-appearance: auto;
  -moz-appearance: auto;
  appearance: auto;
  accent-color: #a78bfa;
  border-radius: 4px;
  border: 1px solid #d1d5db;
  background-color: #ffffff;
  box-sizing: border-box;
}

.table-checkbox:checked {
  border-color: #a78bfa;
  background-color: #a78bfa;
}

/* Responsive */
@media (max-width: 768px) {
  .data-table th,
  .data-table td {
    padding: 0.75rem;
    font-size: var(--font-size-xs);
  }

  .col-checkbox,
  .col-number {
    width: 40px;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .sort-icon {
    display: inline-block;
    font-size: 0.6rem;
    margin-left: 4px;
  }
}

/* Last Row Border */
.data-table tbody tr:last-child {
  border-bottom: none;
}

/* Status Badge Styling */
:deep(.status-badge) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  font-size: var(--font-size-xs);
  font-weight: 600;
  white-space: nowrap;
  transition: all 0.2s ease;
  line-height: 1;

  /* Active Status - Green */
  &.active {
    background: rgba(123, 47, 190, 0.15);
    color: var(--brand-primary-darker);
    border: 1px solid rgba(123, 47, 190, 0.3);
  }

  /* Inactive Status - Gray */
  &.inactive {
    background: rgba(107, 114, 128, 0.15);
    color: #4b5563;
    border: 1px solid rgba(107, 114, 128, 0.3);
  }

  /* Pending Status - Yellow */
  &.pending {
    background: rgba(245, 158, 11, 0.15);
    color: #92400e;
    border: 1px solid rgba(245, 158, 11, 0.3);
  }

  /* Error/Due Status - Red */
  &.error,
  &.due {
    background: rgba(239, 68, 68, 0.15);
    color: #7f1d1d;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }
}

:deep(.status-icon) {
  color: currentColor;
  flex-shrink: 0;
}

:deep(.status-label) {
  display: inline-flex;
  align-items: center;
  font-weight: 600;
}
</style>
