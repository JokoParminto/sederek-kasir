import apiClient from '../apiClient'
import type { MemberTierRule } from '@/types/memberTier'

export const memberTierApi = {
  getRules(): Promise<MemberTierRule[]> {
    return apiClient.get('/member-tier-rules').then(r => r.data.data)
  },

  createRule(data: Partial<MemberTierRule>): Promise<MemberTierRule> {
    return apiClient.post('/member-tier-rules', data).then(r => r.data.data)
  },

  updateRule(id: string, data: Partial<MemberTierRule>): Promise<MemberTierRule> {
    return apiClient.put(`/member-tier-rules/${id}`, data).then(r => r.data.data)
  },

  deleteRule(id: string): Promise<void> {
    return apiClient.delete(`/member-tier-rules/${id}`).then(() => undefined)
  },

  setRuleProducts(ruleId: string, productIds: string[]): Promise<void> {
    return apiClient.post(`/member-tier-rules/${ruleId}/products`, { product_ids: productIds }).then(() => undefined)
  },
}
