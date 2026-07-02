<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useProductStore } from '@/stores/product'
import { useTransactionStore } from '@/stores/transaction'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { formatRupiah } from '@/utils/formatters'
import { usePullToRefresh } from '@/composables/usePullToRefresh'
import ProductFormModal from '@/components/domain/ProductFormModal.vue'
import CategoryFormModal from '@/components/domain/CategoryFormModal.vue'
import AddOnFormModal from '@/components/domain/AddOnFormModal.vue'
import PullToRefreshIndicator from '@/components/common/PullToRefreshIndicator.vue'
import TableActionButtons from '@/components/table/TableActionButtons.vue'
import BaseDataTable from '@/components/base/BaseDataTable.vue'
import BaseSearchBar from '@/components/base/BaseSearchBar.vue'
import BaseChip from '@/components/base/BaseChip.vue'
import BaseChipsGroup from '@/components/base/BaseChipsGroup.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BasePagination from '@/components/base/BasePagination.vue'
import type { Product } from '@/types'
import type { Column } from '@/components/base/BaseTableHeader.vue'
import type { ActionIconKey } from '@/utils/tableActionIcons'

interface Action {
  id: string
  icon: ActionIconKey
  label: string
  variant?: 'default' | 'danger'
  disabled?: boolean
  onClick: () => void | Promise<void>
}

const productStore = useProductStore()
const transactionStore = useTransactionStore()
const authStore = useAuthStore()
const { success: showSuccessToast, error: showErrorToast } = useToast()

// Pull to refresh
const { pullRefreshOffset, isRefreshing, handleTouchStart, handleTouchMove, handleTouchEnd } = usePullToRefresh({
  cooldown: 3000,
  onRefresh: async () => {
    try {
      await Promise.all([
        loadProducts(),
        productStore.fetchCategories()
      ])
    } catch (error: any) {
      if (error?.response?.data?.error?.code === 'TOO_MANY_REQUESTS') {
        alert('Tunggu sebentar sebelum refresh lagi')
      }
      throw error
    }
  }
})

// Load products and categories on mount
onMounted(async () => {
  await Promise.all([
    loadProducts(),
    productStore.fetchCategories()
  ])
})

// Cleanup on component unmount
onBeforeUnmount(() => {
  // Cleanup if needed
})

// Modal state
const selectedProduct = ref<Product | null>(null)
const isMenuDropdownOpen = ref(false)
const isCategorySheetOpen = ref(false)
const isAddOnSheetOpen = ref(false)
const isProductSheetOpen = ref(false)
const deleteConfirmProductId = ref<string | null>(null)
const showDeleteConfirm = ref(false)

// Filters
const selectedCategoryId = ref<string | null>(null)
const searchQuery = ref('')

// Pagination - Server-side
const currentPage = ref(1)
const itemsPerPageState = ref(10)
const totalProducts = ref(0)

// Load products dengan pagination dari API
const loadProducts = async () => {
  try {
    productStore.isLoading = true
    const { productApi } = await import('@/services/api/product.api')
    const response = await productApi.getAllProducts({
      categoryId: selectedCategoryId.value || undefined,
      search: searchQuery.value || undefined,
      page: currentPage.value,
      per_page: itemsPerPageState.value,
    })
    productStore.products = response.data
    totalProducts.value = response.pagination.total
  } catch (error: any) {
    productStore.error = error instanceof Error ? error.message : 'Failed to fetch products'
  } finally {
    productStore.isLoading = false
  }
}


// Auth & permission
const isAdmin = computed(() => {
  return authStore.user?.role === 'admin' || false
})

// Table columns - with conditional hpp column for admins
const tableColumns = computed<Column[]>(() => [
  { key: 'name',        label: 'Nama',         sortable: false, width: '28%', align: 'left'   },
  { key: 'categoryName',label: 'Kategori',     sortable: false, width: '15%', align: 'left'   },
  ...(isAdmin.value ? [{ key: 'hpp', label: 'HPP', sortable: false, width: '10%', align: 'right' } as Column] : []),
  { key: 'price',       label: 'Harga',        sortable: false, width: '12%', align: 'right'  },
  { key: 'memberPrice', label: 'Harga Member', sortable: false, width: '13%', align: 'right'  },
  { key: 'stock',       label: 'Stok',         sortable: false, width: '10%', align: 'center' },
  { key: 'status',      label: 'Status',       sortable: false, width: '12%', align: 'center' },
])

const categories = computed(() => productStore.categories)



const getStockBadgeClass = (stock: number) => {
  return stock === 0 ? 'stock-habis' : 'stock-tersedia'
}

const getStockText = (stock: number) => {
  return stock === 0 ? 'Habis' : 'Tersedia'
}

const openEditModal = (product: Product) => {
  selectedProduct.value = product
  isProductSheetOpen.value = true
}

const closeModal = async (isSubmitted: boolean = false) => {
  isProductSheetOpen.value = false
  selectedProduct.value = null

  // Refresh products if form was submitted
  if (isSubmitted) {

    await refreshProducts()
  }
}

const handleEdit = (id: string) => {
  const product = productStore.getProductById(id)
  if (product) {
    openEditModal(product)
  }
}

