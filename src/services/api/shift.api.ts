import apiClient from './client'

export interface Shift {
  id: string
  cashier_id: string
  modal_awal: number
  actual_cash?: number
  status: 'active' | 'closed'
  opened_at: string
  closed_at?: string
  created_at: string
  updated_at: string
  current_income?: number
  total_cash_in?: number
  total_cash_out?: number
}

export interface ShiftExpense {
  id: string
  shift_id: string
  deskripsi: string
  jumlah: number
  created_at: string
  updated_at: string
}

export const shiftApi = {
  /**
   * Open a new shift
   */
  async openShift(modalAwal: number): Promise<Shift> {
    try {

      const response = await apiClient.post<{ data: Shift }>('/shifts/open', {
        modal_awal: modalAwal,
      })

      return response.data.data
    } catch (error) {

      throw error
    }
  },

  /**
   * Get current active shift
   */
  async getCurrentShift(): Promise<Shift | null> {
    try {

      const response = await apiClient.get<{ data: Shift | null }>('/shifts/current')



      const shift = response.data.data
      if (shift) {

      } else {

      }

      return shift
    } catch (error) {

      throw error
    }
  },

  /**
   * Close shift
   */
  async closeShift(
    shiftId: string,
    actualCash: number,
    shopeeFoodData?: {
      shopee_food_amount: number
      shopee_food_discount_percent: number
      shopee_food_discount_nominal: number
      shopee_food_net: number
    }
  ): Promise<any> {
    try {

      const payload: any = {
        actual_cash: actualCash,
      }

      // Add Shopee Food data if provided
      if (shopeeFoodData && shopeeFoodData.shopee_food_amount > 0) {
        payload.shopee_food_amount = shopeeFoodData.shopee_food_amount
        payload.shopee_food_discount_percent = shopeeFoodData.shopee_food_discount_percent
        payload.shopee_food_discount_nominal = shopeeFoodData.shopee_food_discount_nominal
        payload.shopee_food_net = shopeeFoodData.shopee_food_net
      }

      const response = await apiClient.post<{ data: any }>(`/shifts/${shiftId}/close`, payload)

      return response.data.data
    } catch (error) {

      throw error
    }
  },

  /**
   * Get shift summary
   */
  async getShiftSummary(shiftId: string): Promise<any> {
    try {

      const response = await apiClient.get<{ data: any }>(`/shifts/${shiftId}/summary`)
      return response.data.data
    } catch (error) {

      throw error
    }
  },

  /**
   * Add expense to shift
   */
  async addExpense(shiftId: string, deskripsi: string, jumlah: number): Promise<ShiftExpense> {
    try {

      const response = await apiClient.post<{ data: ShiftExpense }>(
        `/shifts/${shiftId}/expenses`,
        {
          deskripsi,
          jumlah,
        }
      )

      return response.data.data
    } catch (error) {

      throw error
    }
  },

  /**
   * Get shift expenses
   */
  async getExpenses(shiftId: string): Promise<ShiftExpense[]> {
    try {

      const response = await apiClient.get<any>(`/shifts/${shiftId}/expenses`)



      // Handle different response structures
      let rawExpenses: any[] = []

      if (response.data.data && Array.isArray(response.data.data)) {
        // Direct array structure
        rawExpenses = response.data.data
      } else if (response.data.data && response.data.data.expenses) {
        // Nested structure: { data: { expenses: [...] } }
        rawExpenses = response.data.data.expenses
      } else if (Array.isArray(response.data)) {
        // Direct data is array
        rawExpenses = response.data
      }

      // Convert jumlah from string to number if needed
      const expenses: ShiftExpense[] = rawExpenses.map(exp => ({
        ...exp,
        jumlah: typeof exp.jumlah === 'string' ? parseFloat(exp.jumlah) : exp.jumlah
      }))


      return expenses
    } catch (error) {

      throw error
    }
  },

  /**
   * Update expense
   */
  async updateExpense(shiftId: string, expenseId: string, deskripsi: string, jumlah: number): Promise<ShiftExpense> {
    try {

      const response = await apiClient.put<{ data: ShiftExpense }>(
        `/shifts/${shiftId}/expenses/${expenseId}`,
        { deskripsi, jumlah }
      )
      return response.data.data
    } catch (error) {

      throw error
    }
  },

  /**
   * Delete expense
   */
  async deleteExpense(shiftId: string, expenseId: string): Promise<void> {
    try {

      await apiClient.delete(`/shifts/${shiftId}/expenses/${expenseId}`)
    } catch (error) {

      throw error
    }
  },

  /**
   * Get total expenses (sum of all shift_expenses.jumlah)
   */
  async getTotalExpenses(): Promise<{ total: number }> {
    try {

      const response = await apiClient.get<{ data: { total: number } }>(
        '/shifts/expenses/total'
      )

      return response.data.data
    } catch (error) {

      throw error
    }
  },

  /**
   * Get shift income calculation
   */
  async getShiftIncome(
    shiftId: string
  ): Promise<{
    shift_id: string
    modal_awal: number
    total_penjualan: number
    total_belanja: number
    pendapatan_shift: number  // total_penjualan - total_belanja
    total_kas: number         // modal_awal + pendapatan_shift (posisi uang di laci)
  }> {
    try {

      const response = await apiClient.get<{
        data: {
          shift_id: string
          modal_awal: number
          total_penjualan: number
          total_belanja: number
          pendapatan_shift: number
          total_kas: number
        }
      }>(`/shifts/${shiftId}/income`)

      return response.data.data
    } catch (error) {

      throw error
    }
  },
}
