export interface Category {
  id: string
  name: string
  description?: string
  sortOrder?: number
  createdAt: Date
  updatedAt: Date
}

export interface Product {
  id: string
  categoryId: string
  categoryName: string  // For display purposes
  name: string
  description: string
  image?: string  // Base64 or URL (optional)
  hpp: number   // Harga Pokok Penjualan (Cost Price)
  price: number  // Harga Jual (Selling Price)
  memberPrice?: number  // Special price for members (optional)
  stock: number
  status: 'active' | 'inactive'
  addOns?: AddOn[]  // Add-ons assigned to this product
  createdAt: Date
  updatedAt: Date
}

export interface AddOn {
  id: string
  name: string
  price: number
  description?: string
  icon?: string
  sortOrder?: number
  status?: 'active' | 'inactive'
  createdAt: Date
  updatedAt: Date
}

export type StockStatus = 'normal' | 'low' | 'out'