const handleToggleStatus = async (id: string) => {
  try {
    const product = productStore.getProductById(id)
    if (!product) return

    const newStatus = product.status === 'active' ? 'inactive' : 'active'


    const { productApi } = await import('@/services/api/product.api')
    const updated = await productApi.updateProductStatus(id, newStatus)

    productStore.updateProduct(id, updated)
    const statusLabel = newStatus === 'active' ? 'Aktif' : 'Nonaktif'
    showSuccessToast(`Status produk diubah ke ${statusLabel}`)

  } catch (error) {

    showErrorToast('Gagal mengubah status produk')
  }
}

const handleDelete = async (id: string) => {
  deleteConfirmProductId.value = id
  showDeleteConfirm.value = true
}

const confirmDelete = async () => {
  if (!deleteConfirmProductId.value) return

  try {

    const { productApi } = await import('@/services/api/product.api')
    await productApi.deleteProduct(deleteConfirmProductId.value)

    showSuccessToast('Produk berhasil dihapus')
    await refreshProducts()
  } catch (error) {

    showErrorToast('Gagal menghapus produk')
  } finally {
    showDeleteConfirm.value = false
    deleteConfirmProductId.value = null
  }
}

const cancelDelete = () => {
  showDeleteConfirm.value = false
  deleteConfirmProductId.value = null
}

/**
 * Get actions array for a product row
 * Used by TableActionButtons component
 */
const getRowActions = (product: Product): Action[] => [
  {
    id: `edit-${product.id}`,
    icon: 'edit',
    label: 'Edit',
    onClick: () => handleEdit(product.id),
  },
  {
    id: `toggle-${product.id}`,
    icon: product.status === 'active' ? 'toggleActive' : 'toggleInactive',
    label: product.status === 'active' ? 'Nonaktifkan' : 'Aktifkan',
    onClick: () => handleToggleStatus(product.id),
  },
  {
    id: `delete-${product.id}`,
    icon: 'delete',
    label: 'Hapus',
    variant: 'danger',
    onClick: () => handleDelete(product.id),
  },
]

const selectCategory = async (categoryId: string | null) => {
  selectedCategoryId.value = categoryId
  currentPage.value = 1 // Reset to first page

  // Fetch products with category filter
  try {
    await loadProducts()
  } catch (error) {

  }
}

const handleSearch = async (query: string) => {
  searchQuery.value = query
  currentPage.value = 1 // Reset to first page

  // Fetch products with search query (on keyup)
  try {
    await loadProducts()

  } catch (error) {

  }
}


// Refresh products from API
const refreshProducts = async () => {

  await productStore.fetchProducts()
  currentPage.value = 1 // Reset to first page

}

// Category modal handlers
const openCategoryModal = () => {
  isCategorySheetOpen.value = true
}

const handleCategoryModalClose = async () => {
  isCategorySheetOpen.value = false
}

const handleCategorySubmitted = async () => {

  await productStore.fetchCategories()
}

// Add-on modal handlers
const openAddOnModal = () => {
  isAddOnSheetOpen.value = true
  isMenuDropdownOpen.value = false
}

const handleAddOnModalClose = async () => {
  isAddOnSheetOpen.value = false
}

const handleAddOnSubmitted = async () => {

}

// Menu dropdown handlers
const toggleMenuDropdown = () => {
  isMenuDropdownOpen.value = !isMenuDropdownOpen.value
}

const handleMenuItemClick = (action: 'product' | 'category' | 'addon') => {
  isMenuDropdownOpen.value = false
  if (action === 'product') {
    selectedProduct.value = null
    isProductSheetOpen.value = true
  } else if (action === 'category') {
    isCategorySheetOpen.value = true
  } else if (action === 'addon') {
    isAddOnSheetOpen.value = true
  }
}

const toggleCategorySheet = () => {
  isCategorySheetOpen.value = !isCategorySheetOpen.value
}

const toggleAddOnSheet = () => {
  isAddOnSheetOpen.value = !isAddOnSheetOpen.value
}

// Cart/Transaction handlers
const handleAddToCart = (product: Product) => {

  const itemId = transactionStore.addItem(product.id, product.name, product.price)

}

const isProductInCart = (productId: string): boolean => {
  return transactionStore.isProductInCart(productId)
}
</script>

