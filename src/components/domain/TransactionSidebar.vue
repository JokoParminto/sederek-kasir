<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import type { TransactionItem, Discount, Customer, Transaction } from '@/types'
import CartItem from './CartItem.vue'
import OrderSummary from './OrderSummary.vue'
import GlobalDiscountInput from './GlobalDiscountInput.vue'
import CustomerSelector from './CustomerSelector.vue'
import PromoSelector from './PromoSelector.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import AntrianPanel from './AntrianPanel.vue'
import { useDiscount } from '@/composables/useDiscount'
import { formatRupiah } from '@/utils/formatters'
import type { Promo } from '@/services/api/promo.api'
import { printerService } from '@/services/printer.service'
import type { UiPrinter } from '@/services/printer.service'
import { printDispatch } from '@/services/print-dispatch.service'
import { printLayoutService } from '@/services/printerlayout.service'
import type { BaristaLayoutConfig } from '@/services/printerlayout.service'

interface Props {
  items: TransactionItem[]
  globalDiscount: Discount
  subtotal: number
  customers: Customer[]
  selectedCustomerId: string | null
  isLoading?: boolean
  isCreatingCustomer?: boolean
  isCustomerLocked?: boolean
  isLoadingMoreCustomers?: boolean
  hasMoreCustomers?: boolean
  heldOrders: Transaction[]
  showHeldOrdersModal?: boolean
  loadingHeldOrderId?: string | null
}

interface Emits {
  updateItemQuantity: [itemId: string, quantity: number]
  removeItem: [itemId: string]
  applyItemDiscount: [itemId: string, discount: Discount]
  applyGlobalDiscount: [discount: Discount]
  selectCustomer: [customerId: string | null]
  addNewCustomer: [customer: Omit<Customer, 'id' | 'last_transaction'>]
  checkout: []
  holdOrder: []
  openSplitBill: []
  loadHeldOrder: [orderId: string]
  cancelHeldOrder: [orderId: string]
  refreshHeldOrders: []
  openHeldOrdersModal: []
  closeHeldOrdersModal: []
  loadMoreCustomers: []
  searchCustomers: [query: string]
  fetchCustomers: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { calculateTotal } = useDiscount()

const showHeldOrdersModal = computed({
  get: () => props.showHeldOrdersModal ?? false,
  set: (value: boolean) => {
    if (value) {
      emit('openHeldOrdersModal')
    } else {
      emit('closeHeldOrdersModal')
    }
  },
})

const total = computed(() => calculateTotal(props.items, props.globalDiscount))

const isEmpty = computed(() => props.items.length === 0)

const showAntrianModal = ref(false)

const heldOrdersCount = computed(() => props.heldOrders.length)
const heldOrdersTotalValue = computed(() =>
  props.heldOrders.reduce((sum, order) => sum + Number(order.total || 0), 0)
)

// FIFO: oldest first
const sortedHeldOrders = computed(() =>
  [...props.heldOrders].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
)

const getCustomerName = (customerId: string | null) => {
  if (!customerId) return 'Guest'
  const customer = props.customers.find(c => c.id === customerId)
  return customer?.name || 'Unknown'
}

const getElapsed = (date: Date): string => {
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Baru'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rem = minutes % 60
  return rem > 0 ? `${hours}j ${rem}m` : `${hours}j`
}

const getElapsedClass = (date: Date): string => {
  const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
  if (minutes >= 30) return 'elapsed--danger'
  if (minutes >= 10) return 'elapsed--warn'
  return 'elapsed--ok'
}

const formatTime = (date: Date) => {
  return new Date(date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })
}

const getOrderNumber = (order: Transaction) =>
  order.transactionNumber || (order as any).transaction_number || `HOLD-${order.id.slice(0, 8)}`

const getItemName = (item: any) => item.productName || item.product_name || 'Item'

const isMemberOrder = (order: Transaction) =>
  Boolean((order as any).customerIsMember ?? (order as any).customer_is_member)

// --- Barista printer + layout (loaded once on mount) ---
const baristaPrinter = ref<UiPrinter | null>(null)
const baristaLayout = ref<BaristaLayoutConfig | null>(null)
const printingOrderId = ref<string | null>(null)
const printSuccessId  = ref<string | null>(null)
const printErrorId    = ref<string | null>(null)

onMounted(async () => {
  try {
    const printers = await printerService.getAllPrinters()
    const bp = printers.find(p => p.type === 'barista') ?? null
    baristaPrinter.value = bp
    if (bp) {
      const result = await printLayoutService.getLayoutByPrinterId(bp.id)
      if (result.templateType === 'barista') {
        baristaLayout.value = result.layout as BaristaLayoutConfig
      }
    }
  } catch {
    // silent — falls back to browser print
  }
})

