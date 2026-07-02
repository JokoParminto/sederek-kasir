<script setup lang="ts">
import { computed } from 'vue'
import localLogoPath from '@/assets/logo/logoblack.png'

interface Props {
  previewContent?: Record<string, any> | null
  printerSpecs?: Record<string, any> | null
  layoutConfig?: Record<string, any> | null
}

const props = withDefaults(defineProps<Props>(), {
  layoutConfig: null
})

// Extract sections from preview_content
const sections = computed(() => {
  return props.previewContent?.sections || {}
})

// Get header data (array in preview_content)
const headerData = computed(() => {
  const headerArray = sections.value.header || []
  const result: Record<string, any> = {}
  
  if (Array.isArray(headerArray)) {
    headerArray.forEach((field: any) => {
      Object.assign(result, field)
    })
  } else {
    // If header is object instead of array
    Object.assign(result, headerArray)
  }
  
  return result
})

// Get items data
const itemsData = computed(() => {
  return sections.value.items || {}
})

// Get payment data
const paymentData = computed(() => {
  return sections.value.payment || {}
})

// Get footer data
const footerData = computed(() => {
  return sections.value.footer || {}
})

// Footer visibility — dari layoutConfig (live) atau previewContent
const showFooterText = computed(() => {
  if (props.layoutConfig?.footer !== undefined) {
    return props.layoutConfig.footer.show_thank_you_message !== false
  }
  return footerData.value.show_thank_you_message !== false
})

// Footer text — dari store settings (previewContent), bukan dari layout config
const footerText = computed(() => footerData.value.footer_text || '')

// Format currency with rupiah format
const formatCurrency = (value: any): string => {
  if (!value) return 'Rp 0'
  
  // If already string like "13.000", return as-is
  if (typeof value === 'string' && value.includes('.')) {
    return `Rp ${value}`
  }
  
  // If number, format it
  if (typeof value === 'number') {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }
  
  return `Rp ${value}`
}

// Parse numeric value from string like "13.000"
const parseNumber = (value: any): number => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    return parseInt(value.replace(/\D/g, '')) || 0
  }
  return 0
}

// Format whole number without decimal places (58.00 → 58, 150.00 → 150)
const formatWholeNumber = (value: any): string => {
  if (typeof value === 'number') {
    return Math.round(value).toString()
  }
  if (typeof value === 'string') {
    const num = parseFloat(value)
    if (!isNaN(num)) {
      return Math.round(num).toString()
    }
    return value
  }
  return String(value)
}

// Resolve logo URL — prefer uploaded URL, fallback to local asset
const logoSrc = computed(() => {
  const logoField = getHeaderField('logo')
  if (logoField && (logoField.startsWith('/uploads') || logoField.startsWith('http'))) {
    const base = import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:3000'
    return logoField.startsWith('http') ? logoField : `${base}${logoField}`
  }
  return localLogoPath
})

// Get paper width from printer specs
const paperWidth = computed(() => {
  return props.printerSpecs?.paper_width || 80
})

// Calculate divider length based on paper width
// Standard 80mm thermal printer can fit ~32 characters at 12pt font
// Narrower printers (58mm) fit ~22 characters
const dividerLength = computed(() => {
  const width = paperWidth.value
  if (width >= 80) return 32
  if (width >= 58) return 22
  return Math.max(16, Math.floor(width / 3))  // Dynamic calculation for custom widths
})

const divider = computed(() => {
  return '='.repeat(dividerLength.value)
})

// Calculate max width in pixels based on mm and screen DPI
// For screen rendering, use standard screen DPI (96px per inch)
// NOT printer DPI (203dpi is for printer output)
// Formula: pixels = (mm / 25.4) * 96
// Add padding (16px on each side = 32px total)
const containerMaxWidth = computed(() => {
  const screenDPI = 96  // Standard screen DPI for web
  const paperWidthInches = paperWidth.value / 25.4
  const widthInPixels = paperWidthInches * screenDPI
  return widthInPixels + 32  // Add padding
})

// Helper to get field value from headerData
const getHeaderField = (fieldName: string, defaultValue: any = ''): any => {
  return headerData.value[fieldName] || defaultValue
}

// Get items array - handle both single item and multiple items
const getItemsArray = computed(() => {
  // If items contains single item data
  if (itemsData.value.item_name) {
    return [
      {
        name: itemsData.value.item_name,
        quantity: itemsData.value.quantity || 1,
        price: itemsData.value.price || '0',
        subtotal: itemsData.value.subtotal || '0',
        addOns: itemsData.value.add_ons || [],
        discount: itemsData.value.item_discount || '0',
        notes: itemsData.value.notes || '',
      }
    ]
  }
  
  // Otherwise return empty array
  return []
})

