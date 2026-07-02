<script setup lang="ts">
import { computed, ref } from 'vue'
import logoblackPath from '@/assets/logo/logo-black.png'

interface LayoutConfig {
  header: {
    show_logo: boolean
    show_store_name: boolean
    show_store_address: boolean
    show_store_phone: boolean
    show_transaction_date: boolean
    show_cashier_name: boolean
    show_store_slogan: boolean
  }
  item: {
    show_item_name: boolean
    show_item_quantity: boolean
    show_item_price: boolean
    show_item_addons: boolean
    item_name_format: 'short' | 'long'
  }
  summary: {
    show_subtotal: boolean
    show_discount: boolean
    show_discount_reason: boolean
    show_tax: boolean
    show_tax_breakdown: boolean
    show_rounding: boolean
    show_total: boolean
    total_display_format: 'compact' | 'detailed'
  }
  footer: {
    footer_text: string
    show_thank_you_message: boolean
  }
}

interface Props {
  config: LayoutConfig
  type?: 'customer' | 'barista'
  previewContent?: Record<string, any> | null
}

const props = withDefaults(defineProps<Props>(), {
  type: 'customer',
  previewContent: null
})

// Get preview data from props or use hardcoded fallback
const getPreviewData = () => {

  
  if (!props.previewContent || !props.previewContent.sections) {
    // Fallback to hardcoded mock data if no preview_content provided

    return {
      logo: '☕',
      storeName: 'Sederek Coffee',
      storeAddress: 'Jl. Merdeka No. 123',
      storePhone: '(021) 1234-5678',
      storeSlogan: 'Kopi terbaik untuk hari terbaik',
      transactionDate: '17 Feb 2026 14:30',
      cashierName: 'Budi',
      items: [
        {
          name: 'Cappuccino Venti',
          quantity: 2,
          unit: 'cup',
          price: 35000,
          total: 70000,
          addOns: [
            { name: 'Extra shot', price: 5000 },
            { name: 'Almond milk', price: 3000 }
          ]
        },
        {
          name: 'Matcha Latte',
          quantity: 1,
          unit: 'cup',
          price: 42000,
          total: 42000,
          addOns: [
            { name: 'Whipped cream', price: 2000 }
          ]
        },
        {
          name: 'Pastry - Croissant',
          quantity: 1,
          unit: 'pcs',
          price: 25000,
          total: 25000,
          addOns: []
        }
      ],
      subtotal: 137000,
      discount: 15000,
      discountReason: 'Member discount',
      tax: 14500,
      rounding: -500,
      total: 136000
    }
  }

  // Extract data from preview_content
  const sections = props.previewContent.sections || {}
  const headerArray = Array.isArray(sections.header) ? sections.header : []
  const headerObj: Record<string, any> = {}
  
  // Convert header array to object format for easier access
  headerArray.forEach((field: any) => {
    if (field.show_logo !== undefined) {
      headerObj.show_logo = field.show_logo
      headerObj.logo = field.logo || '☕'
    }
    if (field.show_store_name !== undefined) {
      headerObj.show_store_name = field.show_store_name
      headerObj.storeName = field.store_name || 'Store Name'
    }
    if (field.show_store_address !== undefined) {
      headerObj.show_store_address = field.show_store_address
      headerObj.storeAddress = field.store_address || 'Store Address'
    }
    if (field.show_store_phone !== undefined) {
      headerObj.show_store_phone = field.show_store_phone
      headerObj.storePhone = field.store_phone || 'Phone'
    }
    if (field.show_date_time !== undefined) {
      headerObj.show_date_time = field.show_date_time
      headerObj.transactionDate = field.date_time || 'Date Time'
    }
    if (field.show_cashier !== undefined) {
      headerObj.show_cashier = field.show_cashier
      headerObj.cashierName = field.cashier || 'Cashier'
    }
    if (field.show_customer_name !== undefined) {
      headerObj.show_customer_name = field.show_customer_name
      headerObj.customerName = field.customer_name || 'Customer'
    }
    if (field.show_table_number !== undefined) {
      headerObj.show_table_number = field.show_table_number
      headerObj.tableNumber = field.table_number || 'Table'
    }
  })

  const items = sections.items || {}
  const payment = sections.payment || {}
  const footer = sections.footer || {}

  return {
    // Header data
    logo: headerObj.logo,
    storeName: headerObj.storeName,
    storeAddress: headerObj.storeAddress,
    storePhone: headerObj.storePhone,
    transactionDate: headerObj.transactionDate,
    cashierName: headerObj.cashierName,
    customerName: headerObj.customerName,
    tableNumber: headerObj.tableNumber,
    storeSlogan: '',
    // Items data
    item_name: items.item_name || 'Americano',
    item_quantity: items.quantity || 1,
    item_price: items.price || '13.000',
    item_addons: items.add_ons || items.addOns || [],
    item_subtotal: items.subtotal || '15.000',
    item_discount: items.item_discount || '1.000',
    // Payment data
    subtotal: payment.subtotal || '15.000',
    discount: (parseFloat(String(payment.discount_items || 0).replace(/\D/g, '')) || 0) + (parseFloat(String(payment.global_discount || 0).replace(/\D/g, '')) || 0),
    discountReason: 'Member discount',
    tax: payment.tax || '0',
    rounding: 0,
    total: payment.grand_total || '15.000',
    payment_method: payment.payment_method || 'QRIS',
    // Footer data
    footer_text: footer.footer_text || 'Terima kasih!',
    show_qr_code: footer.show_qr_code !== false,
    // Items list for iteration
    items: [
      {
        name: items.item_name || 'Americano',
        quantity: items.quantity || 1,
        unit: 'cup',
        price: parseInt(items.price?.replace(/\D/g, '') || '0') || 13000,
        total: parseInt(items.subtotal?.replace(/\D/g, '') || '0') || 15000,
        addOns: (items.add_ons || items.addOns || []).map((addon: any) => ({
          name: addon.name || 'Add-on',
          price: parseInt(addon.price?.replace(/\D/g, '') || '0') || 0
        }))
      }
    ]
  }
}

