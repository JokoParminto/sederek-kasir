export type MemberTier = 'umum' | 'akamsi' | 'vip'
export type MemberStatus = 'active' | 'pending' | 'inactive'
export type MemberRuleType = 'discount_amount' | 'fixed_price'
export type MemberRuleScope = 'all' | 'non_food' | 'specific'

export interface MemberTierRuleProduct {
  id: string
  name: string
}

export interface MemberTierRule {
  id: string
  tier: MemberTier
  label: string
  rule_type: MemberRuleType
  scope: MemberRuleScope
  min_price: number | null
  discount_amount: number | null
  fixed_price: number | null
  sort_order: number
  is_active: boolean
  daily_limit: number | null
  products: MemberTierRuleProduct[]
}

export interface TierDiscountResult {
  discountAmount: number
  finalPrice: number
  isFixed: boolean
  ruleLabel: string
}
