/**
 * Print Layout Service - Business logic & conversions
 * Converts between Backend Template Format ↔ Frontend LayoutConfig Format
 */

import { printLayoutApi, type PrinterTemplateResponse } from '@/services/api/printerlayout/printerlayout.api'

/**
 * Frontend UI Layout Config (camelCase - what EditLayoutView.vue uses)
 */
export interface CustomerLayoutConfig {
  header: {
    show_logo: boolean
    show_store_name: boolean
    show_store_address: boolean
    show_store_phone: boolean
    show_store_slogan: boolean
    show_transaction_date: boolean
    show_cashier_name: boolean
    show_customer_name: boolean
    show_table_number: boolean
  }
  item: {
    show_item_name: boolean
    show_item_quantity: boolean
    show_item_price: boolean
    show_item_addons: boolean
    show_item_notes: boolean
    show_member_discount: boolean
    item_name_format: 'short' | 'long'
  }
  summary: {
    show_subtotal: boolean
    show_discount: boolean
    show_discount_reason: boolean
    show_member_savings: boolean
    show_tax: boolean
    show_tax_breakdown: boolean
    show_rounding: boolean
    show_total: boolean
    show_payment_method: boolean
    total_display_format: 'compact' | 'detailed'
  }
  footer: {
    show_thank_you_message: boolean
  }
}

export interface BaristaLayoutConfig {
  header: {
    show_order_number: boolean
    show_customer_name: boolean
    show_table_number: boolean
    show_transaction_date: boolean
  }
  item: {
    show_item_quantity: boolean
    show_item_addons: boolean
    show_item_notes: boolean
  }
  footer: {
    show_preparation_reminder: boolean
    preparation_text: string
  }
}

// Kitchen ticket has the same structure as barista ticket
export type KitchenLayoutConfig = BaristaLayoutConfig

/**
 * Backend Template Format (from DB)
 */
interface BackendTemplate {
  sections: {
    header: Record<string, any>
    items: Record<string, any>
    payment?: Record<string, any>
    footer: Record<string, any>
  }
}

export interface LayoutLoadResult {
  layout: CustomerLayoutConfig | BaristaLayoutConfig | KitchenLayoutConfig
  templateType: 'receipt' | 'barista' | 'kitchen'
  previewContent: Record<string, any> | null
  rawContent: Record<string, any> | null
  printerSpecs: Record<string, any> | null
}

export interface LayoutSaveResult {
  previewContent: Record<string, any> | null
  rawContent: Record<string, any> | null
  printerSpecs: Record<string, any> | null
}

/**
 * Convert Backend Template → Frontend LayoutConfig (Customer Receipt)
 * Maps all database fields to frontend UI config
 */
function backendToCustomerLayout(backend: BackendTemplate): CustomerLayoutConfig {
  const header = backend.sections.header || {}
  const items = backend.sections.items || {}
  const payment = backend.sections.payment || {}
  const footer = backend.sections.footer || {}

  return {
    header: {
      show_logo: header.show_logo !== false,
      show_store_name: header.show_store_name !== false,
      show_store_address: header.show_store_address !== false,
      show_store_phone: header.show_store_phone !== false,
      show_store_slogan: header.show_store_slogan === true,
      show_transaction_date: (header.show_date_time !== false) && (header.show_transaction_date !== false),
      show_cashier_name: (header.show_cashier !== false) && (header.show_cashier_name !== false),
      show_customer_name: header.show_customer_name !== false,
      show_table_number: header.show_table_number !== false,
    },
    item: {
      show_item_name: items.show_item_name !== false,
      show_item_quantity: items.show_quantity !== false,
      show_item_price: (items.show_item_subtotal !== false) || (items.show_price !== false),
      show_item_addons: items.show_add_ons !== false,
      show_item_notes: items.show_notes !== false,
      show_member_discount: items.show_member_discount !== false,
      item_name_format: (items.item_name_format as 'short' | 'long') || 'short',
    },
    summary: {
      show_subtotal: payment.show_subtotal !== false,
      show_discount: payment.show_global_discount !== false,
      show_discount_reason: payment.show_discount_reason === true,
      show_member_savings: payment.show_member_savings !== false,
      show_tax: payment.show_tax === true,
      show_tax_breakdown: payment.show_tax_breakdown === true,
      show_rounding: payment.show_rounding === true,
      show_total: payment.show_grand_total !== false,
      show_payment_method: payment.show_payment_method !== false,
      total_display_format: (payment.total_display_format as 'compact' | 'detailed') || 'compact',
    },
    footer: {
      show_thank_you_message: footer.show_thank_you_message !== false,
    }
  }
}

