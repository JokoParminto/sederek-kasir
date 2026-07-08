<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, nextTick, watch } from 'vue'
import { useTransactionStore } from '@/stores/transaction'
import { useProductStore } from '@/stores/product'
import { useShiftStore } from '@/stores/shift'
import { useAuthStore } from '@/stores/auth'
import { useMemberTierStore } from '@/stores/memberTier'
import { useToast } from '@/composables/useToast'
import { productApi } from '@/services/api/product.api'
import { customerApi } from '@/services/api/customer.api'
import { transactionApi } from '@/services/api/transaction.api'
import { heldOrderApi } from '@/services/api/heldOrder.api'
import type { Product, Discount, Customer, PaymentMethod, SplitPayment, Transaction } from '@/types'
import { printerService } from '@/services/printer.service'
import { printLayoutService } from '@/services/printerlayout.service'
import type { CustomerLayoutConfig, BaristaLayoutConfig, KitchenLayoutConfig } from '@/services/printerlayout.service'
import { printBaristaTicket, printKitchenTicket } from '@/services/ticket-print.service'

import ProductListSection from './components/ProductListSection.vue'
import TransactionSidebar from '@/components/domain/TransactionSidebar.vue'
import PaymentModal from '@/components/domain/PaymentModal.vue'
import SplitBillModal from '@/components/domain/SplitBillModal.vue'
import ShiftControlPanel from '@/components/domain/ShiftControlPanel.vue'
import ExpenseModal from '@/components/domain/ExpenseModal.vue'
import CloseShiftModal from '@/components/domain/CloseShiftModal.vue'
import AddToCartModal from '@/components/domain/AddToCartModal.vue'
import PullToRefreshIndicator from '@/components/common/PullToRefreshIndicator.vue'
import { usePullToRefresh } from '@/composables/usePullToRefresh'

// Stores
const transactionStore = useTransactionStore()
const productStore = useProductStore()
const shiftStore = useShiftStore()
const authStore = useAuthStore()
const memberTierStore = useMemberTierStore()

// Toast
const { success: showSuccess, error: showError } = useToast()

// State
const isLoading = ref(false)
const isCreatingCustomer = ref(false)
const showPaymentModal = ref(false)
const showHeldOrdersModal = ref(false)
const showExpenseModal = ref(false)
const showCloseShiftModal = ref(false)
const showAddToCartModal = ref(false)
const showShiftModal = ref(false)
const showSplitBillModal = ref(false)
const CART_SPLIT_ID = 'CART_SPLIT'
const cartSplitTransaction = ref<Transaction | null>(null)
const selectedProductForModal = ref<Product | null>(null)
const customers = ref<Customer[]>([])
const customersPage = ref(1)
const customersTotal = ref(0)
const customersSearch = ref('')
const isLoadingMoreCustomers = ref(false)
const hasMoreCustomers = computed(() => customers.value.length < customersTotal.value)
const allSplitTransactions = computed(() =>
  cartSplitTransaction.value
    ? [cartSplitTransaction.value, ...transactionStore.openTransactions]
    : transactionStore.openTransactions
)
const heldOrders = ref<Transaction[]>([])
const currentTransaction = ref<Transaction | null>(null)
const loadedFromHeldOrderId = ref<string | null>(null)
const loadedFromHeldOrderVersion = ref<string | null>(null)
const loadedFromHeldOrderHasCustomer = ref(false)
const loadingHeldOrderId = ref<string | null>(null)
const modalAwal = ref<number | null>(null)
const shiftModalLoading = ref(false)
const shiftModalError = ref('')
const shiftControlPanelRef = ref<InstanceType<typeof ShiftControlPanel> | null>(null)

// Computed: Get selected customer and check if member
const selectedCustomer = computed(() =>
  customers.value.find(c => c.id === transactionStore.selectedCustomerId)
)

const is_selected_customer_member = computed(() =>
  selectedCustomer.value?.is_member || false
)

// Pull-to-refresh composable
const { pullRefreshOffset, isRefreshing, handleTouchStart, handleTouchMove, handleTouchEnd } = usePullToRefresh({
  threshold: 80,
  cooldown: 3000, // Prevent refresh more than once per 3 seconds
  onRefresh: async () => {
    try {

      // Clear cart for fresh start
      transactionStore.clearTransaction()

      // Refresh shift data and income
      await shiftStore.fetchCurrentShift()
      if (shiftControlPanelRef.value) {
        await shiftControlPanelRef.value.refreshPendapatanShift()
      }
      // Refresh products
      await productStore.fetchProducts()
      // Refresh customers
      await loadInitialCustomers()
      // Refresh held orders
      await refreshHeldOrders()
      // silent refresh — no toast needed
    } catch (err: any) {

      // Check for rate limit error
      if (err?.response?.data?.error?.code === 'TOO_MANY_REQUESTS') {
        showError('Tunggu sebentar sebelum refresh lagi')
      } else {
        showError('Gagal memperbarui data')
      }
      throw err
    }
  }
})

// Load data on mount
// ── Kasir cache (localStorage) untuk stale-while-revalidate ─────────────────
const CACHE_PRODUCTS  = 'pos_cache_products'
const CACHE_CATEGORIES = 'pos_cache_categories'

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch { return null }
}
function writeCache(key: string, data: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch {}
}

onMounted(async () => {
  transactionStore.clearTransaction()

  // ── Fase 1: Muat dari cache → UI langsung tampil ──
  const cachedProducts   = readCache<Product[]>(CACHE_PRODUCTS)
  const cachedCategories = readCache<any[]>(CACHE_CATEGORIES)
  const hasCache = cachedProducts?.length && cachedCategories?.length

  if (hasCache) {
    productStore.setProducts(cachedProducts!)
    productStore.setCategories(cachedCategories!)
    // Tidak isLoading agar UI langsung interaktif
  } else {
    isLoading.value = true
  }

  // Shift + member tier rules fire-and-forget (non-blocking)
  // reloadRules (bukan loadRules) agar perubahan rule dari admin langsung masuk
  shiftStore.fetchCurrentShift().catch(() => {})
  memberTierStore.reloadRules().catch(() => {})
    .then(() => syncDailyLimitToStore())

  // ── Fase 2: Refresh dari API di background ──
  const refreshData = async () => {
    try {
      const [productsResponse, categories] = await Promise.all([
        productApi.getAllProducts(),
        productApi.getAllCategories(),
      ])
      productStore.setProducts(productsResponse.data)
      productStore.setCategories(categories)
      writeCache(CACHE_PRODUCTS, productsResponse.data)
      writeCache(CACHE_CATEGORIES, categories)
    } catch {
      if (!hasCache) showError('Gagal memuat produk')
    } finally {
      isLoading.value = false
    }
  }

  // Customers + held orders juga background (tidak block UI)
  const refreshSecondary = async () => {
    try { await loadInitialCustomers() } catch { customers.value = [] }
    try {
      heldOrders.value = await heldOrderApi.getHeldOrders()
    } catch { heldOrders.value = [] }
  }

  if (hasCache) {
    // Ada cache → refresh di background, UI sudah aktif
    refreshData()
    refreshSecondary()
  } else {
    // Tidak ada cache → tunggu products dulu, secondary tetap background
    await refreshData()
    refreshSecondary()
  }
})

// Background refresh member tier rules tiap 5 menit
// Agar perubahan rule dari admin langsung masuk tanpa perlu reload halaman
let rulesRefreshInterval: ReturnType<typeof setInterval> | null = null
rulesRefreshInterval = setInterval(() => {
  memberTierStore.reloadRules().catch(() => {}).then(() => {
    syncDailyLimitToStore()
    if (transactionStore.selectedCustomerId) {
      reapplyTierDiscounts()
    }
  })
}, 5 * 60 * 1000)

onUnmounted(() => {
  if (rulesRefreshInterval) clearInterval(rulesRefreshInterval)
})

