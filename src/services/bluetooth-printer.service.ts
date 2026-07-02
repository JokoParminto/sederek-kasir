import { Capacitor, registerPlugin } from '@capacitor/core'

// ── Plugin Interface ──────────────────────────────────────────────────────────

interface BTDevice {
  name: string
  address: string
}

interface BluetoothPrinterPlugin {
  getPairedDevices(): Promise<{ devices: BTDevice[] }>
  connect(options: { address: string }): Promise<{ connected: boolean; name: string }>
  disconnect(): Promise<void>
  isConnected(): Promise<{ connected: boolean }>
  print(options: { data: string }): Promise<void>
}

const BTPlugin = registerPlugin<BluetoothPrinterPlugin>('BluetoothPrinter')

// ── Exports ───────────────────────────────────────────────────────────────────

export type { BTDevice }

export const isNative = Capacitor.isNativePlatform()

// Track which MAC address is currently connected — prevents wrong-printer bug
// when two BT printers are configured (e.g. barista ticket + customer receipt)
let _connectedAddress: string | null = null

export const bluetoothPrinter = {
  /** True only on Android/iOS native app */
  isAvailable: isNative,

  /** List Bluetooth devices already paired in Android settings */
  async getPairedDevices(): Promise<BTDevice[]> {
    if (!isNative) return []
    const { devices } = await BTPlugin.getPairedDevices()
    return devices
  },

  /** Connect to a device by MAC address */
  async connect(address: string): Promise<{ name: string }> {
    if (!isNative) throw new Error('Bluetooth hanya tersedia di app Android')
    const result = await BTPlugin.connect({ address })
    _connectedAddress = address
    return result
  },

  /** Disconnect current printer */
  async disconnect(): Promise<void> {
    if (!isNative) return
    await BTPlugin.disconnect()
    _connectedAddress = null
  },

  /** Check if currently connected (to any device) */
  async isConnected(): Promise<boolean> {
    if (!isNative) return false
    const { connected } = await BTPlugin.isConnected()
    if (!connected) _connectedAddress = null
    return connected
  },

  /** Check if currently connected to the specific MAC address */
  async isConnectedTo(address: string): Promise<boolean> {
    if (!isNative) return false
    const { connected } = await BTPlugin.isConnected()
    if (!connected) { _connectedAddress = null; return false }
    return _connectedAddress === address
  },

  /**
   * Send raw ESC/POS bytes to the printer.
   * Pass a Uint8Array built by your ESC/POS encoder.
   */
  async printRaw(bytes: Uint8Array): Promise<void> {
    if (!isNative) throw new Error('Bluetooth hanya tersedia di app Android')
    const b64 = btoa(String.fromCharCode(...bytes))
    await BTPlugin.print({ data: b64 })
  },
}

// ── ESC/POS Helpers ───────────────────────────────────────────────────────────
// Minimal encoder for thermal receipt printers (58mm / 80mm)

const ESC = 0x1b
const GS  = 0x1d

