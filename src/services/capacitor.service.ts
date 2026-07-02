/**
 * Capacitor native services — thin wrappers with isNative guards.
 * All methods are safe to call on web (they return sensible defaults or no-op).
 *
 * Plugins:
 *   @capacitor/geolocation       — GPS coordinates
 *   @capacitor/device            — Device info (model, OS, UUID)
 *   @capacitor/app               — App lifecycle + back button
 *   @capacitor/camera            — Camera / photo library
 *   @capacitor/preferences       — Persistent key-value storage
 *   @capacitor/haptics           — Vibration feedback
 *   @capacitor/status-bar        — Show/hide status bar
 *   @capacitor/local-notifications — Local push notifications
 *   @capacitor/network           — Network status (used in useNetwork.ts)
 */
import { Capacitor } from '@capacitor/core'

export const isNative = Capacitor.isNativePlatform()

// ── Geolocation ───────────────────────────────────────────────────────────────

export interface GpsPosition {
  lat: number
  lng: number
  accuracy: number
}

export const geoService = {
  /** Request permission then get current GPS position. Web uses browser Geolocation. */
  async getCurrentPosition(): Promise<GpsPosition | null> {
    if (!isNative) {
      return new Promise(resolve => {
        navigator.geolocation?.getCurrentPosition(
          pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
          () => resolve(null),
        )
      })
    }
    try {
      const { Geolocation } = await import('@capacitor/geolocation')
      await Geolocation.requestPermissions()
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10_000 })
      return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }
    } catch {
      return null
    }
  },
}

// ── Device ────────────────────────────────────────────────────────────────────

export interface DeviceInfo {
  model: string
  platform: string
  osVersion: string
  uuid: string
  manufacturer: string
}

export const deviceService = {
  async getInfo(): Promise<DeviceInfo | null> {
    if (!isNative) return null
    try {
      const { Device } = await import('@capacitor/device')
      const [info, id] = await Promise.all([Device.getInfo(), Device.getId()])
      return {
        model:        info.model,
        platform:     info.platform,
        osVersion:    info.osVersion,
        manufacturer: info.manufacturer,
        uuid:         id.identifier,
      }
    } catch {
      return null
    }
  },
}

// ── App lifecycle ─────────────────────────────────────────────────────────────

export const appService = {
  /**
   * Listen for the Android hardware back button.
   * Return a cleanup function to remove the listener.
   */
  onBackButton(handler: () => void): () => void {
    if (!isNative) return () => {}
    let cleanup = () => {}
    import('@capacitor/app').then(({ App }) => {
      App.addListener('backButton', handler).then(h => { cleanup = () => h.remove() })
    })
    return () => cleanup()
  },

  /** Listen for app going to background / coming to foreground */
  onStateChange(handler: (active: boolean) => void): () => void {
    if (!isNative) return () => {}
    let cleanup = () => {}
    import('@capacitor/app').then(({ App }) => {
      App.addListener('appStateChange', state => handler(state.isActive))
        .then(h => { cleanup = () => h.remove() })
    })
    return () => cleanup()
  },

  /** Exit the app (Android only) */
  async exitApp(): Promise<void> {
    if (!isNative) return
    const { App } = await import('@capacitor/app')
    await App.exitApp()
  },
}

// ── Camera ────────────────────────────────────────────────────────────────────

export const cameraService = {
  /**
   * Take a photo or pick from gallery.
   * Returns base64 data URI or null on cancel/error.
   */
  async pickImage(source: 'camera' | 'photos' = 'camera'): Promise<string | null> {
    if (!isNative) return null
    try {
      const { Camera, CameraSource, CameraResultType } = await import('@capacitor/camera')
      const perms = await Camera.requestPermissions({ permissions: ['camera', 'photos'] })
      if (perms.camera === 'denied' && source === 'camera') return null
      const photo = await Camera.getPhoto({
        source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
        resultType: CameraResultType.DataUrl,
        quality: 85,
      })
      return photo.dataUrl ?? null
    } catch {
      return null
    }
  },
}

