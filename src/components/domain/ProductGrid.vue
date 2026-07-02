<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '@/types'
import ProductCard from './ProductCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'

interface Props {
  products: Product[]
  isLoading?: boolean
  is_customer_member?: boolean
}

interface Emits {
  select: [product: Product]
}

const props = defineProps<Props>()
defineEmits<Emits>()

const visibleProducts = computed(() => props.products.slice(0, 80))
</script>

<template>
  <div class="product-grid">
    <!-- Loading State -->
    <SkeletonLoader v-if="isLoading" :count="12" />

    <!-- Empty State -->
    <EmptyState
      v-else-if="products.length === 0"
      icon="inbox"
      title="Tidak ada produk ditemukan"
    />

    <!-- Products Grid -->
    <div v-else class="grid">
      <ProductCard
        v-for="product in visibleProducts"
        :key="product.id"
        :product="product"
        :is-customer-member="is_customer_member"
        @select="$emit('select', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.product-grid {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  min-height: 0;
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: max-content;
  align-content: start;
  gap: var(--spacing-2);
  padding: var(--spacing-3);
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  min-height: 0;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  will-change: scroll-position;

  /* Scrollbar styling - vertical */
  scrollbar-width: thin;
  scrollbar-color: rgba(123, 47, 190, 0.2) transparent;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(123, 47, 190, 0.15);
    border-radius: 3px;

    &:hover {
      background: rgba(123, 47, 190, 0.3);
    }
  }
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: var(--spacing-4);
  color: var(--color-text-secondary);
  grid-column: 1 / -1;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(123, 47, 190, 0.2);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-icon {
  font-size: 3rem;
  opacity: 0.5;
}

/* Ultra Wide (4K+): 6 columns */
@media (min-width: 2560px) {
  .grid {
    grid-template-columns: repeat(6, 1fr);
    gap: var(--spacing-2);
    padding: var(--spacing-3);
  }
}

/* Very Wide Desktop (1920px-2559px): 5 columns */
@media (min-width: 1920px) and (max-width: 2559px) {
  .grid {
    grid-template-columns: repeat(5, 1fr);
    gap: var(--spacing-2);
    padding: var(--spacing-3);
  }
}

/* MatePad SE 11" landscape (1280–1365px, height ≤850px): 3 columns — kasir grid lebih sempit di tablet 11" */
@media (min-width: 1280px) and (max-width: 1365px) and (max-height: 850px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-2);
    padding: var(--spacing-2);
  }
}

/* Large Desktop (1366px-1919px): 4 columns */
@media (min-width: 1366px) and (max-width: 1919px) {
  .grid {
    grid-template-columns: repeat(4, 1fr);
    gap: var(--spacing-2);
    padding: var(--spacing-2);
  }
}

/* Tablet Landscape (1024px-1365px): 3 columns */
@media (min-width: 1024px) and (max-width: 1365px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-2);
    padding: var(--spacing-2);
  }
}

/* Tablet Portrait (768px-1023px): 3 columns */
@media (min-width: 768px) and (max-width: 1023px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-2);
    padding: var(--spacing-2);
  }
}

/* Mobile Landscape (480px-767px): 3 columns */
@media (min-width: 480px) and (max-width: 767px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-1);
    padding: var(--spacing-2);
  }
}

/* Mobile Portrait (< 480px): 2 columns */
@media (max-width: 479px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-1);
    padding: var(--spacing-2);
  }
}
</style>
