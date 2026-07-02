/**
 * Print dispatch — routes to Bluetooth ESC/POS or browser window.print()
 * based on the printer's connectionType.
 *
 * Usage:
 *   import { printDispatch } from '@/services/print-dispatch.service'
 *   await printDispatch.receipt(html, printer)         // HTML → browser or BT
 *   await printDispatch.escpos(bytes, printer)          // raw ESC/POS → BT
 */
import { bluetoothPrinter, escpos } from './bluetooth-printer.service'
import type { UiPrinter } from './printer.service'

// ── Browser print ─────────────────────────────────────────────────────────────

function browserPrint(html: string): void {
  const w = window.open('', '_blank', 'width=320,height=520,toolbar=0,menubar=0')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => { w.print(); w.close() }, 350)
}

// ── Simple HTML → ESC/POS text converter ─────────────────────────────────────
// Strips tags, preserves newlines, pads to 32 chars per line (58mm printer)

function htmlToEscpos(html: string, paperWidth = 58): Uint8Array {
  const cols = paperWidth >= 80 ? 48 : 32

  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|tr|h[1-6]|li)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  const lines = text.split('\n').map(l => l.slice(0, cols))

  const chunks: Uint8Array[] = [
    escpos.init(),
    escpos.align('left'),
    ...lines.map(l => escpos.textLine(l)),
    escpos.lineFeed(4),
    escpos.cut(),
  ]
  return escpos.concat(...chunks)
}

// ── Public API ────────────────────────────────────────────────────────────────

export const printDispatch = {
  /**
   * Print an HTML receipt.
   * - Bluetooth printer: converts to ESC/POS text and sends via BT.
   * - Other: opens browser print dialog.
   */
  async receipt(html: string, printer?: UiPrinter | null): Promise<void> {
    if (printer?.connectionType === 'bluetooth' && printer.devicePath && bluetoothPrinter.isAvailable) {
      const connected = await bluetoothPrinter.isConnected()
      if (!connected) {
        await bluetoothPrinter.connect(printer.devicePath)
      }
      const bytes = htmlToEscpos(html, printer.paperSize ?? 58)
      await bluetoothPrinter.printRaw(bytes)
    } else {
      browserPrint(html)
    }
  },

  /**
   * Send raw ESC/POS bytes directly to a Bluetooth printer.
   * Falls back to no-op on web (can't send raw bytes to browser).
   */
  async escpos(bytes: Uint8Array, printer?: UiPrinter | null): Promise<void> {
    if (!bluetoothPrinter.isAvailable) return
    if (printer?.connectionType === 'bluetooth' && printer.devicePath) {
      const connected = await bluetoothPrinter.isConnected()
      if (!connected) await bluetoothPrinter.connect(printer.devicePath)
      await bluetoothPrinter.printRaw(bytes)
    }
  },

  /** Connect to a Bluetooth printer and keep connection open for session */
  async connectBluetooth(printer: UiPrinter): Promise<string> {
    if (!printer.devicePath) throw new Error('MAC address tidak diset di konfigurasi printer')
    const { name } = await bluetoothPrinter.connect(printer.devicePath)
    return name
  },

  async disconnectBluetooth(): Promise<void> {
    await bluetoothPrinter.disconnect()
  },

  get isBluetoothAvailable() {
    return bluetoothPrinter.isAvailable
  },
}