const handleSelectProduct = async (product: Product) => {
  if (!shiftStore.isShiftActive) {
    showError('Buka shift terlebih dahulu untuk menambah produk')
    showShiftModal.value = true
    return
  }

  if (!productStore.isProductAvailable(product.id)) {
    showError('Produk tidak tersedia atau stok habis')
    return
  }

  // Fetch fresh dari API agar addon selalu up-to-date
  try {
    selectedProductForModal.value = await productApi.getProductById(product.id)
  } catch {
    selectedProductForModal.value = product // fallback ke cache kalau gagal
  }
  showAddToCartModal.value = true
}

const handleAddToCart = (productId: string, quantity: number, selectedAddOns: any[], notes: string = '') => {
  const product = productStore.getProductById(productId)
  if (!product) return

  // Compute tier-based discount from member tier rules
  const tierResult = memberTierStore.computeDiscount(
    { id: product.id, price: product.price, categoryName: product.categoryName },
    transactionStore.selectedCustomerTier
  )

  // Daily quota check — jika qty melebihi sisa kuota, tidak apply diskon sama sekali
  let tierMemberPrice: number | undefined = undefined
  if (tierResult.discountAmount > 0) {
    const remaining = transactionStore.memberRemainingQuota
    if (remaining === null || quantity <= remaining) {
      tierMemberPrice = tierResult.finalPrice
    } else {
      showError(`Kuota diskon member hari ini tidak cukup (sisa ${remaining} cup)`)
    }
  }

  const itemId = transactionStore.addItem(
    product.id,
    product.name,
    product.price,
    quantity,
    tierMemberPrice,
    product.categoryName,
    notes || undefined
  )

  // Add selected add-ons to the item
  selectedAddOns.forEach(addOn => {
    transactionStore.addAddOnToItem(itemId, {
      addOnId: addOn.addOnId,
      addOnName: addOn.addOnName || 'Add-on',
      quantity: addOn.quantity ?? 1,
      price: addOn.price,
      subtotal: addOn.subtotal,
    })
  })

  // cart update sudah jadi visual feedback yang cukup
}

// Handle item quantity update - FE ONLY (no API calls)
const handleUpdateItemQuantity = (itemId: string, quantity: number) => {
  const item = transactionStore.items.find(i => i.id === itemId)
  if (!item) return

  transactionStore.updateItemQuantity(itemId, quantity)

  // Kalau item dapat diskon member dan qty naik, re-validate quota
  if (item.is_member_price) {
    reapplyTierDiscounts()
  }
}

// Handle item removal - FE ONLY (no API calls)
const handleRemoveItem = (itemId: string) => {
  transactionStore.removeItem(itemId)
}

// Handle item discount - FE ONLY (no API calls)
const handleApplyItemDiscount = (itemId: string, discount: Discount) => {
  transactionStore.applyItemDiscount(itemId, discount)
}

// Handle global discount - FE ONLY (no API calls)
const handleApplyGlobalDiscount = (discount: Discount) => {
  transactionStore.applyGlobalDiscount(discount)
}

// ── Barista + Kitchen Ticket Print (untuk direct payment) ───────────────────

const printBaristaKitchenTickets = async (trx: Transaction) => {
  // categoryName disediakan BE dari join dengan categories
  const nonFoodItems = trx.items.filter(i => i.categoryName !== 'Food')
  const foodItems    = trx.items.filter(i => i.categoryName === 'Food')

  const c        = (s: string) => String(s ?? '').replace(/[^\x20-\x7E\xA0-\xFF]/g, '').trim()
  const now      = new Date(trx.createdAt || new Date())
  const time     = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const queueNum = '01'
  const custName = c(trx.customerName || 'Walk In').toUpperCase()
  const trxNum   = c(trx.transactionNumber || '')

  const printers = await printerService.getAllPrinters()

  // ── Barista Ticket ──
  if (nonFoodItems.length > 0) {
    const bp = printers.find(p => p.type === 'barista') ?? null
    if (bp?.connectionType === 'bluetooth' && bp.devicePath) {
      try {
        const res = await printLayoutService.getLayoutByPrinterId(bp.id)
        await printBaristaTicket(nonFoodItems, bp, res.layout as BaristaLayoutConfig, { queueNum, custName, time, trxNum })
      } catch (e: any) {
        console.error('[BaristaTicket] Error:', e?.message || e)
      }
    }
  }

  // ── Kitchen Ticket ──
  if (foodItems.length > 0) {
    const kp = printers.find(p => p.type === 'kitchen') ?? null
    if (kp?.connectionType === 'bluetooth' && kp.devicePath) {
      try {
        const res = await printLayoutService.getLayoutByPrinterId(kp.id)
        await printKitchenTicket(foodItems, kp, res.layout as KitchenLayoutConfig, { queueNum, custName, time })
      } catch (e: any) {
        console.error('[KitchenTicket] Error:', e?.message || e)
      }
    }
  }
}

// ── Customer Receipt Auto-Print ─────────────────────────────────────────────

