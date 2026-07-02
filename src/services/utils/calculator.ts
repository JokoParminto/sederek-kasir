/**
 * Pure calculation functions for discount and transaction logic
 * These functions are isolated and testable
 */

import type { Discount, TransactionItem } from '@/types'

/**
 * Calculate discount amount based on type (percentage or nominal)
 * @param baseAmount - The base amount to apply discount to
 * @param discount - Discount object with type and value
 * @returns Calculated discount amount (rounded)
 */
export function calculateDiscountAmount(baseAmount: number, discount: Discount): number {
  if (discount.type === 'percentage') {
    return Math.round((baseAmount * discount.value) / 100)
  } else {
    return Math.round(discount.value)
  }
}

/**
 * Calculate item price after discount
 * @param item - Transaction item
 * @returns Price after discount
 */
export function calculateItemPrice(item: TransactionItem): number {
  const itemTotal = item.price * item.quantity
  const discountAmount = calculateDiscountAmount(itemTotal, item.discount)
  return itemTotal - discountAmount
}

/**
 * Calculate cart subtotal (sum of all item prices after discounts)
 * @param items - Array of transaction items
 * @returns Cart subtotal
 */
export function calculateCartSubtotal(items: TransactionItem[]): number {
  return items.reduce((sum, item) => {
    return sum + calculateItemPrice(item)
  }, 0)
}

/**
 * Calculate final total after global discount
 * @param cartSubtotal - Cart subtotal
 * @param globalDiscount - Global discount object
 * @returns Final total (minimum 0)
 */
export function calculateFinalTotal(cartSubtotal: number, globalDiscount: Discount): number {
  const discountAmount = calculateDiscountAmount(cartSubtotal, globalDiscount)
  return Math.max(0, cartSubtotal - discountAmount)
}

/**
 * Validate discount doesn't exceed maximum
 * @param discount - Discount to validate
 * @param maxAmount - Maximum allowed amount
 * @returns Validation result
 */
export function validateDiscount(
  discount: Discount,
  maxAmount: number
): { valid: boolean; error?: string } {
  if (discount.value < 0) {
    return { valid: false, error: 'Discount value cannot be negative' }
  }

  if (discount.type === 'percentage' && discount.value > 100) {
    return { valid: false, error: 'Percentage cannot exceed 100%' }
  }

  const discountAmount = calculateDiscountAmount(maxAmount, discount)
  if (discountAmount > maxAmount) {
    return { valid: false, error: 'Discount exceeds maximum allowed' }
  }

  return { valid: true }
}

/**
 * Calculate payment change
 * @param payment - Payment amount
 * @param total - Total to be paid
 * @returns Change amount (minimum 0)
 */
export function calculateChange(payment: number, total: number): number {
  return Math.max(0, payment - total)
}

/**
 * Check if payment is sufficient
 * @param payment - Payment amount
 * @param total - Total to be paid
 * @returns True if payment covers total
 */
export function isPaymentSufficient(payment: number, total: number): boolean {
  return payment >= total
}

/**
 * Calculate summary statistics
 */
export function calculateTransactionSummary(items: TransactionItem[], globalDiscount: Discount) {
  const subtotal = calculateCartSubtotal(items)
  const itemDiscounts = items.reduce((sum, item) => {
    const itemTotal = item.price * item.quantity
    return sum + calculateDiscountAmount(itemTotal, item.discount)
  }, 0)
  const globalDiscountAmount = calculateDiscountAmount(subtotal, globalDiscount)
  const total = calculateFinalTotal(subtotal, globalDiscount)

  return {
    itemCount: items.length,
    quantity: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal,
    itemDiscounts,
    globalDiscount: globalDiscountAmount,
    totalDiscounts: itemDiscounts + globalDiscountAmount,
    total,
  }
}