// Unified visibility config — layoutConfig (form, live) takes priority over previewContent flags
const visibilityConfig = computed(() => {
  const lc = props.layoutConfig
  const hd = headerData.value
  const id = itemsData.value
  const pd = paymentData.value

  return {
    header: {
      show_logo:             lc ? lc.header?.show_logo !== false             : hd.show_logo !== false,
      show_store_name:       lc ? lc.header?.show_store_name !== false       : hd.show_store_name !== false,
      show_store_address:    lc ? lc.header?.show_store_address !== false    : hd.show_store_address !== false,
      show_store_phone:      lc ? lc.header?.show_store_phone !== false      : hd.show_store_phone !== false,
      show_store_slogan:     lc ? lc.header?.show_store_slogan === true      : hd.show_store_slogan === true,
      show_transaction_date: lc ? lc.header?.show_transaction_date !== false : hd.show_date_time !== false,
      show_cashier_name:     lc ? lc.header?.show_cashier_name !== false     : hd.show_cashier !== false,
      show_customer_name:    lc ? lc.header?.show_customer_name !== false    : hd.show_customer_name !== false,
      show_table_number:     lc ? lc.header?.show_table_number !== false     : hd.show_table_number !== false,
    },
    item: {
      show_item_name:    lc ? lc.item?.show_item_name !== false    : id.show_item_name !== false,
      show_quantity:     lc ? lc.item?.show_item_quantity !== false : id.show_quantity !== false,
      show_item_price:   lc ? lc.item?.show_item_price !== false   : (id.show_item_subtotal !== false || id.show_price !== false),
      show_add_ons:      lc ? lc.item?.show_item_addons !== false  : id.show_add_ons !== false,
      show_item_notes:   lc ? lc.item?.show_item_notes !== false   : id.show_notes !== false,
      show_item_discount: id.show_item_discount !== false,
    },
    summary: {
      show_subtotal:        lc ? lc.summary?.show_subtotal !== false       : pd.show_subtotal !== false,
      show_global_discount: lc ? lc.summary?.show_discount !== false       : pd.show_global_discount !== false,
      show_payment_method:  lc ? lc.summary?.show_payment_method !== false : pd.show_payment_method !== false,
      show_grand_total:     lc ? lc.summary?.show_total !== false          : pd.show_grand_total !== false,
    },
  }
})
</script>

<template>
  <div class="dynamic-preview-wrapper">
    <div class="preview-label">
      Live Preview ({{ formatWholeNumber(paperWidth) }}mm)
    </div>
    
    <div 
      class="receipt-container" 
      :style="{ 
        maxWidth: containerMaxWidth + 'px'
      }"
    >
      <!-- HEADER SECTION -->
      <div class="receipt-header">
        <div v-if="visibilityConfig.header.show_logo" class="header-logo">
          <img :src="logoSrc" alt="Logo" class="logo-image" />
        </div>
        <div v-if="visibilityConfig.header.show_store_name" class="header-store-name">
          {{ getHeaderField('store_name', 'Store Name') }}
        </div>
        <div v-if="visibilityConfig.header.show_store_address" class="header-address">
          {{ getHeaderField('store_address', 'Address') }}
        </div>
        <div v-if="visibilityConfig.header.show_store_phone" class="header-address">
          {{ getHeaderField('store_phone', '') }}
        </div>
        <div v-if="visibilityConfig.header.show_store_slogan && getHeaderField('store_slogan')" class="header-slogan">
          {{ getHeaderField('store_slogan') }}
        </div>

        <div class="header-divider">{{ divider }}</div>

        <div class="header-transaction header-transaction-bold">
          {{ getHeaderField('transaction_id', 'TRX-XXXXX') }}
        </div>
        <div v-if="visibilityConfig.header.show_transaction_date" class="header-date">
          {{ getHeaderField('date_time', 'Date') }}
        </div>
        <div v-if="visibilityConfig.header.show_cashier_name" class="header-cashier">
          Kasir: {{ getHeaderField('cashier', 'Staff') }}
        </div>
        <div v-if="visibilityConfig.header.show_customer_name" class="header-customer">
          Tamu: {{ getHeaderField('customer_name', 'Customer') }}
        </div>
        <div v-if="visibilityConfig.header.show_table_number" class="header-table">
          Meja: {{ getHeaderField('table_number', '-') }}
        </div>

        <div class="header-divider">{{ divider }}</div>
      </div>

      <!-- ITEMS SECTION -->
      <div v-if="getItemsArray.length > 0" class="receipt-items">
        <div class="items-header">
          <div v-if="visibilityConfig.item.show_item_name" class="col-name">Item</div>
          <div v-if="visibilityConfig.item.show_quantity" class="col-qty">Qty</div>
          <div v-if="visibilityConfig.item.show_item_price" class="col-price">Harga</div>
        </div>

        <template v-for="(item, idx) in getItemsArray" :key="idx">
          <div class="item-row">
            <div v-if="visibilityConfig.item.show_item_name" class="col-name">
              {{ item.name }}
            </div>
            <div v-if="visibilityConfig.item.show_quantity" class="col-qty">
              {{ item.quantity }}
            </div>
            <div v-if="visibilityConfig.item.show_item_price" class="col-price">
              {{ formatCurrency(item.subtotal) }}
            </div>
          </div>

          <div v-if="visibilityConfig.item.show_item_notes && item.notes" class="item-notes-row">
            › {{ item.notes }}
          </div>

          <div v-if="visibilityConfig.item.show_item_discount && item.discount && parseNumber(item.discount) > 0" class="item-discount-row">
            <span class="discount-label">Diskon</span>
            <span class="discount-value">-{{ formatCurrency(item.discount) }}</span>
          </div>

          <template v-if="visibilityConfig.item.show_add_ons && item.addOns && item.addOns.length > 0">
            <div
              v-for="(addon, addonIdx) in item.addOns"
              :key="`addon-${idx}-${addonIdx}`"
              class="item-addon-row"
            >
              <div class="col-addon-name">+ {{ addon.name }}</div>
              <div v-if="visibilityConfig.item.show_item_price" class="col-addon-price">
                {{ formatCurrency(addon.price) }}
              </div>
            </div>
          </template>
        </template>

        <div class="items-divider">{{ divider }}</div>
      </div>

      <!-- PAYMENT SECTION -->
      <div class="receipt-payment">
        <div v-if="visibilityConfig.summary.show_subtotal" class="payment-row">
          <span>Subtotal</span>
          <span>{{ formatCurrency(paymentData.subtotal) }}</span>
        </div>

        <div v-if="visibilityConfig.summary.show_global_discount && parseNumber(paymentData.global_discount) > 0" class="payment-row discount">
          <span>Diskon</span>
          <span>-{{ formatCurrency(paymentData.global_discount) }}</span>
        </div>

        <div v-if="visibilityConfig.summary.show_payment_method && paymentData.payment_method" class="payment-row">
          <span>Pembayaran</span>
          <span>{{ paymentData.payment_method }}</span>
        </div>

        <div class="payment-divider">{{ divider }}</div>

        <div v-if="visibilityConfig.summary.show_grand_total" class="payment-total">
          <span>TOTAL</span>
          <span class="total-value">{{ formatCurrency(paymentData.grand_total) }}</span>
        </div>
      </div>

      <!-- FOOTER SECTION - Dynamic from preview_content.sections.footer -->
      <div class="receipt-footer">
        <!-- Footer Text — teks dari pengaturan toko, visibility dari layout config -->
        <div v-if="footerText && showFooterText" class="footer-text">
          {{ footerText }}
        </div>

        <div class="footer-divider">{{ divider }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dynamic-preview-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-2);
  width: 100%;
}

