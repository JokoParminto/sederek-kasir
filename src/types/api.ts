export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  timestamp?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    perPage: number
    totalPages: number
    hasMore: boolean
  }
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, any>
}

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  ME: '/auth/me',

  // Products
  PRODUCTS: '/products',
  PRODUCT_BY_ID: (id: string) => `/products/${id}`,
  CATEGORIES: '/categories',

  // Customers
  CUSTOMERS: '/customers',
  CUSTOMER_BY_ID: (id: string) => `/customers/${id}`,
  CUSTOMER_TRANSACTIONS: (id: string) => `/customers/${id}/transactions`,

  // Transactions
  TRANSACTIONS: '/transactions',
  TRANSACTION_BY_ID: (id: string) => `/transactions/${id}`,
  HOLD_ORDER: '/transactions/hold',
  COMPLETE_PAYMENT: '/transactions/payment',

  // Reports
  REPORT_TRANSACTIONS: '/reports/transactions',
  REPORT_REVENUE: '/reports/revenue',
  REPORT_BEST_SELLING: '/reports/best-selling',
  REPORT_TOP_CUSTOMERS: '/reports/top-customers',

  // Settings
  USERS: '/users',
  PROMOS: '/promos',
} as const
