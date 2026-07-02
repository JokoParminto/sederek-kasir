<script setup lang="ts">
import type { AppIconName } from '@/utils/icons'

interface Props {
  icon?: AppIconName
  title: string
  description?: string
}

defineProps<Props>()
</script>

<template>
  <div class="empty-state">
    <div v-if="icon" class="empty-icon"><AppIcon :name="icon!" :size="40" /></div>
    <p class="empty-title">{{ title }}</p>
    <p v-if="description" class="empty-description">{{ description }}</p>
    <slot />
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
  color: var(--color-text-secondary);
}

.empty-icon {
  opacity: 0.6;
  display: flex;
}

.empty-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.empty-description {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin: 0;
}

@media (max-width: 768px) {
  .empty-state {
    padding: 1.5rem;
    gap: 0.75rem;
  }



  .empty-title {
    font-size: 0.85rem;
  }

  .empty-description {
    font-size: 0.75rem;
  }
}
</style>
