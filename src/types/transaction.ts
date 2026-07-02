export interface Discount {
  type: 'percentage' | 'amount'
  value: number
}

export interface CartItemAddOn {
  id?: string
  addOnId: string
  addOnName: string
  price: number
  quantity: number
  subtotal: number
}

export interface TransactionItem {
  id: string
  productId: string
  productName: string
  price: number
  originalPrice: number
  memberPrice?: number
  is_member_price: boolean
  memberSaving?: number
  quantity: number
  discount: Discount
  addOns?: CartItemAddOn[]
  subtotal: number
  paymentStatus?: 'paid' | 'unpaid'
}

export interface SplitPayment {
  cash: number
  qris: number
}

export type PaymentMethod = 'cash' | 'qris' | 'transfer' | 'split'

export interface Transaction {
  id: string
  transactionNumber: string
  customerId: string | null
  customerName?: string  // For held orders and customer display
  customerIsMember?: boolean  // For restoring member pricing on held order load
  items: TransactionItem[]
  subtotal: number
  itemDiscounts: number  // Sum of all item discounts
  globalDiscount: Discount
  globalDiscountAmount: number
  total: number
  paymentMethod: PaymentMethod
  paymentDetails?: SplitPayment | Record<string, any>
  status: 'draft' | 'hold' | 'open' | 'partial_paid' | 'paid' | 'completed' | 'cancelled'
  cashierId: string
  createdAt: Date
  updatedAt?: Date
  paidAt?: Date
  notes?: string
  // Split bill fields (optional, from API)
  amount_paid?: number
  remaining_amount?: number
  version_number?: number
  itemCount?: number  // from list endpoint (items_count), items array may be empty
}

export interface TransactionSummary {
  totalTransactions: number
  totalRevenue: number
  totalDiscount: number
  averageTransaction: number
}
