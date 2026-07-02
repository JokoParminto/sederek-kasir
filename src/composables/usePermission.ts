import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { Permission } from '@/types'

export function usePermission() {
  const authStore = useAuthStore()

  const hasPermission = (permission: Permission): boolean => {
    return authStore.hasPermission(permission)
  }

  const canAccessKasir = computed(() => hasPermission('kasir'))
  const canAccessProduct = computed(() => hasPermission('product'))
  const canAccessCustomer = computed(() => hasPermission('customer'))
  const canAccessLaporan = computed(() => hasPermission('laporan'))
  const canAccessSetting = computed(() => hasPermission('setting'))

  return {
    hasPermission,
    canAccessKasir,
    canAccessProduct,
    canAccessCustomer,
    canAccessLaporan,
    canAccessSetting,
  }
}