const printCustomerReceipt = async (trx: Transaction) => {
  try {
    const printers = await printerService.getAllPrinters()
    const printer = printers.find(p => p.type === 'customer') ?? null
    if (!printer) {
      console.warn('[AutoPrint] No customer printer configured')
      return
    }
    if (printer.connectionType !== 'bluetooth') {
      console.warn('[AutoPrint] Printer not BT, connectionType:', printer.connectionType)
      return
    }
    if (!printer.devicePath) {
      showError('Auto-print: Bluetooth printer belum dipilih di pengaturan printer')
      return
    }

    const result = await printLayoutService.getLayoutByPrinterId(printer.id)
    const cfg = result.layout as CustomerLayoutConfig
    const previewContent = result.previewContent

    const { bluetoothPrinter: bt, escpos } = await import('@/services/bluetooth-printer.service')

    const storedWidth = printer.paperSize
    const paperMm = (printer.connectionType === 'bluetooth' && storedWidth >= 80) ? 58 : storedWidth
    const dpi = printer.dpi || 203
    const printableDots = Math.floor((paperMm - 10) * dpi / 25.4)
    const cols = Math.floor(printableDots / 12)
    const div = '-'.repeat(cols)

    const clean = (s: string) => String(s ?? '').replace(/[^\x20-\x7E\xA0-\xFF]/g, '').trim()
    const L = (s: string) => escpos.textLine(s)
    const fmt = (n: any) => {
      const val = typeof n === 'number' ? n : parseInt(String(n ?? '0').replace(/\D/g, '')) || 0
      return `Rp${val.toLocaleString('id-ID')}`
    }
    const wrap = (text: string): string[] => {
      const t = clean(text)
      if (t.length <= cols) return [t]
      const words = t.split(' ')
      const lines: string[] = []
      let cur = ''
      for (const w of words) {
        const next = cur ? `${cur} ${w}` : w
        if (next.length <= cols) { cur = next }
        else { if (cur) lines.push(cur); cur = w.slice(0, cols) }
      }
      if (cur) lines.push(cur)
      return lines
    }
    const twoCol = (left: string, right: string) => {
      const r = clean(right).slice(0, cols - 2)
      return clean(left).slice(0, cols - r.length - 1).padEnd(cols - r.length - 1) + ' ' + r
    }
    const threeCol = (name: string, qty: string, price: string) => {
      const qW = 4; const pW = 11
      const nW = cols - qW - pW - 2
      return clean(name).slice(0, nW).padEnd(nW) + ' ' +
             clean(qty).slice(0, qW).padStart(qW) + ' ' +
             clean(price).slice(0, pW).padStart(pW)
    }

    // Store info from template's preview_content
    const sections = previewContent?.sections || {}
    const headerArr = Array.isArray(sections.header) ? sections.header : [sections.header || {}]
    const hd: Record<string, any> = {}
    headerArr.forEach((f: any) => f && Object.assign(hd, f))
    const footerSection = sections.footer || {}

    // Real data
    const paidAt = trx.paidAt ? new Date(trx.paidAt) : new Date(trx.createdAt)
    const dateStr = paidAt.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' })
    const timeStr = paidAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    const custName = trx.customerName || customers.value.find(c => c.id === trx.customerId)?.name || 'Walk In'
    const cashierName = authStore.userName

    const chunks: Uint8Array[] = [escpos.init(), ...escpos.applyFontSize(printer.fontSize), escpos.align('center')]

    // ── Header ──
    if (cfg.header.show_logo) {
      try {
        const logoDots = Math.floor(printableDots * 2 / 3)
        const logoModule = await import('@/assets/logo/logo-black.png')
        chunks.push(await escpos.rasterImage(logoModule.default, logoDots), escpos.lineFeed(1))
      } catch { /* logo optional */ }
    }
    if (cfg.header.show_store_name) {
      chunks.push(escpos.bold(true), L(clean(hd.store_name || 'Sederek Kopi')), escpos.bold(false))
    }
    if (cfg.header.show_store_address && hd.store_address) {
      for (const line of wrap(hd.store_address)) chunks.push(L(line))
    }
    if (cfg.header.show_store_phone && hd.store_phone) chunks.push(L(clean(hd.store_phone)))
    if (cfg.header.show_store_slogan && hd.store_slogan) chunks.push(L(clean(hd.store_slogan)))

    chunks.push(L(div), escpos.align('left'))
    chunks.push(L(clean(trx.transactionNumber)))
    if (cfg.header.show_transaction_date) chunks.push(L(`${dateStr} ${timeStr}`))
    if (cfg.header.show_cashier_name) chunks.push(L(`Kasir: ${clean(cashierName)}`))
    if (cfg.header.show_customer_name) chunks.push(L(`Tamu: ${clean(custName)}`))
    chunks.push(L(div))

    // ── Items ──
    if (cfg.item.show_item_name && cfg.item.show_item_quantity && cfg.item.show_item_price) {
      chunks.push(escpos.bold(true), L(threeCol('Item', 'Qty', 'Subtotal')), escpos.bold(false))
    }
    for (const item of trx.items) {
      const rawName = cfg.item.item_name_format === 'short'
        ? item.productName.slice(0, 16)
        : item.productName
      // Kalau member price: tampilkan harga asli di baris nama, subtotal = harga member × qty
      const displaySubtotal = item.is_member_price
        ? (item.memberPrice ?? item.price) * item.quantity
        : item.subtotal
      chunks.push(L(threeCol(
        cfg.item.show_item_name ? clean(rawName) : '',
        cfg.item.show_item_quantity ? String(item.quantity) : '',
        cfg.item.show_item_price ? fmt(displaySubtotal) : '',
      )))
      // Baris member discount per item — dikontrol dari layout config
      if (cfg.item.show_item_price && cfg.item.show_member_discount && item.is_member_price) {
        const saving = item.memberSaving ?? Math.max(0, (item.originalPrice - (item.memberPrice ?? item.price)) * item.quantity)
        if (saving > 0) {
          chunks.push(L(twoCol('  * Hrg normal', fmt(item.originalPrice * item.quantity))))
          chunks.push(L(twoCol('  * Hemat member', `-${fmt(saving)}`)))
        }
      }
      if (cfg.item.show_item_addons && item.addOns?.length) {
        for (const a of item.addOns) {
          const ap = a.price > 0 ? fmt(a.price * a.quantity) : ''
          chunks.push(L(ap ? twoCol(`  + ${clean(a.addOnName)}`, ap) : `  + ${clean(a.addOnName)}`))
        }
      }
      if (cfg.item.show_item_notes && item.notes) {
        chunks.push(L(`  > ${clean(item.notes)}`))
      }
    }
    chunks.push(L(div))

    // ── Summary ──
    if (cfg.summary.show_subtotal) chunks.push(L(twoCol('Subtotal', fmt(trx.subtotal))))
    if (cfg.summary.show_member_savings) {
      const memberDisc = trx.totalMemberSavings || trx.items.reduce((s, i) =>
        s + (i.memberSaving ?? (i.is_member_price ? Math.max(0, (i.originalPrice - (i.memberPrice ?? i.price)) * i.quantity) : 0)), 0)
      if (memberDisc > 0) chunks.push(L(twoCol('Disc. Member', `-${fmt(memberDisc)}`)))
    }
    if (cfg.summary.show_discount) {
      const itemDisc = trx.itemDiscounts || 0
      const globalDisc = trx.globalDiscountAmount || 0
      if (itemDisc > 0) chunks.push(L(twoCol('Disc. Item', `-${fmt(itemDisc)}`)))
      if (globalDisc > 0) chunks.push(L(twoCol('Disc. Global', `-${fmt(globalDisc)}`)))
    }
    if (cfg.summary.show_payment_method) {
      chunks.push(L(twoCol('Bayar', clean(trx.paymentMethod || '-'))))
    }
    chunks.push(L(div))
    if (cfg.summary.show_total) {
      chunks.push(escpos.bold(true), L(twoCol('TOTAL', fmt(trx.total))), escpos.bold(false))
    }

    // ── Footer ──
    if (cfg.footer.show_thank_you_message && footerSection.footer_text) {
      chunks.push(escpos.align('center'), L(''), L(clean(footerSection.footer_text)))
    }

    chunks.push(escpos.lineFeed(3), escpos.cut())
    await bt.printTo(printer.devicePath, escpos.concat(...chunks))
  } catch (e: any) {
    console.error('[AutoPrint] Customer receipt print error:', e?.message || e)
    showError(`Auto-print gagal: ${e?.message || 'Cek koneksi Bluetooth printer'}`)
  }
}

// Handle payment - ONE STEP checkout
const handlePay = async (method: string, details?: SplitPayment | Record<string, any>, paymentMethodId?: string) => {
  if (transactionStore.isEmpty) {
    showError('Tidak ada item untuk dibayar')
    return
  }

  isLoading.value = true
  // Safety timeout: Force unlock after 30 seconds if payment gets stuck
  const paymentTimeout = setTimeout(() => {

    isLoading.value = false
  }, 30000)

  try {
    // Calculate amount paid based on payment method
    let amountPaid = transactionStore.total
    if (details?.cash !== undefined) {
      amountPaid = details.cash
    }



    // Prepare checkout data
    const checkoutData = {
      customer_id: transactionStore.selectedCustomerId,
      payment_method: method,
      payment_method_id: paymentMethodId,
      payment_details: details,
      amount_paid: amountPaid,
      discount_global: transactionStore.globalDiscount.value,
      discount_global_type: transactionStore.globalDiscount.type,
      // Kirim held_order_id agar backend bisa update antrian (preserve FIFO order time)
      held_order_id: loadedFromHeldOrderId.value || undefined,
       items: transactionStore.items.map(item => ({
         product_id: item.productId,
         product_name: item.productName,
         product_price: item.price,
         original_price: item.originalPrice,
         member_price: item.memberPrice || null,
         is_member_price: item.is_member_price || false,
         member_savings: item.memberSaving || 0,
         quantity: item.quantity,
         discount_amount: item.discount.value,
         discount_type: item.discount.type,
         notes: item.notes || '',
         addOns: item.addOns?.map(addOn => ({
           addOnId: addOn.addOnId,
           addOnName: addOn.addOnName,
           quantity: addOn.quantity,
           price: addOn.price,
           subtotal: addOn.subtotal,
         })) || [],
       })),
    }

    // ONE ENDPOINT - checkout
    const completedTransaction = await transactionApi.checkout(checkoutData)



    // Delete from held orders if this was loaded from a held order
    if (loadedFromHeldOrderId.value) {

      try {
        await heldOrderApi.deleteHeldOrder(loadedFromHeldOrderId.value)
        heldOrders.value = heldOrders.value.filter(order => order.id !== loadedFromHeldOrderId.value)

        loadedFromHeldOrderId.value = null
        loadedFromHeldOrderHasCustomer.value = false
      } catch (deleteError) {

        // Don't fail the payment if delete fails
      }
    }

    showSuccess(`Transaksi berhasil! No: ${completedTransaction.transactionNumber}`)
    showPaymentModal.value = false
    currentTransaction.value = null

    // Sequential: barista → kitchen → struk
    printBaristaKitchenTickets(completedTransaction)
      .then(() => printCustomerReceipt(completedTransaction))
      .catch(e => console.error('[PrintChain]', e))

    // Clear cart and reset
    transactionStore.clearTransaction()

    // Refresh shift income after successful checkout
    try {
      await shiftStore.fetchCurrentShift()
      // Also refresh the income display in ShiftControlPanel
      if (shiftControlPanelRef.value) {
        await shiftControlPanelRef.value.refreshPendapatanShift()
      }

    } catch (refreshError) {

    }
  } catch (err: any) {
    const code = err?.response?.data?.error?.code
    const message = err?.response?.data?.error?.message

    if (code === 'OUT_OF_STOCK') {
      showError(message || 'Stok produk tidak mencukupi, periksa kembali keranjang')
    } else if (code === 'NOT_FOUND') {
      showError(message || 'Produk tidak ditemukan atau sudah tidak aktif')
    } else if (code === 'VALIDATION_ERROR') {
      showError(message || 'Data transaksi tidak valid, periksa kembali')
    } else if (code === 'UNAUTHORIZED') {
      showError('Sesi habis, silakan login ulang')
    } else if (err?.response?.status === 503 || err?.code === 'ECONNREFUSED') {
      showError('Server tidak dapat dijangkau, coba beberapa saat lagi')
    } else {
      showError(message || 'Terjadi kesalahan saat checkout, silakan coba lagi')
    }

    // Tutup modal agar user bisa review cart dan retry — cart dibiarkan intact
    showPaymentModal.value = false
  } finally {
    clearTimeout(paymentTimeout)
    isLoading.value = false
  }
}

