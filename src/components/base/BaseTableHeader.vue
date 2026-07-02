<script setup lang="ts">
import { computed } from 'vue'
import { ChevronUpDownIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/vue/20/solid'

export interface Column {
  key: string
  label: string
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  hiddenOnMobile?: boolean
  sticky?: boolean
}

interface Props {
  columns: Column[]
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  showActionsHeader?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  sortBy: '',
  sortDir: 'asc'
})

const emit = defineEmits<{
  'update:sortBy': [column: string]
  'update:sortDir': [direction: 'asc' | 'desc']
}>()

const handleSort = (column: Column) => {
  if (!column.sortable) return

  if (props.sortBy === column.key) {
    // Toggle direction
    emit('update:sortDir', props.sortDir === 'asc' ? 'desc' : 'asc')
  } else {
    // New column
    emit('update:sortBy', column.key)
    emit('update:sortDir', 'asc')
  }
}

const getHeaderClasses = (column: Column) => [
  'table-header-cell',
  {
    'sortable': column.sortable,
    'active': props.sortBy === column.key,
    'hidden-mobile': column.hiddenOnMobile,
    'sticky': column.sticky,
    [`align-${column.align}`]: column.align
  }
]

const getSortIcon = (column: Column) => {
  if (!column.sortable) return null
  if (props.sortBy !== column.key) return ChevronUpDownIcon
  return props.sortDir === 'asc' ? ArrowUpIcon : ArrowDownIcon
}

const isSorted = (column: Column) => props.sortBy === column.key

const getActionsHeaderClasses = () => [
  'table-header-cell',
  'actions-header',
  { 'sticky': true }
]
</script>

<template>
  <thead class="table-header">
    <tr class="table-header-row">
      <th
        v-for="column in columns"
        :key="column.key"
        :class="getHeaderClasses(column)"
        :style="{ width: column.width }"
        @click="handleSort(column)"
      >
        <div class="header-content">
          <span class="header-label">{{ column.label }}</span>
          <component
            v-if="column.sortable"
            :is="getSortIcon(column)"
            :class="['sort-icon', { 'is-sorted': isSorted(column) }]"
          />
        </div>
      </th>
      <th v-if="showActionsHeader" :class="getActionsHeaderClasses()" style="width: 80px">
        <div class="header-content">
          <span class="header-label">Aksi</span>
        </div>
      </th>
    </tr>
  </thead>
</template>

<style scoped>
.table-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: white;
  border-bottom: 2px solid rgba(123, 47, 190, 0.15);
}

.table-header-row {
  display: contents;
}

.table-header-cell {
  padding: 1rem;
  text-align: left;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--color-text-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: transparent;
  user-select: none;
  white-space: nowrap;

  &.align-center {
    text-align: center;
  }

  &.align-right {
    text-align: right;
  }

  &.sortable {
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  &.sortable:hover {
    background: rgba(123, 47, 190, 0.04);
    color: var(--color-primary-700);
  }

  &.active {
    background: rgba(123, 47, 190, 0.06);
    color: var(--color-primary-800);
  }

  &.sticky {
    position: sticky;
    left: 0;
    z-index: 11;
  }

  &.hidden-mobile {
    display: none;
  }
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.header-label {
  flex: 1;
}

.sort-icon {
  width: 1em;
  height: 1em;
  flex-shrink: 0;
  color: var(--color-text-secondary);
  opacity: 0.4;
  transition: all 0.2s ease;

  &.is-sorted {
    color: var(--color-primary-700);
    opacity: 1;
  }
}

/* Responsive: Tablet */
@media (min-width: 768px) and (max-width: 1023px) {
  .table-header-cell {
    padding: 0.85rem;
    font-size: 0.65rem;
  }
}

/* Responsive: Desktop */
@media (min-width: 1024px) {
  .table-header-cell {
    &.hidden-mobile {
      display: table-cell;
    }
  }
}

/* Responsive: Mobile */
@media (max-width: 767px) {
  .table-header-cell {
    padding: 0.75rem;
    font-size: 0.6rem;

    &.hidden-mobile {
      display: none;
    }
  }
}
</style>
