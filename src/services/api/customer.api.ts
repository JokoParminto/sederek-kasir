import apiClient from './client'
import { mockCustomers } from '@/services/mock/mockCustomers'
import type { Customer } from '@/types'
import { parseWIB } from '@/utils/formatters'

const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true'

// In-memory storage for mock data
let mockCustomersData = JSON.parse(JSON.stringify(mockCustomers))

// NO NORMALIZATION - USE SNAKE_CASE DIRECTLY FROM BACKEND
const normalizeCustomer = (data: any): Customer => {
  return {
    id: data.id,
    name: data.name,
    phone_number: data.phone_number || '',
    avatar_url: data.avatar_url || '',
    is_member: data.is_member === true,
    member_type: data.member_type ?? null,
    member_status: data.member_status ?? 'inactive',
    total_spending: parseFloat(data.total_spending) || 0,
    last_transaction: parseWIB(data.last_transaction),
    created_at: parseWIB(data.created_at) ?? new Date(),
    updated_at: parseWIB(data.updated_at) ?? new Date(),
  }
}

export type CustomerListParams = {
  page?: number
  limit?: number
  search?: string
}

export type CustomerListResult = {
  customers: Customer[]
  total: number
}

export const customerApi = {
  async getAllCustomers(params: CustomerListParams = {}): Promise<CustomerListResult> {
    if (USE_MOCK) {
      const all = mockCustomersData as Customer[]
      return { customers: all, total: all.length }
    }

    try {
      const response = await apiClient.get<any>('/customers', {
        params: {
          page: params.page ?? 1,
          limit: params.limit ?? 10,
          ...(params.search ? { search: params.search } : {}),
        },
      })
      const rawCustomers = response.data.data
      const customers = rawCustomers.map(normalizeCustomer)
      const total: number = response.data.pagination?.total ?? response.data.meta?.total ?? customers.length
      return { customers, total }
    } catch (error) {
      throw error
    }
  },

  async getCustomerById(id: string): Promise<Customer> {
    if (USE_MOCK) {
      const customer = mockCustomersData.find((c: Customer) => c.id === id)
      if (!customer) throw new Error('Customer not found')
      return customer
    }

    try {
      const response = await apiClient.get<{ data: any }>(`/customers/${id}`)
      return normalizeCustomer(response.data.data)
    } catch (error) {
      throw error
    }
  },

  async searchCustomers(query: string): Promise<Customer[]> {
    if (USE_MOCK) {
      const lowerQuery = query.toLowerCase()
      return mockCustomersData.filter(
        (c: Customer) =>
          c.name.toLowerCase().includes(lowerQuery) ||
          (c.phone_number || '').includes(query)
      )
    }

    try {
      const response = await apiClient.get<any>('/customers/search', {
        params: { q: query },
      })
      const rawCustomers = response.data.data
      return rawCustomers.map(normalizeCustomer)
    } catch (error) {
      throw error
    }
  },

  async createCustomer(
    customer: Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'last_transaction'>
  ): Promise<Customer> {
    if (USE_MOCK) {
      const newCustomer: Customer = {
        ...customer,
        id: `cust-${Date.now()}`,
        created_at: new Date(),
        updated_at: new Date(),
      }
      mockCustomersData.push(newCustomer)
      return newCustomer
    }

    try {

      const response = await apiClient.post<{ data: any }>('/customers', customer)
      return normalizeCustomer(response.data.data)
    } catch (error) {

      throw error
    }
  },

  async updateCustomer(
    id: string,
    customer: Partial<Customer>
  ): Promise<Customer> {
    if (USE_MOCK) {
      const index = mockCustomersData.findIndex((c: Customer) => c.id === id)
      if (index === -1) throw new Error('Customer not found')

      mockCustomersData[index] = {
        ...mockCustomersData[index],
        ...customer,
        updated_at: new Date(),
      }
      return mockCustomersData[index]
    }

    try {

      const response = await apiClient.put<{ data: any }>(`/customers/${id}`, customer)
      return normalizeCustomer(response.data.data)
    } catch (error) {

      throw error
    }
  },

  async deleteCustomer(id: string): Promise<void> {
    if (USE_MOCK) {
      const index = mockCustomersData.findIndex((c: Customer) => c.id === id)
      if (index === -1) throw new Error('Customer not found')
      mockCustomersData.splice(index, 1)
      return
    }

    try {
      await apiClient.delete(`/customers/${id}`)
    } catch (error) {

      throw error
    }
  },
}