const mockData = computed(() => getPreviewData())

// Format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

// Truncate item name based on config
const getItemName = (name: string) => {
  if (props.config.item.item_name_format === 'short' && name.length > 20) {
    return name.substring(0, 17) + '...'
  }
  return name
}

// Paper width in mm
const paperWidth = props.type === 'customer' ? 80 : 58

// Calculate divider length based on paper width
// For 80mm at 3.78px/mm with padding 16px on each side = ~270px available
// With font-size 0.75rem (12px) and Courier New monospace, ~1 char = 7.2px
// So: 80mm → ~32 chars, 58mm → ~22 chars
const dividerLength = computed(() => {
  return props.type === 'customer' ? 32 : 22
})

const divider = computed(() => {
  return '='.repeat(dividerLength.value)
})
</script>

<template>
  <div class="live-preview-wrapper">
    <div class="preview-label">Live Preview ({{ paperWidth }}mm)</div>
    
    <div class="receipt-container" :style="{ maxWidth: `${paperWidth * 3.78}px` }">
       <!-- Header Section -->
       <div class="receipt-header">
         <div v-if="config.header.show_logo" class="header-logo">
           <img :src="logoblackPath" alt="Logo" class="logo-image" />
         </div>
        
        <div v-if="config.header.show_store_name" class="header-store-name">
          {{ mockData.storeName }}
        </div>
        
        <div v-if="config.header.show_store_slogan" class="header-slogan">
          {{ mockData.storeSlogan }}
        </div>
        
        <div v-if="config.header.show_store_address" class="header-address">
          {{ mockData.storeAddress }}
        </div>
        
        <div v-if="config.header.show_store_phone" class="header-phone">
          {{ mockData.storePhone }}
        </div>
        
        <div v-if="config.header.show_transaction_date" class="header-date">
          {{ mockData.transactionDate }}
        </div>
        
        <div v-if="config.header.show_cashier_name" class="header-cashier">
          Kasir: {{ mockData.cashierName }}
        </div>
        
        <div class="header-divider">{{ divider }}</div>
      </div>

      <!-- Items Section -->
      <div class="receipt-items">
        <!-- Item Header -->
        <div class="items-header">
          <div v-if="config.item.show_item_name" class="col-name">Item</div>
          <div v-if="config.item.show_item_quantity" class="col-qty">Qty</div>
          <div v-if="config.item.show_item_price" class="col-price">Harga</div>
        </div>
        
         <!-- Item List -->
         <div v-for="(item, idx) in mockData.items" :key="idx">
           <!-- Main item row -->
           <div class="item-row">
             <div v-if="config.item.show_item_name" class="col-name">
               {{ getItemName(item.name) }}
             </div>
             <div v-if="config.item.show_item_quantity" class="col-qty">
               {{ item.quantity }}{{ item.unit }}
             </div>
             <div v-if="config.item.show_item_price" class="col-price">
               {{ formatCurrency(item.total) }}
             </div>
           </div>
           
           <!-- Add-ons rows (if enabled) -->
           <div
             v-if="config.item.show_item_addons && item.addOns && item.addOns.length > 0"
             v-for="addon in item.addOns"
             :key="`addon-${idx}-${addon.name}`"
             class="item-addon-row"
           >
             <div class="col-addon-name">  + {{ addon.name }}</div>
             <div class="col-addon-price">{{ formatCurrency(addon.price) }}</div>
           </div>
         </div>
        
         <div class="items-divider">{{ divider }}</div>
      </div>

      <!-- Summary Section -->
      <div class="receipt-summary">
        <div v-if="config.summary.show_subtotal" class="summary-row">
          <span>Subtotal</span>
          <span>{{ formatCurrency(mockData.subtotal) }}</span>
        </div>
        
        <div v-if="config.summary.show_discount && mockData.discount > 0" class="summary-row discount">
          <span>Diskon</span>
          <span>-{{ formatCurrency(mockData.discount) }}</span>
        </div>
        
        <div v-if="config.summary.show_discount_reason && config.summary.show_discount" class="summary-note">
          {{ mockData.discountReason }}
        </div>
        
        <div v-if="config.summary.show_tax" class="summary-row">
          <span>Pajak (PPN)</span>
          <span>{{ formatCurrency(mockData.tax) }}</span>
        </div>
        
        <div v-if="config.summary.show_tax_breakdown && config.summary.show_tax" class="summary-note">
          10% dari subtotal
        </div>
        
        <div v-if="config.summary.show_rounding" class="summary-row">
          <span>Pembulatan</span>
          <span>{{ mockData.rounding > 0 ? '+' : '' }}{{ formatCurrency(mockData.rounding) }}</span>
        </div>
        
         <div class="summary-divider">{{ divider }}</div>
        
         <div v-if="config.summary.show_total" class="summary-total" :class="{ detailed: config.summary.total_display_format === 'detailed' }">
           <span v-if="config.summary.total_display_format === 'detailed'">Total</span>
           <span class="total-value">{{ formatCurrency(mockData.total) }}</span>
         </div>
      </div>

      <!-- Footer Section -->
      <div class="receipt-footer">
        <div v-if="config.footer.show_thank_you_message" class="footer-message">
          Terima kasih telah berbelanja!
        </div>
        
        <div v-if="config.footer.footer_text" class="footer-text">
          {{ config.footer.footer_text }}
        </div>
        
         <div class="footer-divider">{{ divider }}</div>
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
  height: 100%;
}

