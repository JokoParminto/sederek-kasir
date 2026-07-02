import type { UserRole, Permission } from '@/types'

export const USER_ROLES: UserRole[] = ['owner', 'admin', 'kasir']

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: ['kasir', 'product', 'customer', 'laporan', 'setting'],
  admin: ['kasir', 'product', 'customer', 'laporan'],
  kasir: ['kasir', 'customer'],
}

export const PAYMENT_METHODS = ['cash', 'qris', 'transfer', 'split'] as const

export const TRANSACTION_STATUS = ['draft', 'hold', 'paid', 'cancelled'] as const

export const PROMO_STATUS = ['upcoming', 'active', 'expired'] as const

export const STOCK_WARNING_THRESHOLD = 5

export const DEFAULT_AVATAR = '👤'

export const CATEGORIES = [
  { id: 'coffee', name: 'Coffee', sortOrder: 1 },
  { id: 'non-coffee', name: 'Non Coffee', sortOrder: 2 },
  { id: 'snack', name: 'Snack', sortOrder: 3 },
]

export const DEMO_USERS = [
  {
    id: '1',
    name: 'Owner A',
    username: 'owner',
    role: 'owner' as const,
    password: 'owner123',
  },
  {
    id: '2',
    name: 'Admin B',
    username: 'admin',
    role: 'admin' as const,
    password: 'admin123',
  },
  {
    id: '3',
    name: 'Kasir C',
    username: 'kasir',
    role: 'kasir' as const,
    password: 'kasir123',
  },
]
