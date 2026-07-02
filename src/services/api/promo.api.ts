import apiClient from './client'

export interface Promo {
  id: string
  name: string
  description?: string
  discount_value: number
  discount_type: 'amount' | 'percentage'
  start_date: string
  end_date: string
  min_transaction?: number
  max_discount?: number
  applicable_products?: any
  status: 'active' | 'inactive'
  usage_count?: number
  created_at?: string
  updated_at?: string
}

export const promoApi = {
  // List all promos with filters
  async listPromos(params?: {
    page?: number
    limit?: number
    status?: string
    search?: string
    active_only?: boolean
  }): Promise<{ data: Promo[]; pagination?: any }> {
    try {
      const response = await apiClient.get<any>('/promos', { params })

      return {
        data: response.data.data || [],
        pagination: response.data.pagination
      }
    } catch (error) {
      throw error
    }
  },

  // Get active promos (currently valid)
  async getActivePromos(): Promise<{ data: Promo[] }> {
    try {

      const response = await apiClient.get<any>('/promos/active')


      if (response.data.data && Array.isArray(response.data.data)) {
        return { data: response.data.data }
      }

      return { data: [] }
    } catch (error) {

      throw error
    }
  },

  // Get promo by ID
  async getPromoById(id: string): Promise<{ data: Promo }> {
    try {

      const response = await apiClient.get<{ data: Promo }>(`/promos/${id}`)
      return { data: response.data.data }
    } catch (error) {

      throw error
    }
  },

  // Create new promo
  async createPromo(data: {
    name: string
    description?: string
    discount_value: number
    discount_type: 'amount' | 'percentage'
    start_date: string
    end_date: string
    min_transaction?: number
    max_discount?: number
    applicable_products?: any
    status?: 'active' | 'inactive'
  }): Promise<{ data: Promo }> {
    try {

      const response = await apiClient.post<{ data: Promo }>('/promos', data)
      return { data: response.data.data }
    } catch (error) {

      throw error
    }
  },

  // Update promo
  async updatePromo(
    id: string,
    data: {
      name?: string
      description?: string
      discount_value?: number
      discount_type?: 'amount' | 'percentage'
      start_date?: string
      end_date?: string
      min_transaction?: number
      max_discount?: number
      applicable_products?: any
      status?: 'active' | 'inactive'
    }
  ): Promise<{ data: Promo }> {
    try {

      const response = await apiClient.put<{ data: Promo }>(`/promos/${id}`, data)
      return { data: response.data.data }
    } catch (error) {

      throw error
    }
  },

  // Delete promo
  async deletePromo(id: string): Promise<void> {
    try {

      await apiClient.delete(`/promos/${id}`)
    } catch (error) {

      throw error
    }
  },

  // Update promo status
  async updatePromoStatus(
    id: string,
    status: 'active' | 'inactive'
  ): Promise<{ data: Promo }> {
    try {

      const response = await apiClient.patch<{ data: Promo }>(
        `/promos/${id}/status`,
        { status }
      )
      return { data: response.data.data }
    } catch (error) {

      throw error
    }
  }
}
