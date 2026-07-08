<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import { printerApi } from '@/services/api/printer/printer.api'
import SectionConfigPanel from '@/components/domain/SectionConfigPanel.vue'
import SectionConfigPanelBarista from '@/components/domain/SectionConfigPanelBarista.vue'
import DynamicPreviewPanel from '@/components/domain/DynamicPreviewPanel.vue'
import LivePreviewComponentBarista from '@/components/domain/LivePreviewComponentBarista.vue'
import StoreInfoPanel from '@/components/domain/StoreInfoPanel.vue'
import ConfirmDeleteModal from '@/components/domain/ConfirmDeleteModal.vue'
import { printLayoutService } from '@/services/printerlayout.service'
import type { CustomerLayoutConfig, BaristaLayoutConfig, KitchenLayoutConfig, LayoutLoadResult } from '@/services/printerlayout.service'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const route = useRoute()
const { success: showSuccess, error: showError, info: showInfo } = useToast()

const isResetModalOpen = ref(false)
const isBackModalOpen = ref(false)

// Get printerId from route params (NEW: per-printer mode)
const printerId = computed(() => {
  return route.params.printerId as string | undefined
})

// Get template type from route name or params
const templateType = computed(() => {
  const currentRoute = router.currentRoute.value
  if (currentRoute.name === 'print-layout-barista') return 'barista'
  if (currentRoute.name === 'print-layout-kitchen') return 'kitchen'
  return 'receipt'
})

const templateName = computed(() => {
  return templateType.value === 'receipt' ? 'Customer Receipt' : templateType.value === 'kitchen' ? 'Kitchen Ticket' : 'Barista Ticket'
})

const templateNameLower = computed(() => {
  return templateType.value === 'receipt' ? 'customer receipt' : templateType.value === 'kitchen' ? 'kitchen ticket' : 'barista ticket'
})

const headerTitleText = computed(() => {
  return templateType.value === 'receipt' ? 'layout Customer Receipt' : templateType.value === 'kitchen' ? 'layout Kitchen Ticket' : 'layout Barista Ticket'
})

// State - Customer config
const customerConfig = ref<CustomerLayoutConfig>({
  header: {
    show_logo: true,
    show_store_name: true,
    show_store_address: true,
    show_store_phone: true,
    show_store_slogan: false,
    show_transaction_date: true,
    show_cashier_name: true,
    show_customer_name: true,
    show_table_number: true,
  },
  item: {
    show_item_name: true,
    show_item_quantity: true,
    show_item_price: true,
    show_item_addons: false,
    show_item_notes: true,
    show_member_discount: true,
    item_name_format: 'short'
  },
  summary: {
    show_subtotal: true,
    show_discount: true,
    show_discount_reason: false,
    show_member_savings: true,
    show_tax: true,
    show_tax_breakdown: false,
    show_rounding: true,
    show_total: true,
    show_payment_method: true,
    total_display_format: 'compact'
  },
  footer: {
    show_thank_you_message: true
  }
})

// State - Barista config
const baristaConfig = ref<BaristaLayoutConfig>({
  header: {
    show_order_number: true,
    show_customer_name: true,
    show_table_number: true,
    show_transaction_date: true,
  },
  item: {
    show_item_quantity: true,
    show_item_addons: true,
    show_item_notes: true,
  },
  footer: {
    show_preparation_reminder: true,
    preparation_text: 'Siapkan sesuai resep standar',
  }
})

// State - Kitchen config (same structure as barista)
const kitchenConfig = ref<KitchenLayoutConfig>({
  header: {
    show_order_number: true,
    show_customer_name: true,
    show_table_number: true,
    show_transaction_date: true,
  },
  item: {
    show_item_quantity: true,
    show_item_addons: true,
    show_item_notes: true,
  },
  footer: {
    show_preparation_reminder: true,
    preparation_text: 'Siapkan segera',
  }
})

const hasChanges = ref(false)
const isSaving = ref(false)
const isLoading = ref(false)
const loadError = ref<string | null>(null)
const previewContent = ref<Record<string, any> | null>(null)
const rawContent = ref<Record<string, any> | null>(null)
const printerSpecs = ref<Record<string, any> | null>(null)

const storeInfo = ref({
  store_name: '',
  store_address: '',
  store_phone: '',
  footer_text: '',
  logo_url: '',
})

