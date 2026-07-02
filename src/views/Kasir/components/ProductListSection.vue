<script setup lang="ts">
import type { Product, Category } from '@/types'
import CategoryChips from '@/components/domain/CategoryChips.vue'
import ProductGrid from '@/components/domain/ProductGrid.vue'

interface Props {
  products: Product[]
  categories: Category[]
  selectedCategoryId: string | null
  searchQuery: string
  isLoading?: boolean
  is_customer_member?: boolean
}

interface Emits {
  selectCategory: [categoryId: string | null]
  search: [query: string]
  selectProduct: [product: Product]
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<template>
  <section class="product-list-section">
    <!-- Search Bar -->
    <div class="search-bar">
      <input
        :value="searchQuery"
        type="text"
        class="search-input"
        placeholder="🔍 Cari produk..."
        @keyup="$emit('search', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <!-- Category Filter -->
    <CategoryChips
      :categories="categories"
      :selectedCategoryId="selectedCategoryId"
      @select="$emit('selectCategory', $event)"
    />

    <!-- Product Grid -->
    <ProductGrid
      :products="products"
      :isLoading="isLoading"
      :is-customer-member="is_customer_member"
      @select="$emit('selectProduct', $event)"
    />
  </section>
</template>

<style scoped>
.product-list-section {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-surface-0);
  border: 1px solid var(--color-border-light);
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  min-height: 0;
}

.search-bar {
  padding: var(--spacing-3);
  background: transparent;
  border-bottom: 1px solid var(--color-border-light);
  flex-shrink: 0;
}

.search-input {
  width: 100%;
  padding: 0.6rem var(--spacing-3);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  font-size: 0.8rem;
  transition: border-color 0.15s;
  background: var(--color-surface-0);
  color: var(--color-text-primary);
  font-weight: 500;

  &:hover {
    border-color: var(--brand-primary);
  }

  &:focus {
    outline: none;
    border-color: var(--brand-primary);
    box-shadow: 0 0 0 3px rgba(27, 107, 58, 0.12);
  }

  &::placeholder {
    color: var(--color-text-hint);
    font-weight: 400;
  }
}

/* Tablet Landscape (768px-1023px) */
@media (min-width: 768px) and (max-width: 1023px) {
  .search-bar {
    padding: 0.4rem var(--spacing-2);
  }
}

/* Mobile */
@media (max-width: 768px) {
  .search-bar {
    padding: 0.75rem;
  }

  .search-input {
    padding: 0.6rem 0.75rem;
    font-size: 0.9rem;
  }
}
</style>
