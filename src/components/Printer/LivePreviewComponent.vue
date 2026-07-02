<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  layoutMode: 'customer' | 'barista'
  paperSize: string
  visibleFields: Record<string, any>
  footerText: string
  updateTrigger: boolean
}

const props = defineProps<Props>()

// Sample data for preview
const sampleCustomerData = {
  store: {
    name: 'SEDEREK KOPI',
    address: 'Jl. Mawar No 12',
    phone: '0812-xxxx-xxxx',
    logo: '☕'
  },
  transaction: {
    id: 'TRX-00124',
    date: '15 Feb 2026',
    time: '10:32'
  },
  cashier: 'Admin',
  customer: 'Ajik',
  table: '07',
  items: [
    {
      name: 'Americano',
      quantity: 2,
      addons: ['Extra Shot', 'Oat Milk'],
      discount: 'Diskon Item',
      subtotal: 36000
    },
    {
      name: 'Muffin',
      quantity: 1,
      subtotal: 15000
    }
  ],
  subtotal: 51000,
  discount: -2000,
  total: 49000,
  payment: {
    method: 'QRIS',
    reference: 'QRS-882712883'
  }
}

const sampleBaristaData = {
  queue: '#24',
  time: '15 Feb 10:32',
  customer: 'Ajik',
  table: '07',
  channel: 'POS',
  items: [
    {
      name: 'AMERICANO',
      quantity: 2,
      addons: ['EXTRA SHOT', 'OAT MILK'],
      notes: 'LESS ICE'
    },
    {
      name: 'MUFFIN',
      quantity: 1
    }
  ],
  reminder: 'Siapkan dengan standar resep ☕'
}

// Computed preview content
const previewContent = computed(() => {
  if (props.layoutMode === 'customer') {
    return generateCustomerPreview()
  } else {
    return generateBaristaPreview()
  }
})

function generateCustomerPreview() {
  const lines: string[] = []

  // Header
  if (props.visibleFields.header?.show_logo) {
    lines.push('☕')
  }
  if (props.visibleFields.header?.show_store_name) {
    lines.push('SEDEREK KOPI')
  }
  if (props.visibleFields.header?.show_store_info) {
    lines.push('Jl. Mawar No 12')
    lines.push('0812-xxxx-xxxx')
  }

  lines.push(''.padEnd(20, '─'))

  // Transaction & User Info
  if (props.visibleFields.header?.show_transaction_id) {
    lines.push('TRX-00124')
  }
  if (props.visibleFields.header?.show_date_time) {
    lines.push('15 Feb 2026 10:32')
  }
  if (props.visibleFields.header?.show_cashier) {
    lines.push('Kasir  : Admin')
  }
  if (props.visibleFields.header?.show_customer_name) {
    lines.push('Customer: Ajik')
  }
  if (props.visibleFields.header?.show_table_number) {
    lines.push('Meja    : 07')
  }

  lines.push(''.padEnd(20, '─'))

  // Items
  if (props.visibleFields.items?.show_quantity) {
    lines.push('Americano x2')
    if (props.visibleFields.items?.show_addons) {
      lines.push('  + Extra Shot')
      lines.push('  + Oat Milk')
    }
    if (props.visibleFields.items?.show_item_discount) {
      lines.push('  - Diskon Item')
    }
    if (props.visibleFields.items?.show_item_subtotal) {
      lines.push('  Subtotal 36.000')
    }
  }

  lines.push('Muffin x1')
  if (props.visibleFields.items?.show_item_subtotal) {
    lines.push('  Subtotal 15.000')
  }

  lines.push(''.padEnd(20, '─'))

  // Payment Summary
  if (props.visibleFields.payment?.show_subtotal) {
    lines.push('Subtotal  51.000')
  }
  if (props.visibleFields.payment?.show_global_discount) {
    lines.push('Diskon    -2.000')
  }
  if (props.visibleFields.payment?.show_grand_total) {
    lines.push('TOTAL     49.000')
  }

  lines.push(''.padEnd(20, '─'))

  if (props.visibleFields.payment?.show_payment_method) {
    lines.push('Metode: QRIS')
  }
  if (props.visibleFields.payment?.show_payment_reference) {
    lines.push('Ref: QRS-882712883')
  }

  lines.push(''.padEnd(20, '─'))

  // Footer
  if (props.footerText) {
    lines.push(props.footerText)
  }
  if (props.visibleFields.footer?.show_qr_code) {
    lines.push('[QR CODE]')
  }

  return lines
}

