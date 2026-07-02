<script setup lang="ts">
import { computed } from 'vue'
import type { Column } from './BaseTableHeader.vue'

interface Props {
  row: Record<string, any>
  columns: Column[]
  rowIndex: number
}

withDefaults(defineProps<Props>(), {})

const getCellClasses = (column: Column) => [
  'table-cell',
  {
    'hidden-mobile': column.hiddenOnMobile,
    'sticky': column.sticky,
    [`align-${column.align}`]: column.align
  }
]

const getCellValue = (row: Record<string, any>, key: string) => {
  return row[key] ?? '-'
}
</script>

<template>
  <tr class="table-row">
    <td
      v-for="column in columns"
      :key="column.key"
      :class="getCellClasses(column)"
      :style="{ width: column.width }"
    >
      <slot :name="`cell-${column.key}`" :row="row" :value="getCellValue(row, column.key)">
        <span class="cell-content">{{ getCellValue(row, column.key) }}</span>
      </slot>
    </td>

    <!-- Actions cell (last column) -->
    <td class="table-cell table-cell--actions">
      <slot name="actions" :row="row" />
    </td>
  </tr>
</template>

<style scoped>
.table-row {
  display: table-row;

  &:hover {
    & .table-cell {
      background: rgba(240, 253, 244, 0.4);
    }
  }
}

.table-cell {
  padding: 0.75rem;
  font-size: 0.8rem;
  border-bottom: 1px solid rgba(123, 47, 190, 0.08);
  color: var(--color-text-primary);
  background: white;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-sizing: border-box;  /* CRITICAL: Include padding in width calculation */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &.align-center {
    text-align: center;
  }

  &.align-right {
    text-align: right;
  }

  &.sticky {
    position: sticky;
    left: 0;
    z-index: 5;
    background: white;
  }

  &.table-row:hover & {
    &.sticky {
      background: rgba(240, 253, 244, 0.4);
    }
  }

  &.hidden-mobile {
    display: none;
  }

  &--actions {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem;
    width: 80px;  /* Fixed width for action buttons */
    flex-shrink: 0;
  }
}

.cell-content {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Responsive: Tablet */
@media (min-width: 768px) and (max-width: 1023px) {
  .table-cell {
    padding: 0.85rem;
    font-size: 0.75rem;

    &.hidden-mobile {
      display: table-cell;
    }
  }
}

/* Responsive: Desktop */
@media (min-width: 1024px) {
  .table-cell {
    padding: 1rem;
    font-size: 0.8rem;

    &.hidden-mobile {
      display: table-cell;
    }
  }
}

/* Responsive: Mobile */
@media (max-width: 767px) {
  .table-cell {
    padding: 0.75rem;
    font-size: 0.75rem;

    &.hidden-mobile {
      display: none;
    }

    &--actions {
      padding: 0.5rem;
    }
  }
}
</style>
