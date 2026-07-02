import { ref, onUnmounted } from 'vue'

export interface PullToRefreshOptions {
  threshold?: number
  cooldown?: number
  onRefresh: () => Promise<void>
}

// Helper to find the nearest scrollable parent
const findScrollableParent = (element: HTMLElement | null): HTMLElement | null => {
  if (!element) return null

  const parent = element.parentElement
  if (!parent) return null

  const overflowY = window.getComputedStyle(parent).overflowY
  if (overflowY === 'auto' || overflowY === 'scroll') {
    return parent
  }

  return findScrollableParent(parent)
}

export function usePullToRefresh(options: PullToRefreshOptions) {
  const { threshold = 80, cooldown = 3000, onRefresh } = options

  const pullRefreshOffset = ref(0)
  const isRefreshing = ref(false)
  const pullStartY = ref(0)
  const canPullRefresh = ref(true)
  let lastRefreshTime = 0
  let mounted = true

  onUnmounted(() => {
    mounted = false
  })

  const getScrollTop = () =>
    window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0

  const handleTouchStart = (e: TouchEvent) => {
    // Check if we're at the top of the window
    if (getScrollTop() !== 0 || e.touches.length === 0) {
      canPullRefresh.value = false
      return
    }

    // Check if touch started on a scrollable element
    const target = e.target as HTMLElement
    const scrollableParent = findScrollableParent(target)

    if (scrollableParent && scrollableParent.scrollTop > 0) {
      // User is scrolling within a scrollable container that's not at the top
      canPullRefresh.value = false
      return
    }

    pullStartY.value = e.touches[0]!.clientY
    canPullRefresh.value = true
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (!canPullRefresh.value || isRefreshing.value || e.touches.length === 0) return

    const currentY = e.touches[0]!.clientY
    const diff = currentY - pullStartY.value

    // Only pull-to-refresh if pulling down AND at the top of the page
    if (diff > 0 && getScrollTop() === 0) {
      // Double-check: if there's a scrollable parent, ensure it's at the top
      const target = e.target as HTMLElement
      const scrollableParent = findScrollableParent(target)

      if (scrollableParent && scrollableParent.scrollTop > 0) {
        // User scrolled within a nested container - cancel pull-to-refresh
        canPullRefresh.value = false
        pullRefreshOffset.value = 0
        return
      }

      pullRefreshOffset.value = Math.min(diff, 120)
    }
  }

  const handleTouchEnd = async () => {
    const now = Date.now()
    const timeSinceLastRefresh = now - lastRefreshTime

    if (pullRefreshOffset.value > threshold && !isRefreshing.value && timeSinceLastRefresh > cooldown) {
      isRefreshing.value = true
      lastRefreshTime = now
      try {
        await onRefresh()
      } catch (error) {
        throw error
      } finally {
        if (mounted) {
          isRefreshing.value = false
          pullRefreshOffset.value = 0
        }
      }
      return
    }

    pullRefreshOffset.value = 0
  }

  return {
    pullRefreshOffset,
    isRefreshing,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  }
}
