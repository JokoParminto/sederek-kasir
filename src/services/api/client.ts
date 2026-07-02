import axios from 'axios'
import type { AxiosInstance, AxiosError } from 'axios'
import router from '@/router'
import { useAuthStore } from '@/stores/auth'

const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true', // Required for ngrok free tier
  },
})

// Request interceptor for auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // Prevent Android WebView from serving stale cached responses
    if (config.method === 'get' || !config.method) {
      config.headers['Cache-Control'] = 'no-cache'
      config.headers['Pragma'] = 'no-cache'
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
let isSessionExpiring = false

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle 401 Unauthorized — guard against multiple simultaneous 401s
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes('/auth/login') &&
      !isSessionExpiring
    ) {
      isSessionExpiring = true
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      // Show session-expired overlay then redirect
      try {
        const authStore = useAuthStore()
        authStore.isSessionExpiring = true
      } catch {}
      setTimeout(() => {
        router.push('/login').finally(() => {
          isSessionExpiring = false
          try { useAuthStore().isSessionExpiring = false } catch {}
        })
      }, 1500)
    }

    return Promise.reject(error)
  }
)

export default apiClient
