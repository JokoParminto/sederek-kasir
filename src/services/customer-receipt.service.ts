import type { Transaction } from '@/types'
import { printerService } from '@/services/printer.service'
import { printLayoutService, type CustomerLayoutConfig } from '@/services/printerlayout.service'

export interface PrintCustomerReceiptOptions {
  cashierNameFallback?: string
  customerNameFallback?: string
}

export const printCustomerReceipt = async (
  transaction: Transaction,
  options: PrintCustomerReceiptOptions = {},
): Promise<void> => {
  const printers = await printerService.getAllPrinters()
  const customerPrinters = printers.filter(printer => printer.type === 'customer')
  const printer = customerPrinters.find(item => item.isDefault)
    ?? customerPrinters.find(item => item.status === 'connected')
    ?? customerPrinters[0]
    ?? null

  if (!printer) throw new Error('Printer struk belum dikonfigurasi')
  if (printer.connectionType !== 'bluetooth') {
    throw new Error('Print struk hanya tersedia untuk printer Bluetooth')
  }
  if (!printer.devicePath) throw new Error('Perangkat printer belum dipilih')

  const result = await printLayoutService.getLayoutByPrinterId(printer.id)
  const config = result.layout as CustomerLayoutConfig
  const previewContent = result.previewContent
  const { bluetoothPrinter, escpos } = await import('@/services/bluetooth-printer.service')

  const paperMm = printer.paperSize
  const dpi = printer.dpi || 203
  const printableDots = Math.floor((paperMm - 10) * dpi / 25.4)
  const characterDots = printer.fontSize >= 16 ? 24 : printer.fontSize <= 10 ? 9 : 12
  const columns = Math.floor(printableDots / characterDots)
  const divider = '-'.repeat(columns)

  const clean = (value: unknown) => String(value ?? '').replace(/[^\x20-\x7E\xA0-\xFF]/g, '').trim()
  const line = (value: string) => escpos.textLine(value)
  const money = (value: unknown) => {
    const amount = typeof value === 'number'
      ? value
      : parseInt(String(value ?? '0').replace(/\D/g, '')) || 0
    return `Rp${amount.toLocaleString('id-ID')}`
  }
  const wrap = (text: string): string[] => {
    const safeText = clean(text)
    if (safeText.length <= columns) return [safeText]
    const words = safeText.split(' ')
    const lines: string[] = []
    let current = ''
    for (const word of words) {
      const next = current ? `${current} ${word}` : word
      if (next.length <= columns) {
        current = next
      } else {
        if (current) lines.push(current)
        current = word.slice(0, columns)
      }
    }
    if (current) lines.push(current)
    return lines
  }
  const twoColumns = (left: string, right: string) => {
    const safeRight = clean(right).slice(0, columns - 2)
    return clean(left).slice(0, columns - safeRight.length - 1)
      .padEnd(columns - safeRight.length - 1) + ` ${safeRight}`
  }
  const threeColumns = (name: string, quantity: string, price: string) => {
    const quantityWidth = 4
    const priceWidth = 11
    const nameWidth = columns - quantityWidth - priceWidth - 2
    return clean(name).slice(0, nameWidth).padEnd(nameWidth) + ' '
      + clean(quantity).slice(0, quantityWidth).padStart(quantityWidth) + ' '
      + clean(price).slice(0, priceWidth).padStart(priceWidth)
  }

  const sections = previewContent?.sections || {}
  const headerSections = Array.isArray(sections.header) ? sections.header : [sections.header || {}]
  const header: Record<string, any> = {}
  headerSections.forEach((field: any) => field && Object.assign(header, field))
  const footer = sections.footer || {}

  const paidAt = transaction.paidAt ? new Date(transaction.paidAt) : new Date(transaction.createdAt)
  const date = paidAt.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' })
  const time = paidAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  const customerName = transaction.customerName || options.customerNameFallback || 'Walk In'
  const cashierName = transaction.cashierName || options.cashierNameFallback || '-'
  const chunks: Uint8Array[] = [
    escpos.init(),
    ...escpos.applyFontSize(printer.fontSize),
    escpos.align('center'),
  ]

  if (config.header.show_logo) {
    try {
      const logo = await import('@/assets/logo/logo-black.png')
      chunks.push(await escpos.rasterImage(logo.default, Math.floor(printableDots * 2 / 3)), escpos.lineFeed(1))
    } catch { /* logo is optional */ }
  }
  if (config.header.show_store_name) {
    chunks.push(escpos.bold(true), line(clean(header.store_name || 'Sederek Kopi')), escpos.bold(false))
  }
  if (config.header.show_store_address && header.store_address) {
    for (const addressLine of wrap(header.store_address)) chunks.push(line(addressLine))
  }
  if (config.header.show_store_phone && header.store_phone) chunks.push(line(clean(header.store_phone)))
  if (config.header.show_store_slogan && header.store_slogan) chunks.push(line(clean(header.store_slogan)))

  chunks.push(line(divider), escpos.align('left'), line(clean(transaction.transactionNumber)))
  if (config.header.show_transaction_date) chunks.push(line(`${date} ${time}`))
  if (config.header.show_cashier_name) chunks.push(line(`Kasir: ${clean(cashierName)}`))
  if (config.header.show_customer_name) chunks.push(line(`Tamu: ${clean(customerName)}`))
  chunks.push(line(divider))

  if (config.item.show_item_name && config.item.show_item_quantity && config.item.show_item_price) {
    chunks.push(escpos.bold(true), line(threeColumns('Item', 'Qty', 'Subtotal')), escpos.bold(false))
  }
  for (const item of transaction.items) {
    const rawName = config.item.item_name_format === 'short'
      ? item.productName.slice(0, 16)
      : item.productName
    chunks.push(line(threeColumns(
      config.item.show_item_name ? clean(rawName) : '',
      config.item.show_item_quantity ? String(item.quantity) : '',
      config.item.show_item_price ? money(item.subtotal) : '',
    )))
    if (config.item.show_item_price && config.item.show_member_discount && item.is_member_price) {
      const saving = item.memberSaving
        ?? Math.max(0, (item.originalPrice - (item.memberPrice ?? item.price)) * item.quantity)
      if (saving > 0) {
        chunks.push(line(twoColumns('  * Hrg normal', money(item.originalPrice * item.quantity))))
        chunks.push(line(twoColumns('  * Hemat member', `-${money(saving)}`)))
      }
    }
    if (config.item.show_item_addons && item.addOns?.length) {
      for (const addOn of item.addOns) {
        const addOnPrice = addOn.price > 0 ? money(addOn.price * addOn.quantity) : ''
        chunks.push(line(addOnPrice
          ? twoColumns(`  + ${clean(addOn.addOnName)}`, addOnPrice)
          : `  + ${clean(addOn.addOnName)}`))
      }
    }
    if (config.item.show_item_notes && item.notes) chunks.push(line(`  > ${clean(item.notes)}`))
  }
  chunks.push(line(divider))

  if (config.summary.show_subtotal) chunks.push(line(twoColumns('Subtotal', money(transaction.subtotal))))
  if (config.summary.show_member_savings) {
    const memberDiscount = transaction.totalMemberSavings || transaction.items.reduce((sum, item) =>
      sum + (item.memberSaving
        ?? (item.is_member_price
          ? Math.max(0, (item.originalPrice - (item.memberPrice ?? item.price)) * item.quantity)
          : 0)), 0)
    if (memberDiscount > 0) chunks.push(line(twoColumns('Disc. Member', `-${money(memberDiscount)}`)))
  }
  if (config.summary.show_discount) {
    if (transaction.itemDiscounts > 0) {
      chunks.push(line(twoColumns('Disc. Item', `-${money(transaction.itemDiscounts)}`)))
    }
    if (transaction.globalDiscountAmount > 0) {
      chunks.push(line(twoColumns('Disc. Global', `-${money(transaction.globalDiscountAmount)}`)))
    }
  }
  if (config.summary.show_payment_method) {
    chunks.push(line(twoColumns('Bayar', clean(transaction.paymentMethod || '-'))))
  }
  chunks.push(line(divider))
  if (config.summary.show_total) {
    chunks.push(escpos.bold(true), line(twoColumns('TOTAL', money(transaction.total))), escpos.bold(false))
  }

  if (config.footer.show_thank_you_message && footer.footer_text) {
    chunks.push(escpos.align('center'), line(''), line(clean(footer.footer_text)))
  }
  chunks.push(escpos.lineFeed(3), escpos.cut())

  await bluetoothPrinter.printTo(printer.devicePath, escpos.concat(...chunks))
}
