import apiClient from './client'
import type { LoginPayload, User } from '@/types'

export interface LoginResponse {
  success: boolean
  data: {
    user: User
    accessToken: string
    refreshToken: string
  }
  message: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: {
    code: string
    message: string
  }
}

export const authApi = {
  /**
   * Login user
   */
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', payload)
    return response.data
  },

  /**
   * Logout user
   */
  async logout(refreshToken: string): Promise<ApiResponse> {
    const response = await apiClient.post<ApiResponse>('/auth/logout', { refreshToken })
    return response.data
  },

  /**
   * Get current user profile
   */
  async me(): Promise<ApiResponse<User>> {
    const response = await apiClient.get<ApiResponse<User>>('/auth/me')
    return response.data
  },

  /**
   * Refresh access token
   */
  async refresh(refreshToken: string): Promise<{ success: boolean; data: { accessToken: string } }> {
    const response = await apiClient.post('/auth/refresh', { refreshToken })
    return response.data
  },

  /**
   * Change password
   */
  async changePassword(payload: { currentPassword: string; newPassword: string }): Promise<ApiResponse> {
    const response = await apiClient.put<ApiResponse>('/auth/change-password', payload)
    return response.data
  },

  /**
   * Register new user (admin only)
   */
  async register(payload: {
    username: string
    password: string
    full_name: string
    email?: string
    phone_number?: string
    role: 'admin' | 'manager' | 'kasir'
  }): Promise<ApiResponse<User>> {
    const response = await apiClient.post<ApiResponse<User>>('/auth/register', payload)
    return response.data
  }
}