.preview-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  letter-spacing: 0.5px;
}

.receipt-container {
  flex: 0 0 auto;
  overflow-y: visible;
  width: 100%;
  background: white;
  border: 2px dashed var(--color-border);
  border-radius: 8px;
  padding: var(--spacing-4);
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
  line-height: 1.5;
  color: #1f2937;
}

/* Header Section */
.receipt-header {
  text-align: center;
  margin-bottom: var(--spacing-2);
}

.header-logo {
  display: flex;
  justify-content: center;
  margin-bottom: var(--spacing-2);
}

.logo-image {
  max-width: 60px;
  max-height: 60px;
  object-fit: contain;
}

.header-store-name {
  font-weight: 600;
  font-size: 0.85rem;
  margin-bottom: 2px;
  letter-spacing: 0.5px;
}

.header-slogan {
  font-size: 0.65rem;
  font-style: italic;
  margin-bottom: 4px;
  color: #6b7280;
}

.header-address,
.header-phone,
.header-date,
.header-cashier {
  font-size: 0.65rem;
  margin-bottom: 1px;
  color: #4b5563;
}

.header-divider {
  margin-top: var(--spacing-2);
  margin-bottom: var(--spacing-2);
  letter-spacing: 2px;
  opacity: 0.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: clip;
}

