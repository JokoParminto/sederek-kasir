import apiClient from './client'
import type { Product, Category, AddOn } from '@/types'

// Helper function to normalize add-on data (snake_case to camelCase)
const normalizeAddOn = (data: any): AddOn => {
  return {
    id: data.id,
    name: data.name,
    price: parseFloat(data.price) || 0,  // IMPORTANT: Convert to number!
    description: data.description || '',
    icon: data.icon,
    sortOrder: data.sort_order || data.sortOrder || 0,
    status: data.status || 'active',
    createdAt: new Date(data.created_at || data.createdAt),
    updatedAt: new Date(data.updated_at || data.updatedAt),
  }
}

// Helper function to convert snake_case to camelCase for product data
const normalizeProduct = (data: any): Product => {
  // Normalize add-ons if present
  const addOns = data.addOns || data.add_ons || []
  const normalizedAddOns = Array.isArray(addOns) ? addOns.map(normalizeAddOn) : []

  return {
    id: data.id,
    categoryId: data.category_id || data.categoryId,
    categoryName: data.category_name || data.categoryName || '',
    name: data.name,
    description: data.description || '',
    image: data.image_url || data.image,
    hpp: parseFloat(data.hpp) || 0,
    price: parseFloat(data.price) || 0,
    memberPrice: data.member_price ? parseFloat(data.member_price) : undefined,
    stock: parseInt(data.stock) || 0,
    status: data.status || 'active',
    addOns: normalizedAddOns,  // Use normalized add-ons
    createdAt: new Date(data.created_at || data.createdAt),
    updatedAt: new Date(data.updated_at || data.updatedAt),
  }
}

// Helper function to normalize categories
const normalizeCategory = (data: any): Category => {
  return {
    id: data.id,
    name: data.name,
    description: data.description || '',
    sortOrder: data.sort_order || data.sortOrder || 0,
    createdAt: new Date(data.created_at || data.createdAt),
    updatedAt: new Date(data.updated_at || data.updatedAt),
  }
}

export const productApi = {
  async getAllProducts(params?: {
    categoryId?: string
    search?: string
    page?: number
    per_page?: number
    sort_by?: string
    sort_dir?: 'asc' | 'desc'
  }): Promise<{ data: Product[]; pagination: { total: number; page: number; limit: number } }> {
    try {
      // Build query params
      const queryParams = new URLSearchParams()
      if (params?.categoryId) {
        queryParams.append('category_id', params.categoryId)
      }
      if (params?.search && params.search.trim()) {
        queryParams.append('search', params.search.trim())
      }
      if (params?.page) {
        queryParams.append('page', params.page.toString())
      }
      if (params?.per_page) {
        queryParams.append('per_page', params.per_page.toString())
      }
      if (params?.sort_by) {
        queryParams.append('sort_by', params.sort_by)
      }
      if (params?.sort_dir) {
        queryParams.append('sort_dir', params.sort_dir)
      }

      const queryString = queryParams.toString()
      const endpoint = queryString ? `/products?${queryString}` : '/products'

      const response = await apiClient.get<{ data: any; pagination?: any }>(endpoint)

      // Extract and normalize the products array
      const rawProducts = response.data.data || []
      const products = rawProducts.map(normalizeProduct)

      return {
        data: products,
        pagination: response.data.pagination || { total: products.length, page: 1, limit: 10 },
      }
    } catch (error) {

      throw error
    }
  },

  async getProductById(id: string): Promise<Product> {
    try {
      const response = await apiClient.get<{ data: any }>(`/products/${id}`)
      return normalizeProduct(response.data.data)
    } catch (error) {

      throw error
    }
  },

  async createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    try {
      const response = await apiClient.post<{ data: any }>('/products', product)
      return normalizeProduct(response.data.data)
    } catch (error) {

      throw error
    }
  },

  async updateProduct(id: string, product: Partial<Product>): Promise<Product> {
    try {
      const response = await apiClient.put<{ data: any }>(`/products/${id}`, product)
      return normalizeProduct(response.data.data)
    } catch (error) {

      throw error
    }
  },

  async updateProductStatus(id: string, status: 'active' | 'inactive'): Promise<Product> {

    try {
      const response = await apiClient.patch<{ data: any }>(
        `/products/${id}/status`,
        { status }
      )
      return normalizeProduct(response.data.data)
    } catch (error) {

      throw error
    }
  },

  async deleteProduct(id: string): Promise<void> {

    try {
      await apiClient.delete(`/products/${id}`)
    } catch (error) {

      throw error
    }
  },

  async getAllCategories(): Promise<Category[]> {

    try {

      const response = await apiClient.get<{ data: any[] }>('/categories')


      // Categories endpoint returns array directly in data - normalize them
      const rawCategories = response.data.data
      const categories = rawCategories.map(normalizeCategory)


      return categories
    } catch (error) {

      throw error
    }
  },

  async updateProductStock(id: string, quantity: number): Promise<Product> {

    try {
      const response = await apiClient.patch<{ data: any }>(
        `/products/${id}/stock`,
        { quantity }
      )
      return normalizeProduct(response.data.data)
    } catch (error) {

      throw error
    }
  },

  async createCategory(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {

    try {

      const response = await apiClient.post<{ data: any }>('/categories', category)

      return normalizeCategory(response.data.data)
    } catch (error) {

      throw error
    }
  },

  async updateCategory(id: string, category: Partial<Category>): Promise<Category> {

    try {

      const response = await apiClient.put<{ data: any }>(`/categories/${id}`, category)

      return normalizeCategory(response.data.data)
    } catch (error) {

      throw error
    }
  },

  async deleteCategory(id: string): Promise<void> {

    try {

      await apiClient.delete(`/categories/${id}`)

    } catch (error) {

      throw error
    }
  },
}
