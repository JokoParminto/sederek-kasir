// Shared ESC/POS print logic for barista and kitchen tickets.
// Used by TransactionSidebar (held orders) and KasirView (direct payment).

import type { TransactionItem } from '@/types'
import type { UiPrinter } from '@/services/printer.service'
import type { BaristaLayoutConfig, KitchenLayoutConfig } from '@/services/printerlayout.service'

const clean = (s: string) => String(s ?? '').replace(/[^\x20-\x7E\xA0-\xFF]/g, '').trim()

function getItemName(item: TransactionItem): string {
  return (item as any).productName || (item as any).product_name || 'Item'
}

function calcCols(printer: UiPrinter): number {
  const paperMm =
    printer.connectionType === 'bluetooth' && printer.paperSize >= 80
      ? 58
      : printer.paperSize ?? 58
  const dots = Math.floor((paperMm - 10) * (printer.dpi || 203) / 25.4)
  return Math.floor(dots / 12)
}

export interface PrintBaristaInfo {
  queueNum: string   // e.g. '01'
  custName: string   // already clean+uppercase
  time: string       // e.g. '14:30'
  trxNum: string     // e.g. 'TRX-001'
}

export interface PrintKitchenInfo {
  queueNum: string
  custName: string
  time: string
}

export async function printBaristaTicket(
  items: TransactionItem[],
  printer: UiPrinter,
  layout: BaristaLayoutConfig | null,
  info: PrintBaristaInfo,
): Promise<void> {
  if (!items.length || !printer.devicePath) return
  const { bluetoothPrinter: bt, escpos } = await import('@/services/bluetooth-printer.service')

  const cols = calcCols(printer)
  const div  = '-'.repeat(cols)
  const L    = (s: string) => escpos.textLine(s)

  const cfg       = layout
  const showQueue = cfg?.header.show_order_number     !== false
  const showCust  = cfg?.header.show_customer_name    !== false
  const showDate  = cfg?.header.show_transaction_date !== false
  const showQty   = cfg?.item.show_item_quantity      !== false
  const showAO    = cfg?.item.show_item_addons        !== false
  const showNotes = cfg?.item.show_item_notes         !== false
  const showPrep  = cfg?.footer.show_preparation_reminder !== false
  const prepText  = cfg?.footer.preparation_text || 'Siapkan sesuai resep standar'

  const chunks: Uint8Array[] = [escpos.init(), ...escpos.applyFontSize(printer.fontSize), escpos.align('center')]
  if (showQueue) chunks.push(escpos.bold(true), L(`#${info.queueNum}`), escpos.bold(false))
  if (showCust)  chunks.push(L(info.custName))
  chunks.push(L(showDate ? `${info.trxNum} - ${info.time}` : info.trxNum))
  chunks.push(L(div), escpos.align('left'))

  for (const item of items) {
    const name = clean(getItemName(item))
    const qPfx = showQty ? `${item.quantity}x ` : ''
    chunks.push(escpos.bold(true), L(`${qPfx}${name}`), escpos.bold(false))
    if (showNotes && item.notes) chunks.push(L(`  > ${clean(item.notes)}`))
    if (showAO && item.addOns?.length) {
      for (const a of item.addOns) {
        const q = a.quantity > 1 ? ` x${a.quantity}` : ''
        chunks.push(L(`  + ${clean(a.addOnName)}${q}`))
      }
    }
  }

  chunks.push(L(div), escpos.align('center'))
  if (showPrep) chunks.push(L(clean(prepText)))
  chunks.push(escpos.lineFeed(3), escpos.cut())
  await bt.printTo(printer.devicePath, escpos.concat(...chunks))
}

export async function printKitchenTicket(
  items: TransactionItem[],
  printer: UiPrinter,
  layout: KitchenLayoutConfig | null,
  info: PrintKitchenInfo,
): Promise<void> {
  if (!items.length || !printer.devicePath) return
  const { bluetoothPrinter: btK, escpos: ep } = await import('@/services/bluetooth-printer.service')

  const cols = calcCols(printer)
  const div  = '-'.repeat(cols)
  const L    = (s: string) => ep.textLine(s)

  const cfg       = layout
  const showQueue = cfg?.header.show_order_number     !== false
  const showCust  = cfg?.header.show_customer_name    !== false
  const showDate  = cfg?.header.show_transaction_date !== false
  const showQty   = cfg?.item.show_item_quantity      !== false
  const showAO    = cfg?.item.show_item_addons        !== false
  const showNotes = cfg?.item.show_item_notes         !== false
  const showPrep  = cfg?.footer.show_preparation_reminder !== false
  const prepText  = cfg?.footer.preparation_text || 'Siapkan segera'

  const chunks: Uint8Array[] = [ep.init(), ...ep.applyFontSize(printer.fontSize), ep.align('center')]
  if (showQueue) chunks.push(ep.bold(true), L(`DAPUR #${info.queueNum}`), ep.bold(false))
  if (showCust && info.custName) chunks.push(L(clean(info.custName)))
  if (showDate) chunks.push(L(info.time))
  chunks.push(L(div), ep.align('left'))

  for (const item of items) {
    const name = clean(getItemName(item))
    const qPfx = showQty ? `${item.quantity}x ` : ''
    chunks.push(ep.bold(true), L(`${qPfx}${name}`), ep.bold(false))
    if (showAO && item.addOns?.length) {
      for (const a of item.addOns) chunks.push(L(`  + ${clean(a.addOnName)}`))
    }
    if (showNotes && item.notes) chunks.push(L(`  > ${clean(item.notes)}`))
  }

  chunks.push(L(div), ep.align('center'))
  if (showPrep) chunks.push(L(clean(prepText)))
  chunks.push(ep.lineFeed(3), ep.cut())
  await btK.printTo(printer.devicePath, ep.concat(...chunks))
}