<template>
  <div
    class="product-view"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >

    <PullToRefreshIndicator :pull-refresh-offset="pullRefreshOffset" :is-refreshing="isRefreshing" />
    <div class="container">
      <!-- Content Card -->
      <div class="content-card">
        <!-- Search Bar -->
        <BaseSearchBar
          :model-value="searchQuery"
          placeholder="Cari produk..."
          @update:model-value="handleSearch"
        />

        <!-- Category Chips + Add Button -->
        <div class="chips-container">
          <BaseChipsGroup>
            <BaseChip
              variant="primary"
              :closable="false"
              :class="['category-chip', { active: selectedCategoryId === null }]"
              @click="selectCategory(null)"
            >
              Semua
            </BaseChip>
            <BaseChip
              v-for="category in categories"
              :key="category.id"
              variant="primary"
              :closable="false"
              :class="['category-chip', { active: selectedCategoryId === category.id }]"
              @click="selectCategory(category.id)"
            >
              {{ category.name }}
            </BaseChip>
          </BaseChipsGroup>
          <div class="button-group">
            <!-- Menu button (all screen sizes) -->
            <div class="menu-dropdown-wrapper">
              <BaseButton
                variant="secondary"
                @click="toggleMenuDropdown"
              >
                <AppIcon name="settings" :size="15" /> Kelola
              </BaseButton>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="productStore.isLoading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading produk...</p>
        </div>

        <!-- Error State -->
        <div v-else-if="productStore.error" class="error-state">
          <div class="error-icon"><AppIcon name="warning" :size="40" /></div>
          <p>{{ productStore.error }}</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="productStore.products.length === 0" class="empty-state">
          <div class="empty-icon"><AppIcon name="package" :size="40" /></div>
          <p>Tidak ada produk ditemukan</p>
        </div>

        <!-- Product Table (Desktop) / Card Layout (Mobile) -->
        <div v-else class="list-content">
          <!-- Desktop Table using Global BaseDataTable -->
          <BaseDataTable
            :columns="tableColumns"
            :data="productStore.products"
            :current-page="1"
            :items-per-page="999"
            hide-pagination-on-single-page
            :fill-height="false"
          >
            <template #cell-name="{ row }">
              <div class="product-name-cell">
                <div v-if="row.image" class="product-thumbnail">
                  <img :src="row.image" :alt="row.name" />
                </div>
                <div v-else class="product-thumbnail product-thumbnail--placeholder">
                  <AppIcon name="menu" :size="20" />
                </div>
                <span class="product-name-text">{{ row.name }}</span>
              </div>
            </template>

            <template #cell-hpp="{ row }">
              <span>{{ formatRupiah(row.hpp) }}</span>
            </template>

            <template #cell-price="{ row }">
              <span class="price-cell">{{ formatRupiah(row.price) }}</span>
            </template>

            <template #cell-memberPrice="{ row }">
              <div v-if="row.memberPrice">
                <div class="regular-price">{{ formatRupiah(row.memberPrice) }}</div>
                <div class="discount-badge"><AppIcon name="tag" :size="12" /> -{{ formatRupiah(row.price - row.memberPrice) }}</div>
              </div>
              <span v-else class="no-member-price">—</span>
            </template>

            <template #cell-stock="{ row }">
              <span :class="['stock-badge', getStockBadgeClass(row.stock)]">
                <AppIcon :name="row.stock === 0 ? 'x-circle' : 'check-circle'" :size="13" />
                {{ getStockText(row.stock) }}
              </span>
            </template>

            <template #cell-status="{ row }">
              <span :class="['status-badge', row.status === 'active' ? 'status-active' : 'status-inactive']">
                {{ row.status === 'active' ? 'Aktif' : 'Nonaktif' }}
              </span>
            </template>

            <template #actions="{ row }">
              <TableActionButtons :actions="getRowActions(row)" />
            </template>
          </BaseDataTable>

          <!-- Mobile Card Layout -->
          <div class="card-grid">
            <div v-for="product in productStore.products" :key="product.id" class="product-card">
              <!-- Image -->
              <div v-if="product.image" class="card-image">
                <img :src="product.image" :alt="product.name" />
              </div>
              <div v-else class="card-image card-image--placeholder">
                <AppIcon name="menu" :size="20" />
              </div>

              <!-- Content -->
              <div class="card-content">
                <!-- Name & Category -->
                <div class="card-header">
                  <h3 class="card-title">{{ product.name }}</h3>
                  <span class="card-category">{{ product.categoryName }}</span>
                </div>

                <!-- Price Info -->
                <div class="card-prices">
                  <div class="price-row">
                    <span class="price-label">HPP:</span>
                    <span class="price-value">{{ formatRupiah(product.hpp) }}</span>
                  </div>
                  <div class="price-row">
                    <span class="price-label">Harga:</span>
                    <span class="price-value price-value--main">{{ formatRupiah(product.price) }}</span>
                  </div>
                  <div v-if="product.memberPrice" class="price-row">
                    <span class="price-label">Harga Member:</span>
                    <span class="price-value price-value--member">{{ formatRupiah(product.memberPrice) }}</span>
                  </div>
                </div>

                <!-- Status & Stock -->
                <div class="card-badges">
                  <span :class="['stock-badge', getStockBadgeClass(product.stock)]">
                    <AppIcon :name="product.stock === 0 ? 'x-circle' : 'check-circle'" :size="13" />
                    {{ getStockText(product.stock) }}
                  </span>
                  <span :class="['status-badge', product.status === 'active' ? 'status-active' : 'status-inactive']">
                    {{ product.status === 'active' ? 'Aktif' : 'Nonaktif' }}
                  </span>
                </div>

                <!-- Actions -->
                <div class="card-actions">
                  <button class="btn-card-action btn-edit" @click="handleEdit(product.id)" title="Edit">
                    <AppIcon name="edit" :size="14" /> Edit
                  </button>
                  <button
                    class="btn-card-action"
                    :class="product.status === 'active' ? 'btn-toggle-off' : 'btn-toggle-on'"
                    @click="handleToggleStatus(product.id)"
                    :title="product.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'"
                  >
                    <AppIcon :name="product.status === 'active' ? 'toggle-off' : 'toggle-on'" :size="16" />
                  </button>
                  <button class="btn-card-action btn-delete" @click="handleDelete(product.id)" title="Hapus">
                    <AppIcon name="delete" :size="14" /> Hapus
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <BasePagination
          :current-page="currentPage"
          :total-items="totalProducts"
          :items-per-page="itemsPerPageState"
          :loading="productStore.isLoading"
          @update:current-page="currentPage = $event; loadProducts()"
          @update:itemsPerPage="itemsPerPageState = $event; currentPage = 1; loadProducts()"
        />
      </div>
    </div>

    <!-- Mobile Menu Bottom Sheet -->
    <Teleport to="body">
      <Transition name="menu-slide">
        <div v-if="isMenuDropdownOpen" class="menu-overlay">
          <div class="menu-sheet">
            <div class="menu-header">
              <h3 class="menu-title"><AppIcon name="settings" :size="16" /> Kelola</h3>
              <button class="menu-close" @click="toggleMenuDropdown"><AppIcon name="close" :size="16" /> Tutup</button>
            </div>
            <div class="menu-items">
              <div class="menu-section">
                <button class="menu-item" @click="isMenuDropdownOpen = false; selectedProduct = null; isProductSheetOpen = true">
                  <span class="menu-icon"><AppIcon name="add" :size="16" /></span>
                  <span class="menu-text">Tambah Produk</span>
                </button>
                <button class="menu-item" @click="isMenuDropdownOpen = false; isCategorySheetOpen = true">
                  <span class="menu-icon"><AppIcon name="add" :size="16" /></span>
                  <span class="menu-text">Tambah Kategori</span>
                </button>
                <button class="menu-item" @click="isMenuDropdownOpen = false; isAddOnSheetOpen = true">
                  <span class="menu-icon"><AppIcon name="add" :size="16" /></span>
                  <span class="menu-text">Tambah Add-on</span>
                </button>
              </div>
              <div class="menu-divider"></div>
              <div class="menu-section">
                <button class="menu-item" @click="isMenuDropdownOpen = false; isCategorySheetOpen = true">
                  <span class="menu-icon"><AppIcon name="settings" :size="16" /></span>
                  <span class="menu-text">Kelola Kategori</span>
                </button>
                <button class="menu-item" @click="isMenuDropdownOpen = false; isAddOnSheetOpen = true">
                  <span class="menu-icon"><AppIcon name="settings" :size="16" /></span>
                  <span class="menu-text">Kelola Add-on</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>


    <!-- Delete Confirmation Dialog (Mobile-Friendly) -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showDeleteConfirm" class="delete-confirm-overlay">
          <div class="delete-confirm-dialog">
            <div class="confirm-header">
              <h3 class="confirm-title">Hapus Produk?</h3>
            </div>
            <div class="confirm-body">
              <p class="confirm-message">Tindakan ini tidak dapat dibatalkan. Apakah Anda yakin ingin menghapus produk ini?</p>
            </div>
            <div class="confirm-actions">
              <button class="btn-confirm-cancel" @click="cancelDelete">
                Batal
              </button>
              <button class="btn-confirm-delete" @click="confirmDelete">
                Hapus
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Product Form Sheet (menggunakan modal component dalam sheet) -->
    <Teleport to="body" v-if="isProductSheetOpen">
      <div class="sheet-overlay" @click.self="closeModal(false)">
        <div class="product-form-sheet">
          <ProductFormModal
            :is-open="true"
            :product="selectedProduct"
            @close="closeModal(false)"
            @submit="closeModal(true)"
          />
        </div>
      </div>
    </Teleport>

    <!-- Category Form Sheet -->
    <Teleport to="body" v-if="isCategorySheetOpen">
      <div class="sheet-overlay" @click.self="handleCategoryModalClose">
        <div class="category-form-sheet">
          <CategoryFormModal
            :is-open="true"
            @close="handleCategoryModalClose"
            @submitted="handleCategorySubmitted"
          />
        </div>
      </div>
    </Teleport>

    <!-- Add-On Form Sheet -->
    <Teleport to="body" v-if="isAddOnSheetOpen">
      <div class="sheet-overlay" @click.self="handleAddOnModalClose">
        <div class="addon-form-sheet">
          <AddOnFormModal
            :is-open="true"
            @close="handleAddOnModalClose"
            @submitted="handleAddOnSubmitted"
          />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.product-view {
  padding: var(--spacing-3);
  min-height: 100vh;
  background: #f8fafb;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 300px;
    background: linear-gradient(135deg, rgba(123, 47, 190, 0.03) 0%, rgba(52, 211, 153, 0.05) 100%);
    pointer-events: none;
  }
}