// Sync storeInfo values into previewContent header array so DynamicPreviewPanel reflects live changes.
// Also called on load to handle cases where preview_content in DB has stale/default logo (e.g. "logoblack.webp").
const applyStoreInfoToPreview = (info: typeof storeInfo.value) => {
  if (!previewContent.value?.sections) return
  if (Array.isArray(previewContent.value.sections.header)) {
    previewContent.value.sections.header = previewContent.value.sections.header.map((field: any) => {
      if (field.logo !== undefined && info.logo_url) return { ...field, logo: info.logo_url }
      if (field.store_name !== undefined && info.store_name) return { ...field, store_name: info.store_name }
      if (field.store_address !== undefined && info.store_address) return { ...field, store_address: info.store_address }
      if (field.store_phone !== undefined && info.store_phone) return { ...field, store_phone: info.store_phone }
      return field
    })
  }
  if (previewContent.value.sections.footer && info.footer_text) {
    previewContent.value.sections.footer.footer_text = info.footer_text
  }
}

const onStoreInfoChange = (val: typeof storeInfo.value) => {
  if (rawContent.value) {
    if (!rawContent.value.sections) rawContent.value.sections = {}
    rawContent.value.sections.store_info = { ...val }
  }
  applyStoreInfoToPreview(val)
  hasChanges.value = true
}

// Get current config based on template type
const currentConfig = computed(() => {
  if (templateType.value === 'receipt') return customerConfig.value
  if (templateType.value === 'kitchen') return kitchenConfig.value
  return baristaConfig.value
})

// Patch previewContent visibility flags live (receipt only)
const applyConfigToPreview = (config: CustomerLayoutConfig) => {
  if (!previewContent.value?.sections) return
  const s = previewContent.value.sections

  // Header — array of {show_xxx: bool, value: ...}
  if (Array.isArray(s.header)) {
    s.header = s.header.map((field: any) => {
      if ('show_logo' in field) return { ...field, show_logo: config.header.show_logo }
      if ('show_store_name' in field) return { ...field, show_store_name: config.header.show_store_name }
      if ('show_store_address' in field) return { ...field, show_store_address: config.header.show_store_address }
      if ('show_store_phone' in field) return { ...field, show_store_phone: config.header.show_store_phone }
      if ('show_store_slogan' in field) return { ...field, show_store_slogan: config.header.show_store_slogan }
      if ('show_date_time' in field || 'show_transaction_date' in field) {
        return { ...field, show_date_time: config.header.show_transaction_date, show_transaction_date: config.header.show_transaction_date }
      }
      if ('show_cashier' in field || 'show_cashier_name' in field) {
        return { ...field, show_cashier: config.header.show_cashier_name, show_cashier_name: config.header.show_cashier_name }
      }
      return field
    })
  } else if (s.header && typeof s.header === 'object') {
    Object.assign(s.header, {
      show_logo: config.header.show_logo,
      show_store_name: config.header.show_store_name,
      show_store_address: config.header.show_store_address,
      show_store_phone: config.header.show_store_phone,
      show_store_slogan: config.header.show_store_slogan,
      show_date_time: config.header.show_transaction_date,
      show_cashier: config.header.show_cashier_name,
    })
  }

  // Items
  if (s.items) {
    Object.assign(s.items, {
      show_quantity: config.item.show_item_quantity,
      show_add_ons: config.item.show_item_addons,
      show_item_subtotal: config.item.show_item_price,
      show_price: config.item.show_item_price,
      item_name_format: config.item.item_name_format,
    })
  }

  // Payment
  if (s.payment) {
    Object.assign(s.payment, {
      show_subtotal: config.summary.show_subtotal,
      show_global_discount: config.summary.show_discount,
      show_discount_reason: config.summary.show_discount_reason,
      show_tax: config.summary.show_tax,
      show_grand_total: config.summary.show_total,
    })
  }

  // Footer
  if (s.footer) {
    s.footer.show_thank_you_message = config.footer.show_thank_you_message
  }
}

