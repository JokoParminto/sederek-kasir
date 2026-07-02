<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import BaseTextField from '@/components/base/BaseTextField.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import { brand } from '@/config/brand'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { error: showError } = useToast()

const form = reactive({
  username: '',
  password: '',
})

const isLoading = ref(false)
const errorMessage = ref('')

const clearError = () => {
  errorMessage.value = ''
}

const handleLogin = async (e: Event) => {

  e.preventDefault()


  errorMessage.value = ''
  isLoading.value = true


  try {
    const result = await authStore.login({
      username: form.username,
      password: form.password,
    })


    if (result.success) {

      // Redirect to kasir immediately
      const redirect = route.query.redirect as string | undefined
      router.push(redirect || '/kasir')
    } else {

      const message = result.error || 'Login gagal'
      errorMessage.value = message
      showError(message, 7000) // Toast juga muncul

    }
  } catch (error) {

    const message = error instanceof Error ? error.message : 'Terjadi kesalahan'
    errorMessage.value = message
    showError(message, 7000)
  } finally {
    isLoading.value = false

  }
}
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <!-- Header -->
      <div class="login-header">
        <img :src="brand.logoPath" :alt="brand.name" class="logo" />
        <h1 class="title">{{ brand.name }}</h1>
        <p class="subtitle">{{ brand.tagline }}</p>
      </div>

      <!-- Body (form side in landscape) -->
      <div class="login-body">
        <!-- Error Alert -->
        <BaseAlert
          v-if="errorMessage"
          type="error"
          title="Login Failed"
          :description="errorMessage"
          :closable="true"
          @close="clearError"
        />

        <!-- Form -->
        <form class="login-form" @submit.prevent="handleLogin" autocomplete="off">
          <!-- Username -->
          <BaseTextField
            v-model="form.username"
            label="Username"
            type="text"
            placeholder="Masukkan username"
            required
            :disabled="isLoading"
            @focus="clearError"
          />

          <!-- Password -->
          <BaseTextField
            v-model="form.password"
            label="Password"
            type="password"
            placeholder="Masukkan password"
            required
            :disabled="isLoading"
            @focus="clearError"
          />

          <!-- Login Button -->
          <BaseButton
            type="submit"
            variant="primary"
            size="lg"
            :loading="isLoading"
            full-width
          >
            {{ isLoading ? 'Logging in...' : 'Login' }}
          </BaseButton>
        </form>

        <!-- Footer -->
        <div class="login-footer">
          <p class="version">{{ brand.name }} POS v{{ brand.version }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, var(--brand-bg-dark) 0%, var(--brand-primary-deep) 50%, var(--brand-primary-darker) 100%);
  padding: 1rem;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.03"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E');
    opacity: 1;
  }
}

.login-card {
  position: relative;
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.5);
  width: 100%;
  max-width: 450px;
  padding: 2.5rem 2.25rem;
}

.login-body {
  display: contents;
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.logo {
  display: block;
  width: 90px;
  height: 90px;
  object-fit: contain;
  border-radius: 50%;
  margin: 0 auto 0.75rem;
}

.title {
  font-family: var(--brand-font-heading);
  font-size: 2rem;
  font-weight: 400;
  color: var(--brand-primary-deep);
  margin-bottom: 0.25rem;
  letter-spacing: 0.06em;
}

.subtitle {
  font-family: var(--brand-font-accent);
  color: var(--brand-primary);
  font-size: 1.1rem;
  font-weight: 400;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}

.login-footer {
  text-align: center;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(123, 47, 190, 0.12);
}

.version {
  color: var(--color-text-hint);
  font-size: 0.8rem;
  font-weight: 500;
}

/* Portrait mobile */
@media (max-width: 480px) {
  .login-card {
    padding: 2rem 1.5rem;
    max-width: 100%;
  }

  .title {
    font-size: 1.3rem;
  }

  .logo {
    width: 70px;
    height: 70px;
  }

  .subtitle {
    font-size: 0.85rem;
  }

  .login-form {
    gap: 1rem;
  }
}

/* Tablet landscape — Samsung Tab A9 and similar */
@media (orientation: landscape) and (min-width: 768px) {
  .login-container {
    padding: 0.75rem;
    align-items: center;
  }

  .login-card {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    gap: 0;
    padding: 0;
    max-width: 740px;
    max-height: calc(100vh - 1.5rem);
    overflow: hidden;
  }

  .login-header {
    flex: 0 0 210px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1.5rem 1.25rem;
    margin-bottom: 0;
    border-right: 1px solid rgba(123, 47, 190, 0.1);
    background: linear-gradient(160deg, rgba(123, 47, 190, 0.05) 0%, rgba(61, 10, 79, 0.03) 100%);
    border-radius: 20px 0 0 20px;
  }

  .logo {
    width: 64px;
    height: 64px;
    margin-bottom: 0.6rem;
  }

  .title {
    font-size: 1.4rem;
    margin-bottom: 0.2rem;
  }

  .subtitle {
    font-size: 0.8rem;
  }

  .login-body {
    display: flex;
    flex-direction: column;
    justify-content: center;
    flex: 1;
    padding: 1.5rem 1.75rem;
    overflow-y: auto;
    gap: 0.75rem;
  }

  .login-form {
    gap: 0.75rem;
    margin-bottom: 0;
  }

  .login-footer {
    margin-top: 0;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(123, 47, 190, 0.12);
  }
}
</style>
