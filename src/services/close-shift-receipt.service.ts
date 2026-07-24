import { printerService } from '@/services/printer.service'
import { printLayoutService } from '@/services/printerlayout.service'
import type { CustomerLayoutConfig } from '@/services/printerlayout.service'

export type ShiftSummarySource = 'stored' | 'live' | 'derived'

export interface ShiftFinancialSummary {
  modal_awal: number | string
  total_sales_income: number | string
  cash_income: number | string
  qris_income: number | string
  total_expenses: number | string
  net_income: number | string
  shopee_food_amount: number | string
  shopee_food_discount_percent: number | string
  shopee_food_discount_nominal: number | string
  shopee_food_net: number | string
  expected_cash: number | string
  actual_cash: number | string | null
  selisih: number | string | null
  summary_source?: ShiftSummarySource
  reconciliation_complete?: boolean
  shift?: {
    status?: string
    opened_at?: string
    closed_at?: string | null
  }
}

export interface CashStatus {
  label: 'Uang Tunai Cocok' | 'Uang Kurang' | 'Uang Lebih'
  amount: number
  type: 'match' | 'short' | 'over'
  helper: string
}

export interface ShiftFinancialView {
  modalAwal: number
  totalSales: number
  cashIncome: number
  qrisIncome: number
  totalExpenses: number
  posNetIncome: number
  shopeeFoodAmount: number
  shopeeFoodDiscountPercent: number
  shopeeFoodDiscountNominal: number
  shopeeFoodNet: number
  expectedCash: number
  actualCash: number | null
  difference: number | null
  totalNetIncome: number
  totalNonCash: number
  cashStatus: CashStatus | null
  source: ShiftSummarySource
  reconciliationComplete: boolean
}

const toNumber = (value: unknown): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export const getCashStatus = (difference: number): CashStatus => {
  if (difference === 0) {
    return {
      label: 'Uang Tunai Cocok',
      amount: 0,
      type: 'match',
      helper: 'Hasil hitung sama dengan tunai seharusnya',
    }
  }
  if (difference < 0) {
    return {
      label: 'Uang Kurang',
      amount: Math.abs(difference),
      type: 'short',
      helper: 'Hasil hitung lebih kecil dari tunai seharusnya',
    }
  }
  return {
    label: 'Uang Lebih',
    amount: difference,
    type: 'over',
    helper: 'Hasil hitung lebih besar dari tunai seharusnya',
  }
}

export const createShiftFinancialView = (summary: ShiftFinancialSummary): ShiftFinancialView => {
  const actualCash = summary.actual_cash === null || summary.actual_cash === undefined
    ? null
    : toNumber(summary.actual_cash)
  const expectedCash = toNumber(summary.expected_cash)
  const difference = summary.selisih === null || summary.selisih === undefined
    ? (actualCash === null ? null : actualCash - expectedCash)
    : toNumber(summary.selisih)
  const posNetIncome = toNumber(summary.net_income)
  const shopeeFoodNet = toNumber(summary.shopee_food_net)
  const qrisIncome = toNumber(summary.qris_income)

  return {
    modalAwal: toNumber(summary.modal_awal),
    totalSales: toNumber(summary.total_sales_income),
    cashIncome: toNumber(summary.cash_income),
    qrisIncome,
    totalExpenses: toNumber(summary.total_expenses),
    posNetIncome,
    shopeeFoodAmount: toNumber(summary.shopee_food_amount),
    shopeeFoodDiscountPercent: toNumber(summary.shopee_food_discount_percent),
    shopeeFoodDiscountNominal: toNumber(summary.shopee_food_discount_nominal),
    shopeeFoodNet,
    expectedCash,
    actualCash,
    difference,
    totalNetIncome: posNetIncome + shopeeFoodNet,
    totalNonCash: qrisIncome + shopeeFoodNet,
    cashStatus: difference === null ? null : getCashStatus(difference),
    source: summary.summary_source ?? 'stored',
    reconciliationComplete: summary.reconciliation_complete !== false,
  }
}

export interface PrintCloseShiftOptions {
  cashierName: string
  closedAt?: string | Date | null
}

