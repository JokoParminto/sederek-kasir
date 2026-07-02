<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '@/types'
import { formatRupiah } from '@/utils/formatters'

interface Props {
  product: Product
  is_customer_member?: boolean
}

interface Emits {
  select: [product: Product, quantity: number]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isAvailable = computed(() =>
  props.product.status === 'active' && props.product.stock > 0
)

const isSelectable = computed(() => isAvailable.value)

const stockBadgeColor = computed(() =>
  isAvailable.value ? 'success' : 'danger'
)

const handleClick = () => {
  if (isSelectable.value) {
    emit('select', props.product, 1)
  }
}

const stockLabel = computed(() =>
  isAvailable.value ? null : 'Habis'
)

const displayPrice = computed(() => {
  if (props.is_customer_member && props.product.memberPrice) {
    return props.product.memberPrice
  }
  return props.product.price
})

const isMemberPriceApplied = computed(() =>
  props.is_customer_member && !!props.product.memberPrice
)
</script>

<template>
  <div
    class="product-card"
    :class="{ 'product-card--disabled': !isSelectable }"
    @click="handleClick"
  >
    <!-- Product Image -->
    <div class="product-image">
      <img
        v-if="product.image"
        :src="product.image"
        :alt="product.name"
        class="product-img"
        loading="lazy"
        width="80"
        height="80"
      />
      <div v-else class="image-placeholder">
        <AppIcon name="menu" :size="28" />
      </div>
      <div v-if="stockLabel" class="stock-badge badge-danger">
        {{ stockLabel }}
      </div>
    </div>

    <!-- Product Info -->
    <div class="product-info">
      <h3 class="product-name">{{ product.name }}</h3>
      <!-- If customer is member and product has member price -->
      <div v-if="isMemberPriceApplied" class="price-container-member">
        <p class="product-price-original">{{ formatRupiah(product.price) }}</p>
        <p class="product-price-member">{{ formatRupiah(displayPrice) }}</p>
        <span class="member-price-badge">Member Price</span>
      </div>
      <!-- Regular price display -->
      <p v-else class="product-price">{{ formatRupiah(displayPrice) }}</p>
      <!-- Member price hint for regular customers -->
      <p v-if="!isMemberPriceApplied && product.memberPrice" class="member-price-hint">
        <AppIcon name="star" :size="11" /> {{ formatRupiah(product.memberPrice) }} for member
      </p>
    </div>

    <!-- Hover Indicator -->
    <div v-if="isSelectable" class="click-hint">
      Klik untuk tambah
    </div>
  </div>
</template>

<style scoped>
.product-card {
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(123, 47, 190, 0.1);
  transition: border-color 0.15s, box-shadow 0.15s;
  cursor: pointer;
  position: relative;
  display: flex;
  flex-direction: column;
  height: auto;
  max-width: 100%;
  -webkit-tap-highlight-color: transparent;
  contain: layout style;

  @media (hover: hover) {
    &:not(.product-card--disabled):hover {
      box-shadow: 0 4px 12px rgba(123, 47, 190, 0.12);
      border-color: rgba(123, 47, 190, 0.3);
    }
  }

  &:not(.product-card--disabled):active {
    opacity: 0.85;
  }

}

/* Out of Stock / Disabled Product Card */
.product-card--disabled {
  cursor: not-allowed !important;
  background: rgba(243, 244, 246, 0.95) !important;
  border-color: rgba(156, 163, 175, 0.25) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08) !important;
  filter: grayscale(100%) !important;
  opacity: 0.7 !important;
}

.product-card--disabled:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08) !important;
  transform: none !important;
}

.product-card--disabled .product-image {
  background: #e0e0e0 !important;
  filter: grayscale(100%);
}

.product-card--disabled .product-img {
  opacity: 0.5 !important;
  filter: grayscale(100%);
}

.product-card--disabled .image-placeholder {
  opacity: 0.4 !important;
  filter: grayscale(100%);
}

.product-card--disabled .product-name {
  color: #6b7280 !important;
}

.product-card--disabled .product-price {
  background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  background-clip: text !important;
}

.product-card--disabled .stock-badge {
  filter: grayscale(100%);
}