const buildTicketHtml = (order: Transaction, fifoIndex: number, layout?: BaristaLayoutConfig | null): string => {
  const cfg = layout ?? null
  const showQueueNum    = cfg?.header.show_order_number     !== false
  const showCustomer    = cfg?.header.show_customer_name    !== false
  const showDate        = cfg?.header.show_transaction_date !== false
  const showQty         = cfg?.item.show_item_quantity      !== false
  const showAddons      = cfg?.item.show_item_addons        !== false
  const showNotes       = cfg?.item.show_item_notes         !== false
  const showPrepText    = cfg?.footer.show_preparation_reminder !== false
  const prepText        = cfg?.footer.preparation_text || 'Siapkan sesuai resep standar'

  const paperWidth = baristaPrinter.value?.paperSize ?? 58
  const div22 = '─'.repeat(paperWidth >= 80 ? 32 : 22)

  const queueNum     = String(fifoIndex + 1).padStart(2, '0')
  const customerName = (order.customerName || getCustomerName(order.customerId) || 'Walk In').toUpperCase()
  const time         = formatTime(order.createdAt)
  const trxNum       = getOrderNumber(order)

  const itemsHtml = order.items.map(item => {
    const qtyPrefix = showQty ? `${item.quantity}× ` : ''
    let html = `<div class="im">${qtyPrefix}${getItemName(item)}</div>`
    if (showNotes && (item as any).notes) {
      html += `<div class="in">› ${(item as any).notes}</div>`
    }
    if (showAddons && item.addOns?.length) {
      item.addOns.forEach(a => {
        const q = a.quantity > 1 ? ` ×${a.quantity}` : ''
        html += `<div class="ia">+ ${a.addOnName}${q}</div>`
      })
    }
    return `<div class="it">${html}</div>`
  }).join('')

  const headerHtml = [
    showQueueNum ? `<div class="qn">#${queueNum}</div>` : '',
    showCustomer  ? `<div class="cn">${customerName}</div>` : '',
    showDate      ? `<div class="mt">${trxNum} · ${time}</div>` : `<div class="mt">${trxNum}</div>`,
  ].filter(Boolean).join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Tiket Barista</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
@page{size:${paperWidth}mm auto;margin:4mm 3mm}
body{font-family:'Courier New',Courier,monospace;font-size:10pt;line-height:1.45;color:#000;width:${paperWidth - 6}mm;padding:6px 4px}
.qn{font-size:24pt;font-weight:900;text-align:center;letter-spacing:-1px;line-height:1}
.cn{font-size:11.5pt;font-weight:bold;text-align:center;letter-spacing:1px;margin:2px 0}
.mt{font-size:8pt;color:#666;text-align:center;margin-bottom:3px}
.dv{color:#aaa;margin:3px 0;font-size:9pt}
.it{margin-bottom:4px}
.im{font-weight:bold}
.in{padding-left:10px;font-size:8.5pt;font-style:italic;color:#555}
.ia{padding-left:12px;font-size:9pt;color:#333}
.ft{text-align:center;font-style:italic;font-size:8.5pt;color:#666;margin-top:2px}
@media print{html,body{width:${paperWidth}mm}*{-webkit-print-color-adjust:exact}}
</style></head><body>
${headerHtml}
<div class="dv">${div22}</div>
<div>${itemsHtml}</div>
<div class="dv">${div22}</div>
${showPrepText ? `<div class="ft">${prepText}</div>` : ''}
</body></html>`
}

const printHeldOrder = async (order: Transaction, fifoIndex: number) => {
  if (printingOrderId.value) return
  printingOrderId.value = order.id
  printSuccessId.value = null
  printErrorId.value   = null
  try {
    const printer = baristaPrinter.value

    if (printer?.connectionType === 'bluetooth' && printer.devicePath) {
      // ── Direct ESC/POS to BT (same approach as EditLayoutView test print) ──
      const { bluetoothPrinter: bt, escpos } = await import('@/services/bluetooth-printer.service')
      const onCorrectDevice = await bt.isConnectedTo(printer.devicePath)
      if (!onCorrectDevice) {
        if (await bt.isConnected()) await bt.disconnect()
        await bt.connect(printer.devicePath)
      }

      const storedWidth = printer.paperSize
      // BT printers saved before paper_width fix may have paper_width=80 despite 58mm
      const paperMm = (printer.connectionType === 'bluetooth' && storedWidth >= 80) ? 58 : storedWidth
      const dpi  = printer.dpi || 203
      const printableDots = Math.floor((paperMm - 10) * dpi / 25.4)
      const cols = Math.floor(printableDots / 12)
      const div  = '-'.repeat(cols)

      const cfg = baristaLayout.value
      const clean = (s: string) => String(s ?? '').replace(/[^\x20-\x7E\xA0-\xFF]/g, '').trim()
      const L     = (s: string) => escpos.textLine(s)

      const showQueueNum = cfg?.header.show_order_number     !== false
      const showCustomer = cfg?.header.show_customer_name    !== false
      const showDate     = cfg?.header.show_transaction_date !== false
      const showQty      = cfg?.item.show_item_quantity      !== false
      const showAddons   = cfg?.item.show_item_addons        !== false
      const showNotes    = cfg?.item.show_item_notes         !== false
      const showPrep     = cfg?.footer.show_preparation_reminder !== false
      const prepText     = cfg?.footer.preparation_text || 'Siapkan sesuai resep standar'

      const queueNum   = String(fifoIndex + 1).padStart(2, '0')
      const custName   = clean(order.customerName || getCustomerName(order.customerId) || 'Walk In').toUpperCase()
      const time       = formatTime(order.createdAt)
      const trxNum     = clean(getOrderNumber(order))

      const chunks: Uint8Array[] = [escpos.init(), ...escpos.applyFontSize(printer.fontSize), escpos.align('center')]
      if (showQueueNum) {
        chunks.push(escpos.bold(true), L(`#${queueNum}`), escpos.bold(false))
      }
      if (showCustomer) chunks.push(L(custName))
      chunks.push(L(showDate ? `${trxNum} - ${time}` : trxNum))
      chunks.push(L(div), escpos.align('left'))

      for (const item of order.items) {
        const name = clean(getItemName(item))
        const qPfx = showQty ? `${item.quantity}x ` : ''
        chunks.push(escpos.bold(true), L(`${qPfx}${name}`), escpos.bold(false))
        if (showNotes && (item as any).notes) {
          chunks.push(L(`  > ${clean((item as any).notes)}`))
        }
        if (showAddons && item.addOns?.length) {
          for (const a of item.addOns) {
            const q = a.quantity > 1 ? ` x${a.quantity}` : ''
            chunks.push(L(`  + ${clean(a.addOnName)}${q}`))
          }
        }
      }

      chunks.push(L(div), escpos.align('center'))
      if (showPrep) chunks.push(L(clean(prepText)))
      chunks.push(escpos.lineFeed(3), escpos.cut())
      await bt.printRaw(escpos.concat(...chunks))
    } else {
      // ── Fallback: HTML → browser print (or network printer via printDispatch) ──
      const html = buildTicketHtml(order, fifoIndex, baristaLayout.value)
      await printDispatch.receipt(html, printer ?? null)
    }

    printSuccessId.value = order.id
    setTimeout(() => { printSuccessId.value = null }, 2500)
  } catch (e: any) {
    printErrorId.value = order.id
    setTimeout(() => { printErrorId.value = null }, 3000)
    console.error('Print error:', e?.message || e)
  } finally {
    printingOrderId.value = null
  }
}

const handleCustomerSelect = (customerId: string | null) => {

  emit('selectCustomer', customerId)

}

const handlePromoSelect = (promo: Promo | null) => {
  if (!promo) {
    // Clear promo discount
    emit('applyGlobalDiscount', { type: 'percentage', value: 0 })
    return
  }

  // Check min transaction requirement
  if (promo.min_transaction && props.subtotal < promo.min_transaction) {
    // Still allow selection, validation can happen at checkout
  }

  // Convert promo to global discount
  const discount: Discount = {
    type: promo.discount_type === 'percentage' ? 'percentage' : 'amount',
    value: promo.discount_value
  }


  emit('applyGlobalDiscount', discount)
}
</script>

<template>
  <aside class="transaction-sidebar">
    <!-- Row 1: header + customer (side-by-side at tablet) -->
    <div class="top-row">
      <div class="sidebar-header">
        <div class="title-group">
          <h2 class="title">Order</h2>
          <span v-if="props.items.length > 0" class="item-count">{{ props.items.length }} item</span>
        </div>
        <div class="header-actions">
          <button class="btn-antrian" @click="showAntrianModal = true" title="Antrian Barista">
            <AppIcon name="bell" :size="18" />
          </button>
        </div>
      </div>
      <div class="customer-selector-wrapper">
        <div class="customer-selector-inner">
          <CustomerSelector
            :customers="customers"
            :selectedCustomerId="selectedCustomerId"
            :is-disabled="isCustomerLocked"
            :is-creating="isCreatingCustomer"
            :is-loading-more="isLoadingMoreCustomers"
            :has-more="hasMoreCustomers"
            @select="handleCustomerSelect"
            @add-new="$emit('addNewCustomer', $event)"
            @open="$emit('fetchCustomers')"
            @load-more="$emit('loadMoreCustomers')"
            @search="$emit('searchCustomers', $event)"
          />
        </div>
        <button
          v-if="heldOrdersCount > 0"
          class="btn-held-orders"
          @click="() => { emit('refreshHeldOrders'); showHeldOrdersModal = true }"
          :title="`${heldOrdersCount} order di-hold`"
        >
          <AppIcon name="layers" :size="16" /> <span class="badge">{{ heldOrdersCount }}</span>
        </button>
      </div>
    </div>

    <!-- Row 2: promo + discount chip (side-by-side at tablet) -->
    <div class="promo-discount-row">
      <div class="promo-selector-wrapper">
        <PromoSelector @select="handlePromoSelect" />
      </div>
      <GlobalDiscountInput
        :discount="globalDiscount"
        :subtotal="subtotal"
        @apply="emit('applyGlobalDiscount', $event)"
      />
    </div>

    <!-- Cart list — dominant area -->
    <div class="sidebar-content">
      <EmptyState v-if="isEmpty" icon="cart" title="Belum ada produk dipilih" />
      <div v-else class="items-list">
        <CartItem
          v-for="item in items"
          :key="item.id"
          :item="item"
          @update-quantity="emit('updateItemQuantity', $event.itemId, $event.quantity)"
          @remove="emit('removeItem', $event)"
          @apply-discount="emit('applyItemDiscount', $event.itemId, $event.discount)"
        />
      </div>
    </div>

    <!-- Sticky bottom: summary + action buttons -->
    <div class="sidebar-bottom">
      <OrderSummary
        :items="items"
        :global-discount="globalDiscount"
      />
      <div class="action-buttons">
        <button class="btn-action hold" @click="emit('holdOrder')" :disabled="isEmpty || isLoading">
          📌 Hold
        </button>
        <button class="btn-action split-bill" @click="emit('openSplitBill')" :disabled="isLoading">
          💸 Split
        </button>
        <button
          class="btn-action checkout"
          @click="emit('checkout')"
          :disabled="isEmpty || isLoading"
          :class="{ loading: isLoading }"
        >
          <AppIcon v-if="isLoading" name="loader" :size="16" :spin="true" />
          <AppIcon v-else name="payment" :size="16" />
          {{ isLoading ? 'Processing...' : 'BAYAR' }}
        </button>
      </div>
    </div>

    <!-- Antrian Barista Bottom Sheet -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showAntrianModal" class="modal-overlay" @click="showAntrianModal = false">
          <div class="modal-container antrian-modal-container" @click.stop>
            <div class="modal-header">
              <h2 class="modal-title">Antrian Barista</h2>
              <button class="btn-close" @click="showAntrianModal = false"><AppIcon name="x" :size="18" /></button>
            </div>
            <div class="antrian-modal-body">
              <AntrianPanel />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Held Orders Bottom Sheet -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showHeldOrdersModal" class="modal-overlay" @click="showHeldOrdersModal = false">
          <div class="modal-container" @click.stop>

            <!-- Modal Header -->
            <div class="modal-header">
              <div class="modal-header-left">
                <h2 class="modal-title">Held Orders</h2>
                <span v-if="heldOrdersCount > 0" class="ho-count-pill">{{ heldOrdersCount }}</span>
              </div>
              <div class="modal-header-right">
                <span v-if="heldOrdersCount > 0" class="ho-total-label">
                  {{ formatRupiah(heldOrdersTotalValue) }}
                </span>
                <button class="btn-close" @click="showHeldOrdersModal = false">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Modal Body -->
            <div class="modal-body">

              <!-- Empty state -->
              <div v-if="heldOrdersCount === 0" class="ho-empty">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.25">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                  <rect x="9" y="3" width="6" height="4" rx="1"/>
                </svg>
                <p>Tidak ada order yang di-hold</p>
              </div>

              <!-- FIFO List -->
              <div v-else class="ho-list">
                <div
                  v-for="(order, idx) in sortedHeldOrders"
                  :key="order.id"
                  class="ho-row"
                >
                  <!-- FIFO Queue Number -->
                  <div class="ho-fifo" :class="getElapsedClass(order.createdAt)">
                    <span class="ho-fifo-num">#{{ String(idx + 1).padStart(2, '0') }}</span>
                    <span class="ho-fifo-time">{{ getElapsed(order.createdAt) }}</span>
                  </div>

                  <!-- Order Info -->
                  <div class="ho-info">
                    <div class="ho-top">
                      <span class="ho-customer">
                        {{ order.customerName || getCustomerName(order.customerId) || 'Walk In' }}
                        <span v-if="isMemberOrder(order)" class="ho-member-star">★</span>
                      </span>
                      <span class="ho-trx">{{ getOrderNumber(order) }}</span>
                    </div>
                    <div class="ho-items">
                      <span
                        v-for="item in order.items.slice(0, 3)"
                        :key="item.id || item.productId"
                        class="ho-item-pill"
                      >{{ item.quantity }}× {{ getItemName(item) }}</span>
                      <span v-if="order.items.length > 3" class="ho-item-more">
                        +{{ order.items.length - 3 }} lagi
                      </span>
                    </div>
                    <div class="ho-meta">
                      <span class="ho-time-text">{{ formatTime(order.createdAt) }}</span>
                      <span class="ho-dot">·</span>
                      <span class="ho-item-count">{{ order.items.length }} item</span>
                    </div>
                  </div>

                  <!-- Total + Actions -->
                  <div class="ho-right">
                    <span class="ho-total">{{ formatRupiah(order.total) }}</span>
                    <div class="ho-actions">
                      <button
                        class="ho-btn-print"
                        :class="{
                          'ho-btn-print--success': printSuccessId === order.id,
                          'ho-btn-print--error':   printErrorId   === order.id,
                        }"
                        @click="printHeldOrder(order, idx)"
                        :disabled="!!printingOrderId"
                        :title="printErrorId === order.id ? 'Gagal — periksa koneksi printer' : 'Print tiket barista'"
                      >
                        <AppIcon v-if="printingOrderId === order.id" name="loader" :size="15" :spin="true" />
                        <svg v-else-if="printSuccessId === order.id" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <svg v-else-if="printErrorId === order.id" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                        <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="6 9 6 2 18 2 18 9"/>
                          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                          <rect x="6" y="14" width="12" height="8"/>
                        </svg>
                      </button>
                      <button
                        class="ho-btn-del"
                        @click="emit('cancelHeldOrder', order.id)"
                        title="Hapus order"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                          <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                      <button
                        class="ho-btn-load"
                        @click="emit('loadHeldOrder', order.id)"
                        :disabled="!!props.loadingHeldOrderId"
                        title="Muat order"
                      >
                        <AppIcon v-if="props.loadingHeldOrderId === order.id" name="loader" :size="14" :spin="true" />
                        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.96"/>
                        </svg>
                        {{ props.loadingHeldOrderId === order.id ? 'Loading...' : 'Load' }}
                      </button>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </aside>
</template>

<style scoped>
.transaction-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
  border: 1px solid rgba(123, 47, 190, 0.08);
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  min-height: 0;
}

/* ── Layout wrappers ── */
.top-row {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.promo-discount-row {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.75rem;
  background: linear-gradient(135deg, rgba(123, 47, 190, 0.04) 0%, rgba(123, 47, 190, 0.01) 100%);
  border-bottom: 1px solid rgba(123, 47, 190, 0.1);
  flex-shrink: 0;
}

.title-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.btn-antrian {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  width: 44px;
  height: 44px;
  background: transparent;
  border: 1.5px solid var(--color-border-light);
  border-radius: 8px;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--color-bg-secondary);
    border-color: var(--brand-primary);
  }
}

