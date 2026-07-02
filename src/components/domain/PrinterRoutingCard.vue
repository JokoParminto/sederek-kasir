<script setup lang="ts">
import { ref, computed } from 'vue'
import BaseButton from '@/components/base/BaseButton.vue'
import StatusBadge from '@/components/base/StatusBadge.vue'
import BaseCard from '@/components/base/BaseCard.vue'
import DynamicPreviewPanel from '@/components/domain/DynamicPreviewPanel.vue'
import LivePreviewComponentBarista from '@/components/domain/LivePreviewComponentBarista.vue'
import { previewToBaristaConfig, previewToKitchenConfig } from '@/services/printerlayout.service'

const props = defineProps<{
  type: string
  icon: string
  title: string
  printerName: string
  status: 'connected' | 'disconnected' | 'error'
  paperSize: number | string
  autoPrint: boolean
  copies: number
  previewContent?: Record<string, any> | null
  connectionType?: string
}>()

const showPreview = ref(false)

defineEmits<{
  changePrinter: []
  editLayout: []
  delete: []
}>()

const statusVariant = (status: string): 'success' | 'danger' | 'warning' => {
  if (status === 'connected') return 'success'
  if (status === 'error') return 'warning'
  return 'danger'
}

const statusLabel = (status: string) => {
  if (status === 'connected') return 'Terhubung'
  if (status === 'error') return 'Error'
  return 'Tidak Terhubung'
}

const connectionLabel = computed(() => {
  if (!props.connectionType) return ''
  if (props.connectionType === 'network') return 'Network'
  if (props.connectionType === 'bluetooth') return 'Bluetooth'
  if (props.connectionType === 'usb') return 'USB'
  return props.connectionType
})

const baristaConfig = computed(() => previewToBaristaConfig(props.previewContent))
const kitchenConfig = computed(() => previewToKitchenConfig(props.previewContent))
</script>

<template>
  <BaseCard :padded="false" class="routing-card">
    <!-- Header -->
    <template #header>
      <div class="card-header-content">
        <div class="header-left">
          <span class="header-icon">{{ icon }}</span>
          <span class="header-title">{{ title }}</span>
        </div>
        <StatusBadge
          :status="status"
          :label="statusLabel(status)"
          :variant="statusVariant(status)"
        />
      </div>
    </template>

    <!-- Info rows -->
    <div class="card-body">
      <div class="info-row">
        <span class="info-label">Printer</span>
        <span class="info-value">{{ printerName }}</span>
      </div>
      <div v-if="connectionType" class="info-row">
        <span class="info-label">Koneksi</span>
        <span class="info-value connection-label">
          <AppIcon
            :name="connectionType === 'bluetooth' ? 'bluetooth' : connectionType === 'usb' ? 'usb' : 'wifi'"
            :size="13"
          />
          {{ connectionLabel }}
        </span>
      </div>
      <div class="info-row">
        <span class="info-label">Paper Size</span>
        <span class="info-value">{{ typeof paperSize === 'number' ? `${paperSize}mm` : paperSize }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Auto Print</span>
        <span class="info-value" :class="autoPrint ? 'value-on' : 'value-off'">
          {{ autoPrint ? 'Aktif' : 'Nonaktif' }}
        </span>
      </div>
      <div class="info-row">
        <span class="info-label">Copies</span>
        <span class="info-value">{{ copies }}</span>
      </div>
    </div>

    <!-- Preview (collapsible) -->
    <div v-if="previewContent" class="preview-section">
      <button class="preview-toggle" @click="showPreview = !showPreview">
        <span>{{ showPreview ? '▲' : '▼' }} Preview {{ type === 'barista' ? 'Tiket Barista' : type === 'kitchen' ? 'Tiket Dapur' : 'Struk' }}</span>
      </button>
      <div v-if="showPreview" class="preview-wrapper">
        <LivePreviewComponentBarista
          v-if="type === 'barista'"
          :config="baristaConfig"
          :preview-content="previewContent"
          :printer-specs="{ paper_width: typeof paperSize === 'number' ? paperSize : undefined, connection_type: connectionType ?? null }"
        />
        <LivePreviewComponentBarista
          v-else-if="type === 'kitchen'"
          :config="kitchenConfig"
          :preview-content="previewContent"
          :printer-specs="{ paper_width: typeof paperSize === 'number' ? paperSize : undefined, connection_type: connectionType ?? null }"
        />
        <DynamicPreviewPanel
          v-else
          :preview-content="previewContent"
          :printer-specs="{ paper_width: typeof paperSize === 'number' ? paperSize : undefined }"
        />
      </div>
    </div>
    <div v-else class="preview-placeholder">
      <span>Belum ada preview — klik Edit Layout untuk setup template</span>
    </div>

    <!-- Actions -->
    <template #footer>
      <div class="card-actions">
        <div class="actions-primary">
          <BaseButton variant="secondary" size="sm" :fullWidth="true" @click="$emit('changePrinter')">
            Konfigurasi
          </BaseButton>
          <BaseButton variant="primary" size="sm" :fullWidth="true" @click="$emit('editLayout')">
            Edit Layout
          </BaseButton>
        </div>
        <BaseButton variant="danger" size="sm" :fullWidth="true" @click="$emit('delete')">
          Hapus Printer
        </BaseButton>
      </div>
    </template>
  </BaseCard>
</template>

<style scoped>
.routing-card {
  transition: transform var(--transition-duration-short) var(--transition-standard),
              box-shadow var(--transition-duration-short) var(--transition-standard);
}

.routing-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-4) !important;
}

/* Header slot */
.card-header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-3);
  width: 100%;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  flex: 1;
  min-width: 0;
}

.header-icon { font-size: 1.25rem; flex-shrink: 0; }

.header-title {
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: 0.03em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Body */
.card-body {
  padding: var(--spacing-4) var(--spacing-6);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-2) 0;
  border-bottom: 1px solid var(--color-border-light);
}

.info-row:last-child { border-bottom: none; }

.info-label {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-tertiary);
  letter-spacing: 0.05em;
}

.info-value {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.value-on { color: #166534; }
.value-off { color: var(--color-text-tertiary); }

.connection-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* Preview */
.preview-section {
  border-top: 1px solid var(--color-border-light);
}

.preview-toggle {
  width: 100%;
  padding: var(--spacing-2) var(--spacing-6);
  background: var(--color-bg-secondary);
  border: none;
  cursor: pointer;
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-secondary);
  text-align: left;
  transition: background var(--transition-duration-short) var(--transition-standard);
  letter-spacing: 0.05em;
}

.preview-toggle:hover { background: var(--color-surface-2); }

.preview-wrapper {
  padding: var(--spacing-4) var(--spacing-6);
  background: var(--color-bg-secondary);
  display: flex;
  justify-content: center;
  max-height: 500px;
  overflow-y: auto;
}

.preview-placeholder {
  padding: var(--spacing-3) var(--spacing-6);
  border-top: 1px solid var(--color-border-light);
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-style: italic;
  text-align: center;
}

/* Footer actions */
.card-actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  width: 100%;
}

.actions-primary {
  display: flex;
  gap: var(--spacing-2);
}
</style>
