<script setup lang="ts">
import { ref } from 'vue'

interface Printer {
  id: string
  name: string
  status: 'connected' | 'disconnected' | 'error'
  paperSize: string
}

interface Routing {
  type: string
  icon: string
  title: string
  templateName: string
  printer: Printer
  autoPrint: boolean
  copies: number
}

interface Props {
  routing: Routing
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'edit-layout': [routing: Routing]
  'change-printer': [routing: Routing]
  'update-auto-print': [routing: Routing, value: boolean]
  'update-copies': [routing: Routing, value: number]
}>()

// Local refs
const localAutoPrint = ref(props.routing.autoPrint)
const localCopies = ref(props.routing.copies)

// Methods
const handleEditLayout = () => {
  emit('edit-layout', props.routing)
}

const handleChangePrinter = () => {
  emit('change-printer', props.routing)
}

const handleAutoPrintChange = (e: Event) => {
  const value = (e.target as HTMLInputElement).checked
  localAutoPrint.value = value
  emit('update-auto-print', props.routing, value)
}

const handleCopiesChange = (e: Event) => {
  const value = parseInt((e.target as HTMLInputElement).value) || 1
  localCopies.value = Math.max(1, Math.min(99, value))
  emit('update-copies', props.routing, localCopies.value)
}

const getStatusBadge = (status: string) => {
  return status === 'connected' ? '🟢' : status === 'disconnected' ? '🔴' : '🟡'
}
</script>

<template>
  <div class="routing-card">
    <!-- Card Header -->
    <div class="card-header">
      <h3 class="card-title">
        <span class="icon">{{ routing.icon }}</span>
        {{ routing.title }}
      </h3>
    </div>

    <!-- Card Divider -->
    <div class="card-divider"></div>

    <!-- Card Content -->
    <div class="card-content">
      <!-- Printer Info -->
      <div class="info-group">
        <div class="info-label">🖨 Printer</div>
        <div class="info-value">{{ routing.printer.name }}</div>
        <div class="status-line">
          Status: <span class="status-badge">{{ getStatusBadge(routing.printer.status) }} Connected</span>
        </div>
      </div>

      <!-- Paper Size -->
      <div class="info-group">
        <div class="info-label"><AppIcon name="file-text" :size="13" /> Paper Size</div>
        <div class="info-value">{{ routing.printer.paperSize }}</div>
      </div>

      <!-- Auto Print Toggle -->
      <div class="info-group">
        <div class="info-label"><AppIcon name="settings" :size="13" /> Auto Print</div>
        <div class="toggle-wrapper">
          <label class="toggle-label">
            <input
              type="checkbox"
              :checked="localAutoPrint"
              @change="handleAutoPrintChange"
              class="toggle-input"
            />
            <span class="toggle-text">{{ localAutoPrint ? 'Enabled' : 'Disabled' }}</span>
          </label>
        </div>
      </div>

      <!-- Copies Input -->
      <div class="info-group">
        <div class="info-label"><AppIcon name="copy" :size="13" /> Copies</div>
        <input
          type="text" inputmode="numeric"
          :value="localCopies"
          @change="handleCopiesChange"
          min="1"
          max="99"
          class="copies-input"
        />
      </div>
    </div>

    <!-- Card Divider -->
    <div class="card-divider"></div>

    <!-- Card Actions -->
    <div class="card-actions">
      <button class="btn-action btn-change" @click="handleChangePrinter">
        ⚙ Change Printer
      </button>
      <button class="btn-action btn-edit" @click="handleEditLayout">
        ✏ Edit Layout
      </button>
    </div>
  </div>
</template>

<style scoped>
.routing-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  border: 1px solid rgba(123, 47, 190, 0.08);
  box-shadow: 0 20px 60px rgba(123, 47, 190, 0.08), 0 4px 16px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    box-shadow: 0 24px 72px rgba(123, 47, 190, 0.12), 0 6px 20px rgba(0, 0, 0, 0.06);
    transform: translateY(-2px);
  }
}

.card-header {
  padding: var(--spacing-4);
  background: linear-gradient(135deg, rgba(123, 47, 190, 0.08) 0%, rgba(52, 211, 153, 0.04) 100%);
}

.card-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.icon {
  font-size: 1.5rem;
}

.card-divider {
  height: 1px;
  background: rgba(123, 47, 190, 0.1);
}

.card-content {
  padding: var(--spacing-4);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.info-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.status-line {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 600;
  color: var(--brand-primary-dark);
}

/* Toggle */
.toggle-wrapper {
  display: flex;
  align-items: center;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
}

.toggle-input {
  cursor: pointer;
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary);
}

.toggle-text {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

/* Copies Input */
.copies-input {
  width: 80px;
  padding: 0.5rem 0.75rem;
  border: 1px solid rgba(123, 47, 190, 0.15);
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  text-align: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(123, 47, 190, 0.1);
  }

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &[type='number'] {
    -moz-appearance: textfield;
  }
}

/* Card Actions */
.card-actions {
  padding: var(--spacing-4);
  background: rgba(123, 47, 190, 0.02);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}



/* Responsive */
@media (max-width: 768px) {
  .card-header {
    padding: var(--spacing-3);
  }

  .card-title {
    font-size: 1rem;
  }

  .icon {
    font-size: 1.3rem;
  }

  .card-content {
    padding: var(--spacing-3);
    gap: var(--spacing-2);
  }

  .card-actions {
    padding: var(--spacing-3);
    gap: var(--spacing-1-5);
  }


}

@media (max-width: 480px) {
  .card-title {
    font-size: 0.95rem;
  }

  .info-label {
    font-size: 0.8rem;
  }

  .info-value {
    font-size: 0.95rem;
  }
}
</style>
