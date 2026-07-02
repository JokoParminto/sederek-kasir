/**
 * Printer Service - Centralized API wrapper with data conversion
 * Handles camelCase ↔ snake_case conversions for printer operations
 */

import { printerApi, type Printer as ApiPrinter } from '@/services/api/printer/printer.api'

/**
 * UI Model Types (camelCase - what components use)
 */
export interface FormDataPrinter {
  type: 'customer' | 'barista'
  printerName: string
  description?: string
  paperSize: number | '58mm' | '80mm' | '100mm'  // Support both string and number
  autoPrint: boolean
  copies: number
  fontSize?: number
  connectionType?: string
  ipAddress?: string
  portNumber?: number
  devicePath?: string  // BT MAC address or USB device path
}

export interface UiPrinter {
  id: string
  type: 'customer' | 'barista'
  printerName: string
  description?: string
  paperSize: number  // Changed to number to match API response
  paperHeight?: number
  autoPrint: boolean
  copies: number
  dpi: number
  fontSize: number
  connectionType: string
  ipAddress?: string | null
  portNumber?: number | null
  devicePath?: string | null
  status: 'connected' | 'disconnected' | 'error'
  isDefault: boolean
  icon: string
  title: string
  createdAt?: string
  updatedAt?: string
  lastUsedAt?: string | null
  // Keep API fields for reference/debugging
  printer_type?: 'receipt' | 'barista' | 'label' | 'a4' | 'network'
  paper_width?: number
  paper_height?: number
  auto_print?: boolean
  dpi_original?: number
  font_size?: number
  created_at?: string
  updated_at?: string
  last_used_at?: string | null
}

/**
 * Conversion: FormData (camelCase) → API Request (snake_case)
 */
function formDataToApiRequest(formData: FormDataPrinter): any {
  // Map UI type to printer_type: 'customer' → 'receipt', 'barista' → 'barista'
  const printerType = formData.type === 'customer' ? 'receipt' : formData.type === 'barista' ? 'barista' : 'receipt'
  
  // Convert paper size - support both string and number formats
  let paperWidth: number
  if (typeof formData.paperSize === 'number') {
    paperWidth = formData.paperSize
  } else if (formData.paperSize === '80mm') {
    paperWidth = 80
  } else if (formData.paperSize === '58mm') {
    paperWidth = 58
  } else if (formData.paperSize === '100mm') {
    paperWidth = 100
  } else {
    paperWidth = 80  // default fallback
  }
  
  const connType = formData.connectionType || 'network'
  const isNetwork = connType === 'network'
  const isBluetooth = connType === 'bluetooth'

  return {
    name: formData.printerName,
    description: formData.description,
    printer_type: printerType,
    connection_type: connType,
    // Explicitly null fields that don't apply to the connection type, so old values get cleared
    ip_address: isNetwork ? (formData.ipAddress || undefined) : null,
    port_number: isNetwork ? (formData.portNumber || undefined) : null,
    device_path: isBluetooth ? (formData.devicePath || undefined) : null,
    paper_width: paperWidth,
    font_size: formData.fontSize || 12,
    auto_print: formData.autoPrint,
  }
}

/**
 * Conversion: API Response (snake_case) → UI Model (camelCase)
 */
