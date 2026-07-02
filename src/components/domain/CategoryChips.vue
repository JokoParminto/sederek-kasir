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
  border-bottom: 1px solid rgba(123, 47, 190, 0.08);
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
  border: 1px solid rgba(123, 47, 190, 0.15);
  background: white;
  color: var(--color-text-secondary);
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.75rem;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.15s, background-color 0.15s;
  white-space: nowrap;
  letter-spacing: 0.01em;

  @media (hover: hover) {
    &:hover {
      border-color: rgba(123, 47, 190, 0.3);
      color: var(--color-primary-700);
    }
  }

  &--active {
    background: var(--brand-primary);
    border-color: transparent;
    color: white;
    font-weight: 700;
  }
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
