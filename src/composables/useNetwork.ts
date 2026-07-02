/**
 * Network status composable.
 * - Native Android: uses @capacitor/network (more reliable than browser events)
 * - Web: falls back to VueUse useOnline (navigator.onLine)
 */
import { ref, watch, onUnmounted } from 'vue'
import { Capacitor } from '@capacitor/core'
import { useOnline } from '@vueuse/core'
import { offlineQueue } from '@/services/offlineQueue'
import { useToast } from '@/composables/useToast'

const isNative = Capacitor.isNativePlatform()

const pendingCount = ref(0)

async function refreshPendingCount() {
  pendingCount.value = await offlineQueue.count()
}

async function cacheForOffline() {
  if (!isNative) return
  try {
    const { offlineDb } = await import('@/services/offline-db.service')
    const { useProductStore } = await import('@/stores/product')
    const { useCustomerStore } = await import('@/stores/customer')
    const productStore  = useProductStore()
    const customerStore = useCustomerStore()
    if (productStore.products.length)  await offlineDb.products.cache(productStore.products)
    if (customerStore.customers.length) await offlineDb.customers.cache(customerStore.customers)
  } catch { /* non-fatal */ }
}

async function onBackOnline(toast: ReturnType<typeof useToast>) {
  await refreshPendingCount()
  if (pendingCount.value > 0) {
    toast.success(`Internet terhubung kembali. Menyinkronkan ${pendingCount.value} transaksi...`)
    await offlineQueue.flush()
    await refreshPendingCount()
  } else {
    toast.success('Internet terhubung kembali')
  }
  await cacheForOffline()
}

export function useNetwork() {
  const toast = useToast()
  const isOnline = ref(true)

  if (isNative) {
    // ── Native: use @capacitor/network ────────────────────────────────────
    // Store handle BEFORE .then() so onUnmounted (registered synchronously) can clean it up
    let networkHandle: Promise<{ remove(): void }> | null = null

    onUnmounted(() => {
      networkHandle?.then(h => h.remove())
    })

    networkHandle = import('@capacitor/network').then(({ Network }) => {
      Network.getStatus().then(status => {
        isOnline.value = status.connected
      })

      return Network.addListener('networkStatusChange', async status => {
        const wasOffline = !isOnline.value
        isOnline.value = status.connected
        if (status.connected && wasOffline) {
          await onBackOnline(toast)
        } else if (!status.connected) {
          toast.warning('Koneksi terputus. Mode offline aktif — transaksi akan disimpan lokal.')
        }
      })
    })
  } else {
    // ── Web: fallback to VueUse ───────────────────────────────────────────
    const browserOnline = useOnline()
    isOnline.value = browserOnline.value

    const stop = watch(browserOnline, async (online) => {
      isOnline.value = online
      if (online) {
        await onBackOnline(toast)
      } else {
        toast.warning('Koneksi terputus. Mode offline aktif — transaksi akan disimpan lokal.')
      }
    })

    onUnmounted(() => stop())
  }

  return { isOnline, pendingCount, refreshPendingCount }
}
