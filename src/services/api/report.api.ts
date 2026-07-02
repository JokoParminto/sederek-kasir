import apiClient from './client'

export interface DateRange {
  start_date: string
  end_date: string
}

export const reportApi = {
  getDashboardStats: (params: Partial<DateRange>) =>
    apiClient.get('/reports/dashboard', { params }),

  getDailySales: (params: Partial<DateRange> & { limit?: number }) =>
    apiClient.get('/reports/daily-sales', { params }),

  getMonthlySales: (params: { year?: number; limit?: number }) =>
    apiClient.get('/reports/monthly-sales', { params }),

  getBestProducts: (params: Partial<DateRange> & { limit?: number }) =>
    apiClient.get('/reports/best-products', { params }),

  getSalesByCategory: (params: Partial<DateRange>) =>
    apiClient.get('/reports/sales-by-category', { params }),

  getCashierPerformance: (params: Partial<DateRange> & { limit?: number }) =>
    apiClient.get('/reports/cashier-performance', { params }),
}