function generateBaristaPreview() {
  const lines: string[] = []

  // Header
  if (props.visibleFields.header?.show_queue_number) {
    lines.push('ORDER #24')
  }
  if (props.visibleFields.header?.show_time) {
    lines.push('15 Feb 10:32')
  }
  if (props.visibleFields.header?.show_customer_name) {
    lines.push('Customer: Ajik')
  }
  if (props.visibleFields.header?.show_table_number) {
    lines.push('MEJA : 07')
  }
  if (props.visibleFields.header?.show_channel) {
    lines.push('Channel: POS')
  }

  lines.push(''.padEnd(18, '─'))

  // Items
  lines.push('AMERICANO x2')
  if (props.visibleFields.items?.show_addons) {
    lines.push('  + EXTRA SHOT')
    lines.push('  + OAT MILK')
  }
  if (props.visibleFields.items?.show_notes) {
    lines.push('  NOTE: LESS ICE')
  }

  lines.push(''.padEnd(18, '─'))

  lines.push('MUFFIN x1')

  lines.push(''.padEnd(18, '─'))

  // Footer
  if (props.visibleFields.footer?.show_preparation_reminder) {
    lines.push(props.footerText || 'Siapkan dengan')
    lines.push('standar resep ☕')
  }

  return lines
}
</script>

<template>
  <div class="live-preview">
    <div :class="['preview-paper', `paper-${paperSize.replace('mm', '').toLowerCase()}`]">
      <div class="preview-content">
        <div
          v-for="(line, index) in previewContent"
          :key="index"
          class="preview-line"
        >
          {{ line }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.live-preview {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  width: 100%;
  padding: 0;
}

.preview-paper {
  background: white;
  border: 2px solid #333;
  border-radius: 2px;
  padding: 8px;
  font-family: 'Courier New', monospace;
  font-size: 0.7rem;
  line-height: 1.4;
  color: #000;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  overflow-y: auto;
  max-height: 500px;

  /* 80mm paper */
  &.paper-80 {
    width: 200px;
    min-width: 200px;
    max-width: 200px;
  }

  /* 58mm paper */
  &.paper-58 {
    width: 145px;
    min-width: 145px;
    max-width: 145px;
  }

  /* Scrollbar styling */
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 2px;

    &:hover {
      background: rgba(0, 0, 0, 0.3);
    }
  }
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 0.2px;
}

.preview-line {
  word-break: break-word;
  text-align: center;
  white-space: pre-wrap;
  min-height: 1.2em;
  padding: 0.5px 2px;
  font-size: 0.65rem;
  letter-spacing: 0px;

  /* Show individual character for better thermal receipt appearance */
  &:empty::after {
    content: ' ';
  }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .preview-paper {
    font-size: 0.65rem;

    &.paper-80 {
      width: 180px;
      min-width: 180px;
      max-width: 180px;
    }

    &.paper-58 {
      width: 130px;
      min-width: 130px;
      max-width: 130px;
    }
  }

  .preview-line {
    font-size: 0.6rem;
  }
}

@media (max-width: 480px) {
  .preview-paper {
    padding: 6px;

    &.paper-80 {
      width: 160px;
      min-width: 160px;
      max-width: 160px;
    }

    &.paper-58 {
      width: 120px;
      min-width: 120px;
      max-width: 120px;
    }
  }

  .preview-line {
    font-size: 0.55rem;
    line-height: 1.3;
    padding: 0.3px 1px;
  }
}
</style>