.product-image {
  position: relative;
  width: 100%;
  height: 80px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.product-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder {
  font-size: 2.5rem;
  opacity: 0.95;
}

.stock-badge {
  position: absolute;
  bottom: var(--spacing-2);
  right: var(--spacing-2);
  padding: 0.15rem var(--spacing-2);
  border-radius: 6px;
  font-size: 0.6rem;
  font-weight: 600;
  white-space: nowrap;
  animation: slideUp var(--transition-duration-medium) var(--transition-decelerate);
  box-shadow: var(--shadow-2);
  letter-spacing: 0.01em;
}

.badge-success {
  background: var(--color-success);
  color: var(--color-on-primary);
}

.badge-danger {
  background: var(--color-danger);
  color: var(--color-on-primary);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.product-info {
  padding: 0.4rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  gap: 0.15rem;
  background: transparent;
}

.product-name {
  font-family: var(--font-family-body);
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.2;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  letter-spacing: 0;
  word-break: break-word;
}

.product-price {
  font-family: var(--font-family-body);
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--brand-primary);
  margin: 0;
  letter-spacing: -0.01em;
  line-height: 1.2;
}

.price-container-member {
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
}

.product-price-original {
  font-size: 0.65rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-decoration: line-through;
  margin: 0;
}

.product-price-member {
  font-size: 0.8rem;
  font-weight: 800;
  color: #f59e0b;
  margin: 0;
  letter-spacing: -0.02em;
  line-height: 1.05;
}

.member-price-hint {
  font-size: 0.6rem;
  font-weight: 600;
  color: #f59e0b;
  margin: 0;
  margin-top: -0.05rem;
  opacity: 0.8;
}

.member-price-badge {
  font-size: 0.55rem;
  font-weight: 700;
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.15);
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  border: 1px solid rgba(251, 191, 36, 0.3);
  text-align: center;
  letter-spacing: 0.02em;
  margin-top: 0.2rem;
  display: inline-block;
}

.click-hint {
  display: none;
}

/* Ultra Wide (4K+) */
@media (min-width: 2560px) {
  .product-image { height: 90px; }
  .image-placeholder { font-size: 2.2rem; }
  .product-name { font-size: 0.82rem; }
  .product-price { font-size: 0.82rem; }
}

/* Very Wide Desktop (1920px-2559px) */
@media (min-width: 1920px) and (max-width: 2559px) {
  .product-image { height: 85px; }
  .image-placeholder { font-size: 2rem; }
  .product-name { font-size: 0.8rem; }
  .product-price { font-size: 0.8rem; }
}

/* Large Desktop (1366px-1919px) */
@media (min-width: 1366px) and (max-width: 1919px) {
  .product-image { height: 80px; }
  .image-placeholder { font-size: 1.9rem; }
  .product-name { font-size: 0.78rem; }
  .product-price { font-size: 0.78rem; }
}

/* Tablet Landscape (1024px-1365px) */
@media (min-width: 1024px) and (max-width: 1365px) {
  .product-image { height: 75px; }
  .image-placeholder { font-size: 1.8rem; }
  .product-info { padding: 0.4rem; gap: 0.15rem; }
  .product-name { font-size: 0.76rem; }
  .product-price { font-size: 0.76rem; }
}

/* Tablet (768px-1023px) — compact card for landscape POS tablet */
@media (min-width: 768px) and (max-width: 1023px) {
  .product-image { height: 65px; }
  .image-placeholder { font-size: 1.8rem; }
  .product-info { padding: 0.3rem var(--spacing-2); gap: 0.1rem; }
  .product-name { font-size: 0.8rem; }
  .product-price { font-size: 0.8rem; }
  .stock-badge { padding: 0.1rem 0.3rem; font-size: 0.7rem; }
}

/* Mobile Landscape (480px-767px) */
@media (min-width: 480px) and (max-width: 767px) {
  .product-image { height: 65px; }
  .image-placeholder { font-size: 1.6rem; }
  .product-info { padding: 0.3rem; gap: 0.1rem; }
  .product-name { font-size: 0.72rem; -webkit-line-clamp: 1; }
  .product-price { font-size: 0.72rem; }
  .stock-badge { padding: 0.1rem 0.25rem; font-size: 0.58rem; }
}

/* Mobile Portrait (< 480px) */
@media (max-width: 479px) {
  .product-image { height: 60px; }
  .image-placeholder { font-size: 1.5rem; }
  .product-info { padding: 0.25rem; gap: 0.08rem; }
  .product-name { font-size: 0.7rem; -webkit-line-clamp: 1; }
  .product-price { font-size: 0.7rem; }
  .stock-badge { padding: 0.08rem 0.2rem; font-size: 0.55rem; }
}
</style>
