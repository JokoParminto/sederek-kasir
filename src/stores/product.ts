import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Capacitor } from '@capacitor/core'
import type { Product, Category, StockStatus } from '@/types'
import { STOCK_WARNING_THRESHOLD } from '@/utils/constants'
import { productApi } from '@/services/api/product.api'

const isNative = Capacitor.isNativePlatform()

export const useProductStore = defineStore('product', () => {
  // State
  const products = ref<Product[]>([])
  const categories = ref<Category[]>([])
  const selectedCategoryId = ref<string | null>(null)
  const searchQuery = ref('')
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const activeProducts = computed(() =>
    products.value.filter(p => p.status === 'active')
  )

  const filteredProducts = computed(() => {
    let filtered = activeProducts.value

    // NOTE: Category filtering is done via API call (fetchProductsByCategory)
    // products.value already contains only products from selected category
    // So we only filter by search query here

    // Filter by search query
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      filtered = filtered.filter(
        p =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query)
      )
    }

    return filtered
  })

  const getProductById = (id: string): Product | undefined =>
    products.value.find(p => p.id === id)

  const getStockStatus = (stock: number): StockStatus => {
    if (stock === 0) return 'out'
    if (stock < STOCK_WARNING_THRESHOLD) return 'low'
    return 'normal'
  }

  const isProductAvailable = (productId: string): boolean => {
    const product = getProductById(productId)
    return !!product && product.status === 'active' && product.stock > 0
  }

  const lowStockProducts = computed(() =>
    products.value.filter(
      p => p.status === 'active' && p.stock > 0 && p.stock < STOCK_WARNING_THRESHOLD
    )
  )

  const outOfStockProducts = computed(() =>
    products.value.filter(p => p.status === 'active' && p.stock === 0)
  )

  // Actions
  const setProducts = (newProducts: Product[]): void => {
    products.value = newProducts
  }

  const setCategories = (newCategories: Category[]): void => {
    categories.value = newCategories
  }

  const fetchProducts = async (): Promise<void> => {
    try {
      isLoading.value = true
      error.value = null

      const response = await productApi.getAllProducts()
      products.value = response.data

      if (isNative) {
        const { offlineDb } = await import('@/services/offline-db.service')
        await offlineDb.products.cache(response.data)
      }
    } catch (err) {
      if (isNative && !products.value.length) {
        try {
          const { offlineDb } = await import('@/services/offline-db.service')
          const cached = await offlineDb.products.getAll()
          if (cached.length) { products.value = cached; return }
        } catch { /* no cache available */ }
      }
      error.value = err instanceof Error ? err.message : 'Failed to fetch products'
    } finally {
      isLoading.value = false
    }
  }

  const fetchProductsByCategory = async (categoryId: string): Promise<void> => {
    try {
      isLoading.value = true
      error.value = null

      const response = await productApi.getAllProducts({ categoryId })
      products.value = response.data

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch products'

    } finally {
      isLoading.value = false
    }
  }

  const searchProducts = async (query: string, categoryId?: string): Promise<void> => {
    try {
      isLoading.value = true
      error.value = null

      const response = await productApi.getAllProducts({ search: query, categoryId })
      products.value = response.data

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to search products'

    } finally {
      isLoading.value = false
    }
  }

  const fetchCategories = async (): Promise<void> => {
    try {
      isLoading.value = true
      error.value = null
      const data = await productApi.getAllCategories()
      categories.value = data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch categories'

    } finally {
      isLoading.value = false
    }
  }

  const addProduct = async (product: Partial<Product>): Promise<void> => {
    try {
      isLoading.value = true
      error.value = null
      const createdProduct = await productApi.createProduct(product as any)
      products.value.push(createdProduct)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create product'

      throw err
    } finally {
      isLoading.value = false
    }
  }

  const updateProduct = async (id: string, updates: Partial<Product>): Promise<void> => {
    try {
      isLoading.value = true
      error.value = null
      const updatedProduct = await productApi.updateProduct(id, updates)
      const product = getProductById(id)
      if (product) {
        Object.assign(product, updatedProduct)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update product'

      throw err
    } finally {
      isLoading.value = false
    }
  }

  const deleteProduct = (id: string): void => {
    const index = products.value.findIndex(p => p.id === id)
    if (index > -1) {
      products.value.splice(index, 1)
    }
  }

  const toggleProductStatus = (id: string): void => {
    const product = getProductById(id)
    if (product) {
      product.status = product.status === 'active' ? 'inactive' : 'active'
      product.updatedAt = new Date()
    }
  }

  const updateProductStock = (id: string, quantity: number): void => {
    const product = getProductById(id)
    if (product) {
      product.stock = Math.max(0, product.stock + quantity)
      product.updatedAt = new Date()
    }
  }

  const addCategory = (category: Category): void => {
    categories.value.push(category)
  }

  const updateCategory = (id: string, updates: Partial<Category>): void => {
    const category = categories.value.find(c => c.id === id)
    if (category) {
      Object.assign(category, updates)
    }
  }

  const removeCategory = (id: string): void => {
    const index = categories.value.findIndex(c => c.id === id)
    if (index > -1) {
      categories.value.splice(index, 1)
    }
  }

  const setSelectedCategory = (categoryId: string | null): void => {
    selectedCategoryId.value = categoryId
  }

  const setSearchQuery = (query: string): void => {
    searchQuery.value = query
  }

  const clearFilters = (): void => {
    selectedCategoryId.value = null
    searchQuery.value = ''
  }

  return {
    // State
    products,
    categories,
    selectedCategoryId,
    searchQuery,
    isLoading,
    error,

    // Getters
    activeProducts,
    filteredProducts,
    getProductById,
    getStockStatus,
    isProductAvailable,
    lowStockProducts,
    outOfStockProducts,

    // Actions
    setProducts,
    setCategories,
    fetchProducts,
    fetchProductsByCategory,
    searchProducts,
    fetchCategories,
    addProduct,
    updateProduct,
    deleteProduct,
    toggleProductStatus,
    updateProductStock,
    addCategory,
    updateCategory,
    removeCategory,
    setSelectedCategory,
    setSearchQuery,
    clearFilters,
  }
})