.container {
  position: relative;
  max-width: 1400px;
  margin: 0 auto;
}

.button-group {
  display: flex;
  gap: 0.75rem;
  flex-shrink: 0;
}

.product-name-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.product-thumbnail {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: linear-gradient(135deg, var(--brand-primary) 0%, #a78bfa 100%);
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &--placeholder {
    span {
      font-size: 1.25rem;
    }
  }
}

.product-name-text {
  font-weight: 600;
  color: var(--color-text-primary);
}

.price-cell {
  font-weight: 700;
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.member-price-cell {
  font-weight: 600;

  .regular-price {
    color: var(--color-text-primary);
    font-weight: 700;
  }

  .discount-badge {
    font-size: 0.65rem;
    color: #16a34a;
    margin-top: 0.2rem;
  }

  .no-member-price {
    color: var(--color-text-secondary);
    font-size: 0.9rem;
  }
}

.stock-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &.stock-tersedia {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(123, 47, 190, 0.08) 100%);
    color: var(--brand-primary-dark);
    border: 1px solid rgba(123, 47, 190, 0.3);
  }

  &.stock-habis {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(220, 38, 38, 0.08) 100%);
    color: #dc2626;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-transform: capitalize;

  &.status-active {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(123, 47, 190, 0.08) 100%);
    color: var(--brand-primary-dark);
    border: 1px solid rgba(123, 47, 190, 0.3);
  }

  &.status-inactive {
    background: linear-gradient(135deg, rgba(107, 114, 128, 0.12) 0%, rgba(75, 85, 99, 0.08) 100%);
    color: #4b5563;
    border: 1px solid rgba(107, 114, 128, 0.3);
  }
}


