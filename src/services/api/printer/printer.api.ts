import apiClient from '../client'

// Type definitions
export interface Printer {
  id: string
  name: string
  description?: string
  printer_type: 'receipt' | 'barista' | 'kitchen' | 'label' | 'a4' | 'network'
  connection_type: 'usb' | 'network' | 'bluetooth'
  ip_address?: string
  port_number?: number
  device_path?: string
  paper_width?: number
  paper_height?: number
  dpi: number
  font_size: number
  status: 'active' | 'inactive' | 'offline'
  is_default: boolean
  auto_print: boolean
  print_copies?: number
  created_at: string
  updated_at: string
  last_used_at?: string
}

export interface PrinterTemplate {
  id: string
  name: string
  description?: string
  template_type: 'receipt' | 'barista' | 'report' | 'custom'
  content: Record<string, any>
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PrinterJob {
  id: string
  printer_id?: string
  transaction_id?: string
  template_id?: string
  job_type: 'receipt' | 'barista' | 'report' | 'test'
  status: 'pending' | 'printing' | 'completed' | 'failed' | 'cancelled'
  content: any
  error_message?: string
  retry_count: number
  created_by?: string
  created_at: string
  completed_at?: string
}

export interface PrinterRouting {
  id: string
  print_type: 'customer_receipt' | 'barista_ticket' | 'kitchen_ticket' | 'label'
  printer_id: string
  template_id?: string
  is_enabled: boolean
  auto_print: boolean
  print_copies: number
  created_at: string
  updated_at: string
  printer_name?: string
  template_name?: string
}

// API Functions
export const printerApi = {
  // Printer CRUD
  getAllPrinters: async (type?: string) => {
    const params = new URLSearchParams()
    if (type) params.append('type', type)
    return apiClient.get(`/printers?${params.toString()}`)
  },

  getPrinterById: async (id: string) => {
    return apiClient.get(`/printers/${id}`)
  },

  createPrinter: async (data: Omit<Printer, 'id' | 'created_at' | 'updated_at' | 'last_used_at'>) => {
    return apiClient.post('/printers', data)
  },

  updatePrinter: async (id: string, data: Partial<Printer>) => {
    return apiClient.put(`/printers/${id}`, data)
  },

  deletePrinter: async (id: string) => {
    return apiClient.delete(`/printers/${id}`)
  },

  getPrinterStatus: async (id: string) => {
    return apiClient.get(`/printers/${id}/status`)
  },

  getPrinterTemplate: async (printerId: string) => {
    return apiClient.get(`/printers/${printerId}/template`)
  },

  // Templates
  getAllTemplates: async (type?: string) => {
    const params = new URLSearchParams()
    if (type) params.append('template_type', type)
    return apiClient.get(`/printers/templates?${params.toString()}`)
  },

  getTemplateById: async (id: string) => {
    return apiClient.get(`/printers/templates/${id}`)
  },

  createTemplate: async (data: Omit<PrinterTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    return apiClient.post('/printers/templates', data)
  },

  updateTemplate: async (id: string, data: Partial<PrinterTemplate>) => {
    return apiClient.put(`/printers/templates/${id}`, data)
  },

  deleteTemplate: async (id: string) => {
    return apiClient.delete(`/printers/templates/${id}`)
  },

  // Print Jobs
  getPrintJobs: async (printerId?: string, status?: string, limit?: number, offset?: number) => {
    const params = new URLSearchParams()
    if (printerId) params.append('printer_id', printerId)
    if (status) params.append('status', status)
    if (limit) params.append('limit', limit.toString())
    if (offset) params.append('offset', offset.toString())
    return apiClient.get(`/printers/jobs?${params.toString()}`)
  },

  createPrintJob: async (data: Omit<PrinterJob, 'id' | 'created_at' | 'completed_at' | 'created_by'>) => {
    return apiClient.post('/printers/jobs', data)
  },

  // Routing
  getPrinterRouting: async () => {
    return apiClient.get('/printers/routing')
  },

  updatePrinterRouting: async (printType: string, data: Partial<PrinterRouting>) => {
    return apiClient.put(`/printers/routing/${printType}`, data)
  },
}