// Refresh cart dari held order terbaru di API (tanpa reload halaman)
const refreshCartFromServer = async () => {
  if (!loadedFromHeldOrderId.value) return
  try {
    const heldOrder = await heldOrderApi.getHeldOrderDetail(loadedFromHeldOrderId.value)
    transactionStore.clearTransaction()
    if (heldOrder.customerId) {
      const customerFound = customers.value.find(c => c.id === heldOrder.customerId)
      transactionStore.setSelectedCustomer(
        heldOrder.customerId,
        customerFound?.is_member ?? heldOrder.customerIsMember ?? false,
        customerFound?.member_type ?? null,
        customerFound?.member_status ?? 'inactive'
      )
    }
    for (const item of (heldOrder.items ?? [])) {
      const itemId = transactionStore.addItem(
        item.productId,
        item.productName,
        item.originalPrice ?? item.price,
        item.quantity,
        undefined,
        item.categoryName
      )
      const storeItem = transactionStore.items.find(i => i.id === itemId)
      if (storeItem) {
        storeItem.discount = item.discount ?? { type: 'amount', value: 0 }
        storeItem.notes = item.notes ?? ''
        storeItem.addOns = item.addOns ?? []
        storeItem.paymentStatus = item.paymentStatus
      }
    }
    if (heldOrder.globalDiscount) transactionStore.globalDiscount = heldOrder.globalDiscount
    // Reapply tier discount setelah daily usage selesai di-fetch
    const stopWatchRefresh = watch(
      () => transactionStore.memberDailyUsageLoading,
      (loading) => {
        if (!loading) {
          stopWatchRefresh()
          syncDailyLimitToStore()
          reapplyTierDiscounts()
        }
      },
      { immediate: true }
    )
  } catch {
    // Offline atau held order sudah tidak ada — biarkan cart apa adanya
  }
}

// Refresh held orders from backend
const refreshHeldOrders = async () => {
  try {

    const loadedHeldOrders = await heldOrderApi.getHeldOrders()
    heldOrders.value = loadedHeldOrders


    // Also refresh customers list
    try {
      await loadInitialCustomers()
    } catch (customerError) {

    }
  } catch (err) {

  }
}

// Handle hold order - Save to backend
const handleHoldOrder = async () => {
  if (transactionStore.isEmpty) {
    showError('Tidak ada item untuk di-hold')
    return
  }

  isLoading.value = true
  // Safety timeout: Force unlock after 15 seconds if hold gets stuck
  const holdTimeout = setTimeout(() => {

    isLoading.value = false
  }, 15000)

  try {
    // Ensure member prices are applied before reading totals (guards against 50ms recalculate timer)
    transactionStore.recalculateAllPrices()

    // Prepare items data with member pricing info
      const itemsData = transactionStore.items.map(item => ({
        product_id: item.productId,
        product_name: item.productName,
        product_price: item.price,
        quantity: item.quantity,
        discount_amount: item.discount.value,
        discount_type: item.discount.type,
        subtotal: item.price * item.quantity,
        total: item.subtotal,
        notes: item.notes || '',
        original_price: item.originalPrice || item.price,
        member_price: item.memberPrice || null,
        is_member_price: item.is_member_price || false,
        member_saving: item.memberSaving || 0,
        addOns: item.addOns?.map(addOn => ({
          addOnId: addOn.addOnId,
          addOnName: addOn.addOnName || '',
          quantity: addOn.quantity,
          price: addOn.price,
          subtotal: addOn.subtotal,
        })) || [],
      }))

    const heldOrderData = {
      customer_id: transactionStore.selectedCustomerId,
      subtotal: transactionStore.subtotal,
      discount_items: transactionStore.totalItemDiscounts,
      discount_global: transactionStore.globalDiscount.value,
      discount_global_type: transactionStore.globalDiscount.type,
      total: transactionStore.total,
      payment_method: transactionStore.paymentMethod,
      version: loadedFromHeldOrderVersion.value ?? undefined,
      items: itemsData,
    }

    let heldOrder: Transaction

    // Check if updating existing held order or creating new one
    if (loadedFromHeldOrderId.value) {

      heldOrder = await heldOrderApi.updateHeldOrder(loadedFromHeldOrderId.value, heldOrderData)

      // Update in local held orders list
      const index = heldOrders.value.findIndex(o => o.id === loadedFromHeldOrderId.value)
      if (index !== -1) {
        heldOrders.value[index] = heldOrder
      }

      showSuccess('Pesanan berhasil diperbarui')
    } else {

      heldOrder = await heldOrderApi.createHeldOrder(heldOrderData)

      // Add to local held orders list
      heldOrders.value.push(heldOrder)

      showSuccess('Pesanan berhasil di-hold')
    }

    // Clear local cart and reset tracking
    transactionStore.clearTransaction()
    currentTransaction.value = null
    loadedFromHeldOrderId.value = null
    loadedFromHeldOrderVersion.value = null
    loadedFromHeldOrderHasCustomer.value = false
  } catch (err: any) {
    const code = err?.response?.data?.error?.code
    if (code === 'CONFLICT') {
      showError('Order ini sudah diubah kasir lain. Silakan muat ulang dari daftar held orders.')
      // Reset version so next save attempt will not send stale version
      loadedFromHeldOrderVersion.value = null
    } else {
      showError('Gagal menyimpan pesanan')
    }
  } finally {
    clearTimeout(holdTimeout)
    isLoading.value = false
  }
}

