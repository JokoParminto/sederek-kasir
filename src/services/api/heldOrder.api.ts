import apiClient from './client'
import type { Transaction } from '@/types'
import { offlineQueue } from '@/services/offlineQueue'
import { parseWIB } from '@/utils/formatters'

function isNetworkError(error: any): boolean {
  return !error.response && (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || !navigator.onLine)
}

const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true'

// In-memory storage for mock held orders
let mockHeldOrdersData: Transaction[] = []

export const heldOrderApi = {
  /**
   * Create a held order
   */
  async createHeldOrder(data: {
     customer_id?: string | null
     subtotal: number
     discount_items: number
     discount_global: number
     discount_global_type: 'amount' | 'percentage'
     total: number
     payment_method: string
     notes?: string
     items: Array<{
       product_id: string
       product_name: string
       product_price: number  // Current price to charge (member or regular)
       quantity: number
       discount_amount: number
       discount_type: 'amount' | 'percentage'
       subtotal: number
       total: number
       original_price: number  // Regular/base price (REQUIRED)
       member_price?: number | null  // Member price if available (optional)
       is_member_price: boolean  // TRUE if member price is being used
       member_saving?: number  // Amount saved from member pricing (optional)
       addOns?: Array<{
         addOnId: string
         addOnName?: string
         quantity: number
         price: number
         subtotal: number
       }>
     }>
   }): Promise<Transaction> {
    if (USE_MOCK) {
      const newOrder: Transaction = {
        id: `held-${Date.now()}`,
        transactionNumber: `HOLD-${Date.now()}`,
        customerId: data.customer_id || null,
        items: data.items as any,
        subtotal: data.subtotal,
        itemDiscounts: data.discount_items,
        globalDiscount: {
          type: data.discount_global_type,
          value: data.discount_global,
        },
        globalDiscountAmount: data.discount_global,
        total: data.total,
        paymentMethod: data.payment_method as any,
        status: 'draft',
        cashierId: '',
        createdAt: new Date(),
      }
      mockHeldOrdersData.push(newOrder)
      return newOrder
    }

    try {
      const response = await apiClient.post<{ data: any }>('/held-orders', data)
      return response.data.data
    } catch (error: any) {
      if (isNetworkError(error)) {
        const entry = await offlineQueue.push('POST', '/held-orders', data)
        return { id: `offline-${entry.id}`, ...data, status: 'pending_sync' } as any
      }
      throw error
    }
  },

  /**
   * Get all held orders for current cashier
   */
  async getHeldOrders(): Promise<Transaction[]> {
    if (USE_MOCK) {
      return mockHeldOrdersData
    }

    try {

      const response = await apiClient.get<{ data: { data: any[] } }>('/held-orders')
       return response.data.data.data.map((order: any) => ({
         id: order.id,
         transactionNumber: order.transaction_number || `HOLD-${order.id.slice(0, 8)}`,
         customerId: order.customer_id,
         customerName: order.customer_name || 'Walk In',
         customerIsMember: order.customer_is_member || false,
         items: (order.items || []).map((item: any) => ({
           id: item.id,
           productId: item.product_id,
           productName: item.product_name || '',
           price: parseFloat(item.product_price) || 0,
           originalPrice: parseFloat(item.original_price) || parseFloat(item.product_price) || 0,
           memberPrice: item.member_price ? (parseFloat(item.member_price) || undefined) : undefined,
           is_member_price: item.is_member_price || false,
           memberSaving: parseFloat(item.member_saving) || 0,
           quantity: parseInt(item.quantity) || 1,
           notes: item.notes || '',
           discount: {
             type: (item.discount_type || 'amount') as 'amount' | 'percentage',
             value: parseFloat(item.discount_amount) || 0,
           },
           subtotal: parseFloat(item.total) || parseFloat(item.subtotal) || 0,
           categoryName: item.category_name || undefined,
           addOns: (item.addOns || []).map((a: any) => ({
             id: a.id,
             addOnId: a.addOnId,
             addOnName: a.addOnName || '',
             quantity: parseInt(a.quantity) || 1,
             price: parseFloat(a.price) || 0,
             subtotal: parseFloat(a.subtotal) || 0,
           })),
         })),
        subtotal: parseFloat(order.subtotal) || 0,
        itemDiscounts: parseFloat(order.discount_items) || 0,
        globalDiscount: {
          type: (order.discount_global_type || 'amount') as 'amount' | 'percentage',
          value: parseFloat(order.discount_global) || 0,
        },
        globalDiscountAmount: parseFloat(order.discount_global) || 0,
        total: (() => {
          // If member order, recalculate from item member prices to correct any race-condition saves
          const isMember = order.customer_is_member || false
          const items = (order.items || []) as any[]
          if (isMember && items.some((i: any) => i.member_price)) {
            const itemsTotal = items.reduce((sum: number, i: any) => {
              const memberP = i.member_price ? parseFloat(i.member_price) : null
              const price = memberP ?? parseFloat(i.product_price) ?? 0
              const qty = parseInt(i.quantity) || 1
              const disc = parseFloat(i.discount_amount) || 0
              const discType = i.discount_type || 'amount'
              const rawTotal = price * qty
              const discAmt = discType === 'percentage' ? rawTotal * disc / 100 : disc
              const addons = (i.addOns || []).reduce((s: number, a: any) => s + (parseFloat(a.subtotal) || 0), 0)
              return sum + rawTotal - discAmt + addons
            }, 0)
            const globalDisc = parseFloat(order.discount_global) || 0
            const globalDiscType = order.discount_global_type || 'amount'
            const globalDiscAmt = globalDiscType === 'percentage' ? itemsTotal * globalDisc / 100 : globalDisc
            return Math.max(0, itemsTotal - globalDiscAmt)
          }
          return parseFloat(order.total) || 0
        })(),
        paymentMethod: (order.payment_method || 'cash') as any,
        status: 'draft',
        cashierId: order.cashier_id || '',
        createdAt: new Date(order.created_at),
        updatedAt: order.updated_at ? new Date(order.updated_at) : undefined,
      }))
    } catch (error) {

      throw error
    }
  },

  /**
   * Get held order detail
   */
  async getHeldOrderDetail(id: string): Promise<Transaction> {
    if (USE_MOCK) {
      const order = mockHeldOrdersData.find(o => o.id === id)
      if (!order) throw new Error('Held order not found')
      return order
    }

    try {

      const response = await apiClient.get<{ data: any }>(`/held-orders/${id}`)
      const data = response.data.data

      // Transform snake_case to camelCase
      const transaction: Transaction = {
        id: data.id,
        transactionNumber: data.transaction_number || `HOLD-${data.id.slice(0, 8)}`,
        customerId: data.customer_id,
        customerName: data.customer_name || 'Walk In',
        customerIsMember: data.customer_is_member || false,
        items: (data.items || []).map((item: any) => ({
          id: item.id,
          productId: item.product_id,
          productName: item.product_name || '',
          price: parseFloat(item.product_price) || 0,
          originalPrice: parseFloat(item.original_price) || parseFloat(item.product_price) || 0,
          memberPrice: item.member_price ? (parseFloat(item.member_price) || undefined) : undefined,
          is_member_price: item.is_member_price || false,
          memberSaving: parseFloat(item.member_saving) || 0,
          quantity: parseInt(item.quantity) || 1,
          notes: item.notes || '',
          paymentStatus: item.payment_status,
          discount: {
            type: (item.discount_type || 'amount') as 'amount' | 'percentage',
            value: parseFloat(item.discount_amount) || 0,
          },
          subtotal: parseFloat(item.total) || parseFloat(item.subtotal) || 0,
          categoryName: item.category_name || undefined,
          addOns: (item.add_ons || item.addOns || []).map((addOn: any) => ({
            id: addOn.id,
            addOnId: addOn.add_on_id || addOn.addOnId,
            addOnName: addOn.add_on_name || addOn.addOnName || '',
            quantity: parseInt(addOn.quantity) || 1,
            price: parseFloat(addOn.price) || 0,
            subtotal: parseFloat(addOn.subtotal) || 0,
          })),
        })),
        subtotal: parseFloat(data.subtotal) || 0,
        itemDiscounts: parseFloat(data.discount_items || 0),
        globalDiscount: {
          type: (data.discount_global_type || 'amount') as 'amount' | 'percentage',
          value: parseFloat(data.discount_global || 0),
        },
        globalDiscountAmount: parseFloat(data.discount_global || 0),
        total: parseFloat(data.total),
        paymentMethod: (data.payment_method || 'cash') as any,
        paymentDetails: data.payment_details,
        status: 'draft',
        cashierId: data.cashier_id || '',
        createdAt: parseWIB(data.created_at) ?? new Date(),
        updatedAt: parseWIB(data.updated_at),
      }
      return transaction
    } catch (error) {

      throw error
    }
  },

  /**
   * Update held order
   */
   async updateHeldOrder(
     id: string,
     data: {
       customer_id?: string | null
       subtotal: number
       discount_items: number
       discount_global: number
       discount_global_type: 'amount' | 'percentage'
       total: number
       version?: string  // updatedAt ISO string for optimistic locking
       notes?: string
       items: Array<{
         product_id: string
         product_name: string
         product_price: number  // Current price to charge (member or regular)
         quantity: number
         discount_amount: number
         discount_type: 'amount' | 'percentage'
         subtotal: number
         total: number
         original_price: number  // Regular/base price (REQUIRED)
         member_price?: number | null  // Member price if available (optional)
         is_member_price: boolean  // TRUE if member price is being used
         member_saving?: number  // Amount saved from member pricing (optional)
         addOns?: Array<{
           addOnId: string
           quantity: number
           price: number
           subtotal: number
         }>
       }>
     }
   ): Promise<Transaction> {
    if (USE_MOCK) {
      const index = mockHeldOrdersData.findIndex(o => o.id === id)
      if (index === -1) throw new Error('Held order not found')

      mockHeldOrdersData[index] = {
        ...mockHeldOrdersData[index],
        id,
        transactionNumber: mockHeldOrdersData[index]?.transactionNumber ?? id,
        customerId: data.customer_id || null,
        items: data.items as any,
        subtotal: data.subtotal,
        itemDiscounts: data.discount_items,
        globalDiscount: {
          type: data.discount_global_type,
          value: data.discount_global,
        },
        globalDiscountAmount: data.discount_global,
        total: data.total,
      } as any
      return mockHeldOrdersData[index] as any
    }

    try {
      const response = await apiClient.put<{ data: any }>(`/held-orders/${id}`, data)
      const result = response.data.data
      if (!result.id) result.id = id
      return result as Transaction
    } catch (error: any) {
      if (isNetworkError(error)) {
        await offlineQueue.push('PUT', `/held-orders/${id}`, data)
        return { id, ...data, status: 'pending_sync' } as any
      }
      throw error
    }
  },

  /**
   * Delete held order (cancel)
   */
  async deleteHeldOrder(id: string): Promise<void> {
    if (USE_MOCK) {
      const index = mockHeldOrdersData.findIndex(o => o.id === id)
      if (index === -1) throw new Error('Held order not found')
      mockHeldOrdersData.splice(index, 1)
      return
    }

    try {

      await apiClient.delete(`/held-orders/${id}`)
    } catch (error) {

      throw error
    }
  },
}
