import apiClient from './client'

export interface PaymentMethod {
  id: string
  icon: string
  name: string
  status: 'active' | 'inactive'
  created_at?: string
  updated_at?: string
}

export const paymentMethodApi = {
  // Get all payment methods
  async getPaymentMethods(): Promise<{ data: PaymentMethod[] }> {
    try {

      const response = await apiClient.get<any>('/payment-methods')


      // Handle response structure from backend
      // Backend returns: { success, data: [...], message }
      if (response.data.data && Array.isArray(response.data.data)) {
        return { data: response.data.data }
      }

      return { data: [] }
    } catch (error) {

      throw error
    }
  },

  // Get payment method by ID
  async getPaymentMethodById(id: string): Promise<{ data: PaymentMethod }> {
    try {

      const response = await apiClient.get<any>(`/payment-methods/${id}`)
      return { data: response.data.data }
    } catch (error) {

      throw error
    }
  },

  // Create new payment method
  async createPaymentMethod(data: {
    icon: string
    name: string
    status?: 'active' | 'inactive'
  }): Promise<{ data: PaymentMethod }> {
    try {

      const response = await apiClient.post<{ data: PaymentMethod }>('/payment-methods', data)
      return { data: response.data.data }
    } catch (error) {

      throw error
    }
  },

  // Update payment method
  async updatePaymentMethod(
    id: string,
    data: {
      icon?: string
      name?: string
      status?: 'active' | 'inactive'
    }
  ): Promise<{ data: PaymentMethod }> {
    try {

      const response = await apiClient.put<{ data: PaymentMethod }>(`/payment-methods/${id}`, data)
      return { data: response.data.data }
    } catch (error) {

      throw error
    }
  },

  // Delete payment method
  async deletePaymentMethod(id: string): Promise<void> {
    try {

      await apiClient.delete(`/payment-methods/${id}`)
    } catch (error) {

      throw error
    }
  },
}
