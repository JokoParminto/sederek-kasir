import apiClient from './client'
import type { MemberTierRule } from '@/types/memberTier'

export const memberTierApi = {
  getRules(): Promise<MemberTierRule[]> {
    return apiClient.get('/member-tier-rules').then((r: any) => r.data.data)
  },

  createRule(data: Partial<MemberTierRule>): Promise<MemberTierRule> {
    return apiClient.post('/member-tier-rules', data).then((r: any) => r.data.data)
  },

  updateRule(id: string, data: Partial<MemberTierRule>): Promise<MemberTierRule> {
    return apiClient.put(`/member-tier-rules/${id}`, data).then((r: any) => r.data.data)
  },

  deleteRule(id: string): Promise<void> {
    return apiClient.delete(`/member-tier-rules/${id}`).then(() => undefined)
  },

  setRuleProducts(ruleId: string, productIds: string[]): Promise<void> {
    return apiClient.post(`/member-tier-rules/${ruleId}/products`, { product_ids: productIds }).then(() => undefined)
  },

  getDailyUsage(customerId: string): Promise<{ used: number }> {
    return apiClient.get(`/member-tier-rules/daily-usage/${customerId}`).then((r: any) => r.data.data)
  },
}
