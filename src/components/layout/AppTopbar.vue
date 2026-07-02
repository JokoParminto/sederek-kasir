<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePermission } from '@/composables/usePermission'
import { brand } from '@/config/brand'

const router = useRouter()
const authStore = useAuthStore()
const { hasPermission } = usePermission()
const isLoggingOut = ref(false)

const handleLogout = async () => {
  if (isLoggingOut.value) return
  isLoggingOut.value = true
  try {
    await authStore.logout()
  } finally {
    isLoggingOut.value = false
    router.push({ name: 'Login' })
  }
}
</script>

<template>
  <header class="topbar">
    <div class="topbar-container">
      <!-- Logo -->
      <div class="topbar-logo">
        <img :src="brand.logoPath" :alt="brand.name" class="logo-image" />
        <span class="logo-text">{{ brand.name }}</span>
      </div>



      <!-- User Info -->
      <div class="topbar-user">
        <div class="user-info">
          <div class="user-name">{{ authStore.userName }}</div>
          <div class="user-role">
            {{ authStore.userRole === 'owner' ? 'Owner' : authStore.userRole === 'admin' ? 'Administrator' : 'Kasir' }}
          </div>
        </div>
        <button class="logout-btn" @click="handleLogout" :disabled="isLoggingOut">
          <AppIcon v-if="isLoggingOut" name="loader" :size="13" :spin="true" />
          {{ isLoggingOut ? 'Logging out...' : 'Logout' }}
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--spacing-topbar);
  background: var(--brand-bg-dark);
  border-bottom: 1px solid rgba(123, 47, 190, 0.3);
  display: flex;
  align-items: center;
  padding: 0 1.5rem;
  z-index: 1000;
  box-shadow: 0 4px 20px rgba(61, 10, 79, 0.4), 0 1px 3px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.topbar-container {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  min-width: 0;
}

.topbar-logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  min-width: 0;
}

.logo-image {
  height: 36px;
  width: 36px;
  object-fit: contain;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(123, 47, 190, 0.5);
}

.logo-icon {
  font-size: 1.3rem;
  text-shadow: 0 2px 8px rgba(123, 47, 190, 0.3);
}

.logo-text {
  font-family: var(--brand-font-heading);
  font-size: 1.3rem;
  font-weight: 400;
  color: var(--brand-cream);
  letter-spacing: 0.05em;
}


.topbar-user {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
  padding-left: 1rem;
  min-width: 0;
  white-space: nowrap;
}

.user-info {
  text-align: right;
}

.user-name {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--brand-cream);
  letter-spacing: -0.01em;
}

.user-role {
  font-size: 0.65rem;
  color: rgba(245, 230, 200, 0.55);
  font-weight: 400;
  letter-spacing: 0.01em;
}

.logout-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.85rem;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.7rem;
  cursor: pointer;
  transition: transform 0.18s ease, background-color 0.15s ease, box-shadow 0.15s ease;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2);
  letter-spacing: 0.02em;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;

  @media (hover: hover) {
    &:hover {
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    }
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.7;
    cursor: wait;
    transform: none;
    pointer-events: none;
  }
}

/* Responsive - Tablet (1024px-1279px) */
@media (max-width: 1279px) {
  .topbar {
    padding: 0 0.8rem;
  }

  .topbar-container {
    gap: 0.6rem;
  }

  .logo-text {
    font-size: 0.85rem;
  }

  .user-name {
    font-size: 0.7rem;
  }

  .user-role {
    font-size: 0.6rem;
  }

  .logout-btn {
    padding: 0.35rem 0.65rem;
    font-size: 0.65rem;
    white-space: nowrap;
  }
}

/* Responsive - Mobile (<640px) */
@media (max-width: 639px) {
  .topbar {
    padding: 0 0.6rem;
  }

  .topbar-container {
    gap: 0.4rem;
  }

  .topbar-logo {
    min-width: 32px;
    width: 32px;
  }

  .logo-image {
    height: 28px;
    width: 28px;
  }

  .logo-text {
    display: none;
  }

  .topbar-user {
    display: none;
  }

  .logout-btn {
    padding: 0.35rem 0.5rem;
    font-size: 0.6rem;
    min-width: 48px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
