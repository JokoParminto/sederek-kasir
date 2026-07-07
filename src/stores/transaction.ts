import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Transaction, TransactionItem, Discount, PaymentMethod } from '@/types'
import { useDiscount } from '@/composables/useDiscount'
import { recordSplitBillPayment, getTransactionPayments, getTransactionTotalPaid } from '@/services/api/transactionPayment.api'
import { transactionApi } from '@/services/api/transaction.api'
import { memberTierApi } from '@/services/api/memberTier.api'

const TRANSACTION_PREFIX = 'TXN'

export const useTransactionStore = defineStore('transaction', () => {
  // Composables
  const { calculateItemDiscount, calculateCartSubtotal, calculateGlobalDiscountAmount } = useDiscount()

  // State
  const items = ref<TransactionItem[]>([])
  const selectedCustomerId = ref<string | null>(null)
  const selectedCustomerIsMember = ref<boolean>(false)
  const selectedCustomerTier = ref<'umum' | 'akamsi' | 'vip' | null>(null)
  const selectedCustomerMemberStatus = ref<'active' | 'pending' | 'inactive'>('inactive')
  const memberDailyUsedToday = ref<number>(0)
  const memberDailyLimit = ref<number | null>(null)
  const memberDailyUsageLoading = ref<boolean>(false)
  const globalDiscount = ref<Discount>({ type: 'percentage', value: 0 })
  const paymentMethod = ref<PaymentMethod>('cash')
  const holdOrders = ref<Transaction[]>([])

  // Guard: prevent concurrent recalculations from rapid customer switching
  let recalculateTimer: ReturnType<typeof setTimeout> | null = null

  // Split Bill State
  const openTransactions = ref<Transaction[]>([])
  const selectedTransactionForPayment = ref<Transaction | null>(null)
  const isLoadingPayment = ref(false)
  const isLoadingSplitBill = ref(false)

  // Getters
  const itemCount = computed(() =>
    items.value.reduce((sum, item) => sum + item.quantity, 0)
  )

  const unpaidItems = computed(() => items.value.filter(i => i.paymentStatus !== 'paid'))

  const subtotal = computed(() => calculateCartSubtotal(unpaidItems.value))

  const totalItemDiscounts = computed(() => {
    return unpaidItems.value.reduce((sum, item) => {
      return sum + calculateItemDiscount(item)
    }, 0)
  })

  const globalDiscountAmount = computed(() => {
    return calculateGlobalDiscountAmount(subtotal.value, globalDiscount.value)
  })

  const total = computed(() =>
    Math.max(0, subtotal.value - globalDiscountAmount.value)
  )

  const isEmpty = computed(() => items.value.length === 0)

  // Total qty item di cart yang sudah dapat diskon member
  const memberDiscountedQtyInCart = computed(() =>
    items.value
      .filter(i => i.memberPrice !== undefined && i.memberPrice !== null)
      .reduce((sum, i) => sum + i.quantity, 0)
  )

  // Sisa kuota diskon hari ini (null = tidak ada limit)
  const memberRemainingQuota = computed(() => {
    if (memberDailyLimit.value === null) return null
    const used = memberDailyUsedToday.value + memberDiscountedQtyInCart.value
    return Math.max(0, memberDailyLimit.value - used)
  })

  // Actions
  const generateTransactionNumber = (): string => {
    const timestamp = Date.now()
    return `${TRANSACTION_PREFIX}-${timestamp}`
  }

  const addItem = (
    productId: string,
    productName: string,
    price: number,
    quantity: number = 1,
    tierMemberPrice?: number,
    categoryName?: string
  ): string => {








    



    
    // Tier-based pricing: KasirView computes tierMemberPrice via memberTierStore.computeDiscount
    const activeMember = selectedCustomerIsMember.value && selectedCustomerMemberStatus.value === 'active'
    const hasTierPrice = activeMember && tierMemberPrice !== undefined && tierMemberPrice !== null
    const finalPrice = hasTierPrice ? tierMemberPrice! : price
    const memberSaving = hasTierPrice ? (price - tierMemberPrice!) * quantity : 0







    const newItem: TransactionItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      productId,
      productName,
      price: finalPrice,
      originalPrice: price,
      memberPrice: hasTierPrice ? tierMemberPrice : undefined,
      is_member_price: hasTierPrice,
      memberSaving,
      quantity,
      discount: { type: 'percentage', value: 0 },
      addOns: [],
      subtotal: finalPrice * quantity,
      categoryName,
    }

    items.value.push(newItem)
    




    return newItem.id
  }

  const updateItemQuantity = (itemId: string, quantity: number): void => {
    const item = items.value.find(i => i.id === itemId)
    if (item) {
      item.quantity = Math.max(1, quantity)
      updateItemSubtotal(itemId)
    }
  }

  const updateItemSubtotal = (itemId: string): void => {
    const item = items.value.find(i => i.id === itemId)
    if (item) {
      const itemTotal = item.price * item.quantity
      const discountAmount = calculateItemDiscount(item)
      const addOnsTotal = (item.addOns || []).reduce((sum, addon) => sum + (addon.price * addon.quantity), 0)
      item.subtotal = itemTotal + addOnsTotal - discountAmount
      
       // Recalculate member savings based on current quantity
       if (item.is_member_price && item.memberPrice) {
         item.memberSaving = (item.originalPrice - item.memberPrice) * item.quantity
       }
    }
  }

  const isProductInCart = (productId: string): boolean => {
    return items.value.some(item => item.productId === productId)
  }

  const getProductsInCart = (): string[] => {
    return [...new Set(items.value.map(item => item.productId))]
  }

  const addAddOnToItem = (itemId: string, addOn: { id?: string; addOnId: string; addOnName: string; price: number; quantity: number; subtotal?: number }): void => {
    const item = items.value.find(i => i.id === itemId)
    if (item) {
      if (!item.addOns) {
        item.addOns = []
      }
      const addOnId = addOn.id || addOn.addOnId
      const existingAddOn = item.addOns.find(a => a.addOnId === addOn.addOnId)
      if (existingAddOn) {
        existingAddOn.quantity = addOn.quantity
      } else {
        item.addOns.push({
          id: addOnId,
          addOnId: addOn.addOnId,
          addOnName: addOn.addOnName,
          price: addOn.price,
          quantity: addOn.quantity,
          subtotal: addOn.subtotal || addOn.price * addOn.quantity,
        })
      }
      updateItemSubtotal(itemId)
    }
  }

  const removeAddOnFromItem = (itemId: string, addOnId: string): void => {
    const item = items.value.find(i => i.id === itemId)
    if (item && item.addOns) {
      const index = item.addOns.findIndex(a => a.addOnId === addOnId)
      if (index > -1) {
        item.addOns.splice(index, 1)
        updateItemSubtotal(itemId)
      }
    }
  }

  const updateAddOnQuantity = (itemId: string, addOnId: string, quantity: number): void => {
    const item = items.value.find(i => i.id === itemId)
    if (item && item.addOns) {
      const addOn = item.addOns.find(a => a.addOnId === addOnId)
      if (addOn) {
        addOn.quantity = Math.max(1, quantity)
        updateItemSubtotal(itemId)
      }
    }
  }

  const removeItem = (itemId: string): void => {
    const index = items.value.findIndex(i => i.id === itemId)
    if (index > -1) {
      items.value.splice(index, 1)
    }
  }

  const applyItemDiscount = (itemId: string, discount: Discount): void => {
    const item = items.value.find(i => i.id === itemId)
    if (item) {
      item.discount = discount
      updateItemSubtotal(itemId)
    }
  }

  const applyGlobalDiscount = (discount: Discount): void => {
    globalDiscount.value = discount
  }

  const setPaymentMethod = (method: PaymentMethod): void => {
    paymentMethod.value = method
  }

  const recalculateAllPrices = (): void => {



    
    if (items.value.length === 0) {


      return
    }





    // Create new array with updated items (Vue reactivity)
    // NOTE: recalculateAllPrices uses stored memberPrice per item (set when added).
    // Full re-compute via tier rules happens in KasirView after customer changes.
    let usedInRecalc = 0
    items.value = items.value.map((item) => {
      const activeMember = selectedCustomerIsMember.value && selectedCustomerMemberStatus.value === 'active'
      const hasMemberPrice = !!item.memberPrice
      const limit = memberDailyLimit.value
      const quotaOk = limit === null || (memberDailyUsedToday.value + usedInRecalc + item.quantity) <= limit
      const useMemberPrice = activeMember && hasMemberPrice && quotaOk
      if (useMemberPrice) usedInRecalc += item.quantity
      const newPrice = useMemberPrice ? item.memberPrice! : item.originalPrice
      const newMemberSaving = useMemberPrice ? (item.originalPrice - item.memberPrice!) * item.quantity : 0
      





      
      // Calculate new subtotal
      const itemTotal = newPrice * item.quantity
      const discountAmount = calculateItemDiscount(item)
      const addOnsTotal = (item.addOns || []).reduce((sum, addon) => sum + (addon.price * addon.quantity), 0)
      const newSubtotal = itemTotal + addOnsTotal - discountAmount

      // Return NEW object (Vue reactivity!)
      return {
        ...item,
        price: newPrice,
        is_member_price: useMemberPrice,
        memberSaving: newMemberSaving,
        subtotal: newSubtotal
      }
    })




  }

  const setSelectedCustomer = (
    customerId: string | null,
    is_member: boolean = false,
    memberType?: 'umum' | 'akamsi' | 'vip' | null,
    memberStatus?: 'active' | 'pending' | 'inactive'
  ): void => {








    
    const changed = selectedCustomerId.value !== customerId
    const hasItems = items.value.length > 0
    




    
    selectedCustomerId.value = customerId
    selectedCustomerIsMember.value = is_member
    selectedCustomerTier.value = memberType ?? null
    selectedCustomerMemberStatus.value = memberStatus ?? (is_member ? 'active' : 'inactive')

    // Reset daily usage
    memberDailyUsedToday.value = 0
    memberDailyLimit.value = null
    memberDailyUsageLoading.value = false

    // Fetch daily usage jika customer aktif member
    if (customerId && is_member && memberStatus === 'active' && memberType) {
      memberDailyUsageLoading.value = true
      memberTierApi.getDailyUsage(customerId)
        .then(data => { memberDailyUsedToday.value = data.used })
        .catch(() => { memberDailyUsedToday.value = 0 })
        .finally(() => { memberDailyUsageLoading.value = false })
    }

    if (changed && hasItems) {
      if (recalculateTimer) clearTimeout(recalculateTimer)
      recalculateTimer = setTimeout(() => {
        recalculateAllPrices()
        recalculateTimer = null
      }, 50)
    }
  }

  const clearTransaction = (): void => {
    items.value = []
    selectedCustomerId.value = null
    selectedCustomerIsMember.value = false
    selectedCustomerTier.value = null
    selectedCustomerMemberStatus.value = 'inactive'
    memberDailyUsedToday.value = 0
    memberDailyLimit.value = null
    globalDiscount.value = { type: 'percentage', value: 0 }
    paymentMethod.value = 'cash'
  }

  const holdOrder = (): Transaction => {
    const transaction: Transaction = {
      id: `draft-${Date.now()}`,
      transactionNumber: generateTransactionNumber(),
      customerId: selectedCustomerId.value,
      items: JSON.parse(JSON.stringify(items.value)),
      subtotal: subtotal.value,
      itemDiscounts: totalItemDiscounts.value,
      globalDiscount: globalDiscount.value,
      globalDiscountAmount: globalDiscountAmount.value,
      total: total.value,
      paymentMethod: paymentMethod.value,
      status: 'hold',
      cashierId: '',
      createdAt: new Date(),
    }

    holdOrders.value.push(transaction)
    clearTransaction()
    return transaction
  }

  const completePayment = (): Transaction => {
    const transaction: Transaction = {
      id: `txn-${Date.now()}`,
      transactionNumber: generateTransactionNumber(),
      customerId: selectedCustomerId.value,
      items: JSON.parse(JSON.stringify(items.value)),
      subtotal: subtotal.value,
      itemDiscounts: totalItemDiscounts.value,
      globalDiscount: globalDiscount.value,
      globalDiscountAmount: globalDiscountAmount.value,
      total: total.value,
      paymentMethod: paymentMethod.value,
      status: 'paid',
      cashierId: '',
      createdAt: new Date(),
      paidAt: new Date(),
    }

    clearTransaction()
    return transaction
  }

  const loadHoldOrder = (orderId: string): boolean => {
    const holdOrder = holdOrders.value.find(o => o.id === orderId)
    if (!holdOrder) return false

    items.value = JSON.parse(JSON.stringify(holdOrder.items))
    selectedCustomerId.value = holdOrder.customerId
    globalDiscount.value = holdOrder.globalDiscount
    paymentMethod.value = holdOrder.paymentMethod

    holdOrders.value = holdOrders.value.filter(o => o.id !== orderId)
    return true
  }

  const cancelHoldOrder = (orderId: string): void => {
    holdOrders.value = holdOrders.value.filter(o => o.id !== orderId)
  }

  // Split Bill Actions
  const loadingDetailIds = ref<string[]>([])

  const fetchOpenTransactions = async (search?: string): Promise<void> => {
    isLoadingSplitBill.value = true
    try {
      const [openResult, partialResult] = await Promise.all([
        transactionApi.listTransactions({ status: 'open', limit: 20, search }),
        transactionApi.listTransactions({ status: 'partial_paid', limit: 20, search }),
      ])
      const merged = [...openResult.data, ...partialResult.data]
      const seen = new Set<string>()
      openTransactions.value = merged.filter(t => seen.has(t.id) ? false : (seen.add(t.id), true))
    } catch (error) {
      openTransactions.value = []
    } finally {
      isLoadingSplitBill.value = false
    }
  }

  const loadTransactionDetail = async (id: string): Promise<void> => {
    if (loadingDetailIds.value.includes(id)) return
    loadingDetailIds.value = [...loadingDetailIds.value, id]
    try {
      const detail = await transactionApi.getTransaction(id)
      const idx = openTransactions.value.findIndex(t => t.id === id)
      if (idx !== -1) {
        openTransactions.value[idx] = detail
      }
    } catch {
      // silent fail — items stay empty, user can retry by scrolling
    } finally {
      loadingDetailIds.value = loadingDetailIds.value.filter(i => i !== id)
    }
  }

  const selectTransactionForPayment = (transaction: Transaction): void => {
    selectedTransactionForPayment.value = transaction
  }

  const clearSelectedTransaction = (): void => {
    selectedTransactionForPayment.value = null
  }

  const recordPayment = async (
    transactionId: string,
    paymentMethod: string,
    paymentMethodId: string | null,
    paidItems: Array<{ item_id: string; item_subtotal: number; quantity: number }>
  ): Promise<void> => {
    isLoadingPayment.value = true
    try {
      const result = await recordSplitBillPayment(transactionId, paymentMethod, paymentMethodId, paidItems)
      
      // Update the transaction in openTransactions list
      const txnIndex = openTransactions.value.findIndex(t => t.id === transactionId)
      if (txnIndex !== -1) {
        const transaction = openTransactions.value[txnIndex]
        if (transaction) {
          const paidItemIds = new Set(paidItems.map(item => item.item_id))
          const updatedItems = transaction.items.map(item => ({
            ...item,
            paymentStatus: paidItemIds.has(item.id) ? 'paid' : item.paymentStatus
          }))

          openTransactions.value[txnIndex] = {
            ...transaction,
            status: result.transaction_status as 'open' | 'partial_paid' | 'paid',
            amount_paid: result.total_paid,
            remaining_amount: result.remaining_amount,
            items: updatedItems,
            id: transaction.id
          }
        }
      }

      // If payment completes the transaction, remove it from open list
      if (result.transaction_status === 'paid') {
        openTransactions.value = openTransactions.value.filter(t => t.id !== transactionId)
      }
    } catch (error) {

      throw error
    } finally {
      isLoadingPayment.value = false
    }
  }

  return {
    // State
    items,
    selectedCustomerId,
    selectedCustomerIsMember,
    selectedCustomerTier,
    selectedCustomerMemberStatus,
    memberDailyUsedToday,
    memberDailyLimit,
    memberDailyUsageLoading,
    globalDiscount,
    paymentMethod,
    holdOrders,
    openTransactions,
    selectedTransactionForPayment,
    isLoadingPayment,
    isLoadingSplitBill,

    // Getters
    unpaidItems,
    itemCount,
    subtotal,
    totalItemDiscounts,
    globalDiscountAmount,
    total,
    isEmpty,
    memberDiscountedQtyInCart,
    memberRemainingQuota,

    // Actions
    generateTransactionNumber,
    addItem,
    updateItemQuantity,
    updateItemSubtotal,
    removeItem,
    applyItemDiscount,
    applyGlobalDiscount,
    setPaymentMethod,
    setSelectedCustomer,
    recalculateAllPrices,
    clearTransaction,
    holdOrder,
    completePayment,
    loadHoldOrder,
    cancelHoldOrder,
    isProductInCart,
    getProductsInCart,
    addAddOnToItem,
    removeAddOnFromItem,
    updateAddOnQuantity,

    // Split Bill Actions
    loadingDetailIds,
    fetchOpenTransactions,
    clearOpenTransactions: () => { openTransactions.value = [] },
    loadTransactionDetail,
    selectTransactionForPayment,
    clearSelectedTransaction,
    recordPayment,
  }
})
