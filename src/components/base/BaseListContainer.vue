<script setup lang="ts">
import { computed } from 'vue'
import BaseSearchBar from './BaseSearchBar.vue'
import BaseChipsGroup from './BaseChipsGroup.vue'
import BaseDataTable from './BaseDataTable.vue'
import BasePagination from './BasePagination.vue'
import type { Column } from './BaseTableHeader.vue'

interface Props {
  // Search
  searchValue: string
  searchPlaceholder?: string

  // Table
  columns: Column[]
  data: any[]
  rowKey?: string
  currentPage?: number
  itemsPerPage?: number
  variant?: 'default' | 'minimal'
  striped?: boolean
  hoverable?: boolean

  // Pagination
  totalItems: number
  isLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  searchPlaceholder: '🔍 Cari...',
  rowKey: 'id',
  currentPage: 1,
  itemsPerPage: 10,
  variant: 'default',
  striped: true,
  hoverable: true,
  totalItems: 0,
  isLoading: false,
})

const emit = defineEmits<{
  'update:searchValue': [value: string]
  'update:currentPage': [page: number]
  'update:itemsPerPage': [size: number]
}>()

const totalPages = computed(() => {
  return Math.ceil(props.totalItems / props.itemsPerPage) || 1
})
</script>

<template>
  <div class="base-list-container">
    <!-- Search Bar -->
    <BaseSearchBar
      :model-value="searchValue"
      :placeholder="searchPlaceholder"
      @update:model-value="emit('update:searchValue', $event)"
    >
      <template #actions>
        <slot name="search-actions" />
      </template>
    </BaseSearchBar>

    <!-- Chips Group (Filters) -->
    <div class="base-list-chips">
      <slot name="chips" />
    </div>

    <!-- Data Table -->
    <BaseDataTable
      :columns="columns"
      :data="data"
      :row-key="rowKey"
      :current-page="1"
      :items-per-page="999"
      :variant="variant"
      :striped="striped"
      :hoverable="hoverable"
      hide-pagination-on-single-page
      :fill-height="false"
    >
      <!-- Pass through all cell slots -->
      <template v-for="column in columns" :key="`cell-${column.key}`" #[`cell-${column.key}`]="slotProps">
        <slot :name="`cell-${column.key}`" v-bind="slotProps" />
      </template>

      <!-- Actions slot -->
      <template #actions="{ row }">
        <slot name="actions" :row="row" />
      </template>

      <!-- Empty slot -->
      <template #empty>
        <slot name="empty" />
      </template>
    </BaseDataTable>

    <!-- Pagination -->
    <BasePagination
      :current-page="currentPage"
      :total-items="totalItems"
      :items-per-page="itemsPerPage"
      :loading="isLoading"
      @update:current-page="emit('update:currentPage', $event)"
      @update:items-per-page="emit('update:itemsPerPage', $event)"
    />
  </div>
</template>

<style scoped>
.base-list-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.base-list-chips {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-3);
  padding: 0.75rem var(--spacing-3);
  border-bottom: 2px solid rgba(123, 47, 190, 0.15);
  background: white;
  flex-shrink: 0;
}
</style>
