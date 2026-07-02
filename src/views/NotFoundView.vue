<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="not-found">
    <div class="not-found-content">
      <div class="error-code">404</div>
      <h1>Page Not Found</h1>
      <p>Halaman yang Anda cari tidak ada</p>
      <button class="btn-primary" @click="router.push('/kasir')">
        Kembali ke Kasir
      </button>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 2rem;
}

.not-found-content {
  text-align: center;
}

.error-code {
  font-size: 5rem;
  font-weight: 700;
  color: var(--color-danger);
  margin-bottom: 1rem;
}

h1 {
  font-size: 2rem;
  color: var(--color-text-primary);
  margin-bottom: 0.5rem;
}

p {
  color: var(--color-text-secondary);
  margin-bottom: 2rem;
}

.btn-primary {
  padding: 0.75rem 1.5rem;
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all 200ms ease;

  &:hover {
    background-color: var(--color-primary-dark);
    transform: translateY(-2px);
  }
}
</style>
