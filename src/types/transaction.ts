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
  memberQuantity?: number
  regularQuantity?: number
  quantity: number
  discount: Discount
  addOns?: CartItemAddOn[]
  subtotal: number
  notes?: string
  paymentStatus?: 'paid' | 'unpaid'
  categoryName?: string
}

export interface TransactionQuoteRequest {
  customer_id?: string | null
  discount_global?: number
  discount_global_type?: 'amount' | 'percentage'
  items: Array<{
    client_line_id: string
    product_id: string
    quantity: number
    discount_amount?: number
    discount_type?: 'amount' | 'percentage'
    notes?: string
    addOns?: Array<{ addOnId: string; quantity: number }>
  }>
}

export interface TransactionQuoteLine {
  clientLineId: string | null
  productId: string
  productName: string
  quantity: number
  originalPrice: number
  memberPrice?: number
  memberQuantity: number
  regularQuantity: number
  effectivePrice: number
  memberSaving: number
  calculatedDiscount: number
  total: number
  addOns: CartItemAddOn[]
}

export interface TransactionQuote {
  customerId: string | null
  customerIsMember: boolean
  memberType: 'umum' | 'akamsi' | 'vip' | null
  items: TransactionQuoteLine[]
  subtotal: number
  itemDiscounts: number
  globalDiscountAmount: number
  totalMemberSavings: number
  total: number
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
  itemDiscounts: number  // Sum of all per-item manual discounts
  totalMemberSavings?: number  // Sum of all member price savings
  globalDiscount: Discount
  globalDiscountAmount: number
  total: number
  paymentMethod: PaymentMethod
  paymentDetails?: SplitPayment | Record<string, any>
  status: 'draft' | 'hold' | 'open' | 'partial_paid' | 'paid' | 'completed' | 'cancelled'
  cashierId: string
  cashierName?: string
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
