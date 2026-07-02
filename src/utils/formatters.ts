import { format } from 'date-fns'

export function formatCurrency(amount: number, currency: string = 'IDR'): string {
  if (!Number.isFinite(amount)) return '0'

  const formatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

  return formatter.format(amount)
}

export function formatRupiah(amount: number): string {
  if (!Number.isFinite(amount)) return 'Rp 0'

  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`
}

export function formatNumber(num: number, digits: number = 0): string {
  if (!Number.isFinite(num)) return '0'

  return num.toLocaleString('id-ID', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function formatDate(date: Date | string, dateFormat: string = 'dd MMM yyyy'): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    return format(d, dateFormat)
  } catch {
    return '-'
  }
}

export function formatDateTime(date: Date | string, dateFormat: string = 'dd MMM yyyy HH:mm'): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    return format(d, dateFormat)
  } catch {
    return '-'
  }
}

export function formatTime(date: Date | string, timeFormat: string = 'HH:mm'): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    return format(d, timeFormat)
  } catch {
    return '-'
  }
}

export function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '')

  // Handle Indonesian phone numbers
  if (cleaned.startsWith('62')) {
    return `+${cleaned}`
  } else if (cleaned.startsWith('0')) {
    return `+62${cleaned.slice(1)}`
  }

  return cleaned
}

export function truncate(text: string, length: number = 50): string {
  if (text.length <= length) return text
  return `${text.slice(0, length)}...`
}

export function percentageFormat(percentage: number): string {
  return `${Math.round(percentage)}%`
}

export function formatDiscount(discount: { type: 'percentage' | 'amount'; value: number }): string {
  if (discount.type === 'percentage') {
    return `${discount.value}%`
  } else {
    return `Rp ${Math.round(discount.value).toLocaleString('id-ID')}`
  }
}

const TZ = 'Asia/Jakarta'

// DB session tz = Asia/Jakarta → TIMESTAMP WITHOUT TIME ZONE stores WIB values.
// Strings from BE have no timezone suffix — append +07:00 so JS treats them
// as WIB. Intl.DateTimeFormat with Asia/Jakarta then displays correctly.
export function parseWIB(str: string | null | undefined): Date | undefined {
  if (!str) return undefined
  const s = str.trim().replace(' ', 'T')
  if (s.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(s)) return new Date(s)
  return new Date(s + '+07:00')
}

export function formatTimeJakarta(date: Date | string): string {
  try {
    const d = typeof date === 'string' ? (parseWIB(date) ?? new Date(date)) : date
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: TZ,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d)
  } catch {
    return '-'
  }
}

export function formatDateJakarta(date: Date | string): string {
  try {
    const d = typeof date === 'string' ? (parseWIB(date) ?? new Date(date)) : date
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: TZ,
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(d)
  } catch {
    return '-'
  }
}

export function formatDateTimeJakarta(date: Date | string): string {
  try {
    const d = typeof date === 'string' ? (parseWIB(date) ?? new Date(date)) : date
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: TZ,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d)
  } catch {
    return '-'
  }
}