.antrian-modal-container {
  max-height: 88dvh;
  height: 88dvh;
}

.antrian-modal-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--color-bg-secondary);
}

.btn-held-orders {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.65rem;
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(123, 47, 190, 0.25);
  min-height: 44px;
  min-width: 44px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(123, 47, 190, 0.35);
  }

  &:active {
    transform: translateY(0);
  }

  .badge {
    background: white;
    color: var(--brand-primary);
    padding: 0.15rem 0.4rem;
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 900;
  }
}

.customer-selector-wrapper {
  padding: 0.5rem 0.6rem;
  background: transparent;
  border-bottom: 1px solid rgba(123, 47, 190, 0.08);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.customer-selector-inner {
  flex: 1;
  min-width: 0;
}

.promo-selector-wrapper {
  padding: 0.35rem 0.6rem;
  background: transparent;
  border-bottom: 1px solid rgba(123, 47, 190, 0.08);
  flex-shrink: 0;
}

.title {
  font-family: var(--font-family-body);
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
  letter-spacing: -0.01em;
}

.item-count {
  background: rgba(123, 47, 190, 0.1);
  color: var(--brand-primary);
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  border: 1px solid rgba(123, 47, 190, 0.2);
  letter-spacing: 0.01em;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--spacing-3);
  min-height: 0;
  background: rgba(248, 250, 251, 0.5);

  scrollbar-width: thin;
  scrollbar-color: rgba(123, 47, 190, 0.2) transparent;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(123, 47, 190, 0.15);
    border-radius: 10px;

    &:hover {
      background: rgba(123, 47, 190, 0.3);
    }
  }
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.sidebar-bottom {
  flex-shrink: 0;
  padding: var(--spacing-3);
  background: #ffffff;
  border-top: 1px solid rgba(123, 47, 190, 0.08);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  position: sticky;
  bottom: 0;
  z-index: 10;
}

