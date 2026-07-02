import { useTransactionStore } from '@/stores/transaction'
import { useProductStore } from '@/stores/product'
import type { Product, Discount } from '@/types'

/**
 * Transaction composable for Kasir module
 * Provides helper functions for transaction management with validation
 */
export function useTransaction() {
  const transactionStore = useTransactionStore()
  const productStore = useProductStore()

  /**
   * Add product to cart with validation
   */
  const addProduct = (product: Product, quantity: number = 1): { success: boolean; error?: string } => {
    // Validate product is available
    if (!productStore.isProductAvailable(product.id)) {
      return { success: false, error: 'Produk tidak tersedia atau stok habis' }
    }

    // Validate quantity
    if (quantity < 1) {
      return { success: false, error: 'Jumlah harus minimal 1' }
    }

    if (quantity > product.stock) {
      return { success: false, error: `Stok tidak cukup. Stok tersedia: ${product.stock}` }
    }

    transactionStore.addItem(product.id, product.name, product.price, quantity)
    return { success: true }
  }

  /**
   * Update item quantity with validation
   */
  const updateQuantity = (itemId: string, quantity: number): { success: boolean; error?: string } => {
    const item = transactionStore.items.find(i => i.id === itemId)
    if (!item) {
      return { success: false, error: 'Item tidak ditemukan' }
    }

    const product = productStore.getProductById(item.productId)
    if (!product) {
      return { success: false, error: 'Produk tidak ditemukan' }
    }

    if (quantity < 1) {
      return { success: false, error: 'Jumlah harus minimal 1' }
    }

    if (quantity > product.stock) {
      return { success: false, error: `Stok tidak cukup untuk ${product.name}` }
    }

    transactionStore.updateItemQuantity(itemId, quantity)
    return { success: true }
  }

  /**
   * Remove item from cart
   */
  const removeItem = (itemId: string): void => {
    transactionStore.removeItem(itemId)
  }

  /**
   * Apply discount to item
   */
  const applyItemDiscount = (itemId: string, discount: Discount): { success: boolean; error?: string } => {
    const item = transactionStore.items.find(i => i.id === itemId)
    if (!item) {
      return { success: false, error: 'Item tidak ditemukan' }
    }

    const itemTotal = item.price * item.quantity
    const discountAmount = discount.type === 'percentage'
      ? Math.round((itemTotal * discount.value) / 100)
      : discount.value

    if (discountAmount > itemTotal) {
      return { success: false, error: 'Diskon tidak boleh melebihi harga item' }
    }

    transactionStore.applyItemDiscount(itemId, discount)
    return { success: true }
  }

  /**
   * Apply global discount
   */
  const applyGlobalDiscount = (discount: Discount): { success: boolean; error?: string } => {
    const subtotal = transactionStore.subtotal
    const discountAmount = discount.type === 'percentage'
      ? Math.round((subtotal * discount.value) / 100)
      : discount.value

    if (discountAmount > subtotal) {
      return { success: false, error: 'Diskon tidak boleh melebihi total transaksi' }
    }

    transactionStore.applyGlobalDiscount(discount)
    return { success: true }
  }

  /**
   * Hold current order
   */
  const holdOrder = () => {
    return transactionStore.holdOrder()
  }

  /**
   * Complete payment
   */
  const completePayment = () => {
    return transactionStore.completePayment()
  }

  /**
   * Clear cart
   */
  const clearCart = () => {
    transactionStore.clearTransaction()
  }

  /**
   * Get transaction summary
   */
  const getTransactionSummary = () => {
    return {
      itemCount: transactionStore.items.length,
      quantity: transactionStore.items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: transactionStore.subtotal,
      totalItemDiscounts: transactionStore.items.reduce((sum, item) => {
        const itemTotal = item.price * item.quantity
        if (item.discount.type === 'percentage') {
          return sum + Math.round((itemTotal * item.discount.value) / 100)
        } else {
          return sum + item.discount.value
        }
      }, 0),
      globalDiscount: transactionStore.globalDiscountAmount,
      total: transactionStore.total,
    }
  }

  return {
    // State getters
    items: transactionStore.items,
    selectedCustomerId: transactionStore.selectedCustomerId,
    globalDiscount: transactionStore.globalDiscount,
    paymentMethod: transactionStore.paymentMethod,
    isEmpty: transactionStore.isEmpty,
    subtotal: transactionStore.subtotal,
    total: transactionStore.total,

    // Actions
    addProduct,
    updateQuantity,
    removeItem,
    applyItemDiscount,
    applyGlobalDiscount,
    holdOrder,
    completePayment,
    clearCart,
    getTransactionSummary,

    // Store methods
    setPaymentMethod: transactionStore.setPaymentMethod,
    setSelectedCustomer: transactionStore.setSelectedCustomer,
  }
}