// Handle load held order
const handleLoadHeldOrder = async (orderId: string) => {
  if (loadingHeldOrderId.value) return
  loadingHeldOrderId.value = orderId
  try {
    // Step 1: Fetch fresh dari API — kalau offline, lanjut pakai cache
    await Promise.all([
      refreshHeldOrders().catch(() => {}),
      loadInitialCustomers().catch(() => {}),
    ])

    // Step 2: Get held order detail — fallback ke cache kalau offline
    let heldOrder = heldOrders.value.find(o => o.id === orderId) ?? null
    try {
      heldOrder = await heldOrderApi.getHeldOrderDetail(orderId)
    } catch {
      if (!heldOrder) { showError('Tidak bisa memuat held order, cek koneksi internet'); return }
    }


    // Step 3: Clear current cart

    transactionStore.clearTransaction()
    currentTransaction.value = null

    // Step 4: Set customer FIRST before adding items

    if (heldOrder.customerId) {

      const customerFound = customers.value.find(c => c.id === heldOrder.customerId)
      const isMember = customerFound?.is_member ?? heldOrder.customerIsMember ?? false

      if (!customerFound && heldOrder.customerName) {
        customers.value.unshift({
          id: heldOrder.customerId,
          name: heldOrder.customerName,
          phone_number: '',
          avatar_url: '',
          is_member: isMember,
          total_spending: 0,
          created_at: new Date(),
          updated_at: new Date(),
        } as any)
      }
      const customerMeta = customers.value.find(c => c.id === heldOrder.customerId)
      transactionStore.setSelectedCustomer(
        heldOrder.customerId,
        isMember,
        customerMeta?.member_type ?? null,
        customerMeta?.member_status ?? 'inactive'
      )
    }

    // Step 5: Add items to cart

    for (const item of heldOrder.items) {
      const basePrice = item.originalPrice || item.price
      transactionStore.addItem(
        item.productId,
        item.productName,
        basePrice,
        item.quantity,
        undefined,
        item.categoryName
      )

      // Get the just-added item
      const addedItem = transactionStore.items[transactionStore.items.length - 1]

      // Apply item discount if any
      const discountAmount = item.discount?.value || 0
      const discountType = item.discount?.type || 'amount'

      if (discountAmount > 0 && addedItem) {
        transactionStore.applyItemDiscount(addedItem.id, {
          type: discountType as 'amount' | 'percentage',
          value: discountAmount,
        })
      }

      // Add add-ons if any
      if (item.addOns && item.addOns.length > 0 && addedItem) {

        for (const addOn of item.addOns) {
          transactionStore.addAddOnToItem(addedItem.id, {
            addOnId: addOn.addOnId,
            addOnName: addOn.addOnName,
            quantity: addOn.quantity,
            price: addOn.price,
            subtotal: addOn.subtotal,
          })
        }
      }

      if (addedItem) {
        addedItem.paymentStatus = (item as any).paymentStatus || (item as any).payment_status || 'unpaid'
      }
    }

    // Step 6: Apply global discount if any

    if (heldOrder.globalDiscount && heldOrder.globalDiscount.value > 0) {
      transactionStore.applyGlobalDiscount(heldOrder.globalDiscount)
    }

    // Step 6.5: Reapply tier discounts setelah daily usage fetch selesai
    const stopWatchLoad = watch(
      () => transactionStore.memberDailyUsageLoading,
      (loading) => {
        if (!loading) {
          stopWatchLoad()
          syncDailyLimitToStore()
          reapplyTierDiscounts()
        }
      },
      { immediate: true }
    )

    // Step 7: Store held order ID + version for later update/deletion after payment

    loadedFromHeldOrderId.value = orderId
    loadedFromHeldOrderVersion.value = heldOrder.updatedAt?.toISOString() ?? null
    loadedFromHeldOrderHasCustomer.value = !!heldOrder.customerId


    // Step 8: Wait for state updates to propagate
    await nextTick()

    // Step 9: Close modal
    showHeldOrdersModal.value = false

    // perubahan cart sudah jadi feedback cukup
  } catch (err) {
    showError('Gagal memuat order')
  } finally {
    loadingHeldOrderId.value = null
  }
}

// Handle cancel held order
const handleCancelHeldOrder = async (orderId: string) => {
  try {
    // Delete from backend
    await heldOrderApi.deleteHeldOrder(orderId)

    if (loadedFromHeldOrderId.value === orderId) {
      transactionStore.clearTransaction()
      currentTransaction.value = null
      loadedFromHeldOrderId.value = null
      loadedFromHeldOrderHasCustomer.value = false
    }

    // Check how many held orders remain
    const remainingCount = heldOrders.value.length - 1

    if (remainingCount === 0) {
      // If no more orders, close modal
      heldOrders.value = []
      showHeldOrdersModal.value = false
    } else {
      // If more orders exist, refresh the list from backend
      await refreshHeldOrders()
    }

    await transactionStore.fetchOpenTransactions()

    // item hilang dari list sudah jadi feedback cukup
  } catch (err) {
    showError('Gagal menghapus held order')
  }
}

// Build virtual transaction from current cart (for cart-based split bill)
const buildCartTransaction = (): Transaction => ({
  id: CART_SPLIT_ID,
  transactionNumber: 'Pesanan Saat Ini',
  customerId: transactionStore.selectedCustomerId,
  customerName: customers.value.find(c => c.id === transactionStore.selectedCustomerId)?.name || 'Walk In',
  customerIsMember: transactionStore.selectedCustomerIsMember,
  items: transactionStore.items.map(item => ({ ...item, paymentStatus: item.paymentStatus ?? 'unpaid' as const })),
  subtotal: transactionStore.subtotal,
  itemDiscounts: transactionStore.totalItemDiscounts,
  globalDiscount: transactionStore.globalDiscount,
  globalDiscountAmount: transactionStore.globalDiscountAmount,
  total: transactionStore.total,
  paymentMethod: 'cash',
  status: 'open',
  cashierId: '',
  createdAt: new Date(),
  amount_paid: transactionStore.items.filter(i => i.paymentStatus === 'paid').reduce((s, i) => s + i.subtotal, 0),
  remaining_amount: transactionStore.total,
})

// Auto-save remaining cart as updated held order (or delete if empty)
const autoSaveRemainingHeldOrder = async () => {
  if (!loadedFromHeldOrderId.value) return
  try {
    if (transactionStore.isEmpty) {
      await heldOrderApi.deleteHeldOrder(loadedFromHeldOrderId.value)
      heldOrders.value = heldOrders.value.filter(o => o.id !== loadedFromHeldOrderId.value)
      loadedFromHeldOrderId.value = null
      loadedFromHeldOrderVersion.value = null
      loadedFromHeldOrderHasCustomer.value = false
    } else {
      const itemsData = transactionStore.items.map(item => ({
        product_id: item.productId,
        product_name: item.productName,
        product_price: item.price,
        quantity: item.quantity,
        discount_amount: item.discount.value,
        discount_type: item.discount.type,
        subtotal: item.price * item.quantity,
        total: item.subtotal,
        notes: item.notes || '',
        original_price: item.originalPrice || item.price,
        member_price: item.memberPrice || null,
        is_member_price: item.is_member_price || false,
        member_saving: item.memberSaving || 0,
        addOns: item.addOns?.map(a => ({ addOnId: a.addOnId, addOnName: a.addOnName || '', quantity: a.quantity, price: a.price, subtotal: a.subtotal })) || [],
      }))
      const updated = await heldOrderApi.updateHeldOrder(loadedFromHeldOrderId.value, {
        customer_id: transactionStore.selectedCustomerId,
        subtotal: transactionStore.subtotal,
        discount_items: transactionStore.totalItemDiscounts,
        discount_global: transactionStore.globalDiscount.value,
        discount_global_type: transactionStore.globalDiscount.type,
        total: transactionStore.total,
        version: loadedFromHeldOrderVersion.value ?? undefined,
        items: itemsData,
      })
      const idx = heldOrders.value.findIndex(o => o.id === loadedFromHeldOrderId.value)
      if (idx !== -1) heldOrders.value[idx] = updated
    }
  } catch {}
}