// When receipt config changes → patch rawContent fields only (preserve original backend fields)
const onCustomerConfigChange = (config: CustomerLayoutConfig) => {
  customerConfig.value = config
  if (rawContent.value?.sections) {
    const s = rawContent.value.sections
    if (s.header) Object.assign(s.header, {
      show_logo: config.header.show_logo,
      show_store_name: config.header.show_store_name,
      show_store_address: config.header.show_store_address,
      show_store_phone: config.header.show_store_phone,
      show_store_slogan: config.header.show_store_slogan,
      show_date_time: config.header.show_transaction_date,
      show_transaction_date: config.header.show_transaction_date,
      show_cashier: config.header.show_cashier_name,
      show_cashier_name: config.header.show_cashier_name,
      show_customer_name: config.header.show_customer_name,
      show_table_number: config.header.show_table_number,
    })
    if (s.items) Object.assign(s.items, {
      show_item_name: config.item.show_item_name,
      show_quantity: config.item.show_item_quantity,
      show_add_ons: config.item.show_item_addons,
      show_item_subtotal: config.item.show_item_price,
      show_price: config.item.show_item_price,
      show_notes: config.item.show_item_notes,
      item_name_format: config.item.item_name_format,
    })
    if (s.payment) Object.assign(s.payment, {
      show_subtotal: config.summary.show_subtotal,
      show_global_discount: config.summary.show_discount,
      show_discount_reason: config.summary.show_discount_reason,
      show_tax: config.summary.show_tax,
      show_tax_breakdown: config.summary.show_tax_breakdown,
      show_rounding: config.summary.show_rounding,
      show_grand_total: config.summary.show_total,
      show_payment_method: config.summary.show_payment_method,
      total_display_format: config.summary.total_display_format,
    })
    if (s.footer) Object.assign(s.footer, {
      show_thank_you_message: config.footer.show_thank_you_message,
    })
  }
  applyConfigToPreview(config)
  hasChanges.value = true
}

// When barista config changes → patch rawContent fields only
const onBaristaConfigChange = (config: BaristaLayoutConfig) => {
  baristaConfig.value = config
  if (rawContent.value?.sections) {
    const s = rawContent.value.sections
    if (s.header) Object.assign(s.header, {
      show_queue_number: config.header.show_order_number,
      show_customer_name: config.header.show_customer_name,
      show_table_number: config.header.show_table_number,
      show_time: config.header.show_transaction_date,
    })
    if (s.items) Object.assign(s.items, {
      show_item_name: true,
      show_quantity: config.item.show_item_quantity,
      show_add_ons: config.item.show_item_addons,
      show_notes: config.item.show_item_notes,
    })
    if (s.footer) Object.assign(s.footer, {
      show_preparation_reminder: config.footer.show_preparation_reminder,
      preparation_text: config.footer.preparation_text,
    })
  }
  hasChanges.value = true
}

// When kitchen config changes → same structure as barista
const onKitchenConfigChange = (config: KitchenLayoutConfig) => {
  kitchenConfig.value = config
  if (rawContent.value?.sections) {
    const s = rawContent.value.sections
    if (s.header) Object.assign(s.header, {
      show_queue_number: config.header.show_order_number,
      show_customer_name: config.header.show_customer_name,
      show_table_number: config.header.show_table_number,
      show_time: config.header.show_transaction_date,
    })
    if (s.items) Object.assign(s.items, {
      show_item_name: true,
      show_quantity: config.item.show_item_quantity,
      show_add_ons: config.item.show_item_addons,
      show_notes: config.item.show_item_notes,
    })
    if (s.footer) Object.assign(s.footer, {
      show_preparation_reminder: config.footer.show_preparation_reminder,
      preparation_text: config.footer.preparation_text,
    })
  }
  hasChanges.value = true
}

const handleResetConfirm = () => {
  isResetModalOpen.value = false
  doReset()
}

// Reset to defaults
const handleReset = () => {
  isResetModalOpen.value = true
}

const doReset = () => {
  if (templateType.value === 'receipt') {
      customerConfig.value = {
        header: {
          show_logo: true,
          show_store_name: true,
          show_store_address: true,
          show_store_phone: true,
          show_store_slogan: false,
          show_transaction_date: true,
          show_cashier_name: true,
          show_customer_name: true,
          show_table_number: true,
        },
        item: {
          show_item_name: true,
          show_item_quantity: true,
          show_item_price: true,
          show_item_addons: false,
          show_item_notes: false,
          show_member_discount: true,
          item_name_format: 'short'
        },
        summary: {
          show_subtotal: true,
          show_discount: true,
          show_discount_reason: false,
          show_member_savings: true,
          show_tax: true,
          show_tax_breakdown: false,
          show_rounding: true,
          show_total: true,
          show_payment_method: true,
          total_display_format: 'compact'
        },
        footer: {
          show_thank_you_message: true
        }
      }
    } else if (templateType.value === 'kitchen') {
      kitchenConfig.value = {
        header: { show_order_number: true, show_customer_name: true, show_table_number: true, show_transaction_date: true },
        item: { show_item_quantity: true, show_item_addons: true, show_item_notes: true },
        footer: { show_preparation_reminder: true, preparation_text: 'Siapkan segera' }
      }
    } else {
      baristaConfig.value = {
        header: {
          show_order_number: true,
          show_customer_name: true,
          show_table_number: true,
          show_transaction_date: true,
        },
        item: {
          show_item_quantity: true,
          show_item_addons: true,
          show_item_notes: true,
        },
        footer: {
          show_preparation_reminder: true,
          preparation_text: 'Siapkan sesuai resep standar',
        }
      }
    }
  hasChanges.value = false
}

