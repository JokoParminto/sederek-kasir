import type { Discount } from './transaction'

export type PromoStatus = 'upcoming' | 'active' | 'expired'

export interface Promo {
  id: string
  name: string
  description?: string
  startDate: Date
  endDate: Date
  productIds: string[]  // Products that have this promo
  discount: Discount
  status: PromoStatus
  createdAt: Date
  updatedAt: Date
}

export interface PromoSummary {
  id: string
  name: string
  status: PromoStatus
  appliedCount: number  // How many times applied
  totalDiscount: number
}
