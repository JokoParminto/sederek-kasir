<script setup lang="ts">
import { computed } from 'vue'
import type { BaristaLayoutConfig } from '@/services/printerlayout.service'

interface Props {
  config: BaristaLayoutConfig
  previewContent?: Record<string, any> | null
}

const props = withDefaults(defineProps<Props>(), {
  previewContent: null
})

const getPreviewData = () => {
  if (!props.previewContent || !props.previewContent.sections) {
    return {
      orderNumber: '#01',
      transactionDate: '14:30',
      customerName: 'Ajik S.',
      preparation_text: 'Siapkan sesuai resep standar',
      items: [
        { name: 'Cappuccino Venti', quantity: 2, notes: 'Extra hot, light foam', addOns: [{ name: 'Oat Milk', quantity: 1 }, { name: 'Extra Shot', quantity: 1 }] },
        { name: 'Matcha Latte',     quantity: 1, notes: '',                       addOns: [{ name: 'Less Sweet', quantity: 1 }] },
      ]
    }
  }

  const sections = props.previewContent.sections || {}
  const headerArray = Array.isArray(sections.header) ? sections.header : []
  const headerObj: Record<string, any> = {}

  headerArray.forEach((field: any) => {
    if (field.show_queue_number  !== undefined) { headerObj.show_queue_number  = field.show_queue_number;  headerObj.orderNumber = field.queue_number || '#01' }
    if (field.show_table_number  !== undefined) { headerObj.show_table_number  = field.show_table_number;  headerObj.tableNumber = field.table_number || '' }
    if (field.show_date_time     !== undefined) { headerObj.show_date_time     = field.show_date_time;     headerObj.transactionDate = field.date_time || '' }
    if (field.show_customer_name !== undefined) { headerObj.show_customer_name = field.show_customer_name; headerObj.customerName = field.customer_name || '' }
  })

  const items   = sections.items  || {}
  const footer  = sections.footer || {}

  return {
    orderNumber:       headerObj.orderNumber     || '#01',
    transactionDate:   headerObj.transactionDate || '',
    customerName:      headerObj.customerName    || 'Customer',
    tableNumber:       headerObj.tableNumber     || '',
    preparation_text:  footer.preparation_text   || 'Siapkan sesuai resep standar',
    items: [{
      name:     items.item_name || 'Americano',
      quantity: items.quantity  || 1,
      notes:    '',
      addOns:   (items.add_ons || items.addOns || []).map((a: any) => ({ name: a.name || 'Add-on', quantity: a.quantity || 1 })),
    }]
  }
}

const mockData = computed(() => getPreviewData())

const getItemName = (name: string) => {
  return name.length > 20 ? name.substring(0, 17) + '...' : name
}

// 58mm thermal: ~22 char wide in Courier 0.75rem
const divider = '─'.repeat(22)
</script>

<template>
  <div class="live-preview-wrapper">
    <div class="preview-label">Preview Tiket Barista · 58mm</div>

    <div class="ticket">

      <!-- ── Queue Number ── -->
      <div v-if="config.header.show_order_number" class="ticket-queue-number">
        {{ mockData.orderNumber }}
      </div>

      <!-- ── Customer Name ── -->
      <div v-if="config.header.show_customer_name" class="ticket-customer">
        {{ mockData.customerName }}
      </div>

      <!-- ── Date/Time + Table ── -->
      <div class="ticket-meta">
        <span v-if="config.header.show_transaction_date && mockData.transactionDate">
          {{ mockData.transactionDate }}
        </span>
        <span v-if="config.header.show_table_number && mockData.tableNumber">
          · Meja {{ mockData.tableNumber }}
        </span>
      </div>

      <!-- ── Divider ── -->
      <div class="ticket-divider">{{ divider }}</div>

      <!-- ── Items ── -->
      <div class="ticket-items">
        <div v-for="(item, idx) in mockData.items" :key="idx" class="ticket-item">
          <!-- Qty + Name on one line -->
          <div class="ti-main">
            <span v-if="config.item.show_item_quantity" class="ti-qty">{{ item.quantity }}×</span>
            <span class="ti-name">{{ getItemName(item.name) }}</span>
          </div>
          <!-- Notes -->
          <div v-if="config.item.show_item_notes && item.notes" class="ti-notes">
            › {{ item.notes }}
          </div>
          <!-- Add-ons -->
          <div v-if="config.item.show_item_addons && item.addOns?.length" class="ti-addons">
            <div v-for="(addon, ai) in item.addOns" :key="ai" class="ti-addon">
              + {{ addon.name }}<span v-if="addon.quantity > 1"> ×{{ addon.quantity }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Bottom divider ── -->
      <div class="ticket-divider">{{ divider }}</div>

      <!-- ── Footer ── -->
      <div class="ticket-footer">
        <div
          v-if="config.footer.show_preparation_reminder && config.footer.preparation_text"
          class="tf-note"
        >
          {{ config.footer.preparation_text }}
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.live-preview-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-2);
}

.preview-label {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-tertiary);
  letter-spacing: 0.02em;
}

/* ── Ticket container ── */
.ticket {
  width: 100%;
  max-width: 210px;
  background: white;
  border: 2px dashed #d1d5db;
  border-radius: 6px;
  padding: 12px 10px;
  font-family: 'Courier New', 'Courier', monospace;
  font-size: 0.72rem;
  line-height: 1.5;
  color: #111827;
}

/* ── Queue number — most prominent ── */
.ticket-queue-number {
  text-align: center;
  font-size: 2rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #111827;
  line-height: 1.1;
  margin-bottom: 4px;
}

/* ── Customer name ── */
.ticket-customer {
  text-align: center;
  font-size: 0.95rem;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #111827;
  margin-bottom: 2px;
}

/* ── Meta (time / table) ── */
.ticket-meta {
  text-align: center;
  font-size: 0.68rem;
  color: #6b7280;
  margin-bottom: 4px;
  display: flex;
  justify-content: center;
  gap: 4px;
}

/* ── Divider ── */
.ticket-divider {
  letter-spacing: 1px;
  color: #9ca3af;
  margin: 4px 0;
  font-size: 0.72rem;
  overflow: hidden;
  white-space: nowrap;
}

/* ── Items ── */
.ticket-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 2px 0;
}

.ticket-item {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.ti-main {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.ti-qty {
  font-weight: 900;
  font-size: 0.8rem;
  color: #111827;
  flex-shrink: 0;
}

.ti-name {
  font-weight: bold;
  color: #111827;
  word-break: break-word;
}

.ti-notes {
  font-size: 0.65rem;
  color: #6b7280;
  font-style: italic;
  padding-left: 14px;
}

.ti-addons {
  padding-left: 14px;
}
.ti-addon {
  font-size: 0.65rem;
  color: #374151;
}

/* ── Footer ── */
.ticket-footer {
  text-align: center;
  margin-top: 2px;
}
.tf-note {
  font-size: 0.68rem;
  font-style: italic;
  color: #6b7280;
}

/* Responsive */
@media (max-width: 1024px) {
  .ticket { font-size: 0.68rem; padding: 10px 8px; }
  .ticket-queue-number { font-size: 1.7rem; }
}
</style>