export interface PrintCloseShiftResult {
  success: boolean
  message: string
}

export const printCloseShiftReceipt = async (
  summary: ShiftFinancialSummary,
  options: PrintCloseShiftOptions,
): Promise<PrintCloseShiftResult> => {
  try {
    const printers = await printerService.getAllPrinters()
    const customerPrinters = printers.filter(item => item.type === 'customer')
    const printer = customerPrinters.find(item => item.isDefault)
      ?? customerPrinters.find(item => item.status === 'connected')
      ?? customerPrinters[0]
      ?? null
    if (!printer) return { success: false, message: 'Printer struk belum dikonfigurasi' }
    if (printer.connectionType !== 'bluetooth') {
      return { success: false, message: 'Print tutup shift hanya tersedia untuk printer Bluetooth' }
    }
    if (!printer.devicePath) return { success: false, message: 'Perangkat printer belum dipilih' }

    const layoutResult = await printLayoutService.getLayoutByPrinterId(printer.id)
    const config = layoutResult.layout as CustomerLayoutConfig
    const sections = layoutResult.previewContent?.sections || {}
    const headerSections = Array.isArray(sections.header) ? sections.header : [sections.header || {}]
    const header: Record<string, any> = {}
    headerSections.forEach((field: any) => field && Object.assign(header, field))
    const footer = sections.footer || {}

    const { bluetoothPrinter, escpos } = await import('@/services/bluetooth-printer.service')
    const paperMm = printer.paperSize
    const dpi = printer.dpi || 203
    const printableDots = Math.floor((paperMm - 10) * dpi / 25.4)
    const characterDots = printer.fontSize >= 16 ? 24 : printer.fontSize <= 10 ? 9 : 12
    const columns = Math.floor(printableDots / characterDots)
    const divider = '-'.repeat(columns)
    const clean = (value: unknown) => String(value ?? '').replace(/[^\x20-\x7E\xA0-\xFF]/g, '').trim()
    const line = (value: string) => escpos.textLine(value)
    const money = (value: number) => `Rp${value.toLocaleString('id-ID')}`
    const twoColumns = (left: string, right: string) => {
      const safeRight = clean(right).slice(0, columns - 2)
      return clean(left).slice(0, columns - safeRight.length - 1)
        .padEnd(columns - safeRight.length - 1) + ` ${safeRight}`
    }
    const hint = (text: string) => {
      const maxLength = Math.max(12, columns - 2)
      const words = clean(text).split(/\s+/)
      const lines: string[] = []
      let current = ''
      for (const word of words) {
        const candidate = current ? `${current} ${word}` : word
        if (candidate.length > maxLength && current) {
          lines.push(current)
          current = word
        } else {
          current = candidate
        }
      }
      if (current) lines.push(current)
      return [
        escpos.italic(true),
        escpos.font(1),
        ...lines.map(value => line(`  ${value}`)),
        escpos.italic(false),
        ...escpos.applyFontSize(printer.fontSize),
      ]
    }

    const view = createShiftFinancialView(summary)
    const closedAt = options.closedAt ? new Date(options.closedAt) : new Date()
    const date = closedAt.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' })
    const time = closedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    const chunks: Uint8Array[] = [escpos.init(), ...escpos.applyFontSize(printer.fontSize), escpos.align('center')]

    if (config.header?.show_logo) {
      try {
        const logo = await import('@/assets/logo/logo-black.png')
        chunks.push(await escpos.rasterImage(logo.default, Math.floor(printableDots * 2 / 3)), escpos.lineFeed(1))
      } catch { /* logo is optional */ }
    }

    chunks.push(escpos.bold(true), line(clean(header.store_name || 'Sederek Kopi')), escpos.bold(false))
    if (header.store_address) {
      const address = clean(header.store_address)
      chunks.push(line(address.slice(0, columns)))
      if (address.length > columns) chunks.push(line(address.slice(columns, columns * 2)))
    }
    chunks.push(line(''), escpos.bold(true), line('LAPORAN TUTUP SHIFT'), escpos.bold(false))
    chunks.push(line(`${date} ${time}`), line(`Kasir: ${clean(options.cashierName || '-')}`))
    chunks.push(line(divider), escpos.align('left'))

    if (!view.reconciliationComplete) {
      chunks.push(escpos.bold(true), line('DATA REKONSILIASI TIDAK LENGKAP'), escpos.bold(false))
      chunks.push(...hint('Angka dihitung ulang dari transaksi yang tersedia'), line(divider))
    }

    chunks.push(escpos.bold(true), line('RINGKASAN SHIFT'), escpos.bold(false), line(''))
    chunks.push(line(twoColumns('Modal Awal', money(view.modalAwal))), line(''))
    chunks.push(escpos.bold(true), line('PENJUALAN'), escpos.bold(false))
    chunks.push(line(twoColumns('Penjualan Tunai', money(view.cashIncome))))
    chunks.push(line(twoColumns('Penjualan QRIS', money(view.qrisIncome))))
    chunks.push(line(twoColumns('Penjualan ShopeeFood', money(view.shopeeFoodAmount))))
    chunks.push(line(twoColumns(`Potongan ShopeeFood ${view.shopeeFoodDiscountPercent}%`, `-${money(view.shopeeFoodDiscountNominal)}`)))
    chunks.push(line(twoColumns('ShopeeFood Diterima', money(view.shopeeFoodNet))))
    chunks.push(...hint('Tidak masuk dalam uang tunai'), line(''))
    chunks.push(escpos.bold(true), line('PENGELUARAN'), escpos.bold(false))
    chunks.push(line(twoColumns('Total Belanja', `-${money(view.totalExpenses)}`)), line(divider))
    chunks.push(escpos.bold(true), line(twoColumns('PENDAPATAN BERSIH', money(view.totalNetIncome))), escpos.bold(false))
    chunks.push(...hint('Tunai + QRIS + ShopeeFood diterima - belanja'))

    if (view.actualCash !== null && view.cashStatus) {
      chunks.push(line(divider), line(''))
      chunks.push(escpos.bold(true), line('PERIKSA UANG SHIFT'), escpos.bold(false), line(''))
      chunks.push(escpos.bold(true), line('KAS TUNAI'), escpos.bold(false))
      chunks.push(line(twoColumns('Seharusnya Ada', money(view.expectedCash))))
      chunks.push(...hint('Modal awal + penjualan tunai - belanja'))
      chunks.push(line(twoColumns('Hasil Hitung Kasir', money(view.actualCash))), line(divider))
      chunks.push(escpos.bold(true), line(twoColumns(view.cashStatus.label.toUpperCase(), money(view.cashStatus.amount))), escpos.bold(false))
      chunks.push(...hint(view.cashStatus.helper), line(divider), line(''))
      chunks.push(escpos.bold(true), line('KAS NON-TUNAI'), escpos.bold(false))
      chunks.push(line(twoColumns('Pembayaran QRIS', money(view.qrisIncome))))
      chunks.push(line(twoColumns('ShopeeFood Diterima', money(view.shopeeFoodNet))), line(divider))
      chunks.push(escpos.bold(true), line(twoColumns('Total Non-Tunai', money(view.totalNonCash))), escpos.bold(false))
      chunks.push(...hint('QRIS + ShopeeFood diterima'))
      chunks.push(line(divider), escpos.align('center'), line('SHIFT TELAH DITUTUP'))
    }

    if (config.footer?.show_thank_you_message && footer.footer_text) {
      chunks.push(escpos.align('center'), line(''), line(clean(footer.footer_text)))
    }
    chunks.push(escpos.lineFeed(3), escpos.cut())
    const receipt = escpos.concat(...chunks)
    for (let copy = 0; copy < Math.max(1, printer.copies || 1); copy += 1) {
      await bluetoothPrinter.printTo(printer.devicePath, receipt)
    }
    return { success: true, message: 'Laporan tutup shift berhasil dicetak' }
  } catch (error: any) {
    console.error('[CloseShiftReceipt]', error?.message || error)
    return { success: false, message: error?.message || 'Gagal mencetak laporan tutup shift' }
  }
}
