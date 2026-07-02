import apiClient from './client'
import { mockAddOns } from '@/services/mock/mockAddOns'
import type { AddOn } from '@/types'

const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true'

// In-memory storage for mock data
let mockAddOnsData = JSON.parse(JSON.stringify(mockAddOns))

// Helper function to normalize add-ons
const normalizeAddOn = (data: any): AddOn => {
  return {
    id: data.id,
    name: data.name,
    price: parseFloat(data.price) || 0,
    description: data.description || '',
    icon: data.icon || '',
    sortOrder: data.sort_order || data.sortOrder || 0,
    status: data.status || 'active',
    createdAt: new Date(data.created_at || data.createdAt),
    updatedAt: new Date(data.updated_at || data.updatedAt),
  }
}

export const addOnApi = {
  /**
   * Get all active add-ons
   */
  async getAllAddOns(): Promise<AddOn[]> {
    if (USE_MOCK) {

      const activeAddOns = mockAddOnsData.filter((a: AddOn) => a.status === 'active')
      return Promise.resolve(activeAddOns)
    }

    try {

      const response = await apiClient.get<{ data: any[] }>('/add-ons')


      const rawAddOns = response.data.data
      const addOns = rawAddOns.map(normalizeAddOn)


      return addOns
    } catch (error) {

      throw error
    }
  },

  /**
   * Get all add-ons including inactive (admin only)
   */
  async getAllAddOnsIncludeInactive(): Promise<AddOn[]> {
    try {

      const response = await apiClient.get<{ data: any[] }>('/add-ons/all')

      const rawAddOns = response.data.data
      const addOns = rawAddOns.map(normalizeAddOn)


      return addOns
    } catch (error) {

      throw error
    }
  },

  /**
   * Get add-on by ID
   */
  async getAddOnById(id: string): Promise<AddOn> {
    try {

      const response = await apiClient.get<{ data: any }>(`/add-ons/${id}`)
      return normalizeAddOn(response.data.data)
    } catch (error) {

      throw error
    }
  },

  /**
   * Create add-on
   */
  async createAddOn(addOn: Omit<AddOn, 'id' | 'createdAt' | 'updatedAt'>): Promise<AddOn> {
    try {

      const response = await apiClient.post<{ data: any }>('/add-ons', {
        name: addOn.name,
        price: addOn.price,
        description: addOn.description,
        icon: addOn.icon,
        sort_order: addOn.sortOrder,
      })

      return normalizeAddOn(response.data.data)
    } catch (error) {

      throw error
    }
  },

  /**
   * Update add-on
   */
  async updateAddOn(id: string, addOn: Partial<AddOn>): Promise<AddOn> {
    try {

      const response = await apiClient.put<{ data: any }>(`/add-ons/${id}`, {
        name: addOn.name,
        price: addOn.price,
        description: addOn.description,
        icon: addOn.icon,
        sort_order: addOn.sortOrder,
        status: addOn.status,
      })

      return normalizeAddOn(response.data.data)
    } catch (error) {

      throw error
    }
  },

  /**
   * Update add-on status
   */
  async updateAddOnStatus(id: string, status: 'active' | 'inactive'): Promise<AddOn> {
    try {

      const response = await apiClient.patch<{ data: any }>(`/add-ons/${id}/status`, {
        status,
      })

      return normalizeAddOn(response.data.data)
    } catch (error) {

      throw error
    }
  },

  /**
   * Delete add-on
   */
  async deleteAddOn(id: string): Promise<void> {
    try {

      await apiClient.delete(`/add-ons/${id}`)

    } catch (error) {

      throw error
    }
  },
}
