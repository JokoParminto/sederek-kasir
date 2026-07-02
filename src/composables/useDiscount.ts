import type { Discount, TransactionItem } from '@/types'

/**
 * Discount calculation composable
 * Handles all discount-related calculations with proper validation
 *
 * Calculation Order:
 * 1. Item Total = Harga × Qty
 * 2. Item Discount (% or Rp) → dikurangi dari Item Total
 * 3. Item Subtotal = Item Total - Item Discount
 * 4. Cart Subtotal = Sum(all Item Subtotal)
 * 5. Global Discount (% or Rp) → dikurangi dari Cart Subtotal
 * 6. TOTAL BAYAR = Cart Subtotal - Global Discount
 */

export function useDiscount() {
  /**
   * Calculate discount amount based on type
   */
  const calculateDiscountAmount = (baseAmount: number, discount: Discount): number => {
    if (discount.type === 'percentage') {
      return Math.round((baseAmount * discount.value) / 100)
    } else {
      return Math.round(discount.value)
    }
  }

  /**
   * Calculate item discount amount (including add-ons in base)
   */
  const calculateItemDiscount = (item: TransactionItem): number => {
    const itemTotal = item.price * item.quantity
    const addOnsTotal = (item.addOns || []).reduce((sum, addon) => sum + (addon.price * addon.quantity), 0)
    const totalWithAddOns = itemTotal + addOnsTotal
    return calculateDiscountAmount(totalWithAddOns, item.discount)
  }

  /**
   * Calculate item subtotal after discount (including add-ons)
   */
  const calculateItemSubtotal = (item: TransactionItem): number => {
    const itemTotal = item.price * item.quantity
    const addOnsTotal = (item.addOns || []).reduce((sum, addon) => sum + (addon.price * addon.quantity), 0)
    const totalWithAddOns = itemTotal + addOnsTotal
    const discountAmount = calculateDiscountAmount(totalWithAddOns, item.discount)
    return totalWithAddOns - discountAmount
  }

  /**
   * Calculate cart subtotal (sum of all item subtotals)
   */
  const calculateCartSubtotal = (items: TransactionItem[]): number => {
    return items.reduce((sum, item) => sum + calculateItemSubtotal(item), 0)
  }

  /**
   * Calculate global discount amount
   */
  const calculateGlobalDiscountAmount = (
    subtotal: number,
    discount: Discount
  ): number => {
    return calculateDiscountAmount(subtotal, discount)
  }

  /**
   * Calculate total after all discounts
   */
  const calculateTotal = (
    items: TransactionItem[],
    globalDiscount: Discount
  ): number => {
    const subtotal = calculateCartSubtotal(items)
    const globalDiscountAmount = calculateGlobalDiscountAmount(subtotal, globalDiscount)
    return Math.max(0, subtotal - globalDiscountAmount) // Ensure not negative
  }

  /**
   * Validate discount doesn't exceed maximum allowed
   */
  const validateDiscount = (
    discount: Discount,
    maxAmount: number
  ): { valid: boolean; error?: string } => {
    // Check for negative values
    if (discount.value < 0) {
      return { valid: false, error: 'Discount cannot be negative' }
    }

    // Check percentage validity
    if (discount.type === 'percentage' && discount.value > 100) {
      return { valid: false, error: 'Percentage discount cannot exceed 100%' }
    }

    // Check amount doesn't exceed maximum
    const discountAmount = calculateDiscountAmount(maxAmount, discount)
    if (discountAmount > maxAmount) {
      return { valid: false, error: 'Discount exceeds maximum allowed amount' }
    }

    return { valid: true }
  }

  /**
   * Validate item discount (including add-ons)
   */
  const validateItemDiscount = (
    item: TransactionItem,
    newDiscount: Discount
  ): { valid: boolean; error?: string } => {
    const itemTotal = item.price * item.quantity
    const addOnsTotal = (item.addOns || []).reduce((sum, addon) => sum + (addon.price * addon.quantity), 0)
    const totalWithAddOns = itemTotal + addOnsTotal
    return validateDiscount(newDiscount, totalWithAddOns)
  }

  /**
   * Validate global discount
   */
  const validateGlobalDiscount = (
    items: TransactionItem[],
    newDiscount: Discount
  ): { valid: boolean; error?: string } => {
    const subtotal = calculateCartSubtotal(items)
    return validateDiscount(newDiscount, subtotal)
  }

  /**
   * Format discount for display
   */
  const formatDiscount = (discount: Discount): string => {
    if (discount.type === 'percentage') {
      return `${discount.value}%`
    } else {
      return `Rp ${Math.round(discount.value).toLocaleString('id-ID')}`
    }
  }

  return {
    calculateDiscountAmount,
    calculateItemDiscount,
    calculateItemSubtotal,
    calculateCartSubtotal,
    calculateGlobalDiscountAmount,
    calculateTotal,
    validateDiscount,
    validateItemDiscount,
    validateGlobalDiscount,
    formatDiscount,
  }
}