// ── Preferences (persistent key-value) ───────────────────────────────────────

export const prefs = {
  async get(key: string): Promise<string | null> {
    if (!isNative) return localStorage.getItem(key)
    const { Preferences } = await import('@capacitor/preferences')
    const { value } = await Preferences.get({ key })
    return value
  },

  async set(key: string, value: string): Promise<void> {
    if (!isNative) { localStorage.setItem(key, value); return }
    const { Preferences } = await import('@capacitor/preferences')
    await Preferences.set({ key, value })
  },

  async remove(key: string): Promise<void> {
    if (!isNative) { localStorage.removeItem(key); return }
    const { Preferences } = await import('@capacitor/preferences')
    await Preferences.remove({ key })
  },

  async clear(): Promise<void> {
    if (!isNative) { localStorage.clear(); return }
    const { Preferences } = await import('@capacitor/preferences')
    await Preferences.clear()
  },
}

// ── Haptics ───────────────────────────────────────────────────────────────────

export const haptics = {
  /** Short tap feedback — good for button presses */
  async tap(): Promise<void> {
    if (!isNative) return
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Light })
  },

  /** Medium vibration — confirmations / success */
  async medium(): Promise<void> {
    if (!isNative) return
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Medium })
  },

  /** Heavy vibration — errors / warnings */
  async heavy(): Promise<void> {
    if (!isNative) return
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Heavy })
  },

  /** Notification-style vibration */
  async notify(type: 'success' | 'warning' | 'error' = 'success'): Promise<void> {
    if (!isNative) return
    const { Haptics, NotificationType } = await import('@capacitor/haptics')
    const t = type === 'success' ? NotificationType.Success
            : type === 'warning' ? NotificationType.Warning
            : NotificationType.Error
    await Haptics.notification({ type: t })
  },
}

// ── Status Bar ────────────────────────────────────────────────────────────────

export const statusBar = {
  async hide(): Promise<void> {
    if (!isNative) return
    const { StatusBar } = await import('@capacitor/status-bar')
    await StatusBar.hide()
  },

  async show(): Promise<void> {
    if (!isNative) return
    const { StatusBar } = await import('@capacitor/status-bar')
    await StatusBar.show()
  },

  async setColor(hexColor: string): Promise<void> {
    if (!isNative) return
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setBackgroundColor({ color: hexColor })
    await StatusBar.setStyle({ style: Style.Dark })
  },
}

// ── Local Notifications ───────────────────────────────────────────────────────

let _notifId = 1000

export const localNotif = {
  /** Request notification permission (must call once on app start). */
  async requestPermission(): Promise<boolean> {
    if (!isNative) return false
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const { display } = await LocalNotifications.requestPermissions()
    return display === 'granted'
  },

  /**
   * Show an immediate local notification.
   * Useful for: "Pesanan baru masuk", "Stok hampir habis", dll.
   */
  async show(title: string, body: string, id?: number): Promise<void> {
    if (!isNative) return
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.schedule({
      notifications: [{
        id:    id ?? _notifId++,
        title,
        body,
        sound: undefined,
        extra: {},
      }],
    })
  },

  /**
   * Schedule a notification at a future time.
   * @param atMs  Unix timestamp (ms) when to fire
   */
  async schedule(title: string, body: string, atMs: number, id?: number): Promise<void> {
    if (!isNative) return
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.schedule({
      notifications: [{
        id:        id ?? _notifId++,
        title,
        body,
        schedule: { at: new Date(atMs) },
        extra:     {},
      }],
    })
  },

  async cancelAll(): Promise<void> {
    if (!isNative) return
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const pending = await LocalNotifications.getPending()
    if (pending.notifications.length) {
      await LocalNotifications.cancel({ notifications: pending.notifications })
    }
  },
}
