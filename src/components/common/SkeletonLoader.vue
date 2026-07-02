<script setup lang="ts">
interface Props {
  count?: number
}

const props = defineProps<Props>()
const items = Array.from({ length: props.count ?? 8 })
</script>

<template>
  <div class="skeleton-grid">
    <div v-for="(_, index) in items" :key="index" class="skeleton-card">
      <div class="skeleton-image"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
    </div>
  </div>
</template>

<style scoped>
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-2);
  padding: var(--spacing-3);
}

.skeleton-card {
  background: rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  padding: 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.04);
}

.skeleton-image {
  height: 80px;
  border-radius: 10px;
  background: linear-gradient(90deg, rgba(229, 231, 235, 0.6) 25%, rgba(243, 244, 246, 0.9) 50%, rgba(229, 231, 235, 0.6) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.2s ease-in-out infinite;
}

.skeleton-line {
  height: 10px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(229, 231, 235, 0.6) 25%, rgba(243, 244, 246, 0.9) 50%, rgba(229, 231, 235, 0.6) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.2s ease-in-out infinite;
}

.skeleton-line.short {
  width: 60%;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@media (max-width: 1023px) {
  .skeleton-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 767px) {
  .skeleton-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