.action-buttons {
  display: flex;
  gap: var(--spacing-3);
  flex-wrap: wrap;
}

.btn-action {
  flex: 1;
  min-width: 70px;
  min-height: 44px;
  padding: 0.65rem 0.8rem;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  letter-spacing: 0.02em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:not(:disabled):active {
    transform: scale(0.96);
  }

  @media (hover: hover) {
    &:not(:disabled):hover {
      transform: translateY(-2px);
    }
  }
}

.btn-action.hold {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.2);

  &:not(:disabled):hover {
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
    box-shadow: 0 4px 16px rgba(245, 158, 11, 0.3);
    transform: translateY(-2px);
  }

  &:not(:disabled):active {
    transform: translateY(0);
  }
}

.btn-action.split-bill {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.2);

  &:not(:disabled):hover {
    background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);
    box-shadow: 0 4px 16px rgba(139, 92, 246, 0.3);
    transform: translateY(-2px);
  }

  &:not(:disabled):active {
    transform: translateY(0);
  }
}

.btn-action.checkout {
  flex: 2;
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  color: white;
  font-size: 0.75rem;
  box-shadow: 0 4px 16px rgba(123, 47, 190, 0.3);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    transition: left 0.5s;
  }

  &:not(:disabled):hover {
    background: linear-gradient(135deg, #a78bfa 0%, var(--brand-primary) 100%);
    box-shadow: 0 8px 28px rgba(123, 47, 190, 0.45);
    transform: translateY(-3px);

    &::before {
      left: 100%;
    }
  }

  &:not(:disabled):active {
    transform: translateY(-1px);
  }

  &.loading {
    opacity: 0.8;
  }
}

