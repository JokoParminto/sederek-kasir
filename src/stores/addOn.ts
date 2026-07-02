import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AddOn } from '@/types'
import { addOnApi } from '@/services/api/addOn.api'

export const useAddOnStore = defineStore('addOn', () => {
  // State
  const addOns = ref<AddOn[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed properties
  const activeAddOns = computed(() =>
    addOns.value.filter(a => a.status === 'active')
  )

  const getAddOnById = (id: string): AddOn | undefined =>
    addOns.value.find(a => a.id === id)

  // Actions
  const setAddOns = (newAddOns: AddOn[]): void => {
    addOns.value = newAddOns
  }

  const fetchAddOns = async (): Promise<void> => {
    try {
      isLoading.value = true
      error.value = null

      const data = await addOnApi.getAllAddOns()

      addOns.value = data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch add-ons'

    } finally {
      isLoading.value = false
    }
  }

  const fetchAllAddOns = async (): Promise<void> => {
    try {
      isLoading.value = true
      error.value = null

      const data = await addOnApi.getAllAddOnsIncludeInactive()

      addOns.value = data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch add-ons'

    } finally {
      isLoading.value = false
    }
  }

  const addAddOn = (addOn: AddOn): void => {
    addOns.value.push(addOn)
  }

  const updateAddOn = (id: string, updates: Partial<AddOn>): void => {
    const addOn = getAddOnById(id)
    if (addOn) {
      Object.assign(addOn, updates)
    }
  }

  const removeAddOn = (id: string): void => {
    const index = addOns.value.findIndex(a => a.id === id)
    if (index > -1) {
      addOns.value.splice(index, 1)
    }
  }

  return {
    // State
    addOns,
    isLoading,
    error,

    // Getters
    activeAddOns,
    getAddOnById,

    // Actions
    setAddOns,
    fetchAddOns,
    fetchAllAddOns,
    addAddOn,
    updateAddOn,
    removeAddOn,
  }
})
