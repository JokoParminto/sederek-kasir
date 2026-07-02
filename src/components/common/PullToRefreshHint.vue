<script setup lang="ts">
import { ref, onMounted } from 'vue'

const showHint = ref(false)

onMounted(() => {
  // Check if user has seen the hint before
  const hasSeenHint = localStorage.getItem('pullToRefreshHintSeen')
  
  if (!hasSeenHint) {
    // Show hint after a short delay
    setTimeout(() => {
      showHint.value = true
    }, 500)

    // Hide hint after 4 seconds
    setTimeout(() => {
      showHint.value = false
      // Mark as seen
      localStorage.setItem('pullToRefreshHintSeen', 'true')
    }, 4500)
  }
})

const dismissHint = () => {
  showHint.value = false
  localStorage.setItem('pullToRefreshHintSeen', 'true')
}
</script>

<template>
  <Transition name="hint-fade">
    <div v-if="showHint" class="pull-refresh-hint">
      <div class="hint-content">
        <div class="hint-icon">👇</div>
        <div class="hint-text">
          <p class="hint-title">Tarik untuk refresh!</p>
          <p class="hint-description">Tarik ke bawah untuk memperbarui data</p>
        </div>
        <button class="hint-close" @click="dismissHint"><AppIcon name="x" :size="16" /></button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.pull-refresh-hint {
  position: fixed;
  top: var(--spacing-topbar);
  left: var(--spacing-4);
  right: var(--spacing-4);
  z-index: 500;
  animation: slideDown 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.hint-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3) var(--spacing-4);
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  color: white;
  border-radius: var(--radius-lg);
  box-shadow: 0 4px 12px rgba(123, 47, 190, 0.3);
}

.hint-icon {
  font-size: 1.5rem;
  animation: bounce 1s ease-in-out infinite;
  flex-shrink: 0;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(6px);
  }
}

.hint-text {
  flex: 1;
}

.hint-title {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: 700;
  line-height: 1.2;
}

.hint-description {
  margin: 0.25rem 0 0 0;
  font-size: 0.75rem;
  opacity: 0.9;
  line-height: 1.2;
}

.hint-close {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  min-height: 28px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  font-size: 1rem;
  flex-shrink: 0;
  transition: all var(--transition-duration-short) var(--transition-standard);

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .pull-refresh-hint {
    left: var(--spacing-2);
    right: var(--spacing-2);
  }

  .hint-content {
    padding: var(--spacing-2) var(--spacing-3);
    gap: var(--spacing-2);
  }

  .hint-icon {
    font-size: 1.2rem;
  }

  .hint-close {
    min-width: 24px;
    min-height: 24px;
    font-size: 0.9rem;
  }
}

/* Fade Transition */
.hint-fade-enter-active,
.hint-fade-leave-active {
  transition: opacity var(--transition-duration-medium) var(--transition-standard),
              transform var(--transition-duration-medium) var(--transition-standard);
}

.hint-fade-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.hint-fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
