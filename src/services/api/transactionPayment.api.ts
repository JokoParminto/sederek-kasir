import apiClient from './client'
import type { PaymentMethod } from '@/types'

interface SplitBillPaymentRequest {
  payment_method: string
  payment_method_id?: string
  paid_items: Array<{
    item_id: string
    item_subtotal: number
    quantity: number
  }>
  notes?: string
}

interface TransactionPaymentResponse {
  id: string
  transaction_id: string
  amount_paid: number
  payment_method: string
  payment_method_id?: string
  paid_items_json: Array<{
    item_id: string
    quantity: number
  }>
  created_at: string
  updated_at: string
  idempotency_key?: string
}

interface RecordPaymentResponse {
  payment: TransactionPaymentResponse
  transaction_status: 'open' | 'partial_paid' | 'paid'
  remaining_amount: number
  total_paid: number
}

/**
 * Record a split bill payment for a transaction
 * @param transactionId - Transaction ID
 * @param paymentMethod - Payment method (cash, qris, transfer, etc.)
 * @param paidItems - Array of items being paid for with subtotals
 * @param notes - Optional notes for the payment
 * @returns Payment response with updated transaction status
 */
export const recordSplitBillPayment = async (
  transactionId: string,
  paymentMethod: string,
  paymentMethodId: string | null,
  paidItems: Array<{
    item_id: string
    item_subtotal: number
    quantity: number
  }>,
  notes?: string
): Promise<RecordPaymentResponse> => {
  try {
    // Build request with paid_items array
    // Amount is CALCULATED by backend from selected items, not sent directly
    const payload: SplitBillPaymentRequest = {
      payment_method: paymentMethod,
      payment_method_id: paymentMethodId || undefined,
      paid_items: paidItems,
      notes: notes || undefined,
    }

    const response = await apiClient.post<any>(
      `/transactions/${transactionId}/payments`,
      payload
    )

    // Backend wraps in { success, data: {...} } — unwrap if needed
    const body = response.data
    return (body?.data ?? body) as RecordPaymentResponse
  } catch (error) {

    throw error
  }
}

/**
 * Get payment history for a transaction
 * @param transactionId - Transaction ID
 * @returns Array of payment records
 */
export const getTransactionPayments = async (
  transactionId: string
): Promise<TransactionPaymentResponse[]> => {
  try {
    const response = await apiClient.get<{
      payments: TransactionPaymentResponse[]
      count: number
    }>(`/transactions/${transactionId}/payments`)

    return response.data.payments
  } catch (error) {

    throw error
  }
}

/**
 * Get total amount paid for a transaction
 * @param transactionId - Transaction ID
 * @returns Total paid amount and payment count
 */
export const getTransactionTotalPaid = async (
  transactionId: string
): Promise<{
  total_paid: number
  payment_count: number
}> => {
  try {
    const response = await apiClient.get<{
      total_paid: number
      payment_count: number
    }>(`/transactions/${transactionId}/total-paid`)

    return response.data
  } catch (error) {

    throw error
  }
}

/**
 * Refund a payment
 * @param transactionId - Transaction ID
 * @param paymentId - Payment ID to refund
 * @param reason - Reason for refund (optional)
 * @returns Refund details
 */
export const refundPayment = async (
  transactionId: string,
  paymentId: string,
  reason?: string
): Promise<{
  refund_id: string
  original_payment_id: string
  refund_amount: number
  transaction_status: 'open' | 'partial_paid' | 'paid'
}> => {
  try {
    const payload = reason ? { reason } : {}

    const response = await apiClient.post(
      `/transactions/${transactionId}/payments/${paymentId}/refund`,
      payload
    )

    return response.data
  } catch (error) {

    throw error
  }
}