/* Responsive - Tablet Landscape (1024px-1279px) */
@media (max-width: 1279px) and (min-width: 1024px) {
  .sidebar-content {
    padding: var(--spacing-2);
  }

  .sidebar-bottom {
    padding: var(--spacing-2);
    gap: var(--spacing-2);
  }

  .btn-action {
    padding: 0.6rem 0.7rem;
    font-size: 0.65rem;
    min-height: 40px;
    white-space: normal;
    line-height: 1.2;
    word-break: break-word;
  }

  .title {
    font-size: 1rem;
  }

  .item-count {
    font-size: 0.7rem;
    padding: 0.2rem 0.5rem;
  }
}

/* MatePad SE 11" landscape (≥1280px wide, ≤850px tall) */
@media (min-width: 1280px) and (max-height: 850px) {
  .sidebar-content {
    padding: var(--spacing-2);
  }

  .sidebar-bottom {
    padding: var(--spacing-2);
    gap: var(--spacing-2);
  }

  .btn-action {
    padding: 0.55rem 0.7rem;
    font-size: 0.7rem;
    min-height: 40px;
    white-space: normal;
    line-height: 1.2;
    word-break: break-word;
  }

  .title {
    font-size: 1rem;
  }

  .item-count {
    font-size: 0.7rem;
    padding: 0.2rem 0.5rem;
  }
}

