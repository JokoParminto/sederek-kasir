/**
 * Printer Layout API - HTTP calls only
 * Handles GET/PUT requests for printer template endpoints
 * 
 * NEW ENDPOINTS (Per-Printer):
 * - GET /api/v1/printers/:printerId/template - Get specific printer's template
 * - PUT /api/v1/printers/:printerId/template - Update specific printer's template
 * 
 * OLD ENDPOINTS (Legacy - still available for backward compatibility):
 * - GET /api/v1/printers/templates - Get templates by type
 * - PUT /api/v1/printers/templates/:id - Update template by ID
 */

import apiClient from '@/services/api/client'

export interface PrinterTemplateResponse {
   // API response wrapper
   success?: boolean
   data?: any
   message?: string
   error?: {
     code: string
     message: string
     details?: any
   }
   
   // Template fields (with template_ prefix when from join)
   template_id?: string
   template_name?: string
   template_description?: string
   template_type: 'receipt' | 'barista'
   template_is_default?: boolean
   template_is_active?: boolean
   template_created_at?: string
   template_updated_at?: string
   
   // Legacy template fields (for backward compatibility)
   id?: string
   name?: string
   description?: string
   id_printer?: string
   is_default?: boolean
   is_active?: boolean
   created_at?: string
   updated_at?: string
   
   // Template content
   content: {
     sections: {
       header: Record<string, any>
       items: Record<string, any>
       payment?: Record<string, any>
       footer: Record<string, any>
     }
   }
   preview_content?: Record<string, any>
   
    // Printer fields (from /printers/:id/template endpoint)
    printer_type?: 'receipt' | 'barista'
    connection_type?: string
    paper_width?: number
    font_size?: number
    auto_print?: boolean
    status?: string
    last_used_at?: string | null
}

/**
 * Get template for a specific printer (per-printer customization)
 * GET /api/v1/printers/:printerId/template
 * 
 * @param printerId - ID of the printer
 * @returns Template for this specific printer
 */
export const getTemplateByPrinterId = async (
  printerId: string
): Promise<PrinterTemplateResponse> => {
  try {
    const response = await apiClient.get(`/printers/${printerId}/template`)
    return response.data?.data
  } catch (error) {

    throw error
  }
}

/**
 * Update template for a specific printer (per-printer customization)
 * PUT /api/v1/printers/:printerId/template
 * 
 * @param printerId - ID of the printer
 * @param content - Updated JSONB template content
 * @returns Updated template
 */
export const updateTemplateByPrinterId = async (
  printerId: string,
  content: Record<string, any>
): Promise<PrinterTemplateResponse> => {
  try {
    const response = await apiClient.put(`/printers/${printerId}/template`, {
      content
    })
    return response.data?.data
  } catch (error) {

    throw error
  }
}

/**
 * [LEGACY] Get printer template by type (receipt/barista)
 * GET /api/v1/printers/templates?template_type=receipt
 * 
 * Note: Use getTemplateByPrinterId() for new code targeting specific printers
 */
export const getLayoutTemplate = async (
  templateType: 'receipt' | 'barista'
): Promise<PrinterTemplateResponse> => {
  try {
    // Map UI template type to API template type
    const apiTemplateType = templateType === 'receipt' ? 'receipt' : 'barista'
    
    const response = await apiClient.get('/printers/templates', {
      params: {
        template_type: apiTemplateType,
        is_active: true
      }
    })

    // API returns array, get first active/default one
    if (response.data?.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
      // Prefer default template, otherwise take first
      const defaultTemplate = response.data.data.find((t: PrinterTemplateResponse) => t.is_default)
      return defaultTemplate || response.data.data[0]
    }

    throw new Error(`No template found for type: ${templateType}`)
  } catch (error) {

    throw error
  }
}

/**
 * [LEGACY] Get printer template by ID
 * GET /api/v1/printers/templates/:id
 */
export const getLayoutTemplateById = async (
  templateId: string
): Promise<PrinterTemplateResponse> => {
  try {
    const response = await apiClient.get(`/printers/templates/${templateId}`)
    return response.data?.data
  } catch (error) {

    throw error
  }
}

/**
 * [LEGACY] Create printer template
 * POST /api/v1/printers/templates
 */
export const createLayoutTemplate = async (
  templateData: {
    name: string
    description?: string
    template_type: 'receipt' | 'barista'
    content: any
    is_default?: boolean
  }
): Promise<PrinterTemplateResponse> => {
  try {
    const response = await apiClient.post('/printers/templates', templateData)
    return response.data?.data
  } catch (error) {

    throw error
  }
}

/**
 * [LEGACY] Update printer template by ID
 * PUT /api/v1/printers/templates/:id
 * 
 * Note: Use updateTemplateByPrinterId() for new code targeting specific printers
 */
export const updateLayoutTemplate = async (
  templateId: string,
  updateData: {
    name?: string
    description?: string
    content?: any
    is_default?: boolean
    is_active?: boolean
  }
): Promise<PrinterTemplateResponse> => {
  try {
    const response = await apiClient.put(`/printers/templates/${templateId}`, updateData)
    return response.data?.data
  } catch (error) {

    throw error
  }
}

export const printLayoutApi = {
  // New per-printer endpoints
  getTemplateByPrinterId,
  updateTemplateByPrinterId,
  // Legacy endpoints (backward compatibility)
  getLayoutTemplate,
  getLayoutTemplateById,
  createLayoutTemplate,
  updateLayoutTemplate
}