// Test print
const isTesting = ref(false)
const handleTest = async () => {
  if (isTesting.value) return
  if (!Capacitor.isNativePlatform()) {
    showInfo('Test print hanya tersedia di app Android')
    return
  }
  if (!printerId.value) {
    showError('Printer ID tidak ditemukan')
    return
  }
  isTesting.value = true
  try {
    const res = await printerApi.getPrinterById(printerId.value)
    const p = res.data?.data
    if (!p || p.connection_type !== 'bluetooth') {
      showInfo('Test print via Bluetooth hanya tersedia untuk printer dengan koneksi Bluetooth')
      return
    }
    if (!p.device_path) {
      showError('MAC address printer belum diset. Buka Konfigurasi printer → Bluetooth → Pindai Perangkat.')
      return
    }
    const { bluetoothPrinter, escpos } = await import('@/services/bluetooth-printer.service')

    // BT printers saved before paper_width fix may have paper_width=80 despite being 58mm.
    const storedWidth = p.paper_width ?? 58
    const paperMm = (p.connection_type === 'bluetooth' && storedWidth >= 80) ? 58 : storedWidth
    const dpi = p.dpi || 203
    // Font A (default): 12 dots/char. Standard 58mm thermal = 32 chars/line.
    const printableDots = Math.floor((paperMm - 10) * dpi / 25.4)
    const cols = Math.floor(printableDots / 12)  // 58mm→31, 80mm→46
    const div = '-'.repeat(cols)
    const L = (s: string) => escpos.textLine(s)

    // Strip emoji/non-printable (ESC/POS is Latin-1, emojis become garbage bytes)
    const clean = (s: string) => String(s ?? '').replace(/[^\x20-\x7E\xA0-\xFF]/g, '').trim()

    // Word-wrap long text at word boundaries to prevent mid-word cuts
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
    const fmt = (n: any) => {
      const val = typeof n === 'number' ? n : parseInt(String(n ?? '0').replace(/\D/g, '')) || 0
      return `Rp${val.toLocaleString('id-ID')}`
    }

    const sections = previewContent.value?.sections || {}
    const headerArr = Array.isArray(sections.header) ? sections.header : [sections.header || {}]
    const hd: Record<string, any> = {}
    headerArr.forEach((f: any) => f && Object.assign(hd, f))
    const items = sections.items || {}
    const payment = sections.payment || {}
    const footer = sections.footer || {}

    const chunks: Uint8Array[] = [escpos.init()]

    if (templateType.value === 'barista' || templateType.value === 'kitchen') {
      const cfg = currentConfig.value as typeof baristaConfig.value
      chunks.push(escpos.align('center'))
      if (cfg.header.show_order_number) {
        chunks.push(escpos.bold(true), L(`#${clean(hd.queue_number) || '01'}`), escpos.bold(false))
      }
      if (cfg.header.show_customer_name && hd.customer_name) chunks.push(L(clean(hd.customer_name)))
      if (cfg.header.show_table_number && hd.table_number) chunks.push(L(`Meja: ${clean(hd.table_number)}`))
      if (cfg.header.show_transaction_date && hd.date_time) chunks.push(L(clean(hd.date_time)))
      chunks.push(L(div), escpos.align('left'))
      const sampleItems = items.item_name
        ? [{ name: items.item_name, quantity: items.quantity || 1, notes: items.notes || '', add_ons: items.add_ons || [] }]
        : [
            { name: 'Cappuccino Venti', quantity: 2, notes: 'Less sweet', add_ons: [{ name: 'Oat Milk' }, { name: 'Extra Shot' }] },
            { name: 'Matcha Latte',     quantity: 1, notes: '',           add_ons: [] },
          ]
      for (const si of sampleItems) {
        const qty = cfg.item.show_item_quantity ? `${si.quantity}x ` : ''
        chunks.push(escpos.bold(true), L(clean(`${qty}${si.name}`)), escpos.bold(false))
        if (cfg.item.show_item_addons && si.add_ons?.length) {
          for (const a of si.add_ons) chunks.push(L(`  + ${clean(a.name)}`))
        }
        if (cfg.item.show_item_notes && si.notes) chunks.push(L(`  > ${clean(si.notes)}`))
      }
      chunks.push(L(div), escpos.align('center'))
      if (cfg.footer.show_preparation_reminder && cfg.footer.preparation_text) {
        chunks.push(L(clean(cfg.footer.preparation_text)))
      }
    } else {
      const cfg = currentConfig.value as typeof customerConfig.value
      chunks.push(escpos.align('center'))
      if (cfg.header.show_logo) {
        try {
          const logoDots = Math.floor(printableDots * 2 / 3)
          const logoModule = await import('@/assets/logo/logo-black.png')
          const logoBytes = await escpos.rasterImage(logoModule.default, logoDots)
          chunks.push(logoBytes, escpos.lineFeed(1))
        } catch { /* logo gagal dimuat, skip */ }
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
      chunks.push(L(clean(hd.transaction_id || 'TRX-SAMPLE')))
      if (cfg.header.show_transaction_date) chunks.push(L(clean(hd.date_time || new Date().toLocaleString('id-ID'))))
      if (cfg.header.show_cashier_name) chunks.push(L(`Kasir: ${clean(hd.cashier || '-')}`))
      if (cfg.header.show_customer_name) chunks.push(L(`Tamu: ${clean(hd.customer_name || '-')}`))
      if (cfg.header.show_table_number) chunks.push(L(`Meja: ${clean(hd.table_number || '-')}`))
      chunks.push(L(div))
      if (items.item_name) {
        if (cfg.item.show_item_name && cfg.item.show_item_quantity && cfg.item.show_item_price) {
          chunks.push(escpos.bold(true), L(threeCol('Item', 'Qty', 'Subtotal')), escpos.bold(false))
        }
        chunks.push(L(threeCol(
          cfg.item.show_item_name ? (items.item_name || '-') : '',
          cfg.item.show_item_quantity ? String(items.quantity || 1) : '',
          cfg.item.show_item_price ? fmt(items.subtotal) : '',
        )))
        if (cfg.item.show_item_addons && items.add_ons?.length) {
          for (const a of items.add_ons) {
            const addonPrice = a.price != null && Number(String(a.price).replace(/\D/g, '')) > 0
              ? fmt(a.price) : ''
            chunks.push(L(addonPrice
              ? twoCol(`  + ${clean(a.name)}`, addonPrice)
              : `  + ${clean(a.name)}`
            ))
          }
        }
        if (cfg.item.show_item_notes && items.notes) chunks.push(L(`  > ${clean(items.notes)}`))
        // Member discount per item (preview sample)
        if (cfg.item.show_item_price && cfg.item.show_member_discount) {
          chunks.push(L(twoCol('  * Hrg normal', fmt(payment.subtotal || 17000))))
          chunks.push(L(twoCol('  * Hemat member', `-${fmt(2000)}`)))
        }
      }
      chunks.push(L(div))
      if (cfg.summary.show_subtotal) chunks.push(L(twoCol('Subtotal', fmt(payment.subtotal))))
      if (cfg.summary.show_member_savings) {
        chunks.push(L(twoCol('Disc. Member', `-${fmt(2000)}`)))
      }
      if (cfg.summary.show_discount) {
        const itemDisc = parseFloat(payment.discount_items || 0)
        const globalDisc = parseFloat(payment.global_discount || 0)
        if (itemDisc > 0) chunks.push(L(twoCol('Disc. Item', `-${fmt(itemDisc)}`)))
        if (globalDisc > 0) chunks.push(L(twoCol('Disc. Global', `-${fmt(globalDisc)}`)))
      }
      if (cfg.summary.show_payment_method && payment.payment_method) {
        chunks.push(L(twoCol('Bayar', clean(payment.payment_method))))
      }
      chunks.push(L(div))
      if (cfg.summary.show_total) {
        chunks.push(escpos.bold(true), L(twoCol('TOTAL', fmt(payment.grand_total))), escpos.bold(false))
      }
      if (cfg.footer.show_thank_you_message && footer.footer_text) {
        chunks.push(escpos.align('center'), L(''), L(clean(footer.footer_text)))
      }
    }

    chunks.push(escpos.lineFeed(3), escpos.cut())
    await bluetoothPrinter.printTo(p.device_path, escpos.concat(...chunks))
    showSuccess('Test print berhasil dikirim ke printer')
  } catch (e: any) {
    showError(`Test print gagal: ${e?.message || 'periksa koneksi printer'}`)
  } finally {
    isTesting.value = false
  }
}

// Save changes
const handleSave = async () => {
  isSaving.value = true
  try {
    if (!printerId.value) throw new Error('Printer ID tidak ditemukan')

    const tmplType = templateType.value as 'receipt' | 'barista' | 'kitchen'
    const content = rawContent.value ?? currentConfig.value
    const saved = await printLayoutService.saveLayoutByPrinterId(printerId.value, tmplType, content as any)

    if (saved.previewContent) previewContent.value = saved.previewContent
    if (saved.rawContent) rawContent.value = saved.rawContent
    if (saved.printerSpecs) printerSpecs.value = saved.printerSpecs

    hasChanges.value = false
    showSuccess(`${templateName.value} berhasil disimpan`)
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message ||
                     (error instanceof Error ? error.message : 'Gagal menyimpan pengaturan')
    showError(errorMsg)
  } finally {
    isSaving.value = false
  }
}

// Track if we've already attempted to load to prevent duplicate calls
let hasAttemptedLoad = false

// Load layout on mount
const loadLayout = async () => {
  // Skip if already attempted to load (prevents duplicate API calls during component mounting)
  if (hasAttemptedLoad) {
    return
  }
  hasAttemptedLoad = true
  
  isLoading.value = true
  loadError.value = null
  try {

    
    if (!printerId.value) {
      throw new Error('Printer ID tidak ditemukan. Kembali ke daftar printer dan coba lagi.')
    }

    const result: LayoutLoadResult = await printLayoutService.getLayoutByPrinterId(printerId.value)

    if (result.templateType === 'receipt') {
      customerConfig.value = result.layout as CustomerLayoutConfig
    } else if (result.templateType === 'kitchen') {
      kitchenConfig.value = result.layout as KitchenLayoutConfig
    } else {
      baristaConfig.value = result.layout as BaristaLayoutConfig
    }

    previewContent.value = result.previewContent
    rawContent.value = result.rawContent
    printerSpecs.value = result.printerSpecs

     // Populate store info from rawContent or preview_content
     const si = rawContent.value?.sections?.store_info
     const pc = previewContent.value?.sections?.header
     let extractedStoreInfo = {
       store_name: '',
       store_address: '',
       store_phone: '',
       footer_text: '',
       logo_url: '',
     }
     if (si) {
       extractedStoreInfo = {
         store_name: si.store_name || '',
         store_address: si.store_address || '',
         store_phone: si.store_phone || '',
         footer_text: si.footer_text || '',
         logo_url: si.logo_url || '',
       }
     } else if (Array.isArray(pc)) {
       const nameField = pc.find((f: any) => f.store_name !== undefined)
       const addrField = pc.find((f: any) => f.store_address !== undefined)
       const logoField = pc.find((f: any) => f.logo !== undefined)
       extractedStoreInfo = {
         store_name: nameField?.store_name || '',
         store_address: addrField?.store_address || '',
         store_phone: '',
         footer_text: previewContent.value?.sections?.footer?.footer_text || '',
         logo_url: logoField?.logo?.startsWith?.('/uploads') ? logoField.logo : '',
       }
     }
     storeInfo.value = extractedStoreInfo
     // Always write store_info into rawContent so it persists on save
     if (rawContent.value) {
       if (!rawContent.value.sections) rawContent.value.sections = {}
       rawContent.value.sections.store_info = { ...extractedStoreInfo }
     }
     // Sync previewContent with loaded storeInfo so DynamicPreviewPanel shows the correct logo
     applyStoreInfoToPreview(extractedStoreInfo)



    
     hasChanges.value = false

   } catch (error: any) {

     const errorMsg = error.response?.data?.error?.message || 
                      (error instanceof Error ? error.message : 'Gagal memuat pengaturan')
     loadError.value = errorMsg
     showError(errorMsg)
   } finally {
     isLoading.value = false
   }
}

// Load layout on component mount
onMounted(() => {
  loadLayout()
})

const handleBackConfirm = () => {
  isBackModalOpen.value = false
  router.back()
}

// Go back
const handleBack = () => {
  if (hasChanges.value) {
    isBackModalOpen.value = true
  } else {
    router.back()
  }
}
</script>

<template>
  <div class="edit-layout-view">
    <!-- Fixed Header -->
    <div class="page-header">
      <div class="header-top">
        <button class="btn-back" @click="handleBack">
          <span>←</span>
        </button>
        <div class="header-info">
          <h1 class="header-title">{{ headerTitleText }}</h1>
           <p class="header-template">{{ templateName }}</p>
        </div>
        <div v-if="hasChanges" class="unsaved-indicator">
          <span class="dot"></span>
          <span>Belum disimpan</span>
        </div>
      </div>
    </div>

    <!-- Error Banner -->
    <div v-if="loadError" class="error-banner">
      <AppIcon name="warning" :size="14" /> <span>{{ loadError }}</span>
      <button @click="loadError = null" class="btn-close"><AppIcon name="x" :size="14" /></button>
    </div>

     <!-- Loading State -->
     <div v-if="isLoading" class="loading-state">
       <div class="spinner"></div>
       <p>Memuat pengaturan...</p>
     </div>

    <!-- Main Content -->
     <div v-else class="main-content">
       <!-- Left Panel: Configuration -->
       <div class="left-panel">
        <!-- Store Info Panel — hanya untuk receipt -->
        <StoreInfoPanel
          v-if="templateType === 'receipt'"
          v-model="storeInfo"
          @update:modelValue="onStoreInfoChange"
        />

        <!-- Receipt Config Panel -->
        <SectionConfigPanel
          v-if="templateType === 'receipt'"
          :model-value="customerConfig"
          @update:model-value="onCustomerConfigChange"
        />

        <!-- Barista Config Panel -->
        <SectionConfigPanelBarista
          v-else-if="templateType === 'barista'"
          :model-value="baristaConfig"
          @update:model-value="onBaristaConfigChange"
        />

        <!-- Kitchen Config Panel (same component as barista) -->
        <SectionConfigPanelBarista
          v-else
          :model-value="kitchenConfig"
          @update:model-value="onKitchenConfigChange"
        />
       </div>

       <!-- Right Panel: Preview -->
       <div class="right-panel">
        <!-- Customer Preview - dari preview_content (last saved) -->
        <DynamicPreviewPanel
          v-if="templateType === 'receipt'"
          :preview-content="previewContent"
          :printer-specs="printerSpecs"
          :layout-config="customerConfig"
        />

        <!-- Barista Preview - live dari baristaConfig -->
        <LivePreviewComponentBarista
          v-else-if="templateType === 'barista'"
          :config="baristaConfig"
          :preview-content="previewContent"
          :printer-specs="printerSpecs"
        />

        <!-- Kitchen Preview - live dari kitchenConfig -->
        <LivePreviewComponentBarista
          v-else
          :config="kitchenConfig"
          :preview-content="previewContent"
          :printer-specs="printerSpecs"
        />
       </div>
    </div>

    <!-- Sticky Footer -->
    <div class="page-footer">
      <div class="footer-left">
        <button class="btn btn-secondary" @click="handleReset" :disabled="isSaving" title="Reset ke pengaturan default">
          <AppIcon name="refresh" :size="13" /> Reset
        </button>
        <button class="btn btn-secondary" @click="handleTest" :disabled="isSaving || isTesting" title="Cetak test print">
          <AppIcon v-if="isTesting" name="loader" :size="13" :spin="true" />
          <AppIcon v-else name="printer" :size="13" />
          {{ isTesting ? 'Mencetak...' : 'Test Print' }}
        </button>
      </div>
      <button class="btn btn-primary" @click="handleSave" :disabled="!hasChanges || isSaving">
        <AppIcon v-if="isSaving" name="loader" :size="13" :spin="true" />
        <AppIcon v-else name="save" :size="13" />
        {{ isSaving ? 'Menyimpan...' : 'Simpan' }}
      </button>
    </div>

    <!-- Reset Confirm Modal -->
    <ConfirmDeleteModal
      :is-open="isResetModalOpen"
      title="Reset ke Default"
      message="Semua pengaturan layout akan dikembalikan ke nilai default. Perubahan yang belum disimpan akan hilang."
      item-name="Layout ini"
      @confirm="handleResetConfirm"
      @cancel="isResetModalOpen = false"
    />

    <!-- Back Without Save Confirm Modal -->
    <ConfirmDeleteModal
      :is-open="isBackModalOpen"
      title="Keluar Tanpa Menyimpan"
      message="Ada perubahan yang belum disimpan. Perubahan akan hilang jika kamu keluar sekarang."
      item-name="Perubahan ini"
      @confirm="handleBackConfirm"
      @cancel="isBackModalOpen = false"
    />
  </div>
</template>

<style scoped>
.edit-layout-view {
  display: flex;
  flex-direction: column;
  height: calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
  background: #f8fafb;
}

/* Header */
.page-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: white;
  border-bottom: 1px solid var(--color-border);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.header-top {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3) var(--spacing-4);
  max-width: 100%;
}

