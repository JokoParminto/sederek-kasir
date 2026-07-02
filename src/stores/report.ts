import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Transaction, TransactionSummary } from '@/types'

export const useReportStore = defineStore('report', () => {
  // State
  const transactions = ref<Transaction[]>([])
  const dateRange = ref<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  })
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const filteredTransactions = computed(() => {
    let filtered = transactions.value.filter(t => t.status === 'completed' || t.status === 'paid')

    // Filter by date range
    if (dateRange.value.start && dateRange.value.end) {
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.paidAt || t.createdAt)
        return (
          transactionDate >= dateRange.value.start! &&
          transactionDate <= dateRange.value.end!
        )
      })
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(b.paidAt || b.createdAt)
      const dateB = new Date(a.paidAt || a.createdAt)
      return dateA.getTime() - dateB.getTime()
    })
  })

  const transactionSummary = computed((): TransactionSummary => {
    const filtered = filteredTransactions.value

    const totalRevenue = filtered.reduce((sum, t) => sum + t.total, 0)
    const totalDiscount = filtered.reduce(
      (sum, t) => sum + t.itemDiscounts + t.globalDiscountAmount,
      0
    )

    return {
      totalTransactions: filtered.length,
      totalRevenue,
      totalDiscount,
      averageTransaction: filtered.length > 0 ? totalRevenue / filtered.length : 0,
    }
  })

  const bestSellingProducts = computed(() => {
    const productSales = new Map<
      string,
      { name: string; quantity: number; revenue: number }
    >()

    filteredTransactions.value.forEach(transaction => {
      transaction.items.forEach(item => {
        const existing = productSales.get(item.productId)
        if (existing) {
          existing.quantity += item.quantity
          existing.revenue += item.subtotal
        } else {
          productSales.set(item.productId, {
            name: item.productName,
            quantity: item.quantity,
            revenue: item.subtotal,
          })
        }
      })
    })

    return Array.from(productSales.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        quantity: data.quantity,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)
  })

  const topCustomers = computed(() => {
    const customerSpending = new Map<string, { name: string; total: number; count: number }>()

    filteredTransactions.value.forEach(transaction => {
      if (transaction.customerId) {
        const existing = customerSpending.get(transaction.customerId)
        if (existing) {
          existing.total += transaction.total
          existing.count += 1
        } else {
          // Note: We would need customer name from customer store
          // For now, just use customer ID
          customerSpending.set(transaction.customerId, {
            name: transaction.customerId,
            total: transaction.total,
            count: 1,
          })
        }
      }
    })

    return Array.from(customerSpending.entries())
      .map(([customerId, data]) => ({
        customerId,
        customerName: data.name,
        totalSpent: data.total,
        transactionCount: data.count,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)
  })

  const paymentMethodBreakdown = computed(() => {
    const breakdown = new Map<string, { count: number; total: number }>()

    filteredTransactions.value.forEach(transaction => {
      const method = transaction.paymentMethod
      const existing = breakdown.get(method)
      if (existing) {
        existing.count += 1
        existing.total += transaction.total
      } else {
        breakdown.set(method, { count: 1, total: transaction.total })
      }
    })

    return Array.from(breakdown.entries()).map(([method, data]) => ({
      method,
      count: data.count,
      total: data.total,
      percentage: (data.total / transactionSummary.value.totalRevenue) * 100,
    }))
  })

  // Actions
  const setTransactions = (newTransactions: Transaction[]): void => {
    transactions.value = newTransactions
  }

  const setDateRange = (start: Date | null, end: Date | null): void => {
    dateRange.value = { start, end }
  }

  const clearDateRange = (): void => {
    dateRange.value = { start: null, end: null }
  }

  const getTransactionById = (id: string): Transaction | undefined =>
    transactions.value.find(t => t.id === id)

  return {
    // State
    transactions,
    dateRange,
    isLoading,
    error,

    // Getters
    filteredTransactions,
    transactionSummary,
    bestSellingProducts,
    topCustomers,
    paymentMethodBreakdown,

    // Actions
    setTransactions,
    setDateRange,
    clearDateRange,
    getTransactionById,
  }
})
