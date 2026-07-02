import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { shiftApi } from '@/services/api/shift.api'
import type { Shift } from '@/services/api/shift.api'

export const useShiftStore = defineStore('shift', () => {
  const currentShift = ref<Shift | null>(null)
  const isLoadingShift = ref(false)
  const shiftError = ref<string | null>(null)

  // Computed properties
  const shiftIncome = computed(() => {
    if (!currentShift.value) return 0
    // Pendapatan = penjualan - belanja (tidak termasuk modal awal)
    const totalCashIn = currentShift.value.total_cash_in || 0
    const totalCashOut = currentShift.value.total_cash_out || 0
    return totalCashIn - totalCashOut
  })

  const isShiftActive = computed(() => currentShift.value?.status === 'active')

  // Methods
  const fetchCurrentShift = async () => {
    isLoadingShift.value = true
    shiftError.value = null

    try {

      const shift = await shiftApi.getCurrentShift()


      currentShift.value = shift

      return shift
    } catch (error) {

      shiftError.value = error instanceof Error ? error.message : 'Failed to fetch shift'
      throw error
    } finally {
      isLoadingShift.value = false
    }
  }

  const openNewShift = async (modalAwal: number) => {
    isLoadingShift.value = true
    shiftError.value = null

    try {

      const newShift = await shiftApi.openShift(modalAwal)
      currentShift.value = newShift

      return newShift
    } catch (error) {

      shiftError.value = error instanceof Error ? error.message : 'Failed to open shift'
      throw error
    } finally {
      isLoadingShift.value = false
    }
  }

  const closeCurrentShift = async (
    actualCash: number,
    shopeeFoodData?: {
      shopee_food_amount: number
      shopee_food_discount_percent: number
      shopee_food_discount_nominal: number
      shopee_food_net: number
    }
  ) => {
    if (!currentShift.value) {
      throw new Error('No active shift to close')
    }

    isLoadingShift.value = true
    shiftError.value = null

    try {

      const closedShift = await shiftApi.closeShift(currentShift.value.id, actualCash, shopeeFoodData)
      currentShift.value = null

      return closedShift
    } catch (error) {

      shiftError.value = error instanceof Error ? error.message : 'Failed to close shift'
      throw error
    } finally {
      isLoadingShift.value = false
    }
  }

  const clearShift = () => {

    currentShift.value = null
    shiftError.value = null
  }

  return {
    // State
    currentShift,
    isLoadingShift,
    shiftError,

    // Computed
    shiftIncome,
    isShiftActive,

    // Methods
    fetchCurrentShift,
    openNewShift,
    closeCurrentShift,
    clearShift,
  }
})
