import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User, UserRole, LoginPayload } from '@/types'
import { authApi } from '@/services/api/auth.api'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token') || null)
  const refreshToken = ref<string | null>(localStorage.getItem('refreshToken') || null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isSessionExpiring = ref(false)
  const sidebarExpanded = ref<boolean>(
    JSON.parse(localStorage.getItem('sidebarExpanded') ?? 'true')
  )

  // Getters
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const userRole = computed<UserRole>(() => user.value?.role || 'kasir')
  const userName = computed(() => user.value?.full_name || user.value?.username || '')
  const userPermissions = computed<string[]>(() => user.value?.permissions || [])

  const hasPermission = (permission: string): boolean =>
    userPermissions.value.includes(permission)

  // Actions
  async function login(payload: LoginPayload) {
    isLoading.value = true
    error.value = null

    try {
      const response = await authApi.login(payload)

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Login failed')
      }

      // Set state
      user.value = response.data.user
      token.value = response.data.accessToken
      refreshToken.value = response.data.refreshToken

      // Store in localStorage
      localStorage.setItem('token', response.data.accessToken)
      localStorage.setItem('refreshToken', response.data.refreshToken)
      localStorage.setItem('user', JSON.stringify(response.data.user))

      return { success: true, user: response.data.user }
    } catch (err: any) {
      const message = err.response?.data?.error?.message || err.message || 'Login failed'
      error.value = message
      return { success: false, error: message }
    } finally {
      isLoading.value = false
    }
  }

  async function logout() {
    const rt = refreshToken.value

    // Clear state synchronously first — prevents stale session if page reloads
    // during the API call (e.g. Android appStateChange firing mid-logout)
    user.value = null
    token.value = null
    refreshToken.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')

    try {
      if (rt) await authApi.logout(rt)
    } catch {}
  }

  async function fetchCurrentUser() {
    if (!token.value) {
      return
    }

    try {
      const response = await authApi.me()
      if (response.success && response.data) {
        user.value = response.data
        localStorage.setItem('user', JSON.stringify(response.data))
      }
    } catch (err) {

      // If token is invalid, logout
      logout()
    }
  }

  async function refreshAccessToken() {
    if (!refreshToken.value) {
      return false
    }

    try {
      const response = await authApi.refresh(refreshToken.value)
      if (response.success && response.data) {
        token.value = response.data.accessToken
        localStorage.setItem('token', response.data.accessToken)
        return true
      }
      return false
    } catch (err) {

      logout()
      return false
    }
  }

  function loadUserFromStorage() {
    const storedToken = localStorage.getItem('token')
    const storedRefreshToken = localStorage.getItem('refreshToken')
    const storedUser = localStorage.getItem('user')

    if (storedToken && storedUser) {
      try {
        token.value = storedToken
        refreshToken.value = storedRefreshToken
        user.value = JSON.parse(storedUser)
      } catch {
        // Invalid stored data
        logout()
      }
    }
  }

  function toggleSidebar() {
    sidebarExpanded.value = !sidebarExpanded.value
    localStorage.setItem('sidebarExpanded', JSON.stringify(sidebarExpanded.value))
  }

  // Initialize on store creation
  loadUserFromStorage()

  return {
    // State
    user,
    token,
    refreshToken,
    isLoading,
    error,
    sidebarExpanded,

    // Getters
    isAuthenticated,
    userRole,
    userName,
    userPermissions,
    hasPermission,

    // Actions
    isSessionExpiring,
    login,
    logout,
    fetchCurrentUser,
    refreshAccessToken,
    loadUserFromStorage,
    toggleSidebar,
  }
})
