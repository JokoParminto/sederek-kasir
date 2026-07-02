<script setup lang="ts">
import type { Category } from '@/types'

interface Props {
  categories: Category[]
  selectedCategoryId: string | null
}

interface Emits {
  select: [categoryId: string | null]
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<template>
  <div class="category-chips">
    <!-- All Categories Button -->
    <button
      :class="['chip', { 'chip--active': selectedCategoryId === null }]"
      @click="$emit('select', null)"
    >
      Semua
    </button>

    <!-- Category Chips -->
    <button
      v-for="category in categories"
      :key="category.id"
      :class="['chip', { 'chip--active': selectedCategoryId === category.id }]"
      @click="$emit('select', category.id)"
    >
      {{ category.name }}
    </button>
  </div>
</template>

<style scoped>
.category-chips {
  display: flex;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  overflow-x: auto;
  scroll-behavior: smooth;
  border-bottom: 1px solid var(--color-border-light);
  background: transparent;
  flex-shrink: 0;

  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.chip {
  flex-shrink: 0;
  padding: 0.4rem var(--spacing-3);
  border: 1.5px solid var(--color-border);
  background: var(--color-surface-0);
  color: var(--color-text-secondary);
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.75rem;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.15s, background-color 0.15s, color 0.15s, box-shadow 0.15s, transform 0.15s;
  white-space: nowrap;
  letter-spacing: 0.01em;
}

.chip:hover:not(.chip--active) {
  border-color: var(--brand-primary);
  color: var(--brand-primary);
  background: rgba(27, 107, 58, 0.05);
}

.chip--active {
  background: var(--brand-primary);
  border-color: var(--brand-primary);
  color: white;
  font-weight: 700;
  box-shadow: 0 3px 10px rgba(27, 107, 58, 0.35);
  transform: translateY(-1px);
}

/* Responsive */
@media (max-width: 768px) {
  .category-chips {
    padding: 0.75rem;
  }

  .chip {
    padding: 0.4rem 0.85rem;
    font-size: 0.8rem;
  }
}
</style>
