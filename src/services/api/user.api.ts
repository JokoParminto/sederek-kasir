import apiClient from './client'

export interface User {
  id: string
  username: string
  full_name: string
  email?: string
  phone_number?: string
  role: 'admin' | 'manager' | 'kasir'
  status: 'active' | 'inactive'
  avatar_url?: string
  created_at?: string
  updated_at?: string
}

export const userApi = {
  // List all users (admin/manager only)
  async listUsers(params?: {
    page?: number
    per_page?: number
    search?: string
    sort_by?: string
    sort_dir?: 'asc' | 'desc'
    excludeUserId?: string
  }): Promise<{ data: User[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
    try {
      const queryParams: any = {}
      if (params?.page) queryParams.page = params.page
      if (params?.per_page) queryParams.per_page = params.per_page
      if (params?.search) queryParams.search = params.search
      if (params?.sort_by) queryParams.sort_by = params.sort_by
      if (params?.sort_dir) queryParams.sort_dir = params.sort_dir
      if (params?.excludeUserId) queryParams.userId = params.excludeUserId

      const response = await apiClient.get<any>('/users', { params: queryParams })
      const paginationData = response.data.pagination || { total: 0, page: 1, limit: 10 }
      const totalPages = Math.ceil(paginationData.total / paginationData.limit) || 1

      return {
        data: response.data.data || [],
        pagination: { ...paginationData, totalPages },
      }
    } catch (error) {
      throw error
    }
  },

  // Create new user (admin only)
  async createUser(data: {
    username: string
    password: string
    full_name: string
    role: 'kasir' | 'manager' | 'admin'
    email?: string
    phone_number?: string
  }): Promise<{ data: User }> {
    try {

      const response = await apiClient.post<{ data: User }>('/users', data)
      return { data: response.data.data }
    } catch (error) {

      throw error
    }
  },

  // Update user (admin only)
  async updateUser(
    userId: string,
    data: {
      username?: string
      full_name?: string
      email?: string
      phone_number?: string
      role?: 'kasir' | 'manager' | 'admin'
      status?: 'active' | 'inactive'
    }
  ): Promise<{ data: User }> {
    try {

      const response = await apiClient.put<{ data: User }>(`/users/${userId}`, data)
      return { data: response.data.data }
    } catch (error) {

      throw error
    }
  },

  // Update user status (admin only)
  async updateUserStatus(
    userId: string,
    status: 'active' | 'inactive'
  ): Promise<{ data: User }> {
    try {

      const response = await apiClient.patch<{ data: User }>(
        `/users/${userId}/status`,
        { status }
      )
      return { data: response.data.data }
    } catch (error) {

      throw error
    }
  },

  // Reset user password (admin only)
  async resetPassword(
    userId: string,
    newPassword: string
  ): Promise<{ data: User }> {
    try {

      const response = await apiClient.patch<{ data: User }>(
        `/users/${userId}/password`,
        { new_password: newPassword }
      )
      return { data: response.data.data }
    } catch (error) {

      throw error
    }
  },

  // Get all available permissions (admin only)
  async getAllPermissions(): Promise<{
    permissions: Array<{ id: string; name: string; assigned: boolean }>
  }> {
    try {

      const response = await apiClient.get<{
        data: { permissions: Array<{ id: string; name: string; assigned: boolean }> }
      }>('/users/permissions/all')

      return response.data.data
    } catch (error) {

      throw error
    }
  },

  // Get user permissions (admin only)
  async getUserPermissions(userId: string): Promise<{
    permissions: Array<{ id: string; name: string; assigned: boolean }>
  }> {
    try {

      const response = await apiClient.get<{
        data: { permissions: Array<{ id: string; name: string; assigned: boolean }> }
      }>(`/users/${userId}/permissions`)

      return response.data.data
    } catch (error) {

      throw error
    }
  },

  // Update own profile
  async updateMyProfile(data: {
    full_name?: string
    email?: string
    phone_number?: string
    avatar_url?: string
  }): Promise<import('@/types/user').User> {
    const res = await apiClient.patch('/users/me', data)
    return res.data?.data
  },

  // Self-service password change
  async changeMyPassword(current_password: string, new_password: string): Promise<void> {
    await apiClient.patch('/users/me/password', { current_password, new_password })
  },

  async deleteUser(userId: string): Promise<void> {
    await apiClient.delete(`/users/${userId}`)
  },

  // Update user permissions (admin only)
  async updateUserPermissions(
    userId: string,
    permissionIds: string[]
  ): Promise<void> {
    try {

      await apiClient.patch(`/users/${userId}/permissions`, {
        permissionIds: permissionIds,
      })

    } catch (error) {

      throw error
    }
  },
}