/* Responsive - Tablet Landscape (768px-1023px) — grid side-by-side, fill full height */
@media (max-width: 1023px) and (min-width: 768px) {
  .transaction-sidebar {
    height: 100%;
  }

  .sidebar-header {
    padding: var(--spacing-2);
  }

  .customer-selector-wrapper {
    padding: var(--spacing-2);
  }

  .sidebar-content {
    padding: var(--spacing-2);
  }

  .sidebar-bottom {
    padding: var(--spacing-2);
    gap: var(--spacing-2);
  }

  .btn-action {
    min-height: 38px;
    padding: 0.5rem 0.6rem;
    font-size: 0.75rem;
    white-space: normal;
    line-height: 1.2;
    word-break: break-word;
  }

  .action-buttons {
    gap: var(--spacing-2);
  }

  .title {
    font-size: 0.9rem;
  }

  .item-count {
    font-size: 0.7rem;
  }
}

/* Responsive - Mobile (<768px) */
@media (max-width: 767px) {
  /* On mobile, sidebar becomes full width */
  .transaction-sidebar {
    border-left: none;
    border-top: 1px solid var(--color-border);
    border-radius: 0;
    max-height: auto;
  }

  .sidebar-header {
    padding: var(--spacing-2);
  }

  .customer-selector-wrapper {
    padding: var(--spacing-2);
  }

  .promo-selector-wrapper {
    padding: 0.3rem 0.5rem;
  }

  .sidebar-content {
    padding: 0.5rem;
    max-height: calc(100dvh - 360px);
  }

  .sidebar-bottom {
    padding: 0.4rem;
    gap: 0.3rem;
  }

  .action-buttons {
    gap: 0.4rem;
    flex-direction: column;
  }

  .btn-action {
    min-height: 44px;
    padding: 0.65rem 1rem;
    font-size: 0.8rem;
    white-space: normal;
    line-height: 1.3;
    flex: none;
    width: 100%;
  }

  .btn-action.checkout {
    flex: none;
    width: 100%;
  }

  .btn-action.checkout {
    flex: 1;
  }
}