.preview-label {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-tertiary);
  letter-spacing: 0.05em;
  align-self: flex-start;
}

.receipt-container {
  width: 100%;
  background: #fff;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--spacing-4);
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.72rem;
  line-height: 1.6;
  color: #111;
  box-shadow: var(--shadow-1);
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

.header-address {
  font-size: 0.65rem;
  margin-bottom: 1px;
  color: #444;
  word-break: break-word;
  text-align: center;  /* Centered before divider */
}

/* Fields after divider - left aligned */
.header-transaction,
.header-date,
.header-cashier,
.header-customer,
.header-table {
  font-size: 0.65rem;
  margin-bottom: 1px;
  color: #444;
  word-break: break-word;
  text-align: left;  /* Left aligned after divider */
}

/* Bold transaction ID */
.header-transaction-bold {
  font-weight: 600;
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

.item-notes-row {
  margin-bottom: 2px;
  margin-left: 12px;
  font-size: 0.65rem;
  color: #888;
  font-style: italic;
  word-break: break-word;
}

.header-slogan {
  font-size: 0.6rem;
  color: #888;
  font-style: italic;
  text-align: center;
  margin-bottom: 1px;
}

.item-discount-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2px;
  margin-left: 12px;
  font-size: 0.7rem;
  color: var(--brand-primary-dark);
  font-weight: 500;
}

.discount-label {
  flex: 1;
}

.discount-value {
  text-align: right;
  font-family: 'Courier New', monospace;
  min-width: 60px;
}

.item-addon-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
  margin-left: 12px;
  font-size: 0.7rem;
  color: #666;
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

/* Payment Section */
.receipt-payment {
  margin-bottom: var(--spacing-2);
}

.payment-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 3px;
  font-size: 0.7rem;
  color: #444;
}

.payment-row.discount {
  color: var(--brand-primary-dark);
  font-weight: 500;
}

.payment-divider {
  margin-top: var(--spacing-2);
  margin-bottom: var(--spacing-2);
  letter-spacing: 2px;
  opacity: 0.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: clip;
}

.payment-total {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
  font-size: 0.8rem;
  color: #111;
}

.total-value {
  font-family: 'Courier New', monospace;
}

/* Footer Section */
.receipt-footer {
  text-align: center;
}

.footer-text {
  font-size: 0.65rem;
  margin-bottom: 4px;
  color: #444;
  word-break: break-word;
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
