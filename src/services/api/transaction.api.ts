import apiClient from './client'
import type { Transaction, TransactionItem, Discount, PaymentMethod, SplitPayment } from '@/types'
import { offlineQueue } from '@/services/offlineQueue'
import { parseWIB } from '@/utils/formatters'

const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true'

// In-memory storage for mock transactions
let mockTransactionsData: Transaction[] = []

// Helper function to convert snake_case to camelCase for transaction data
const normalizeTransaction = (data: any): Transaction => {
  const items = (data.transaction_items || data.items || []).map((item: any) => {
    // Parse add-ons if available
    const addOns = (item.add_ons || item.addOns || []).map((addOn: any) => ({
      id: addOn.id,
      addOnId: addOn.add_on_id || addOn.addOnId,
      addOnName: addOn.add_on_name || addOn.addOnName || addOn.name,
      price: parseFloat(addOn.price) || 0,
      quantity: parseInt(addOn.quantity) || 1,
      subtotal: parseFloat(addOn.subtotal || addOn.price * addOn.quantity) || 0,
    }))

    return {
      id: item.id,
      productId: item.product_id || item.productId,
      productName: item.product_name || item.productName,
      price: parseFloat(item.product_price || item.price) || 0,
      originalPrice: parseFloat(item.original_price || item.originalPrice) || parseFloat(item.product_price || item.price) || 0,
      memberPrice: item.member_price ? parseFloat(item.member_price) : undefined,
      is_member_price: Boolean(item.is_member_price ?? item.isMemberPrice ?? false),
      paymentStatus: item.payment_status || item.paymentStatus,
      quantity: parseInt(item.quantity) || 1,
      discount: {
        type: (item.discount_type || item.discount?.type || 'amount') as 'percentage' | 'amount',
        value: parseFloat(item.discount_amount || item.discount?.value) || 0,
      },
      addOns: addOns.length > 0 ? addOns : undefined,
      subtotal: parseFloat(item.total || item.subtotal) || 0,
    }
  })

  return {
    id: data.id,
    transactionNumber: data.transaction_number || data.transactionNumber,
    customerId: data.customer_id || data.customerId || null,
    customerName: data.customer_name || data.customerName,
    items,
    subtotal: parseFloat(data.subtotal) || 0,
    itemDiscounts: parseFloat(data.discount_items || data.itemDiscounts) || 0,
    globalDiscount: {
      type: (data.discount_global_type || 'amount') as 'percentage' | 'amount',
      value: parseFloat(data.discount_global || data.globalDiscount) || 0,
    },
    globalDiscountAmount: parseFloat(data.discount_global || data.globalDiscountAmount) || 0,
    total: parseFloat(data.total) || 0,
    paymentMethod: (data.payment_method || data.paymentMethod || 'cash') as PaymentMethod,
    paymentDetails: data.payment_details || data.paymentDetails,
    status: (data.status || 'draft') as 'draft' | 'open' | 'partial_paid' | 'hold' | 'paid' | 'completed' | 'cancelled',
    cashierId: data.cashier_id || data.cashierId || '',
    createdAt: parseWIB(data.created_at || data.createdAt) ?? new Date(),
    paidAt: parseWIB(data.completed_at),
    notes: data.notes,
    amount_paid: data.amount_paid !== undefined ? parseFloat(data.amount_paid) : undefined,
    remaining_amount: data.remaining_amount !== undefined ? parseFloat(data.remaining_amount) : undefined,
    version_number: data.version_number !== undefined ? Number(data.version_number) : undefined,
    itemCount: data.items_count !== undefined ? parseInt(data.items_count) : undefined,
  }
}

