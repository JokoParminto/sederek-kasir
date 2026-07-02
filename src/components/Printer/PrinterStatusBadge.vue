<script setup lang="ts">
interface Props {
  status: 'active' | 'inactive' | 'offline'
}

defineProps<Props>()

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'badge-active'
    case 'inactive':
      return 'badge-inactive'
    case 'offline':
      return 'badge-offline'
    default:
      return 'badge-inactive'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active':
      return '🟢 Aktif'
    case 'inactive':
      return '⚪ Nonaktif'
    case 'offline':
      return '🔴 Offline'
    default:
      return status
  }
}
</script>

<template>
  <div :class="['status-badge', getStatusColor(status)]">
    {{ getStatusLabel(status) }}
  </div>
</template>

<style scoped>
.status-badge {
  display: inline-block;
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.badge-active {
  background: rgba(34, 197, 94, 0.15);
  color: #166534;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.badge-inactive {
  background: rgba(107, 114, 128, 0.15);
  color: #374151;
  border: 1px solid rgba(107, 114, 128, 0.3);
}

.badge-offline {
  background: rgba(239, 68, 68, 0.15);
  color: #991b1b;
  border: 1px solid rgba(239, 68, 68, 0.3);
}
</style>