.btn-back {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-size: 1.25rem;
  transition: all 0.2s ease;
}

.btn-back:hover {
  background: var(--color-background-secondary, #f3f4f6);
  border-color: var(--color-primary, var(--brand-primary-darker));
}

.header-info {
  flex: 1;
  min-width: 0;
}

.header-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
  letter-spacing: -0.01em;
}

.header-template {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin: 4px 0 0 0;
}

.unsaved-indicator {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-2) var(--spacing-3);
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 6px;
  font-size: 0.85rem;
  color: #b45309;
  font-weight: 500;
}

.unsaved-indicator .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f59e0b;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Error Banner */
.error-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-3) var(--spacing-4);
  margin-bottom: var(--spacing-3);
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 10px;
  color: #991b1b;
  font-weight: 500;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.error-banner .btn-close {
  background: none;
  border: none;
  color: #991b1b;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0;
  transition: transform 0.2s;
}

.error-banner .btn-close:hover {
  transform: scale(1.2);
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-8);
  gap: var(--spacing-3);
  flex: 1;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(75, 0, 130, 0.1);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-state p {
  color: var(--color-text-secondary);
  font-weight: 500;
}

/* Main Content */
.main-content {
  display: grid;
  grid-template-columns: 40% 60%;
  flex: 1;
  overflow: hidden;
  gap: var(--spacing-3);
  padding: var(--spacing-3);
  max-width: 100%;
}