.content-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  border: 1px solid rgba(123, 47, 190, 0.08);
  box-shadow: 0 20px 60px rgba(123, 47, 190, 0.08), 0 4px 16px rgba(0, 0, 0, 0.04);
  overflow: visible;
  /* Fixed height - prevent global scroll */
  height: calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - var(--spacing-4) * 2);
  display: flex;
  flex-direction: column;
}

.content-card > :deep(.base-search-bar) {
  flex-shrink: 0;
}

.content-card > .chips-container {
  flex-shrink: 0;
}

.content-card > .list-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-card > :deep(.base-pagination) {
  flex-shrink: 0;
}

.alert {
  padding: var(--spacing-3) var(--spacing-4);
  margin: var(--spacing-3) var(--spacing-3) 0;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-3);
}

.alert-error {
  background: #fee;
  color: #c33;
  border: 1px solid #fcc;
}

.btn-close-alert {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 1.25rem;
  padding: 0;
}

.chips-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-3);
  padding: 0.75rem var(--spacing-3);
  border-bottom: 2px solid rgba(123, 47, 190, 0.15);
  background: white;
  flex-shrink: 0;
}


.category-chip {
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &.active {
    background: var(--brand-primary) !important;
    border-color: var(--brand-primary) !important;
    color: white !important;
    font-weight: 700 !important;
    box-shadow: 0 2px 8px rgba(27, 107, 58, 0.3) !important;
  }

  &:not(.active):hover {
    border-color: var(--brand-primary);
    color: var(--brand-primary);
    background: rgba(27, 107, 58, 0.05);
  }
}


.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: var(--color-text-secondary);
  gap: var(--spacing-3);

  p {
    font-size: 0.9rem;
    font-weight: 500;
    margin: 0;
  }
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(123, 47, 190, 0.1);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: #dc2626;
  gap: var(--spacing-2);
  padding: var(--spacing-4);
  background: rgba(239, 68, 68, 0.05);
  border-radius: 12px;
  margin: var(--spacing-2);

  p {
    font-size: 0.9rem;
    font-weight: 500;
    margin: 0;
    text-align: center;
  }
}

.error-icon {
  font-size: 3rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: var(--color-text-secondary);
  gap: var(--spacing-2);

  p {
    font-size: 0.9rem;
    font-weight: 500;
    margin: 0;
  }
}

.empty-icon {
  font-size: 4rem;
  opacity: 0.3;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-top: 2px solid rgba(123, 47, 190, 0.15);
  margin-top: 0;
  background: linear-gradient(135deg, rgba(123, 47, 190, 0.02) 0%, rgba(52, 211, 153, 0.02) 100%);
  flex-shrink: 0;
}

/* Pagination Button Styles */
.pagination-btn {
  padding: 0.5rem 0.8rem;
  background: white;
  border: 1px solid rgba(123, 47, 190, 0.25);
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  min-height: 36px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--color-text-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, var(--brand-primary) 0%, #a78bfa 100%);
    border-color: transparent;
    color: white;
    box-shadow: 0 4px 12px rgba(123, 47, 190, 0.3);
    transform: translateY(-2px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(123, 47, 190, 0.2);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    background: rgba(0, 0, 0, 0.03);
  }

  /* Icon vs Text based on screen size */
  .pagination-btn__text {
    display: inline;
  }

  .pagination-btn__icon {
    display: none;
    font-size: 1.2rem;
  }
}

/* Page Numbers Container */
.pagination-pages {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  justify-content: center;
  flex: 1;
  min-width: 200px;
}