export const escpos = {
  init:        () => new Uint8Array([ESC, 0x40]),
  lineFeed:    (n = 1) => new Uint8Array([ESC, 0x64, n]),
  cut:         () => new Uint8Array([GS, 0x56, 0x41, 0x03]),
  bold:        (on: boolean) => new Uint8Array([ESC, 0x45, on ? 1 : 0]),
  align:       (a: 'left' | 'center' | 'right') =>
    new Uint8Array([ESC, 0x61, a === 'left' ? 0 : a === 'center' ? 1 : 2]),
  /** ESC M n — select font: 0=Font A (12×24, default), 1=Font B (9×17, smaller) */
  font:        (type: 0 | 1) => new Uint8Array([ESC, 0x4D, type]),
  /**
   * GS ! n — character size multiplier.
   * High nibble = width multiplier (0=1×…7=8×), low nibble = height multiplier.
   * e.g. 0x00 = 1×1 (normal), 0x11 = 2×2, 0x10 = 2× width only, 0x01 = 2× height only.
   */
  charSize:    (n: number) => new Uint8Array([GS, 0x21, n & 0xFF]),
  /**
   * Apply font_size (points) from printer config to ESC/POS commands.
   * Returns array of Uint8Array chunks to prepend to print data.
   *   ≤10  → Font B (compact 9×17)
   *   11–13 → Font A normal (default, no size cmd needed)
   *   ≥14  → Font A + GS ! 0x01 (double height)
   *   ≥16  → Font A + GS ! 0x11 (double width+height)
   */
  applyFontSize(fontSize: number): Uint8Array[] {
    if (fontSize <= 10) return [this.font(1)]
    if (fontSize >= 16) return [this.font(0), this.charSize(0x11)]
    if (fontSize >= 14) return [this.font(0), this.charSize(0x01)]
    // 11–13: normal — reset to default
    return [this.font(0), this.charSize(0x00)]
  },
  textLine:    (text: string) => {
    const enc = new TextEncoder()
    const bytes = enc.encode(text + '\n')
    return bytes
  },
  concat:      (...chunks: Uint8Array[]) => {
    const total = chunks.reduce((n, c) => n + c.length, 0)
    const out = new Uint8Array(total)
    let offset = 0
    for (const c of chunks) { out.set(c, offset); offset += c.length }
    return out
  },

  /**
   * Convert an image to ESC/POS raster bytes (GS v 0) using Floyd-Steinberg dithering.
   * @param src     Image src (imported asset path, URL, or data URL)
   * @param maxDots Max width in printer dots. For 58mm @ 203 DPI printable ≈ 384 dots.
   */
  async rasterImage(src: string, maxDots = 200): Promise<Uint8Array> {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Logo gagal dimuat'))
      el.src = src
    })

    // Scale proportionally to maxDots wide, keep aspect ratio
    const scale = Math.min(1, maxDots / img.naturalWidth)
    const w = Math.floor(img.naturalWidth * scale)
    const h = Math.floor(img.naturalHeight * scale)

    // Draw to canvas with white background (for PNG transparency)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)
    const { data } = ctx.getImageData(0, 0, w, h)

    // Build grayscale buffer; transparent pixels → white
    const gray = new Float32Array(w * h)
    for (let i = 0; i < w * h; i++) {
      const p = i * 4
      gray[i] = data[p + 3]! < 128
        ? 255
        : data[p]! * 0.299 + data[p + 1]! * 0.587 + data[p + 2]! * 0.114
    }

    // Contrast stretch: bilinear downscaling blurs edges into gray (80-200 range).
    // Stretch [90, 210] → [0, 255] so blur-zone snaps toward black or white before dithering.
    for (let i = 0; i < gray.length; i++) {
      gray[i] = Math.max(0, Math.min(255, (gray[i]! - 90) * 255 / 120))
    }

    // Floyd-Steinberg dithering — distributes quantisation error to neighbours
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x
        const old = gray[idx]!
        const q   = old < 128 ? 0 : 255
        gray[idx] = q
        const err = old - q
        if (x + 1 < w)            gray[idx + 1]     = (gray[idx + 1]     ?? 0) + err * 7 / 16
        if (y + 1 < h) {
          if (x > 0)               gray[idx + w - 1] = (gray[idx + w - 1] ?? 0) + err * 3 / 16
                                   gray[idx + w]     = (gray[idx + w]     ?? 0) + err * 5 / 16
          if (x + 1 < w)          gray[idx + w + 1] = (gray[idx + w + 1] ?? 0) + err * 1 / 16
        }
      }
    }

    // Pack bits: 1 byte = 8 horizontal dots, MSB = leftmost dot, dark=1
    const bytesPerRow = Math.ceil(w / 8)
    const bitmap = new Uint8Array(bytesPerRow * h)
    for (let y = 0; y < h; y++) {
      for (let bx = 0; bx < bytesPerRow; bx++) {
        let byte = 0
        for (let bit = 0; bit < 8; bit++) {
          const x = bx * 8 + bit
          if (x < w && (gray[y * w + x] ?? 255) < 128) byte |= (0x80 >> bit)
        }
        bitmap[y * bytesPerRow + bx] = byte
      }
    }

    // ESC/POS GS v 0: [1D 76 30 00] xL xH yL yH <bitmap>
    const xL = bytesPerRow & 0xFF, xH = (bytesPerRow >> 8) & 0xFF
    const yL = h & 0xFF,           yH = (h >> 8) & 0xFF
    const header = new Uint8Array([GS, 0x76, 0x30, 0x00, xL, xH, yL, yH])
    const out = new Uint8Array(header.length + bitmap.length)
    out.set(header)
    out.set(bitmap, header.length)
    return out
  },
}