/**
 * Convert preview_content (from template API) → BaristaLayoutConfig.
 * Handles array-format header sections that preview_content uses.
 */
export function previewToBaristaConfig(previewContent: Record<string, any> | null | undefined): BaristaLayoutConfig {
  const sections = previewContent?.sections || {}
  const rawHeader = sections.header
  const header: Record<string, any> = Array.isArray(rawHeader)
    ? rawHeader.reduce((acc: Record<string, any>, f: any) => ({ ...acc, ...f }), {})
    : (rawHeader || {})
  const items = sections.items || {}
  const footer = sections.footer || {}
  return {
    header: {
      show_order_number: header.show_queue_number !== false,
      show_customer_name: header.show_customer_name !== false,
      show_table_number: header.show_table_number !== false,
      show_transaction_date: header.show_time !== false,
    },
    item: {
      show_item_quantity: items.show_quantity !== false,
      show_item_addons: items.show_add_ons !== false,
      show_item_notes: items.show_notes !== false,
    },
    footer: {
      show_preparation_reminder: footer.show_preparation_reminder !== false,
      preparation_text: footer.preparation_text || 'Siapkan sesuai resep standar',
    }
  }
}

export function previewToKitchenConfig(previewContent: Record<string, any> | null | undefined): KitchenLayoutConfig {
  return previewToBaristaConfig(previewContent)
}

/**
 * Convert Backend Template → Frontend LayoutConfig (Barista Ticket)
 */
function backendToBaristaLayout(backend: BackendTemplate): BaristaLayoutConfig {
  const header = backend.sections.header || {}
  const items = backend.sections.items || {}
  const footer = backend.sections.footer || {}

  return {
    header: {
      show_order_number: header.show_queue_number !== false,
      show_customer_name: header.show_customer_name !== false,
      show_table_number: header.show_table_number !== false,
      show_transaction_date: header.show_time !== false,
    },
    item: {
      show_item_quantity: items.show_quantity !== false,
      show_item_addons: items.show_add_ons !== false,
      show_item_notes: items.show_notes !== false,
    },
    footer: {
      show_preparation_reminder: footer.show_preparation_reminder !== false,
      preparation_text: footer.preparation_text || 'Siapkan sesuai resep standar',
    }
  }
}

/**
 * Convert Frontend LayoutConfig → Backend Template (Customer Receipt)
 */
