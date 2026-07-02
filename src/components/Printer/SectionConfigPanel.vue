<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  layoutMode: 'customer' | 'barista'
  visibleFields: Record<string, any>
  footerText: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'field-toggle': [section: string, field: string, value: boolean]
  'footer-text-change': [text: string]
}>()

// Expanded sections state
const expandedSections = ref<Record<string, boolean>>({
  header: true,
  items: true,
  payment: true,
  footer: true
})

// Section configurations for Customer Receipt
const customerReceiptSections = [
  {
    id: 'header',
    title: 'HEADER',
    icon: 'layout',
    fields: [
      { key: 'show_logo', label: 'Show Logo' },
      { key: 'show_store_name', label: 'Show Store Name' },
      { key: 'show_store_info', label: 'Show Store Info' },
      { key: 'show_transaction_id', label: 'Show Transaction ID' },
      { key: 'show_date_time', label: 'Show Date & Time' },
      { key: 'show_cashier', label: 'Show Cashier' },
      { key: 'show_customer_name', label: 'Show Customer Name' },
      { key: 'show_table_number', label: 'Show Table Number' }
    ]
  },
  {
    id: 'items',
    title: 'ITEM SETTINGS',
    icon: 'package',
    fields: [
      { key: 'show_quantity', label: 'Show Quantity' },
      { key: 'show_addons', label: 'Show Add-ons' },
      { key: 'show_item_discount', label: 'Show Item Discount' },
      { key: 'show_item_subtotal', label: 'Show Item Subtotal' },
      { key: 'show_notes', label: 'Show Notes' }
    ]
  },
  {
    id: 'payment',
    title: 'PAYMENT SUMMARY',
    icon: 'banknote',
    fields: [
      { key: 'show_subtotal', label: 'Show Subtotal' },
      { key: 'show_global_discount', label: 'Show Global Discount' },
      { key: 'show_tax', label: 'Show Tax' },
      { key: 'show_service_charge', label: 'Show Service Charge' },
      { key: 'show_grand_total', label: 'Show Grand Total' },
      { key: 'show_payment_method', label: 'Show Payment Method' },
      { key: 'show_payment_reference', label: 'Show Payment Reference' }
    ]
  },
  {
    id: 'footer',
    title: 'FOOTER',
    icon: 'file-text',
    fields: [
      { key: 'show_qr_code', label: 'Show QR Code' }
    ]
  }
]

// Section configurations for Barista Ticket
const baristaSections = [
  {
    id: 'header',
    title: 'HEADER',
    icon: 'layout',
    fields: [
      { key: 'show_queue_number', label: 'Show Queue Number' },
      { key: 'show_time', label: 'Show Time' },
      { key: 'show_customer_name', label: 'Show Customer Name' },
      { key: 'show_table_number', label: 'Show Table Number' },
      { key: 'show_channel', label: 'Show Channel' }
    ]
  },
  {
    id: 'items',
    title: 'ITEM SETTINGS',
    icon: 'package',
    fields: [
      { key: 'show_addons', label: 'Show Add-ons' },
      { key: 'show_notes', label: 'Show Notes' },
      { key: 'show_price', label: 'Show Price' }
    ]
  },
  {
    id: 'footer',
    title: 'FOOTER',
    icon: 'file-text',
    fields: [
      { key: 'show_preparation_reminder', label: 'Show Preparation Reminder' }
    ]
  }
]

// Computed sections based on layout mode
const sections = computed(() => {
  return props.layoutMode === 'customer' ? customerReceiptSections : baristaSections
})

// Methods
const toggleSection = (sectionId: string) => {
  expandedSections.value[sectionId] = !expandedSections.value[sectionId]
}

const handleFieldChange = (section: string, field: string, value: boolean) => {
  emit('field-toggle', section, field, value)
}

const handleFooterTextChange = (e: Event) => {
  const text = (e.target as HTMLTextAreaElement).value
  emit('footer-text-change', text)
}

const isFieldChecked = (section: string, field: string): boolean => {
  return props.visibleFields[section]?.[field] ?? false
}
</script>