function apiResponseToUiModel(apiPrinter: ApiPrinter): UiPrinter {
  const paperWidth = apiPrinter.paper_width || (apiPrinter.connection_type === 'bluetooth' ? 58 : 80)
  const printerType = apiPrinter.printer_type || 'receipt'
  
  // Map printer_type back to UI: 'receipt' → 'customer', 'barista' → 'barista'
  // For other types (label, a4, network), default to 'customer'
  let uiType: 'customer' | 'barista' = 'customer'
  if (printerType === 'barista') {
    uiType = 'barista'
  } else if (printerType === 'receipt') {
    uiType = 'customer'
  } else {
    uiType = 'customer' // Default for label, a4, network
  }

  return {
    id: apiPrinter.id,
    type: uiType,
    printerName: apiPrinter.name,
    description: apiPrinter.description,
    paperSize: paperWidth,  // Store as number to preserve exact API value
    paperHeight: apiPrinter.paper_height,
    autoPrint: apiPrinter.auto_print || false,
    copies: apiPrinter.print_copies ?? 1,
    dpi: apiPrinter.dpi || 203,
    fontSize: apiPrinter.font_size || 12,
    connectionType: apiPrinter.connection_type,
    ipAddress: apiPrinter.ip_address,
    portNumber: apiPrinter.port_number,
    devicePath: apiPrinter.device_path,
    status: (apiPrinter.status === 'active' ? 'connected' : 'disconnected') as 'connected' | 'disconnected' | 'error',
    isDefault: apiPrinter.is_default || false,
    icon: printerType === 'receipt' || printerType === 'label' ? '🧾' : '☕',
    title: printerType === 'receipt' || printerType === 'label' ? 'CUSTOMER RECEIPT' : 'BARISTA TICKET',
    createdAt: apiPrinter.created_at,
    updatedAt: apiPrinter.updated_at,
    lastUsedAt: apiPrinter.last_used_at,
    // Keep original fields for reference
    printer_type: apiPrinter.printer_type,
    paper_width: apiPrinter.paper_width,
    paper_height: apiPrinter.paper_height,
    auto_print: apiPrinter.auto_print,
    dpi_original: apiPrinter.dpi,
    font_size: apiPrinter.font_size,
    created_at: apiPrinter.created_at,
    updated_at: apiPrinter.updated_at,
    last_used_at: apiPrinter.last_used_at,
  }
}

/**
 * Printer Service - All CRUD operations with automatic conversions
 */
export const printerService = {

  /**
   * Get all printers with automatic camelCase conversion
   */
  async getAllPrinters(): Promise<UiPrinter[]> {
    try {
      const response = await printerApi.getAllPrinters()

      if (response.data?.data && Array.isArray(response.data.data)) {
        return response.data.data.map(apiResponseToUiModel)
      }

      return []
    } catch (error) {

      throw error
    }
  },

  /**
   * Get single printer by ID with automatic camelCase conversion
   */
  async getPrinterById(id: string): Promise<UiPrinter> {
    try {
      const response = await printerApi.getPrinterById(id)

      if (response.data?.data) {
        return apiResponseToUiModel(response.data.data)
      }

      throw new Error('No data in response')
    } catch (error) {

      throw error
    }
  },

  /**
   * Create printer - accepts camelCase FormData, handles conversion to snake_case
   */
  async createPrinter(formData: FormDataPrinter): Promise<UiPrinter> {
    try {
      const apiRequest = formDataToApiRequest(formData)
      const response = await printerApi.createPrinter(apiRequest)

      if (response.data?.data) {
        return apiResponseToUiModel(response.data.data)
      }

      throw new Error('No data in response')
    } catch (error) {

      throw error
    }
  },

  /**
   * Update printer - accepts camelCase FormData, handles conversion to snake_case
   */
  async updatePrinter(id: string, formData: FormDataPrinter): Promise<UiPrinter> {
    try {
      const apiRequest = formDataToApiRequest(formData)
      const response = await printerApi.updatePrinter(id, apiRequest)

      if (response.data?.data) {
        return apiResponseToUiModel(response.data.data)
      }

      throw new Error('No data in response')
    } catch (error) {

      throw error
    }
  },

  /**
   * Delete printer
   */
  async deletePrinter(id: string) {
    try {
      const response = await printerApi.deletePrinter(id)
      return response.data
    } catch (error) {

      throw error
    }
  },

  /**
   * Get printer status
   */
  async getPrinterStatus(id: string) {
    try {
      const response = await printerApi.getPrinterStatus(id)
      return response.data?.data
    } catch (error) {

      throw error
    }
  },
}