function customerLayoutToBackend(config: CustomerLayoutConfig): BackendTemplate {
  return {
    sections: {
      header: {
        show_logo: config.header.show_logo,
        show_store_name: config.header.show_store_name,
        show_store_address: config.header.show_store_address,
        show_store_phone: config.header.show_store_phone,
        show_store_slogan: config.header.show_store_slogan,
        show_transaction_id: true,
        show_date_time: config.header.show_transaction_date,
        show_transaction_date: config.header.show_transaction_date,
        show_cashier: config.header.show_cashier_name,
        show_cashier_name: config.header.show_cashier_name,
        show_customer_name: config.header.show_customer_name,
        show_table_number: config.header.show_table_number,
      },
      items: {
        show_item_name: config.item.show_item_name,
        show_quantity: config.item.show_item_quantity,
        show_add_ons: config.item.show_item_addons,
        show_item_discount: true,
        show_item_subtotal: config.item.show_item_price,
        show_price: config.item.show_item_price,
        show_notes: config.item.show_item_notes,
        show_member_discount: config.item.show_member_discount,
        item_name_format: config.item.item_name_format,
      },
      payment: {
        show_subtotal: config.summary.show_subtotal,
        show_global_discount: config.summary.show_discount,
        show_discount_reason: config.summary.show_discount_reason,
        show_member_savings: config.summary.show_member_savings,
        show_tax: config.summary.show_tax,
        show_tax_breakdown: config.summary.show_tax_breakdown,
        show_rounding: config.summary.show_rounding,
        show_service_charge: true,
        show_grand_total: config.summary.show_total,
        show_payment_method: config.summary.show_payment_method,
        show_payment_reference: true,
        total_display_format: config.summary.total_display_format,
      },
      footer: {
        show_thank_you_message: config.footer.show_thank_you_message,
        show_qr_code: false,
      }
    }
  }
}

/**
 * Convert Frontend LayoutConfig → Backend Template (Barista Ticket)
 */
function baristaLayoutToBackend(config: BaristaLayoutConfig): BackendTemplate {
  return {
    sections: {
      header: {
        show_queue_number: config.header.show_order_number,
        show_customer_name: config.header.show_customer_name,
        show_table_number: config.header.show_table_number,
        show_time: config.header.show_transaction_date,
        show_channel: true,
      },
      items: {
        show_item_name: true,
        show_quantity: config.item.show_item_quantity,
        show_add_ons: config.item.show_item_addons,
        show_notes: config.item.show_item_notes,
        show_price: false,
      },
      footer: {
        show_preparation_reminder: config.footer.show_preparation_reminder,
        preparation_text: config.footer.preparation_text,
      }
    }
  }
}

function backendToKitchenLayout(backend: BackendTemplate): KitchenLayoutConfig {
  return backendToBaristaLayout(backend)
}

function kitchenLayoutToBackend(config: KitchenLayoutConfig): BackendTemplate {
  return baristaLayoutToBackend(config)
}

function getDefaultKitchenLayout(): KitchenLayoutConfig {
  return getDefaultBaristaLayout()
}

/**
 * Get default Customer Layout Config
 */
function getDefaultCustomerLayout(): CustomerLayoutConfig {
  return {
    header: {
      show_logo: true,
      show_store_name: true,
      show_store_address: true,
      show_store_phone: true,
      show_store_slogan: false,
      show_transaction_date: true,
      show_cashier_name: true,
      show_customer_name: true,
      show_table_number: true,
    },
    item: {
      show_item_name: true,
      show_item_quantity: true,
      show_item_price: true,
      show_item_addons: false,
      show_item_notes: true,
      show_member_discount: true,
      item_name_format: 'short'
    },
    summary: {
      show_subtotal: true,
      show_discount: true,
      show_discount_reason: false,
      show_member_savings: true,
      show_tax: true,
      show_tax_breakdown: false,
      show_rounding: true,
      show_total: true,
      show_payment_method: true,
      total_display_format: 'compact'
    },
    footer: {
      show_thank_you_message: true
    }
  }
}

/**
 * Get default Barista Layout Config
 */
function getDefaultBaristaLayout(): BaristaLayoutConfig {
  return {
    header: {
      show_order_number: true,
      show_customer_name: true,
      show_table_number: true,
      show_transaction_date: true,
    },
    item: {
      show_item_quantity: true,
      show_item_addons: true,
      show_item_notes: true,
    },
    footer: {
      show_preparation_reminder: true,
      preparation_text: 'Siapkan sesuai resep standar',
    }
  }
}

/**
 * Print Layout Service - Main export
 */
