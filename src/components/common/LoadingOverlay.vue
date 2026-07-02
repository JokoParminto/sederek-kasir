<script setup lang="ts">
interface Props {
  text?: string
}

defineProps<Props>()
</script>

<template>
  <div class="loading-overlay">
    <div class="spinner"></div>
    <p class="loading-text">{{ text || 'Loading...' }}</p>
  </div>
</template>

<style scoped>
.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  z-index: 20;
  gap: 0.8rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(123, 47, 190, 0.2);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  font-size: 0.9rem;
  color: var(--color-text-primary);
  font-weight: 500;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