/* Held Orders Bottom Sheet Modal Overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
  padding: 0;
}

/* Modal Container - Slide up from bottom on mobile */
.modal-container {
  background: white;
  width: 100%;
  max-height: 90dvh;
  border-radius: 20px 20px 0 0;
  display: flex;
  flex-direction: column;
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

/* Modal Header */
.modal-header {
  padding: 1rem;
  border-bottom: 1px solid rgba(123, 47, 190, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.modal-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  color: var(--color-text-secondary);
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    color: var(--color-text-primary);
  }
}

/* Modal Body */
.modal-body {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.modal-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.summary-card {
  background: linear-gradient(135deg, rgba(123, 47, 190, 0.08) 0%, rgba(52, 211, 153, 0.05) 100%);
  border: 1px solid rgba(123, 47, 190, 0.2);
  border-radius: 12px;
  padding: 0.75rem 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.summary-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  letter-spacing: 0.02em;
}

.summary-value {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--color-text-primary);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: var(--color-text-secondary);
  text-align: center;
  gap: var(--spacing-2);

  p {
    font-size: 0.9rem;
    font-weight: 500;
    margin: 0;
  }
}

.empty-icon {
  font-size: 3rem;
  opacity: 0.3;
  filter: grayscale(1);
}

/* ── Held Orders Modal Header ── */
.modal-header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.modal-header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.ho-count-pill {
  font-size: 0.7rem;
  font-weight: 800;
  background: var(--brand-primary);
  color: white;
  padding: 0.15rem 0.55rem;
  border-radius: 99px;
}

.ho-total-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--brand-primary);
}

/* ── Empty State ── */
.ho-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 3rem 1rem;
  color: var(--color-text-tertiary);
  font-size: 0.88rem;

  p { margin: 0; }
}

/* ── FIFO List ── */
.ho-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* Row */
.ho-row {
  display: grid;
  grid-template-columns: 56px 1fr auto;
  gap: 0.85rem;
  align-items: center;
  padding: 0.85rem 0;
  border-bottom: 1px solid var(--color-border-light, rgba(123, 47, 190, 0.07));
  transition: background 0.15s;

  &:last-child { border-bottom: none; }

  &:hover { background: rgba(123, 47, 190, 0.025); border-radius: 8px; }
}

/* FIFO Badge */
.ho-fifo {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 10px;
  flex-shrink: 0;
  gap: 1px;

  &.elapsed--ok {
    background: rgba(16, 185, 129, 0.1);
    border: 1.5px solid rgba(16, 185, 129, 0.25);
    .ho-fifo-num { color: #065f46; }
    .ho-fifo-time { color: #059669; }
  }

  &.elapsed--warn {
    background: rgba(245, 158, 11, 0.1);
    border: 1.5px solid rgba(245, 158, 11, 0.3);
    .ho-fifo-num { color: #92400e; }
    .ho-fifo-time { color: #d97706; }
  }

  &.elapsed--danger {
    background: rgba(239, 68, 68, 0.1);
    border: 1.5px solid rgba(239, 68, 68, 0.3);
    .ho-fifo-num { color: #7f1d1d; }
    .ho-fifo-time { color: #dc2626; }
  }
}

.ho-fifo-num {
  font-size: 0.9rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.02em;
}

.ho-fifo-time {
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 1;
}

/* Info block */
.ho-info {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;
}

.ho-top {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  min-width: 0;
}

.ho-customer {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
}

.ho-member-star {
  font-size: 0.75rem;
  color: #f59e0b;
  margin-left: 2px;
}

.ho-trx {
  font-size: 0.68rem;
  color: var(--color-text-tertiary);
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}

.ho-items {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  align-items: center;
}

.ho-item-pill {
  font-size: 0.68rem;
  font-weight: 600;
  padding: 0.15rem 0.45rem;
  border-radius: 99px;
  background: rgba(123, 47, 190, 0.07);
  color: var(--brand-primary);
  border: 1px solid rgba(123, 47, 190, 0.14);
  white-space: nowrap;
}

.ho-item-more {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--color-text-tertiary);
}

.ho-meta {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.68rem;
  color: var(--color-text-tertiary);
}

.ho-dot { opacity: 0.5; }
.ho-time-text, .ho-item-count { }

/* Right block */
.ho-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.45rem;
  flex-shrink: 0;
}

.ho-total {
  font-size: 0.88rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  white-space: nowrap;
}

.ho-actions {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}

.ho-btn-print {
  width: 36px;
  height: 36px;
  border: 1px solid rgba(123, 47, 190, 0.2);
  background: rgba(123, 47, 190, 0.06);
  color: var(--brand-primary);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    background: rgba(123, 47, 190, 0.12);
    border-color: rgba(123, 47, 190, 0.35);
  }

  &:disabled { cursor: not-allowed; opacity: 0.6; }
  &:active:not(:disabled) { transform: scale(0.95); }

  &.ho-btn-print--success {
    background: rgba(16, 185, 129, 0.1);
    border-color: rgba(16, 185, 129, 0.35);
    color: #059669;
  }

  &.ho-btn-print--error {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.35);
    color: #dc2626;
  }
}

.ho-btn-del {
  width: 36px;
  height: 36px;
  border: 1px solid rgba(239, 68, 68, 0.2);
  background: rgba(239, 68, 68, 0.07);
  color: #dc2626;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;

  &:hover {
    background: rgba(239, 68, 68, 0.14);
    border-color: rgba(239, 68, 68, 0.35);
  }

  &:active { transform: scale(0.95); }
}

.ho-btn-load {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0 0.75rem;
  height: 36px;
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(123, 47, 190, 0.25);

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(123, 47, 190, 0.35);
  }

  &:disabled { opacity: 0.7; cursor: not-allowed; }
  &:active:not(:disabled) { transform: translateY(0); }
}

/* Action Buttons (kept for any other .btn usage) */
.btn {
  padding: 0.6rem 0.8rem;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}

/* Modal Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .modal-container {
  animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-fade-leave-active .modal-container {
  animation: slideDown 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

@keyframes slideDown {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(100%);
  }
}

/* Responsive - Tablet Landscape */
@media (min-width: 1024px) and (max-width: 1279px) {
  .modal-container { max-height: 75dvh; }
  .modal-header { padding: 1rem 1.1rem; }
  .modal-body { padding: 1rem 1.1rem; }
  .modal-title { font-size: 1.1rem; }
}

/* Responsive - Desktop: Centered Modal */
@media (min-width: 1280px) {
  .modal-overlay {
    align-items: center;
    padding: 1rem;
  }
  .modal-container {
    max-width: 640px;
    width: 100%;
    max-height: 85dvh;
    border-radius: 16px;
    margin: 0 auto;
  }
  .modal-body { padding: 0 1.25rem 1.25rem; }
  .modal-title { font-size: 1.1rem; }
}

/* Ensure scrollbar doesn't cause layout shift */
.modal-body {
  scrollbar-width: thin;
  scrollbar-color: rgba(123, 47, 190, 0.2) transparent;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(123, 47, 190, 0.2);
    border-radius: 3px;

    &:hover {
      background: rgba(123, 47, 190, 0.3);
    }
  }
}

