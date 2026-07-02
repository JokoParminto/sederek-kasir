<template>
  <div
    v-show="pullRefreshOffset > 0 || isRefreshing"
    class="pull-refresh-indicator"
    :class="{ 'pull-refresh-indicator--ready': pullRefreshOffset > 80, 'pull-refresh-indicator--refreshing': isRefreshing }"
    :style="{ transform: `translateY(${pullRefreshOffset}px)` }"
  >
    <div class="pull-refresh-bg"></div>
    <div class="pull-refresh-content">
      <div v-if="!isRefreshing" class="pull-icon">
        <span :style="{ transform: `rotate(${Math.min(pullRefreshOffset / 2, 180)}deg)` }">↓</span>
      </div>
      <div v-else class="refresh-spinner">
        <span class="spinner"></span>
      </div>
      <span class="pull-text">
        {{ isRefreshing ? 'Memperbarui...' : pullRefreshOffset > 80 ? 'Lepaskan untuk refresh' : 'Tarik ke bawah' }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  pullRefreshOffset: number
  isRefreshing: boolean
}

defineProps<Props>()
</script>

<style scoped>
.pull-refresh-indicator {
  position: fixed;
  top: -100px;
  left: 0;
  right: 0;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  transition: transform 0.3s ease-out;
  background: linear-gradient(180deg, rgba(123, 47, 190, 0.05) 0%, rgba(123, 47, 190, 0) 100%);
}

.pull-refresh-indicator--ready {
  background: linear-gradient(180deg, rgba(123, 47, 190, 0.15) 0%, rgba(123, 47, 190, 0.05) 100%);
}

.pull-refresh-indicator--refreshing {
  background: linear-gradient(180deg, rgba(123, 47, 190, 0.2) 0%, rgba(123, 47, 190, 0.08) 100%);
}

.pull-refresh-bg {
  position: absolute;
  inset: 0;
  background: transparent;
  transition: background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.pull-refresh-indicator--ready .pull-refresh-bg {
  background-color: rgba(123, 47, 190, 0.08);
}

.pull-refresh-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  position: relative;
  z-index: 1;
}

.pull-icon {
  font-size: 1.5rem;
  transition: transform 0.2s ease-out, color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: #9ca3af;
}

.pull-refresh-indicator--ready .pull-icon {
  color: var(--brand-primary);
}

.pull-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  letter-spacing: 0.02em;
  transition: color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.pull-refresh-indicator--ready .pull-text {
  color: var(--brand-primary);
}

.pull-refresh-indicator--refreshing .pull-text {
  color: var(--brand-primary);
}

.refresh-spinner {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(123, 47, 190, 0.2);
  border-top-color: var(--brand-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
