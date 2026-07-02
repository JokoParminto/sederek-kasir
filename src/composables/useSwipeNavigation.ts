import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

interface SwipeOptions {
  minDistance?: number // minimum distance to trigger swipe
  maxTime?: number // maximum time for swipe gesture
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
}

export const useSwipeNavigation = (options: SwipeOptions = {}) => {
  const router = useRouter()
  const {
    minDistance = 50,
    maxTime = 500,
    onSwipeLeft = () => router.back(),
    onSwipeRight
  } = options

  const touchStartX = ref(0)
  const touchStartTime = ref(0)

  const handleTouchStart = (event: TouchEvent) => {
    if (event.touches[0]) {
      touchStartX.value = event.touches[0].clientX
      touchStartTime.value = Date.now()
    }
  }

  const handleTouchEnd = (event: TouchEvent) => {
    if (!event.changedTouches[0]) return

    const touchEndX = event.changedTouches[0].clientX
    const touchEndTime = Date.now()
    const distance = touchStartX.value - touchEndX
    const time = touchEndTime - touchStartTime.value

    // Check if swipe is valid (distance > minDistance and time < maxTime)
    if (Math.abs(distance) > minDistance && time < maxTime) {
      if (distance > 0) {
        // Swipe left - go back
        onSwipeLeft()
      } else if (distance < 0 && onSwipeRight) {
        // Swipe right - custom handler
        onSwipeRight()
      }
    }
  }

  onMounted(() => {
    document.addEventListener('touchstart', handleTouchStart, false)
    document.addEventListener('touchend', handleTouchEnd, false)
  })

  onUnmounted(() => {
    document.removeEventListener('touchstart', handleTouchStart)
    document.removeEventListener('touchend', handleTouchEnd)
  })

  return {
    handleTouchStart,
    handleTouchEnd,
    touchStartX,
    touchStartTime
  }
}