// Partial checkout: pay for selected cart items without clearing the whole cart
const handlePartialCartCheckout = async (
  paymentMethod: string,
  paymentMethodId: string | null,
  paidItems: Array<{ item_id: string; item_subtotal: number; quantity: number }>
) => {
  const paidItemIds = new Set(paidItems.map(p => p.item_id))
  const paidCartItems = transactionStore.items.filter(item => paidItemIds.has(item.id))
  if (paidCartItems.length === 0) return

  const checkoutData = {
    customer_id: transactionStore.selectedCustomerId,
    payment_method: paymentMethod,
    payment_method_id: paymentMethodId ?? undefined,
    amount_paid: paidItems.reduce((sum, i) => sum + i.item_subtotal, 0),
    discount_global: 0,
    discount_global_type: 'amount' as const,
    items: paidCartItems.map(item => ({
      product_id: item.productId,
      product_name: item.productName,
      product_price: item.price,
      quantity: item.quantity,
      discount_amount: item.discount.value,
      discount_type: item.discount.type,
      addOns: item.addOns?.map(a => ({ addOnId: a.addOnId, addOnName: a.addOnName, quantity: a.quantity, price: a.price, subtotal: a.subtotal })) || [],
    })),
  }

  const completedTransaction = await transactionApi.checkout(checkoutData)

  // Auto-save held order dengan remaining items dulu
  // Remove paid items dari cart
  for (const item of paidCartItems) transactionStore.removeItem(item.id)
  await autoSaveRemainingHeldOrder()

  // Re-fetch cart dari server supaya sync (non-blocking)
  refreshCartFromServer().then(() => {
    cartSplitTransaction.value = transactionStore.isEmpty ? null : buildCartTransaction()
  }).catch(() => {
    cartSplitTransaction.value = transactionStore.isEmpty ? null : buildCartTransaction()
  })

  // Sequential: barista → kitchen → struk
  printBaristaKitchenTickets(completedTransaction)
    .then(() => printCustomerReceipt(completedTransaction))
    .catch(e => console.error('[PrintChain]', e))

  showSuccess(`Pembayaran berhasil! No: ${completedTransaction.transactionNumber}`)

  if (transactionStore.isEmpty) {
    showSplitBillModal.value = false
    transactionStore.clearTransaction()
  }
}

// Handle open split bill modal
const handleOpenSplitBill = async () => {
  if (!transactionStore.isEmpty) {
    // Cart ada items → split dari cart saja, jangan campur DB transactions
    transactionStore.clearOpenTransactions()
    cartSplitTransaction.value = buildCartTransaction()
    showSplitBillModal.value = true
  } else {
    // Cart kosong → fetch DB open transactions, buka modal dengan cache dulu
    cartSplitTransaction.value = null
    showSplitBillModal.value = true
    transactionStore.fetchOpenTransactions().catch(() => {})
  }
}

const handleSearchSplitBillTransactions = async (query: string) => {
  try {
    await transactionStore.fetchOpenTransactions(query)
  } catch {}
}

// Handle record split bill payment
const handleRecordSplitBillPayment = async (
  transactionId: string,
  paymentMethod: string,
  paymentMethodId: string | null,
  paidItems: Array<{ item_id: string; item_subtotal: number; quantity: number }>
) => {
  try {
    // Cart-based split bill (loaded held order in cart)
    if (transactionId === CART_SPLIT_ID) {
      await handlePartialCartCheckout(paymentMethod, paymentMethodId, paidItems)
      return
    }

    // Capture receipt items BEFORE recordPayment updates the store
    const txnBefore = transactionStore.openTransactions.find(t => t.id === transactionId)
    const paidItemIds = new Set(paidItems.map(p => p.item_id))
    const receiptItems = txnBefore?.items.filter(item => paidItemIds.has(item.id)) || []

    await transactionStore.recordPayment(transactionId, paymentMethod, paymentMethodId, paidItems)
    await transactionStore.fetchOpenTransactions()

    const isFullyPaid = !transactionStore.openTransactions.find(t => t.id === transactionId)
    showSuccess(isFullyPaid ? 'Transaksi lunas! Semua item sudah terbayar.' : 'Pembayaran berhasil tercatat')

    // Sequential: barista → kitchen → struk (untuk item yg dibayar)
    if (txnBefore && receiptItems.length > 0) {
      const partialTrx = { ...txnBefore, items: receiptItems, total: paidItems.reduce((sum, i) => sum + i.item_subtotal, 0) }
      printBaristaKitchenTickets(partialTrx)
        .then(() => printCustomerReceipt(partialTrx))
        .catch(e => console.error('[PrintChain]', e))
    }

    await refreshHeldOrders()

    if (transactionStore.openTransactions.length === 0) {
      showSplitBillModal.value = false
    }
  } catch (err) {
    showError('Gagal mencatat pembayaran split bill')
  }
}

// Re-compute tier discounts for all items already in cart (after customer change)
// Sync daily_limit dari rules tier yang aktif ke transaction store
const syncDailyLimitToStore = () => {
  const tier = transactionStore.selectedCustomerTier
  if (!tier) { transactionStore.memberDailyLimit = null; return }
  const tierRules = memberTierStore.rules.filter(r => r.tier === tier && r.is_active)
  const limit = tierRules.find(r => r.daily_limit !== null)?.daily_limit ?? null
  transactionStore.memberDailyLimit = limit
}

const reapplyTierDiscounts = () => {
  syncDailyLimitToStore()
  const tier = transactionStore.selectedCustomerTier
  // Reapply dengan quota check — hitung ulang dari nol
  let usedInCart = 0
  transactionStore.items.forEach(item => {
    const result = memberTierStore.computeDiscount(
      { id: item.productId, price: item.originalPrice, categoryName: item.categoryName },
      tier
    )
    const limit = transactionStore.memberDailyLimit
    const dailyUsed = transactionStore.memberDailyUsedToday
    const canApply = result.discountAmount > 0 &&
      (limit === null || (dailyUsed + usedInCart + item.quantity) <= limit)

    if (canApply) {
      item.memberPrice = result.finalPrice
      item.is_member_price = true
      item.memberSaving = result.discountAmount * item.quantity
      item.price = result.finalPrice
      usedInCart += item.quantity
    } else {
      item.memberPrice = undefined
      item.is_member_price = false
      item.memberSaving = 0
      item.price = item.originalPrice
    }
    item.subtotal = item.price * item.quantity
  })
}

// Handle customer selection
const handleSelectCustomer = (customerId: string | null) => {
  const selectedCustomer = customers.value.find(c => c.id === customerId)
  const is_member = selectedCustomer?.is_member || false
  const memberType = selectedCustomer?.member_type ?? null
  const memberStatus = selectedCustomer?.member_status ?? 'inactive'

  transactionStore.setSelectedCustomer(customerId, is_member, memberType, memberStatus)
  syncDailyLimitToStore()

  // Re-apply tier discounts ke cart items yang sudah ada saat customer dipilih
  if (customerId && is_member && memberStatus === 'active' && memberType) {
    // Tunggu fetch daily usage selesai — jangan pakai setTimeout agar tidak race condition
    const stopWatch = watch(
      () => transactionStore.memberDailyUsageLoading,
      (loading) => {
        if (!loading) {
          stopWatch()
          syncDailyLimitToStore()
          reapplyTierDiscounts()
        }
      },
      { immediate: true }
    )
  } else {
    reapplyTierDiscounts()
  }
}

// Handle add new customer
const handleAddNewCustomer = async (newCustomer: any) => {
  isCreatingCustomer.value = true

  try {
    const customer = await customerApi.createCustomer({
      name: newCustomer.name,
      phone_number: newCustomer.phone_number,
      avatar_url: newCustomer.avatar_url || '',
      is_member: newCustomer.is_member || false,
      total_spending: newCustomer.total_spending || 0,
    })

    customers.value.push(customer)
    transactionStore.setSelectedCustomer(
      customer.id,
      customer.is_member || false,
      customer.member_type ?? null,
      customer.member_status ?? 'inactive'
    )
    showSuccess(`✓ ${customer.name} ditambahkan`)
  } catch (err) {
    showError('Gagal menambahkan customer')
  } finally {
    isCreatingCustomer.value = false
  }
}