/* Individual Page Button */
.pagination-page {
  min-width: 36px;
  min-height: 36px;
  background: white;
  border: 1px solid rgba(123, 47, 190, 0.2);
  border-radius: 5px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    background: rgba(240, 253, 244, 0.8);
    border-color: var(--color-primary);
    color: var(--color-primary);
    transform: scale(1.05);
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  &.active {
    background: linear-gradient(135deg, var(--brand-primary) 0%, #a78bfa 100%);
    border-color: transparent;
    color: white;
    box-shadow: 0 4px 12px rgba(123, 47, 190, 0.35);
    font-weight: 700;
  }

  &.pagination-page--ellipsis {
    cursor: default;
    pointer-events: none;
    background: transparent;
    border: none;
    font-size: 1rem;
    color: var(--color-text-secondary);
    min-width: 32px;
    font-weight: 400;

    &:hover {
      transform: none;
    }
  }
}

/* Pagination Info */
.pagination-info {
  display: none;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
  flex-shrink: 0;

  .pagination-info__text {
    display: inline;
    gap: 0.25rem;

    strong {
      color: var(--color-text-primary);
      font-weight: 700;
    }
  }
}

/* Show info on desktop */
@media (min-width: 1280px) {
  .pagination-info {
    display: block;
  }
}

/* Sheet Overlay & Form Sheets */
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1500;
  padding: 0;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.product-form-sheet,
.category-form-sheet,
.addon-form-sheet {
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Dropdown Menu Styles */
.menu-dropdown-wrapper {
  position: relative;
  display: flex;
}



/* Mobile Menu Bottom Sheet */
.menu-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1500;
  padding: 0;
}

.menu-sheet {
  width: 100%;
  background: white;
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.15);
  padding: 0;
  max-height: 80vh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  position: sticky;
  top: 0;
  background: white;
}

.menu-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.menu-close {
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  color: var(--color-text-primary);
  min-height: 36px;

  &:active {
    background: rgba(0, 0, 0, 0.05);
  }
}

.menu-items {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  gap: 0.5rem;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.875rem 1rem;
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
  min-height: 48px;
  border-radius: 8px;

  &:hover {
    background: rgba(123, 47, 190, 0.08);
  }

  &:active {
    background: rgba(123, 47, 190, 0.15);
  }
}

.menu-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
  width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.menu-text {
  flex: 1;
}