/* Tablet Landscape (768px-1023px) — Samsung Tab A9 */
@media (min-width: 768px) and (max-width: 1023px) {
  .sidebar-content {
    padding: var(--spacing-2);
  }

  .sidebar-bottom {
    padding: var(--spacing-2);
    gap: var(--spacing-1);
  }

  .action-buttons {
    gap: var(--spacing-2);
  }

  .btn-action {
    min-height: 38px;
    padding: 0.45rem 0.6rem;
    font-size: 0.7rem;
  }
}

/* ── Tablet (960–1279px): row-merged header+customer, row-merged promo+discount ── */
@media (min-width: 960px) and (max-width: 1279px) {
  /* Remove backdrop-filter — GPU heavy on Android WebView */
  .transaction-sidebar {
    background: #ffffff;
  }

  /* ── Row 1: header + customer side by side ── */
  .top-row {
    flex-direction: row;
    align-items: stretch;
    border-bottom: 1px solid rgba(123, 47, 190, 0.1);
  }

  .sidebar-header {
    flex-shrink: 0;
    border-bottom: none;
    border-right: 1px solid rgba(123, 47, 190, 0.08);
    padding: 0.3rem 0.45rem;
    gap: 0.3rem;
  }

  .btn-antrian {
    width: 28px;
    height: 28px;
  }

  .btn-held-orders {
    min-height: 28px;
    min-width: 28px;
    padding: 0.2rem 0.4rem;
    font-size: 0.68rem;
    flex-shrink: 0;
  }

  .customer-selector-wrapper {
    flex: 1;
    min-width: 0;
    border-bottom: none;
    padding: 0.25rem 0.4rem;
    gap: 0.3rem;
  }

  .customer-selector-inner {
    flex: 1;
    min-width: 0;
  }

  /* ── Row 2: promo + discount chip side by side ── */
  .promo-discount-row {
    flex-direction: row;
    align-items: center;
    gap: 0.3rem;
    padding: 0.2rem 0.4rem;
    border-bottom: 1px solid rgba(123, 47, 190, 0.08);
  }

  .promo-selector-wrapper {
    flex: 1;
    min-width: 0;
    padding: 0;
    border-bottom: none;
  }

  /* GlobalDiscountInput chip inside row */
  .promo-discount-row :deep(.discount-chip) {
    white-space: nowrap;
    width: auto;
    flex-shrink: 0;
    padding: 0.3rem 0.5rem;
  }

  /* ── Cart list ── */
  .sidebar-content {
    padding: 0.3rem 0.4rem;
  }

  /* ── Bottom section ── */
  .sidebar-bottom {
    background: #ffffff;
    padding: 0.35rem 0.5rem;
    gap: 0.2rem;
  }

  .action-buttons {
    gap: 0.25rem;
  }

  .btn-action {
    min-height: 34px;
    padding: 0.3rem 0.45rem;
    font-size: 0.68rem;
  }
}
</style>