<template>
  <div class="section-config-panel">
    <div class="panel-title"><AppIcon name="settings" :size="14" /> SECTION CONFIGURATION</div>

    <!-- Sections -->
    <div class="sections-container">
      <div v-for="section in sections" :key="section.id" class="section-item">
        <!-- Section Header -->
        <div class="section-header" @click="toggleSection(section.id)">
          <div class="header-left">
            <AppIcon :name="section.icon" :size="14" class="icon" />
            <span class="title">▾ {{ section.title }}</span>
          </div>
          <span class="expand-icon" :class="{ 'is-expanded': expandedSections[section.id] }">
            ▾
          </span>
        </div>

        <!-- Section Content -->
        <div v-if="expandedSections[section.id]" class="section-content">
          <!-- Regular Fields -->
          <div v-for="field in section.fields" :key="field.key" class="field-item">
            <label class="checkbox-label">
              <input
                type="checkbox"
                :checked="isFieldChecked(section.id, field.key)"
                @change="(e: Event) => handleFieldChange(section.id, field.key, (e.target as HTMLInputElement).checked)"
                class="checkbox-input"
              />
              <span class="checkbox-text">{{ field.label }}</span>
            </label>
          </div>

          <!-- Footer Text Input (only for footer section) -->
          <div v-if="section.id === 'footer' && layoutMode === 'customer'" class="footer-text-group">
            <label class="text-label">Footer Text:</label>
            <textarea
              :value="footerText"
              @input="handleFooterTextChange"
              class="text-input"
              rows="2"
              placeholder="Enter footer text..."
            ></textarea>
          </div>

          <div v-if="section.id === 'footer' && layoutMode === 'barista'" class="footer-text-group">
            <label class="text-label">Footer Text:</label>
            <textarea
              :value="footerText"
              @input="handleFooterTextChange"
              class="text-input"
              rows="2"
              placeholder="Enter footer text..."
            ></textarea>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.section-config-panel {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  border: 1px solid rgba(123, 47, 190, 0.08);
  box-shadow: 0 20px 60px rgba(123, 47, 190, 0.08), 0 4px 16px rgba(0, 0, 0, 0.04);
  padding: var(--spacing-4);
  overflow: hidden;
}

.panel-title {
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1.4;
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-3);
  padding-bottom: var(--spacing-2);
  border-bottom: 1px solid rgba(123, 47, 190, 0.1);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sections-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

/* Section Item */
.section-item {
  border: 1px solid rgba(123, 47, 190, 0.15);
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    border-color: rgba(123, 47, 190, 0.25);
    background: rgba(123, 47, 190, 0.04);
  }
}

/* Section Header */
.section-header {
  padding: var(--spacing-3);
  background: linear-gradient(135deg, rgba(123, 47, 190, 0.08) 0%, rgba(52, 211, 153, 0.04) 100%);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;

  &:hover {
    background: linear-gradient(135deg, rgba(123, 47, 190, 0.15) 0%, rgba(52, 211, 153, 0.08) 100%);
    box-shadow: 0 2px 8px rgba(123, 47, 190, 0.1);
  }

  &:active {
    background: linear-gradient(135deg, rgba(123, 47, 190, 0.12) 0%, rgba(52, 211, 153, 0.06) 100%);
  }
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.icon {
  font-size: 1.5rem;
}

.title {
  font-weight: 600;
  font-size: 1rem;
  line-height: 1.5;
  color: var(--color-text-primary);
}

.expand-icon {
  font-size: 1rem;
  color: var(--color-text-secondary);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &.is-expanded {
    transform: rotate(0deg);
  }
}

/* Section Content */
.section-content {
  padding: var(--spacing-3);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  background: rgba(255, 255, 255, 0.8);
  border-top: 1px solid rgba(123, 47, 190, 0.05);
  animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Field Item */
.field-item {
  display: flex;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;
  line-height: 1.6;
  padding: 0.35rem 0;

  &:hover {
    color: var(--color-primary);
  }
}

.checkbox-input {
  cursor: pointer;
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary);
  flex-shrink: 0;
}

.checkbox-text {
  font-size: 1rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

/* Footer Text Group */
.footer-text-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: var(--spacing-1);
}

.text-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  letter-spacing: 0.5px;
}

.text-input {
  padding: 0.75rem;
  border: 1px solid rgba(123, 47, 190, 0.15);
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.9rem;
  color: var(--color-text-primary);
  resize: vertical;
  min-height: 60px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  background: rgba(255, 255, 255, 0.8);

  &:focus {
    outline: none;
    border-color: var(--color-primary);
    background: white;
    box-shadow: 0 0 0 3px rgba(123, 47, 190, 0.1);
  }

  &::placeholder {
    color: var(--color-text-hint);
  }
}

/* Responsive */
/* Tablet Breakpoint (768px and below) */
@media (max-width: 768px) {
  .section-config-panel {
    padding: var(--spacing-3);
  }

  .panel-title {
    font-size: 1rem;
    margin-bottom: var(--spacing-2);
  }

  .icon {
    font-size: 1.3rem;
  }

  .section-header {
    padding: var(--spacing-2);
  }

  .section-content {
    padding: var(--spacing-2);
    gap: var(--spacing-1-5);
  }

  .title {
    font-size: 0.95rem;
    line-height: 1.4;
  }

  .checkbox-text {
    font-size: 0.95rem;
  }

  .checkbox-label {
    line-height: 1.5;
    padding: 0.3rem 0;
  }

  .sections-container {
    gap: var(--spacing-2);
  }
}

/* Mobile Breakpoint (480px and below) */
@media (max-width: 480px) {
  .section-config-panel {
    padding: var(--spacing-2);
  }

  .panel-title {
    font-size: 0.95rem;
  }

  .icon {
    font-size: 1.1rem;
  }

  .title {
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .checkbox-text {
    font-size: 0.9rem;
  }

  .checkbox-label {
    line-height: 1.5;
    padding: 0.25rem 0;
  }

  .section-header {
    padding: var(--spacing-1-5);
  }

  .section-content {
    padding: var(--spacing-1-5);
  }
}
</style>