.menu-section {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.menu-divider {
  height: 1px;
  background: rgba(0, 0, 0, 0.1);
  margin: 0.75rem 0;
}

/* Menu slide animation */
.menu-slide-enter-active,
.menu-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.menu-slide-enter-from {
  opacity: 0;
  background: rgba(0, 0, 0, 0);
}

.menu-slide-leave-to {
  opacity: 0;
  background: rgba(0, 0, 0, 0);
}

.menu-slide-enter-active .menu-sheet,
.menu-slide-leave-active .menu-sheet {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.menu-slide-enter-from .menu-sheet,
.menu-slide-leave-to .menu-sheet {
  transform: translateY(100%);
}

/* List Content - Table & Cards */
.list-content {
  flex: 1;
  display: block;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.75rem;
}

.table-wrapper {
  overflow-x: auto;
  overflow-y: auto;
  width: 100%;
}

.card-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  width: 100%;
}

/* Responsive grid - mobile to desktop */
@media (min-width: 481px) and (max-width: 767px) {
  .card-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* ============================================
   TABLET (768px–1023px): Show table, hide cards
   Tablet landscape (1006px) shows same table as desktop,
   scaled down via root font-size (clamp on html).
   ============================================ */
@media (min-width: 768px) and (max-width: 1023px) {
  .card-grid {
    display: none;
  }

  .table-wrapper {
    display: block;
  }

  .action-buttons-desktop {
    display: flex;
    gap: 0.5rem;
  }
}

/* ============================================
   TABLET LANDSCAPE: Optimized for TARGET POS (1024px–1279px)
   ============================================ */
@media (min-width: 1024px) and (max-width: 1279px) {
  .card-grid {
    display: none;
  }
}

/* ============================================
   DESKTOP: Full Table (≥1280px)
   ============================================ */
@media (min-width: 1280px) {
  .card-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.product-card {
  background: white;
  border: 1px solid rgba(123, 47, 190, 0.08);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;

  &:active {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.card-image {
  width: 100%;
  height: 180px;
  object-fit: cover;
  background: linear-gradient(135deg, rgba(123, 47, 190, 0.05) 0%, rgba(52, 211, 153, 0.05) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &.card-image--placeholder {
    font-size: 3rem;
  }
}

.card-content {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
}

.card-header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.card-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.3;
}

.card-category {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  letter-spacing: 0.01em;
  font-weight: 500;
}

.card-prices {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(123, 47, 190, 0.03);
  border-radius: 8px;
}

.price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.price-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  font-weight: 600;
  letter-spacing: 0.01em;
}

.price-value {
  font-size: 0.85rem;
  color: var(--color-text-primary);
  font-weight: 600;
  text-align: right;

  &.price-value--main {
    font-size: 1rem;
    color: var(--brand-primary);
    font-weight: 700;
  }

  &.price-value--member {
    font-size: 0.9rem;
    color: var(--brand-primary-dark);
    font-weight: 700;
  }
}

.card-badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: auto;
}

/* Delete Confirmation Dialog */
.delete-confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1500;
  padding: 1rem;
}

.delete-confirm-dialog {
  width: 100%;
  max-width: 500px;
  background: white;
  border-radius: 20px;
  padding: 2rem;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.25);
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.confirm-header {
  margin-bottom: 1rem;
}

.confirm-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.confirm-body {
  margin-bottom: 1.5rem;
}

.confirm-message {
  margin: 0;
  font-size: 0.95rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.confirm-actions {
  display: flex;
  gap: 0.75rem;
  flex-direction: column-reverse;
}





.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
  background: rgba(0, 0, 0, 0);
}

/* Safe Area Support for Notched Devices */
@supports (padding: max(0px, env(safe-area-inset-bottom))) {
  .menu-sheet {
    padding-bottom: max(1rem, env(safe-area-inset-bottom));
  }

  .delete-confirm-dialog {
    padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
  }

  .modal-footer {
    padding-bottom: max(var(--spacing-3), env(safe-area-inset-bottom));
  }

  .toast-notification {
    bottom: max(1.5rem, env(safe-area-inset-bottom));
  }


}

/* Responsive - Mobile Bottom Sheet */
@media (max-width: 768px) {
  .delete-confirm-overlay {
    align-items: flex-end;
    padding: 0;
  }

  .delete-confirm-dialog {
    width: 100%;
    max-width: 100%;
    border-radius: 20px 20px 0 0;
    padding: 1.5rem;
    animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.1);
  }

  .confirm-actions {
    flex-direction: column-reverse;
  }

  .toast-notification {
    bottom: 1.5rem;
    top: auto;
    left: 1rem;
    right: 1rem;
    max-width: none;
  }
}

/* Desktop Centered Dialog */
@media (min-width: 769px) {
  .confirm-actions {
    flex-direction: row;
  }

  .toast-notification {
    bottom: auto;
    top: 1.5rem;
    left: auto;
    right: 1.5rem;
    max-width: 400px;
  }
}

/* Small Phone (320px - 480px) */
@media (max-width: 480px) {
  .product-view {
    padding: var(--spacing-3);
  }

  .category-chips {
    flex-direction: column;
    gap: var(--spacing-2);
    padding: var(--spacing-2);
  }

  .table-wrapper {
    display: none !important;
  }

  .card-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .card-image {
    height: 140px;
  }

  .card-content {
    padding: 0.875rem;
    gap: 0.5rem;
  }

  .card-title {
    font-size: 0.95rem;
  }

  .card-prices {
    padding: 0.625rem;
    gap: 0.375rem;
  }

  .price-label {
    font-size: 0.7rem;
  }

  .price-value {
    font-size: 0.8rem;

    &.price-value--main {
      font-size: 0.95rem;
    }
  }



  .pagination {
    flex-direction: column;
    gap: 0.5rem;
  }

  .pagination-btn {
    min-height: 44px;
  }

  .pagination-pages {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .pagination-page {
    min-width: 44px;
    min-height: 44px;
  }

  .container {
    max-width: 100%;
  }

  .content-card {
    border-radius: 12px;
  }
}

/* Standard Phone (480px - 768px) */
@media (min-width: 481px) and (max-width: 767px) {
  .table-wrapper {
    display: none;
  }

  .card-grid {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }

  .category-chips {
    flex-direction: row;
    flex-wrap: wrap;
    gap: var(--spacing-2);
  }

  .pagination-pages {
    flex-wrap: wrap;
  }
}

/* Desktop (1280px+) - Shared Layout Rules */
@media (min-width: 1280px) {
  .card-grid {
    display: none;
  }

  .table-wrapper {
    display: block;
  }

  .category-chips {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  .button-group {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
  }



  .data-table {
    width: 100%;

    th, td {
      padding: 1rem;
      font-size: 0.9rem;
    }
  }

  .product-thumbnail {
    width: 64px;
    height: 64px;
  }

  .action-buttons-desktop {
    display: flex;
    gap: 0.5rem;
    flex-direction: row;
  }

  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    margin-top: 0;
    background: linear-gradient(135deg, rgba(123, 47, 190, 0.02) 0%, rgba(52, 211, 153, 0.02) 100%);
    border-top: 2px solid rgba(123, 47, 190, 0.15);
    flex-shrink: 0;
  }

  .pagination-btn {
    padding: 0.5rem 0.9rem;
    font-size: 0.8rem;
    min-height: 36px;

    .pagination-btn__text {
      display: inline;
    }

    .pagination-btn__icon {
      display: none;
    }
  }

  .pagination-pages {
    display: flex;
    gap: 0.4rem;
    justify-content: center;
  }

  .pagination-page {
    min-width: 36px;
    min-height: 36px;
    font-size: 0.8rem;
  }

  .pagination-info {
    display: inline-block;
  }


}

/* Tablet Landscape - More compact pagination */
@media (min-width: 1024px) and (max-width: 1279px) {
  .pagination {
    flex-direction: row;
    justify-content: center;
    gap: 0.5rem;
    padding: 1rem;
    margin-top: 1.5rem;
  }

  .pagination-btn {
    padding: 0.6rem 0.9rem;
    font-size: 0.8rem;
    min-height: 40px;

    .pagination-btn__text {
      display: none;
    }

    .pagination-btn__icon {
      display: inline;
    }
  }

  .pagination-pages {
    gap: 0.3rem;
  }

  .pagination-page {
    min-width: 36px;
    min-height: 36px;
    font-size: 0.8rem;
    padding: 0.4rem;
  }

  .pagination-info {
    display: none;
  }
}

/* Tablet Portrait - Vertical pagination */
@media (min-width: 768px) and (max-width: 1023px) {
  .pagination {
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
  }

  .pagination-btn {
    padding: 0.6rem 1rem;
    font-size: 0.8rem;
    min-height: 40px;
    width: 100%;

    .pagination-btn__text {
      display: inline;
    }

    .pagination-btn__icon {
      display: none;
    }
  }

  .pagination-pages {
    gap: 0.4rem;
    width: 100%;
  }

  .pagination-page {
    min-width: 40px;
    min-height: 40px;
    font-size: 0.85rem;
    flex: 1;
  }

  .pagination-info {
    display: block;
    text-align: center;
    width: 100%;
  }
}

/* Mobile - Horizontal scroll pagination */
@media (max-width: 767px) {
  .pagination {
    flex-direction: row;
    justify-content: space-between;
    gap: 0.4rem;
    padding: 0.75rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;

    scrollbar-width: thin;
    &::-webkit-scrollbar {
      height: 4px;
    }
    &::-webkit-scrollbar-track {
      background: transparent;
    }
    &::-webkit-scrollbar-thumb {
      background: rgba(123, 47, 190, 0.2);
      border-radius: 4px;
    }
  }

  .pagination-btn {
    padding: 0.55rem 0.8rem;
    font-size: 0.75rem;
    min-height: 36px;
    flex-shrink: 0;

    .pagination-btn__text {
      display: none;
    }

    .pagination-btn__icon {
      display: inline;
      font-size: 1rem;
    }
  }

  .pagination-pages {
    gap: 0.3rem;
    flex-shrink: 0;
  }

  .pagination-page {
    min-width: 32px;
    min-height: 32px;
    font-size: 0.75rem;
    padding: 0;
  }

  .pagination-info {
    display: none;
  }
}

/* Tablet Optimization (768px - 1023px) - General responsive adjustments */
@media (min-width: 768px) and (max-width: 1023px) {
  .product-view {
    padding: var(--spacing-2) var(--spacing-3);
  }

  .search-input {
    padding: 0.6rem var(--spacing-2);
    font-size: 0.85rem;
    min-height: 40px;
  }

  .category-chips {
    padding: var(--spacing-1_5) var(--spacing-2);
    gap: var(--spacing-1_5);
    top: calc(3.5rem);
  }

  .chip {
    padding: 0.4rem 0.8rem;
    font-size: 0.75rem;
    min-height: 32px;
  }

  .data-table {
    th, td {
      padding: 0.75rem 0.6rem;
      font-size: 0.85rem;
    }

    th {
      font-size: 0.7rem;
    }
  }

  .product-thumbnail {
    width: 48px;
    height: 48px;

    span {
      font-size: 1rem;
    }
  }

  .product-name-text {
    font-size: 0.85rem;
  }

  .action-buttons-desktop {
    display: flex;
    gap: 0.4rem;
    flex-wrap: nowrap;
  }



  .stock-badge,
  .status-badge {
    padding: 0.2rem 0.5rem;
    font-size: 0.65rem;
    gap: 0;
  }

  .stock-badge :deep(.app-icon) {
    display: none;
  }

  .price-cell {
    font-size: 0.85rem;
  }

  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    margin-top: 1.5rem;
    flex-wrap: wrap;
  }

  .pagination-btn {
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
    min-height: 40px;
  }

  .pagination-pages {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  .pagination-page {
    min-width: 36px;
    min-height: 36px;
    font-size: 0.8rem;
    padding: 0.4rem 0.6rem;
  }

  .loading-state,
  .empty-state {
    padding: 2rem 1rem;
    min-height: 300px;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
  }

  .content-card {
    border-radius: 20px;
  }
}

/* Tablet Portrait & Small Tablets (600px - 768px) */
@media (min-width: 600px) and (max-width: 767px) {
  .data-table {
    th, td {
      padding: 0.8rem 0.7rem;
      font-size: 0.82rem;
    }

    th {
      font-size: 0.72rem;
    }
  }

  .product-thumbnail {
    width: 52px;
    height: 52px;
  }



  .search-input {
    padding: 0.65rem var(--spacing-2);
    font-size: 0.88rem;
    min-height: 42px;
  }

  .chip {
    padding: 0.45rem 0.9rem;
    font-size: 0.78rem;
    min-height: 34px;
  }
}

/* Large Desktop (1280px+) - Compact for Mobile App */
@media (min-width: 1280px) {
  .data-table {
    th, td {
      padding: 0.9rem;
      font-size: 0.9rem;
    }

    th {
      font-size: 0.75rem;
    }
  }

  .product-thumbnail {
    width: 48px;
    height: 48px;
  }

  .product-name-text {
    font-size: 0.9rem;
  }

  .action-buttons-desktop {
    display: flex;
    gap: 0.5rem;
    flex-wrap: nowrap;
  }



  .stock-badge,
  .status-badge {
    padding: 0.25rem 0.6rem;
    font-size: 0.7rem;
  }

  .price-cell {
    font-size: 0.9rem;
  }
}

/* Desktop (≥1280px) - Show action buttons, Hide menu */
@media (min-width: 1280px) {
  .action-buttons-desktop {
    display: flex;
  }

  .action-menu-wrapper {
    display: none;
  }
}

/* Tablet (1024px-1279px) - Hide buttons, Show menu */
@media (min-width: 1024px) and (max-width: 1279px) {
  .action-buttons-desktop {
    display: none;
  }

  .action-menu-wrapper {
    position: relative;
    display: block;
  }
}

/* Mobile (<1024px) - Hide buttons, Show menu */
@media (max-width: 1023px) {
  .action-buttons-desktop {
    display: none;
  }

  .action-menu-wrapper {
    position: relative;
    display: block;
  }
}
</style>
