import apiClient from './client'

export type ItemStatus = 'pending' | 'making' | 'done'
export type OrderType = 'hold' | 'paid'

export interface QueueItemDetail {
  name: string
  qty: number
  notes: string
  addons: string[]
  status: ItemStatus
}

export interface QueueEntry {
  id: string
  order_ref_id: string
  order_type: OrderType
  transaction_number: string
  customer_name: string
  items: QueueItemDetail[]
  is_active: boolean
  queue_number: number | null
  shift_id: string | null
  ordered_at: string
  created_at: string
  updated_at: string
}

export interface AdvanceItemResult {
  all_done: boolean
  item_status: ItemStatus
  items: QueueItemDetail[]
}

export const queueApi = {
  getQueue: async (): Promise<QueueEntry[]> => {
    const res = await apiClient.get('/queue')
    return res.data?.data ?? []
  },

  advanceItemStatus: async (queueId: string, itemIndex: number): Promise<AdvanceItemResult> => {
    const res = await apiClient.patch(`/queue/${queueId}/item/${itemIndex}`)
    return res.data?.data
  },
}