.left-panel {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding-right: var(--spacing-2);
  padding-bottom: 100px;
}

.right-panel {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding-bottom: 100px;
}

/* Footer */
.page-footer {
  position: sticky;
  bottom: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-2);
  padding: 0.375rem var(--spacing-4);
  background: white;
  border-top: 1px solid var(--color-border);
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.05);
  z-index: 50;
}

.footer-left {
  display: flex;
  gap: var(--spacing-2);
}

/* Buttons */
.btn {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.875rem;
  border-radius: 8px;
  border: none;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 34px;
  white-space: nowrap;
  font-family: 'Inter', sans-serif;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--color-primary, var(--brand-primary-darker));
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #065f46;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(75, 0, 130, 0.3);
}

.btn-secondary {
  background: white;
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-background-secondary, #f9fafb);
  border-color: var(--color-text-secondary);
}

/* Responsive */
@media (max-width: 1279px) {
  .main-content {
    grid-template-columns: 1fr 1fr;
  }

  .header-template {
    display: none;
  }
}

@media (max-width: 767px) {
  .main-content {
    grid-template-columns: 1fr;
    gap: var(--spacing-2);
    padding: var(--spacing-2);
  }

  .left-panel {
    max-height: 50vh;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: white;
    padding: var(--spacing-3);
    padding-right: var(--spacing-2);
    padding-bottom: var(--spacing-3);
  }

  .right-panel {
    max-height: 50vh;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: white;
    padding: var(--spacing-3);
  }

  .page-footer {
    flex-direction: column;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-3);
  }

  .footer-left {
    width: 100%;
  }

  .btn {
    flex: 1;
    justify-content: center;
  }
}

@media (max-width: 767px) {
  .header-top {
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-3);
  }

  .header-title {
    font-size: 1.1rem;
  }

  .main-content {
    padding: var(--spacing-2);
  }

  .left-panel,
  .right-panel {
    padding: var(--spacing-2);
  }

  .page-footer {
    padding: var(--spacing-2) var(--spacing-3);
  }
}
</style>
