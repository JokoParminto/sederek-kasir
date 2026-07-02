<script setup lang="ts">
import { computed } from 'vue'
import type { TransactionItem, Discount } from '@/types'
import { useDiscount } from '@/composables/useDiscount'
import { formatRupiah } from '@/utils/formatters'

interface Props {
  items: TransactionItem[]
  globalDiscount: Discount
}

const props = defineProps<Props>()

const { calculateCartSubtotal, calculateGlobalDiscountAmount, calculateItemDiscount } = useDiscount()

const subtotal = computed(() =>
  calculateCartSubtotal(props.items)
)

const totalItemDiscounts = computed(() =>
  props.items.reduce((sum: number, item: TransactionItem) => sum + calculateItemDiscount(item), 0)
)

const globalDiscountAmount = computed(() =>
  calculateGlobalDiscountAmount(subtotal.value, props.globalDiscount)
)

const total = computed(() =>
  Math.max(0, subtotal.value - globalDiscountAmount.value)
)
</script>

<template>
  <div class="order-summary">
    <!-- Summary Lines -->
    <div class="summary-line">
      <span class="label">Subtotal</span>
      <span class="amount">{{ formatRupiah(subtotal) }}</span>
    </div>

    <div v-if="totalItemDiscounts > 0" class="summary-line discount-line">
      <span class="label">Diskon Item</span>
      <span class="amount negative">−{{ formatRupiah(totalItemDiscounts) }}</span>
    </div>

    <div v-if="globalDiscountAmount > 0" class="summary-line discount-line">
      <span class="label">Diskon Global</span>
      <span class="amount negative">−{{ formatRupiah(globalDiscountAmount) }}</span>
    </div>

    <!-- Divider -->
    <div class="divider"></div>

    <!-- Total -->
    <div class="summary-line total-line">
      <span class="label">TOTAL BAYAR</span>
      <span class="amount total">{{ formatRupiah(total) }}</span>
    </div>
  </div>
</template>

<style scoped>
.order-summary {
  background: rgba(240, 253, 244, 0.4);
  padding: 0.6rem;
  border-radius: 8px;
  border: 1px solid rgba(123, 47, 190, 0.15);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.summary-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.15rem 0;
  font-size: 0.7rem;

  &.discount-line {
    color: var(--color-warning);
  }
}

.label {
  font-weight: 500;
  color: var(--color-text-secondary);
  letter-spacing: 0.01em;
  font-size: 0.7rem;
}

.amount {
  font-weight: 600;
  color: var(--color-text-primary);
  text-align: right;
  font-feature-settings: 'tnum';
  font-size: 0.75rem;

  &.negative {
    color: var(--color-warning);
    font-weight: 600;
  }

  &.total {
    background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-size: 1.4rem;
    font-weight: 900;
    letter-spacing: -0.04em;
    text-shadow: 0 2px 12px rgba(123, 47, 190, 0.35);
  }
}

.divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(123, 47, 190, 0.3), transparent);
  margin: 0.4rem 0;
}

.total-line {
  padding: 0.4rem 0 0 0;
  font-size: 0.7rem;
  font-weight: 700;
  background: linear-gradient(135deg, rgba(123, 47, 190, 0.08) 0%, rgba(52, 211, 153, 0.08) 100%);
  margin: 0 calc(-0.6rem) calc(-0.6rem);
  padding-left: 0.6rem;
  padding-right: 0.6rem;
  padding-bottom: 0.6rem;
  border-radius: 0 0 8px 8px;

  .label {
    color: var(--color-text-primary);
    font-weight: 800;
    letter-spacing: 0.1em;
    font-size: 0.7rem;
  }
}

/* Tablet landscape — compact */
@media (min-width: 960px) and (max-width: 1279px) {
  .order-summary {
    padding: 0.3rem 0.45rem;
  }

  .amount.total {
    font-size: 1rem;
    letter-spacing: -0.02em;
  }

  .divider {
    margin: 0.2rem 0;
  }

  .total-line {
    padding: 0.2rem 0.45rem 0.3rem;
    margin: 0 calc(-0.45rem) calc(-0.3rem);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .order-summary {
    padding: 0.5rem;
  }

  .summary-line {
    padding: 0.1rem 0;
    font-size: 0.7rem;
  }

  .amount.total {
    font-size: 1.2rem;
  }

  .divider {
    margin: 0.3rem 0;
  }

  .total-line {
    padding: 0.3rem 0;
  }
}
</style>