const CUSTOMER_LIMIT = 20

const loadInitialCustomers = async (search = '') => {
  try {
    customersSearch.value = search
    customersPage.value = 1
    const { customers: loaded, total } = await customerApi.getAllCustomers({
      page: 1, limit: CUSTOMER_LIMIT, ...(search ? { search } : {}),
    })
    customers.value = loaded
    customersTotal.value = total
  } catch {}
}

const loadMoreCustomers = async () => {
  if (isLoadingMoreCustomers.value || !hasMoreCustomers.value) return
  isLoadingMoreCustomers.value = true
  try {
    const nextPage = customersPage.value + 1
    const { customers: more, total } = await customerApi.getAllCustomers({
      page: nextPage, limit: CUSTOMER_LIMIT,
      ...(customersSearch.value ? { search: customersSearch.value } : {}),
    })
    customers.value = [...customers.value, ...more]
    customersTotal.value = total
    customersPage.value = nextPage
  } finally {
    isLoadingMoreCustomers.value = false
  }
}

const handleCustomerSearch = (query: string) => loadInitialCustomers(query)

// Re-fetch customers from API (called when CustomerSelector modal opens)
const refreshCustomers = () => loadInitialCustomers(customersSearch.value)

// Category filtering - Fetch from API
const handleSelectCategory = async (categoryId: string | null) => {
  productStore.setSelectedCategory(categoryId)

  try {
    if (categoryId) {
      await productStore.fetchProductsByCategory(categoryId)
    } else {
      await productStore.fetchProducts()
    }
  } catch (err) {
    // Silent fail for category selection
  }
}

// Product search - debounced 300ms to avoid per-keystroke API calls
let searchTimer: ReturnType<typeof setTimeout> | null = null
const handleSearch = (query: string) => {
  productStore.setSearchQuery(query)
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    try {
      if (query.trim()) {
        await productStore.searchProducts(query, productStore.selectedCategoryId || undefined)
      } else {
        if (productStore.selectedCategoryId) {
          await productStore.fetchProductsByCategory(productStore.selectedCategoryId)
        } else {
          await productStore.fetchProducts()
        }
      }
    } catch {
      // Silent fail for search
    }
  }, 300)
}

// Handle shift modal events
const handleOpenExpenseModal = () => {
  showExpenseModal.value = true
}

const handleOpenCloseModal = () => {
  showCloseShiftModal.value = true
}

// Handle Open Shift Modal
const handleOpenShift = async () => {
  if (modalAwal.value === null || modalAwal.value <= 0) {
    shiftModalError.value = 'Modal awal harus lebih dari 0'
    return
  }

  shiftModalLoading.value = true
  shiftModalError.value = ''

  try {
    const newShift = await shiftStore.openNewShift(modalAwal.value)

    await shiftStore.fetchCurrentShift()

    showShiftModal.value = false
    modalAwal.value = null
    showSuccess('Shift berhasil dibuka')
  } catch (err) {
    shiftModalError.value = 'Gagal membuka shift. Silakan coba lagi.'
  } finally {
    shiftModalLoading.value = false
  }
}

const handleCloseShiftModal = () => {
  showShiftModal.value = false
  modalAwal.value = null
  shiftModalError.value = ''
}

const formatModalAwalDisplay = (value: number | null) => {
  if (!value || value <= 0) return ''
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const handleModalAwalInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const rawValue = input.value.replace(/\D/g, '')
  modalAwal.value = rawValue ? parseInt(rawValue, 10) : null
}
</script>

<template>
  <div class="kasir-view">
    <!-- Pull-to-Refresh Indicator -->
    <PullToRefreshIndicator
      :pull-refresh-offset="pullRefreshOffset"
      :is-refreshing="isRefreshing"
    />

    <!-- Shift Control Panel -->
    <ShiftControlPanel
      ref="shiftControlPanelRef"
      @openExpenseModal="handleOpenExpenseModal"
      @openCloseModal="handleOpenCloseModal"
      @openShiftModal="showShiftModal = true"
    />

    <!-- Main Layout: 70/30 Split -->
    <div
      class="kasir-container"
      @touchstart="handleTouchStart"
      @touchmove.passive="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <!-- Left Section: Product List (70%) -->
      <ProductListSection
        :products="productStore.filteredProducts"
        :categories="productStore.categories"
        :selected-category-id="productStore.selectedCategoryId"
        :search-query="productStore.searchQuery"
        :is-loading="isLoading"
        :is-customer-member="is_selected_customer_member"
        @select-category="handleSelectCategory"
        @search="handleSearch"
        @select-product="handleSelectProduct"
      />

      <!-- Right Section: Transaction Sidebar -->
      <TransactionSidebar
        :items="transactionStore.items"
        :global-discount="transactionStore.globalDiscount"
        :subtotal="transactionStore.subtotal"
        :customers="customers"
        :selected-customer-id="transactionStore.selectedCustomerId"
        :is-customer-locked="false"
        :is-loading="isLoading"
        :is-creating-customer="isCreatingCustomer"
        :is-loading-more-customers="isLoadingMoreCustomers"
        :has-more-customers="hasMoreCustomers"
        :held-orders="heldOrders"
        :show-held-orders-modal="showHeldOrdersModal"
        :loading-held-order-id="loadingHeldOrderId"
        @update-item-quantity="handleUpdateItemQuantity"
        @remove-item="handleRemoveItem"
        @apply-item-discount="handleApplyItemDiscount"
        @apply-global-discount="handleApplyGlobalDiscount"
        @select-customer="handleSelectCustomer"
        @add-new-customer="handleAddNewCustomer"
        @checkout="showPaymentModal = true"
        @hold-order="handleHoldOrder"
        @open-split-bill="handleOpenSplitBill"
        @load-held-order="handleLoadHeldOrder"
        @cancel-held-order="handleCancelHeldOrder"
        @refresh-held-orders="refreshHeldOrders"
        @open-held-orders-modal="showHeldOrdersModal = true"
        @close-held-orders-modal="showHeldOrdersModal = false"
        @fetch-customers="refreshCustomers"
        @load-more-customers="loadMoreCustomers"
        @search-customers="handleCustomerSearch"
      />
    </div>

    <!-- Lock Overlay - When Shift Not Active -->
    <div v-if="!shiftStore.isShiftActive" class="lock-overlay">
      <div class="lock-content">
        <div class="lock-icon"><AppIcon name="lock" :size="40" /></div>
        <div class="lock-title">Kasir Terkunci</div>
        <div class="lock-subtitle">Buka shift terlebih dahulu untuk mulai melayani</div>
        <button class="btn-open-shift" @click="showShiftModal = true">
          <AppIcon name="unlock" :size="16" /> Buka Shift
        </button>
      </div>
    </div>

    <!-- Add to Cart Modal -->
    <AddToCartModal
      :is-open="showAddToCartModal"
      :product="selectedProductForModal"
      :is-customer-member="is_selected_customer_member"
      @add-to-cart="handleAddToCart"
      @close="showAddToCartModal = false"
    />

    <!-- Payment Modal -->
    <PaymentModal
      :is-open="showPaymentModal"
      :total="transactionStore.total"
      :is-loading="isLoading"
      @pay="handlePay"
      @close="showPaymentModal = false"
    />

    <!-- Split Bill Modal -->
    <SplitBillModal
      :is-open="showSplitBillModal"
      :transactions="allSplitTransactions"
      :is-loading="transactionStore.isLoadingSplitBill || transactionStore.isLoadingPayment"
      :loading-detail-ids="transactionStore.loadingDetailIds"
      @close="showSplitBillModal = false"
      @record-payment="handleRecordSplitBillPayment"
      @search-transactions="handleSearchSplitBillTransactions"
      @load-items="transactionStore.loadTransactionDetail"
    />

    <!-- Expense Modal -->
    <ExpenseModal
      :is-open="showExpenseModal"
      @close="showExpenseModal = false"
      @expense-changed="shiftControlPanelRef?.refreshPendapatanShift()"
    />

    <!-- Close Shift Modal -->
    <CloseShiftModal
      :is-open="showCloseShiftModal"
      @close="showCloseShiftModal = false"
    />

    <!-- Open Shift Sheet -->
    <Teleport to="body" v-if="showShiftModal">
      <div class="sheet-overlay">
        <div class="shift-form-sheet">
          <div class="form-header">
            <h2>Buka Shift</h2>
            <button
              type="button"
              class="btn-close"
              @click="handleCloseShiftModal"
              aria-label="Close"
            >
              <AppIcon name="x" :size="16" />
            </button>
          </div>

          <div class="form-body">
            <p class="form-text">Masukkan modal awal untuk membuka shift hari ini</p>

            <div class="form-group">
              <label class="label">Modal Awal (Rp)</label>
              <div class="input-wrapper">
                <input
                  :value="formatModalAwalDisplay(modalAwal)"
                  type="text"
                  class="input"
                  placeholder="Contoh: Rp 500.000"
                  :disabled="shiftModalLoading"
                  @input="handleModalAwalInput"
                  @keydown.enter="handleOpenShift"
                  autofocus
                />
              </div>
            </div>

            <!-- Error Message -->
            <div v-if="shiftModalError" class="error-message">
              {{ shiftModalError }}
            </div>
          </div>

          <div class="form-footer">
            <button
              type="button"
              class="btn-cancel"
              @click="handleCloseShiftModal"
              :disabled="shiftModalLoading"
            >
              Batal
            </button>
            <button
              type="button"
              class="btn-submit"
              @click="handleOpenShift"
              :disabled="shiftModalLoading"
            >
              {{ shiftModalLoading ? 'Membuka shift...' : 'Buka Shift' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.kasir-view {
  display: flex;
  flex-direction: column;
  height: calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
  background: #f8fafb;
}

.kasir-container {
  display: grid;
  grid-template-columns: 1.85fr 1fr;
  gap: var(--spacing-4);
  flex: 1;
  overflow: hidden;
  min-height: 0;
  padding: var(--spacing-4);
  position: relative;
  z-index: 1;
}

/* Tablet Landscape (960–1279px) — sidebar collapsed (52px) + side-by-side grid */
@media (min-width: 960px) and (max-width: 1279px) {
  .kasir-view {
    height: calc(100dvh - env(safe-area-inset-top, 0px));
  }

  .kasir-container {
    grid-template-columns: 1.5fr 1fr;
    gap: var(--spacing-2);
    padding: var(--spacing-2);
  }
}

/* MatePad SE 11" landscape — ≥1280px wide tapi tinggi ≤850px (DPR 1.5 → 1280×800) */
@media (min-width: 1280px) and (max-height: 850px) {
  .kasir-view {
    height: calc(100dvh - env(safe-area-inset-top, 0px));
  }

  .kasir-container {
    grid-template-columns: 1.6fr 1fr;
    gap: var(--spacing-2);
    padding: var(--spacing-2);
  }
}

/* Mobile Layout - Stack vertically */
@media (max-width: 767px) {
  .kasir-view {
    height: auto;
    min-height: 100vh;
  }

  .kasir-container {
    display: flex;
    flex-direction: column;
    height: auto;
    gap: 0;
    padding: var(--spacing-2);
  }
}

/* Lock Overlay - When Shift Not Active */
.lock-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
}

.lock-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;
  padding: 2rem;
}

