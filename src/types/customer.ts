export interface Customer {
  id: string
  name: string
  phone_number: string
  avatar_url: string
  is_member: boolean
  member_type?: 'umum' | 'akamsi' | 'vip' | null
  member_status?: 'active' | 'pending' | 'inactive'
  total_spending: number
  last_transaction?: Date
  created_at: Date
  updated_at: Date
}

export interface CustomerTransaction {
  id: string
  transactionId: string
  date: Date
  amount: number
  itemCount: number
  paymentMethod: string
}