export const printLayoutService = {
  /**
   * Get layout config by printer ID (per-printer customization)
   * NEW METHOD: Fetches template specific to a printer
   * 
   * @param printerId - ID of the printer to get template for
   */
  async getLayoutByPrinterId(printerId: string): Promise<LayoutLoadResult> {
    try {
      const templateResponse = await printLayoutApi.getTemplateByPrinterId(printerId)
      const tmplType = templateResponse.template_type as 'receipt' | 'barista' | 'kitchen'
      const previewContent = templateResponse.preview_content || null
      const rawContent = templateResponse.content || null
      const printerSpecs = {
        paper_width: templateResponse.paper_width || 80,
        font_size: templateResponse.font_size || 12,
        connection_type: templateResponse.connection_type || null,
      }

      let layout: CustomerLayoutConfig | BaristaLayoutConfig | KitchenLayoutConfig
      if (tmplType === 'receipt') {
        layout = backendToCustomerLayout(templateResponse.content as BackendTemplate)
      } else if (tmplType === 'kitchen') {
        layout = backendToKitchenLayout(templateResponse.content as BackendTemplate)
      } else {
        layout = backendToBaristaLayout(templateResponse.content as BackendTemplate)
      }

      return { layout, templateType: tmplType, previewContent, rawContent, printerSpecs }
    } catch (error) {
      return {
        layout: getDefaultCustomerLayout(),
        templateType: 'receipt',
        previewContent: null,
        rawContent: null,
        printerSpecs: null,
      }
    }
  },

   /**
    * Save layout config by printer ID (per-printer customization)
    * NEW METHOD: Saves template to specific printer
    * 
    * Flow:
    * 1. Convert UI config to backend format (if config is UI format)
    * 2. Send to API (backend auto-syncs preview_content)
    * 3. Update currentPreviewContent from response
    * 4. Return response with success flag for caller to handle
    * 
    * @param printerId - ID of the printer
    * @param config - Layout config (UI format) OR raw backend content (with sections.header, sections.items, etc)
    * @returns API response with success flag and data
    */
  async saveLayoutByPrinterId(
    printerId: string,
    templateType: 'receipt' | 'barista' | 'kitchen',
    config: CustomerLayoutConfig | BaristaLayoutConfig | KitchenLayoutConfig | Record<string, any>
  ): Promise<LayoutSaveResult> {
    const isRawBackendFormat = (config as any).sections !== undefined

    let backendContent: BackendTemplate
    if (isRawBackendFormat) {
      backendContent = config as BackendTemplate
    } else if (templateType === 'receipt') {
      backendContent = customerLayoutToBackend(config as CustomerLayoutConfig)
    } else if (templateType === 'kitchen') {
      backendContent = kitchenLayoutToBackend(config as KitchenLayoutConfig)
    } else {
      backendContent = baristaLayoutToBackend(config as BaristaLayoutConfig)
    }

    const response = await printLayoutApi.updateTemplateByPrinterId(printerId, backendContent)

    if (!response || response.success === false) {
      throw new Error(response?.error?.message || 'Gagal menyimpan pengaturan')
    }

    const templateData = response.data || response
    return {
      previewContent: templateData.preview_content || null,
      rawContent: templateData.content || null,
      printerSpecs: templateData.paper_width
        ? { paper_width: templateData.paper_width, font_size: templateData.font_size || 12 }
        : null,
    }
  },

  /** Convert CustomerLayoutConfig → backend sections (untuk update rawContent lokal) */
  toReceiptSections(config: CustomerLayoutConfig): Record<string, any> {
    return customerLayoutToBackend(config).sections
  },

  /** Convert BaristaLayoutConfig → backend sections (untuk update rawContent lokal) */
  toBaristaSections(config: BaristaLayoutConfig): Record<string, any> {
    return baristaLayoutToBackend(config).sections
  },

  /** Convert KitchenLayoutConfig → backend sections */
  toKitchenSections(config: KitchenLayoutConfig): Record<string, any> {
    return kitchenLayoutToBackend(config).sections
  },
}
