import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Capacitor } from '@capacitor/core'
import type { Customer } from '@/types'
import { customerApi, type CustomerListParams } from '@/services/api/customer.api'

const isNative = Capacitor.isNativePlatform()

export const useCustomerStore = defineStore('customer', () => {
  // State
  const customers = ref<Customer[]>([])
  const total = ref(0)
  const searchQuery = ref('')
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const getCustomerById = (id: string): Customer | undefined => {



    
    const found = customers.value.find(c => c.id === id)

    
    return found
  }

  const searchedCustomers = computed(() => {
    if (!searchQuery.value) return customers.value

    const query = searchQuery.value.toLowerCase()
    return customers.value.filter(
      c =>
        c.name.toLowerCase().includes(query) ||
        (c.phone_number || '').includes(query)
    )
  })

  const topCustomers = computed(() =>
    [...customers.value]
      .sort((a, b) => b.total_spending - a.total_spending)
      .slice(0, 10)
  )

  const isPhoneNumberUnique = (phoneNumber: string, excludeId?: string): boolean => {
    return !customers.value.some(
      c => c.phone_number === phoneNumber && c.id !== excludeId
    )
  }

  // Actions
  const fetchCustomers = async (params: CustomerListParams = {}): Promise<void> => {
    try {
      isLoading.value = true
      error.value = null

      const result = await customerApi.getAllCustomers(params)
      customers.value = result.customers
      total.value = result.total

      if (isNative) {
        const { offlineDb } = await import('@/services/offline-db.service')
        await offlineDb.customers.cache(result.customers)
      }
    } catch (err) {
      if (isNative && !customers.value.length) {
        try {
          const { offlineDb } = await import('@/services/offline-db.service')
          const cached = await offlineDb.customers.getAll()
          if (cached.length) {
            customers.value = cached
            total.value = cached.length
            return
          }
        } catch { /* no cache available */ }
      }
      error.value = err instanceof Error ? err.message : 'Failed to fetch customers'
    } finally {
      isLoading.value = false
    }
  }

  const setCustomers = (newCustomers: Customer[]): void => {
    customers.value = newCustomers
  }

  const addCustomer = (customer: Customer): void => {
    customers.value.push(customer)
  }

  const updateCustomer = (id: string, updates: Partial<Customer>): void => {
    const customer = getCustomerById(id)
    if (customer) {
      Object.assign(customer, updates, { updated_at: new Date() })
    }
  }

  const deleteCustomer = (id: string): void => {
    const index = customers.value.findIndex(c => c.id === id)
    if (index > -1) {
      customers.value.splice(index, 1)
    }
  }

  const setSearchQuery = (query: string): void => {
    searchQuery.value = query
  }

  const updateCustomerSpending = (id: string, amount: number): void => {
    const customer = getCustomerById(id)
    if (customer) {
      customer.total_spending += amount
      customer.last_transaction = new Date()
      customer.updated_at = new Date()
    }
  }

  return {
    // State
    customers,
    total,
    searchQuery,
    isLoading,
    error,

    // Getters
    getCustomerById,
    searchedCustomers,
    topCustomers,
    isPhoneNumberUnique,

    // Actions
    fetchCustomers,
    setCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    setSearchQuery,
    updateCustomerSpending,
  }
})