export const transactionApi = {
  // Create draft transaction
  async createDraftTransaction(data?: {
    customerId?: string | null
  }): Promise<Transaction> {
    if (USE_MOCK) {
      const newTransaction: Transaction = {
        id: `draft-${Date.now()}`,
        transactionNumber: `TRX-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
        customerId: data?.customerId || null,
        items: [],
        subtotal: 0,
        itemDiscounts: 0,
        globalDiscount: { type: 'amount', value: 0 },
        globalDiscountAmount: 0,
        total: 0,
        paymentMethod: 'cash',
        status: 'draft',
        cashierId: '',
        createdAt: new Date(),
      }
      mockTransactionsData.push(newTransaction)
      return newTransaction
    }

    try {

      const requestData: any = {}
      if (data?.customerId) {
        requestData.customer_id = data.customerId
      }

      const response = await apiClient.post<{ data: any }>('/transactions/draft', requestData)
      return normalizeTransaction(response.data.data)
    } catch (error) {

      throw error
    }
  },

  // Get transaction by ID
  async getTransaction(id: string): Promise<Transaction> {
    if (USE_MOCK) {
      const transaction = mockTransactionsData.find(t => t.id === id)
      if (!transaction) throw new Error('Transaction not found')
      return transaction
    }

    try {

      const response = await apiClient.get<{ data: any }>(`/transactions/${id}`)
      return normalizeTransaction(response.data.data)
    } catch (error) {

      throw error
    }
  },

  // Add item to transaction
  async addItemToTransaction(
    transactionId: string,
    data: {
      productId: string
      quantity: number
      discount?: Discount
      addOns?: Array<{
        addOnId: string
        quantity: number
        price: number
        subtotal: number
      }>
    }
  ): Promise<Transaction> {
    if (USE_MOCK) {
      const transaction = mockTransactionsData.find(t => t.id === transactionId)
      if (!transaction) throw new Error('Transaction not found')

      const discountData = data.discount || { type: 'percentage' as const, value: 0 }

      const itemData = {
        product_id: data.productId,
        quantity: data.quantity,
        discount_amount: discountData.value,
        discount_type: discountData.type,
      }

      // Mock: just return updated transaction
      return transaction
    }

    try {

      const requestData: any = {
        product_id: data.productId,
        quantity: data.quantity,
      }
      if (data.discount) {
        Object.assign(requestData, {
          discount_amount: data.discount.value,
          discount_type: data.discount.type,
        })
      }
      if (data.addOns && data.addOns.length > 0) {
        requestData.addOns = data.addOns
      }

      const response = await apiClient.post<{ data: any }>(
        `/transactions/${transactionId}/items`,
        requestData
      )
      return normalizeTransaction(response.data.data)
    } catch (error) {

      throw error
    }
  },

  // Update transaction item
  async updateTransactionItem(
    transactionId: string,
    itemId: string,
    data: {
      quantity?: number
      discount?: Discount
    }
  ): Promise<Transaction> {
    if (USE_MOCK) {
      const transaction = mockTransactionsData.find(t => t.id === transactionId)
      if (!transaction) throw new Error('Transaction not found')

      const item = transaction.items.find(i => i.id === itemId)
      if (!item) throw new Error('Item not found')

      if (data.quantity !== undefined) {
        item.quantity = data.quantity
      }
      if (data.discount) {
        item.discount = data.discount
      }

      return transaction
    }

    try {

      const requestData: any = {}
      if (data.quantity !== undefined) {
        requestData.quantity = data.quantity
      }
      if (data.discount) {
        requestData.discount_amount = data.discount.value
        requestData.discount_type = data.discount.type
      }

      const response = await apiClient.put<{ data: any }>(
        `/transactions/${transactionId}/items/${itemId}`,
        requestData
      )
      return normalizeTransaction(response.data.data)
    } catch (error) {

      throw error
    }
  },

  // Remove item from transaction
  async removeTransactionItem(transactionId: string, itemId: string): Promise<Transaction> {
    if (USE_MOCK) {
      const transaction = mockTransactionsData.find(t => t.id === transactionId)
      if (!transaction) throw new Error('Transaction not found')

      transaction.items = transaction.items.filter(i => i.id !== itemId)
      return transaction
    }

    try {

      const response = await apiClient.delete<{ data: any }>(
        `/transactions/${transactionId}/items/${itemId}`
      )
      return normalizeTransaction(response.data.data)
    } catch (error) {

      throw error
    }
  },

  // Apply global discount
  async applyGlobalDiscount(
    transactionId: string,
    discount: {
      value: number
      type: 'percentage' | 'amount'
    }
  ): Promise<Transaction> {
    if (USE_MOCK) {
      const transaction = mockTransactionsData.find(t => t.id === transactionId)
      if (!transaction) throw new Error('Transaction not found')

      transaction.globalDiscount = discount
      return transaction
    }

    try {

      const requestData = {
        discount_global: discount.value,
        discount_global_type: discount.type,
      }

      const response = await apiClient.patch<{ data: any }>(
        `/transactions/${transactionId}/discount`,
        requestData
      )
      return normalizeTransaction(response.data.data)
    } catch (error) {

      throw error
    }
  },

  // Complete payment / finalize transaction
  async completePayment(
    transactionId: string,
    data: {
      paymentMethod: PaymentMethod
      amountPaid: number
      paymentDetails?: SplitPayment | Record<string, any>
    }
  ): Promise<Transaction> {
    if (USE_MOCK) {
      const transaction = mockTransactionsData.find(t => t.id === transactionId)
      if (!transaction) throw new Error('Transaction not found')

      transaction.paymentMethod = data.paymentMethod
      transaction.paymentDetails = data.paymentDetails
      transaction.status = 'paid'
      transaction.paidAt = new Date()

      return transaction
    }

    try {

      const requestData: any = {
        payment_method: data.paymentMethod,
        amount_paid: data.amountPaid,
      }
      if (data.paymentDetails) {
        requestData.payment_details = data.paymentDetails
      }

      const response = await apiClient.post<{ data: any }>(
        `/transactions/${transactionId}/complete`,
        requestData
      )
      return normalizeTransaction(response.data.data)
    } catch (error) {

      throw error
    }
  },

  // Cancel transaction
  async cancelTransaction(transactionId: string): Promise<Transaction> {
    if (USE_MOCK) {
      const transaction = mockTransactionsData.find(t => t.id === transactionId)
      if (!transaction) throw new Error('Transaction not found')

      transaction.status = 'cancelled'
      return transaction
    }

    try {

      const response = await apiClient.post<{ data: any }>(
        `/transactions/${transactionId}/cancel`,
        {}
      )
      return normalizeTransaction(response.data.data)
    } catch (error) {

      throw error
    }
  },

  // List transactions with filters
  async listTransactions(filters?: {
    status?: 'draft' | 'open' | 'partial_paid' | 'paid' | 'completed' | 'cancelled'
    customerId?: string
    search?: string
    limit?: number
    offset?: number
  }): Promise<{ data: Transaction[]; total: number }> {
    if (USE_MOCK) {
      let filtered = [...mockTransactionsData]

      if (filters?.status) {
        filtered = filtered.filter(t => t.status === filters.status)
      }
      if (filters?.customerId) {
        filtered = filtered.filter(t => t.customerId === filters.customerId)
      }

      const limit = filters?.limit || 20
      const offset = filters?.offset || 0

      return {
        data: filtered.slice(offset, offset + limit),
        total: filtered.length,
      }
    }

    try {

      const params: any = {}
      if (filters?.status) params.status = filters.status
      if (filters?.customerId) params.customer_id = filters.customerId
      if (filters?.search) params.search = filters.search
      if (filters?.limit) params.limit = filters.limit
      if (filters?.offset) params.offset = filters.offset

      const response = await apiClient.get<{ data: any[]; pagination: any }>(
        '/transactions',
        { params }
      )

      return {
        data: (response.data.data || []).map(normalizeTransaction),
        total: response.data.pagination?.total || 0,
      }
    } catch (error) {

      throw error
    }
  },

  // Get draft transactions for current cashier
  async getDraftTransactions(): Promise<Transaction[]> {
    if (USE_MOCK) {
      return mockTransactionsData.filter(t => t.status === 'draft')
    }

    try {

      const response = await apiClient.get<{ data: any[] }>('/transactions/draft')
      return response.data.data.map(normalizeTransaction)
    } catch (error) {

      throw error
    }
  },

  // Checkout - Create and complete transaction in one step
  async checkout(data: {
    customer_id?: string | null
    payment_method: string
    payment_method_id?: string
    shift_id?: string
    payment_details?: Record<string, any>
    amount_paid: number
    discount_global?: number
    discount_global_type?: 'amount' | 'percentage'
    notes?: string
    items: Array<{
      product_id: string
      product_name: string
      product_price: number
      quantity: number
      discount_amount?: number
      discount_type?: 'amount' | 'percentage'
      notes?: string
      addOns?: Array<{
        addOnId: string
        addOnName?: string
        quantity: number
        price: number
        subtotal: number
      }>
    }>
  }): Promise<Transaction> {
    try {
      const response = await apiClient.post<{ data: any }>('/transactions/checkout', data)
      return normalizeTransaction(response.data.data)
    } catch (error: any) {
      // Network error (offline) — queue untuk sync saat online kembali
      const isNetworkError = !error.response && (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || !navigator.onLine)
      if (isNetworkError) {
        const entry = await offlineQueue.push('POST', '/transactions/checkout', data)
        // Kembalikan pseudo-transaction agar UI kasir tetap bisa lanjut
        const offlineId = `offline-${entry.id}`
        const pseudoTrx: Transaction = {
          id: offlineId,
          transactionNumber: `OFFLINE-${entry.id.slice(0, 8).toUpperCase()}`,
          customerId: data.customer_id || null,
          items: data.items.map((item, i) => ({
            id: `offline-item-${i}`,
            productId: item.product_id,
            productName: item.product_name,
            price: item.product_price,
            originalPrice: item.product_price,
            quantity: item.quantity,
            notes: item.notes || '',
            discount: { type: 'amount', value: item.discount_amount || 0 },
            subtotal: item.product_price * item.quantity,
            addOns: (item.addOns || []).map((a, j) => ({
              id: `offline-addon-${i}-${j}`,
              addOnId: a.addOnId,
              addOnName: a.addOnName || '',
              quantity: a.quantity,
              price: a.price,
              subtotal: a.subtotal,
            })),
          })) as any,
          subtotal: data.items.reduce((s, i) => s + i.product_price * i.quantity, 0),
          itemDiscounts: 0,
          globalDiscount: { type: data.discount_global_type || 'amount', value: data.discount_global || 0 },
          globalDiscountAmount: data.discount_global || 0,
          total: data.amount_paid,
          paymentMethod: data.payment_method as any,
          status: 'pending_sync' as any,
          cashierId: '',
          createdAt: new Date(),
          isOffline: true,
        } as any
        return pseudoTrx
      }
      throw error
    }
  },

  // Update completed transaction (only in active shift)
  async updateTransaction(
    transactionId: string,
    data: {
      items: Array<{
        product_id?: string
        product_name?: string
        price: number
        quantity: number
        discount?: Discount
        add_ons?: Array<{
          add_on_id: string
          quantity: number
          price: number
        }>
        notes?: string
      }>
      discount?: {
        type: 'amount' | 'percentage'
        value: number
      }
      payment_method?: PaymentMethod
      notes?: string
    }
  ): Promise<Transaction> {
    if (USE_MOCK) {
      const transaction = mockTransactionsData.find(t => t.id === transactionId)
      if (!transaction) throw new Error('Transaction not found')

      transaction.items = data.items.map((item: any) => ({
        ...item,
        price: item.price,
        subtotal: item.price * item.quantity,
      }))

      if (data.discount) {
        transaction.globalDiscount = {
          type: data.discount.type === 'nominal' ? 'amount' : 'percentage',
          value: data.discount.value,
        }
      }

      if (data.payment_method) {
        transaction.paymentMethod = data.payment_method
      }

      return transaction
    }

    try {

      const requestData: any = {
        items: data.items.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          price: item.price,
          quantity: item.quantity,
          discount: item.discount ? {
            type: item.discount.type,
            value: item.discount.value,
          } : undefined,
          add_ons: item.add_ons,
          notes: item.notes,
        })),
      }

      if (data.discount) {
        requestData.discount = {
          type: data.discount.type,
          value: data.discount.value,
        }
      }

      if (data.payment_method) {
        requestData.payment_method = data.payment_method
      }

      if (data.notes) {
        requestData.notes = data.notes
      }

      const response = await apiClient.put<{ data: any }>(
        `/transactions/${transactionId}`,
        requestData
      )
      return normalizeTransaction(response.data.data)
    } catch (error) {

      throw error
    }
  },

  // Get reports grouped by shift
  // Returns only own shifts for cashiers, all shifts for admin
  async getReportsByShift(params?: {
    start_date?: string
    end_date?: string
    shift_id?: string
  }): Promise<{ data: any[] }> {
    try {

      const queryParams: any = {}
      if (params?.start_date) queryParams.start_date = params.start_date
      if (params?.end_date) queryParams.end_date = params.end_date
      if (params?.shift_id) queryParams.shift_id = params.shift_id

      const response = await apiClient.get<{ data: any[] }>('/transactions/reports/by-shift', {
        params: queryParams
      })
      return {
        data: (response.data.data || []).map((shift: any) => ({
          ...shift,
          transaction_count: parseInt(shift.transaction_count) || 0,
          total_sales: parseFloat(shift.total_sales) || 0,
          total_discount: parseFloat(shift.total_discount) || 0,
          total_expenses: parseFloat(shift.total_expenses) || 0,
          total_netto: parseFloat(shift.total_netto) || 0,
        }))
      }
    } catch (error) {

      throw error
    }
  },

  // List transactions with optional shift filtering
  async getTransactionsByShift(params?: {
    status?: string
    shift_id?: string
    start_date?: string
    end_date?: string
  }): Promise<{ data: any[] }> {
    try {

      const queryParams: any = { status: params?.status || 'paid,completed' }
      if (params?.shift_id) queryParams.shift_id = params.shift_id
      if (params?.start_date) queryParams.start_date = params.start_date
      if (params?.end_date) queryParams.end_date = params.end_date

      const response = await apiClient.get<{ data: any }>(
        '/transactions',
        { params: queryParams }
      )

      return { data: (response.data.data || []).map(normalizeTransaction) }
    } catch (error) {
      throw error
    }
  },

  // Top selling products (today by default, or by shift_id)
  async getTopProducts(params?: {
    shift_id?: string
    limit?: number
  }): Promise<Array<{ product_id: string; product_name: string; total_qty: number; total_revenue: number }>> {
    try {
      const queryParams: any = {}
      if (params?.shift_id) queryParams.shift_id = params.shift_id
      if (params?.limit) queryParams.limit = params.limit

      const response = await apiClient.get<{ data: any[] }>('/transactions/stats/top-products', { params: queryParams })
      return (response.data.data || []).map((p: any) => ({
        product_id: p.product_id,
        product_name: p.product_name,
        total_qty: parseInt(p.total_qty) || 0,
        total_revenue: parseFloat(p.total_revenue) || 0,
      }))
    } catch (error) {
      throw error
    }
  },
}
