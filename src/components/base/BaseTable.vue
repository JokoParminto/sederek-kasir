<script setup lang="ts">
interface Props {
  loading?: boolean
  empty?: boolean
  emptyText?: string
  minHeight?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  empty: false,
  emptyText: 'Tidak ada data',
  minHeight: '240px'
})
</script>

<template>
  <div class="base-table" :style="{ minHeight: props.minHeight }">
    <div class="base-table__scroll">
      <table>
        <thead v-if="$slots.head">
          <slot name="head" />
        </thead>
        <tbody v-if="!loading && !empty">
          <slot />
        </tbody>
      </table>
    </div>

    <div v-if="loading" class="base-table__state">
      <slot name="loading">Loading...</slot>
    </div>
    <div v-else-if="empty" class="base-table__state">
      <slot name="empty">{{ emptyText }}</slot>
    </div>
  </div>
</template>

<style scoped>
.base-table {
  width: 100%;
  background: var(--color-surface-0);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
  overflow: hidden;
  position: relative;
}

.base-table__scroll {
  width: 100%;
  overflow: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-base);
}

thead {
  background: var(--color-surface-1);
  text-align: left;
}

th,
td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border-light);
}

tbody tr:hover {
  background: var(--color-surface-1);
}

.base-table__state {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  background: rgba(255, 255, 255, 0.6);
}

@media (max-width: 768px) {
  th,
  td {
    padding: 0.6rem 0.8rem;
  }
}
</style>