/* Items Section */
.receipt-items {
  margin-bottom: var(--spacing-2);
}

.items-header {
  display: grid;
  grid-template-columns: 1fr 0.5fr 0.8fr;
  gap: 4px;
  margin-bottom: 4px;
  font-weight: bold;
  border-bottom: 1px solid #ccc;
  padding-bottom: 4px;
}

.item-row {
  display: grid;
  grid-template-columns: 1fr 0.5fr 0.8fr;
  gap: 4px;
  margin-bottom: 4px;
  word-break: break-word;
}

.col-name {
  text-align: left;
}

.col-qty {
  text-align: center;
}

.col-price {
  text-align: right;
  font-family: 'Courier New', monospace;
}

.item-addon-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
  margin-left: 12px;
  font-size: 0.7rem;
  color: #6b7280;
}

.col-addon-name {
  flex: 1;
  word-break: break-word;
}

.col-addon-price {
  text-align: right;
  font-family: 'Courier New', monospace;
  min-width: 60px;
}

.items-divider {
  margin-top: var(--spacing-2);
  margin-bottom: var(--spacing-2);
  letter-spacing: 2px;
  opacity: 0.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: clip;
}

/* Summary Section */
.receipt-summary {
  margin-bottom: var(--spacing-2);
}

.summary-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 3px;
  font-size: 0.7rem;
  color: #4b5563;
}

.summary-row.discount {
  color: var(--brand-primary-dark);
  font-weight: 500;
}

.summary-note {
  font-size: 0.65rem;
  color: #6b7280;
  font-style: italic;
  margin-bottom: 4px;
  margin-left: 12px;
}

.summary-divider {
  margin-top: var(--spacing-2);
  margin-bottom: var(--spacing-2);
  letter-spacing: 2px;
  opacity: 0.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: clip;
}

.summary-total {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-1);
  font-weight: 600;
  font-size: 0.8rem;
  color: #1f2937;
  margin-top: 4px;
}

.summary-total.detailed {
  justify-content: space-between;
}

.total-value {
  font-family: 'Courier New', monospace;
}

/* Footer Section */
.receipt-footer {
  text-align: center;
}

.footer-message {
  font-size: 0.75rem;
  margin-bottom: 4px;
  color: #4b5563;
  font-weight: 500;
}

.footer-text {
  font-size: 0.65rem;
  margin-bottom: 4px;
  font-style: italic;
  color: #6b7280;
}

.footer-divider {
  margin-top: var(--spacing-2);
  letter-spacing: 2px;
  opacity: 0.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: clip;
}

/* Responsive */
@media (max-width: 1024px) {
  .receipt-container {
    font-size: 0.7rem;
    padding: var(--spacing-3);
  }

  .header-logo {
    font-size: 1.5rem;
  }

  .header-store-name {
    font-size: 0.8rem;
  }
}
</style>
