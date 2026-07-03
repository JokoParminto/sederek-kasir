import { defineStore } from 'pinia'
import { ref } from 'vue'
import { memberTierApi } from '@/services/api/memberTier.api'
import type { MemberTierRule, MemberTier, TierDiscountResult } from '@/types/memberTier'

export const useMemberTierStore = defineStore('memberTier', () => {
  const rules = ref<MemberTierRule[]>([])
  const isLoaded = ref(false)

  async function loadRules() {
    if (isLoaded.value) return
    try {
      rules.value = await memberTierApi.getRules()
      isLoaded.value = true
    } catch {
      // rules stays empty — no member discount applied
    }
  }

  async function reloadRules() {
    isLoaded.value = false
    await loadRules()
  }

  /**
   * Compute the best applicable tier discount for a product.
   * Returns { discountAmount, finalPrice, isFixed, ruleLabel }
   * Returns { discountAmount: 0, finalPrice: price } if no rule matches.
   */
  function computeDiscount(
    product: { id: string; price: number; categoryName?: string },
    tier: MemberTier | null
  ): TierDiscountResult {
    const noDiscount: TierDiscountResult = { discountAmount: 0, finalPrice: product.price, isFixed: false, ruleLabel: '' }
    if (!tier) return noDiscount

    const isFood = product.categoryName?.toLowerCase() === 'food'
    const tierRules = rules.value
      .filter(r => r.tier === tier && r.is_active)
      .sort((a, b) => a.sort_order - b.sort_order)

    let bestDiscount = 0
    let bestLabel = ''
    let fixedPrice: number | null = null
    let fixedLabel = ''

    for (const rule of tierRules) {
      // Scope check
      if (rule.scope === 'non_food' && isFood) continue
      if (rule.scope === 'specific') {
        if (!rule.products?.some(p => p.id === product.id)) continue
      }
      // Min price threshold
      if (rule.min_price !== null && product.price < rule.min_price) continue

      if (rule.rule_type === 'fixed_price' && rule.fixed_price !== null) {
        // fixed_price overrides all
        fixedPrice = rule.fixed_price
        fixedLabel = rule.label
      } else if (rule.rule_type === 'discount_amount' && rule.discount_amount !== null) {
        if (rule.discount_amount > bestDiscount) {
          bestDiscount = rule.discount_amount
          bestLabel = rule.label
        }
      }
    }

    if (fixedPrice !== null) {
      return {
        discountAmount: Math.max(0, product.price - fixedPrice),
        finalPrice: fixedPrice,
        isFixed: true,
        ruleLabel: fixedLabel,
      }
    }

    if (bestDiscount > 0) {
      return {
        discountAmount: bestDiscount,
        finalPrice: Math.max(0, product.price - bestDiscount),
        isFixed: false,
        ruleLabel: bestLabel,
      }
    }

    return noDiscount
  }

  return { rules, isLoaded, loadRules, reloadRules, computeDiscount }
})