.lock-icon {
  font-size: 3.5rem;
  animation: lockPulse 2s infinite;
}

@keyframes lockPulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.05);
  }
}

.lock-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-top: 0.5rem;
}

.lock-subtitle {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
  max-width: 280px;
}

.btn-open-shift {
  margin-top: 1rem;
  padding: 0.85rem 1.75rem;
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(123, 47, 190, 0.3);
  letter-spacing: 0.01em;

  &:hover {
    background: linear-gradient(135deg, var(--brand-primary-dark) 0%, var(--brand-primary-darker) 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(123, 47, 190, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
}

/* Sheet Overlay & Form Sheet */
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1500;
  padding: 0;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.shift-form-sheet {
  background: white;
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.15);
  border: none;
  width: 100%;
  max-width: 100%;
  height: auto;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  -webkit-overflow-scrolling: touch;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.form-header {
  padding: 1rem;
  border-bottom: 1px solid rgba(123, 47, 190, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;

  h2 {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--color-text-primary);
  }
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: color 0.3s;

  &:hover {
    color: var(--color-text-primary);
  }
}

.form-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-text {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  line-height: 1.5;
}

.input-wrapper {
  position: relative;

  input {
    width: 100%;
    min-height: 44px;
    padding: 0.75rem 0.95rem;
    border: 1.5px solid rgba(123, 47, 190, 0.15);
    border-radius: 10px;
    font-size: 0.95rem;
    font-weight: 500;
    background: white;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    &::placeholder {
      color: #9ca3af;
      font-weight: 400;
    }

    &:focus {
      outline: none;
      border-color: var(--brand-primary);
      background: white;
      box-shadow: 0 4px 16px rgba(123, 47, 190, 0.12);
      transform: translateY(-1px);
    }

    &:disabled {
      background: #f3f4f6;
      cursor: not-allowed;
    }

    @media (max-width: 768px) {
      min-height: 48px;
      font-size: 1rem;
      padding: 0.8rem 1rem;
    }
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.label {
  font-weight: 700;
  color: var(--color-text-primary);
  font-size: 0.85rem;
  letter-spacing: 0.01em;

  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
}

.input {
  min-height: 44px;
  padding: 0.75rem 0.95rem;
  border: 1px solid rgba(123, 47, 190, 0.15);
  border-radius: 10px;
  font-size: 0.95rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: white;
  font-weight: 500;

  &:focus {
    outline: none;
    border-color: var(--brand-primary);
    background: rgba(240, 253, 244, 0.5);
    box-shadow: 0 4px 12px rgba(123, 47, 190, 0.1);
  }

  &:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }

  @media (max-width: 768px) {
    min-height: 48px;
    font-size: 1rem;
    padding: 0.8rem 1rem;
  }
}

.error-message {
  padding: 0.6rem 0.75rem;
  background: rgba(254, 242, 242, 0.9);
  color: #dc2626;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.form-footer {
  padding: var(--spacing-4);
  border-top: 1px solid rgba(123, 47, 190, 0.08);
  display: flex;
  gap: 0.75rem;
  position: sticky;
  bottom: 0;
  background: rgba(255, 255, 255, 0.98);
  flex-shrink: 0;
  z-index: 10;
}

.btn-cancel,
.btn-submit {
  flex: 1;
  min-height: 44px;
  padding: 0.65rem;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 0.01em;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-submit {
  flex: 2;
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  color: white;
  box-shadow: 0 4px 16px rgba(123, 47, 190, 0.3);

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, var(--brand-primary-dark) 0%, var(--brand-primary-darker) 100%);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(123, 47, 190, 0.4);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.btn-cancel {
  background: rgba(0, 0, 0, 0.05);
  color: var(--color-text-secondary);
  border: 1px solid rgba(0, 0, 0, 0.08);

  &:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.08);
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

@media (max-width: 480px) {
  .form-header,
  .form-body,
  .form-footer {
    padding: 1rem;
  }

  .form-header h2 {
    font-size: 0.9rem;
  }

  .form-text {
    font-size: 0.8rem;
  }

  .btn-cancel,
  .btn-submit {
    padding: 0.6rem;
    font-size: 0.75rem;
  }
}

.cart-fade-enter-active,
.cart-fade-leave-active {
  transition: opacity 0.2s ease;
}
.cart-fade-enter-from,
.cart-fade-leave-to {
  opacity: 0;
}
</style>
