export type UserRole = 'owner' | 'admin' | 'kasir'

export type Permission = 'kasir' | 'product' | 'customer' | 'laporan' | 'setting'

export interface User {
  id: string
  username: string
  full_name: string
  email?: string | null
  phone_number?: string | null
  role: UserRole
  status: 'active' | 'inactive'
  avatar_url?: string | null
  permissions: string[]
  last_login_at?: string | null
  created_at: string
  updated_at: string
}

export interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
}

export interface LoginPayload {
  username: string
  password: string
}

export interface LoginResponse {
  success: boolean
  data: {
    user: User
    accessToken: string
    refreshToken: string
  }
  message: string
}
