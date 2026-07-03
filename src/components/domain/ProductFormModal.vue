<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useProductStore } from '@/stores/product'
import { useAddOnStore } from '@/stores/addOn'
import { useAuthStore } from '@/stores/auth'
import { productApi } from '@/services/api/product.api'
import { formatRupiah } from '@/utils/formatters'
import type { Product } from '@/types'
import { useModal } from '@/composables/useModal'

interface Props {
  isOpen: boolean
  product?: Product | null
}

interface Emits {
  (e: 'close'): void
  (e: 'submit'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const productStore = useProductStore()
const addOnStore = useAddOnStore()
const authStore = useAuthStore()

const isEdit = computed(() => !!props.product)
const isAdmin = computed(() => authStore.user?.role === 'admin' || false)
const isSubmitting = ref(false)
const submitError = ref<string | null>(null)

// Form data
const form = ref({
  categoryId: '',
  name: '',
  image: '',
  description: '',
  hpp: 0,
  price: 0,
  stock: 0,
  status: 'active' as 'active' | 'inactive',
  addOnIds: [] as string[],
})

// Categories and add-ons from stores
const categories = computed(() => productStore.categories)
const allAddOns = computed(() => addOnStore.activeAddOns)

// Load add-ons on mount
onMounted(async () => {
  if (addOnStore.addOns.length === 0) {
    await addOnStore.fetchAddOns()
  }
})

// Watch for product changes (edit mode)
watch(() => props.product, (product) => {
  if (product) {
    form.value = {
      categoryId: product.categoryId,
      name: product.name,
      image: product.image || '',
      description: product.description,
      hpp: product.hpp || 0,
      price: product.price,
      stock: product.stock,
      status: product.status,
      addOnIds: product.addOns?.map(addon => addon.id) || [],
    }
  } else {
    // Reset form for create mode
    form.value = {
      categoryId: '',
      name: '',
      image: '',
      description: '',
      hpp: 0,
      price: 0,
      stock: 0,
      status: 'active',
      addOnIds: [],
    }
  }
}, { immediate: true })

const handleAddOnToggle = (addOnId: string) => {
  const index = form.value.addOnIds.indexOf(addOnId)
  if (index > -1) {
    form.value.addOnIds.splice(index, 1)
  } else {
    form.value.addOnIds.push(addOnId)
  }
}

const selectAllAddOns = () => {
  form.value.addOnIds = allAddOns.value.map(addon => addon.id)
}

const deselectAllAddOns = () => {
  form.value.addOnIds = []
}

const formatRupiahDisplay = (value: number) => {
  if (value === undefined || value === null || value < 0) return ''
  return formatRupiah(value)
}

const handleHppInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const rawValue = input.value.replace(/\D/g, '')
  form.value.hpp = rawValue ? parseInt(rawValue, 10) : 0
}

const handlePriceInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const rawValue = input.value.replace(/\D/g, '')
  form.value.price = rawValue ? parseInt(rawValue, 10) : 0
}

const handleSubmit = async () => {
  try {
    isSubmitting.value = true
    submitError.value = null

    const categoryName = categories.value.find(c => c.id === form.value.categoryId)?.name || ''

    // Convert form data to backend format (snake_case)
    const productData = {
      category_id: form.value.categoryId,
      name: form.value.name,
      description: form.value.description,
      image_url: form.value.image,
      hpp: isAdmin.value ? form.value.hpp : 0, // Non-admin can't set HPP
      price: form.value.price,
      stock: form.value.stock,
      status: form.value.status,
      addOnIds: form.value.addOnIds,
    }



    if (isEdit.value && props.product) {
      // Update existing product

      const updated = await productApi.updateProduct(props.product.id, productData as any)
      productStore.updateProduct(props.product.id, updated)


      // Refresh product list to ensure data consistency

      await productStore.fetchProducts()

    } else {
      // Create new product

      const created = await productApi.createProduct(productData as any)
      // Add to store's local state (don't call addProduct which would make another API call)
      productStore.products.push(created)

    }

    emit('submit')
    emit('close')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal menyimpan produk'
    submitError.value = message

  } finally {
    isSubmitting.value = false
  }
}

const handleClose = () => {
  emit('close')
}

const { handleBackdropClick } = useModal(handleClose)
</script>

<template>
  <div v-if="isOpen">
    <div class="modal-overlay" @click="handleBackdropClick">
        <div class="modal-content">
          <!-- Header -->
          <div class="modal-header">
            <h2 class="modal-title">{{ isEdit ? 'Edit Product' : 'Tambah Product' }}</h2>
            <button class="btn-close" @click="handleClose"><AppIcon name="x" :size="16" /></button>
          </div>

          <!-- Form -->
          <form @submit.prevent="handleSubmit" class="modal-body">
            <div class="form-group">
              <label class="form-label">Kategori</label>
              <select v-model="form.categoryId" class="form-select" required>
                <option value="">Pilih Kategori</option>
                <option v-for="category in categories" :key="category.id" :value="category.id">
                  {{ category.name }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Nama Product</label>
              <input
                v-model="form.name"
                type="text"
                class="form-input"
                placeholder="Contoh: Americano"
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label">Gambar</label>
              <input
                v-model="form.image"
                type="text"
                class="form-input"
                placeholder="URL gambar (contoh: https://images.unsplash.com/...)"
              />
              <p class="form-hint">Masukkan URL gambar dari Unsplash atau sumber lain</p>
            </div>

            <div class="form-group">
              <label class="form-label">Deskripsi</label>
              <textarea
                v-model="form.description"
                class="form-textarea"
                rows="3"
                placeholder="Deskripsi produk..."
              ></textarea>
            </div>

            <div class="form-row" :class="{ 'form-row--single': !isAdmin }">
              <div v-if="isAdmin" class="form-group">
                <label class="form-label">HPP (Harga Pokok)</label>
                <input
                  :value="formatRupiahDisplay(form.hpp)"
                  type="text"
                  class="form-input"
                  placeholder="Contoh: 10000"
                  @input="handleHppInput"
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label">Harga Jual</label>
                <input
                  :value="formatRupiahDisplay(form.price)"
                  type="text"
                  class="form-input"
                  placeholder="Contoh: 20000"
                  @input="handlePriceInput"
                  required
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Stok</label>
              <input
                v-model.number="form.stock"
                type="text" inputmode="numeric"
                class="form-input"
                placeholder="0"
                min="0"
                required
              />
            </div>

            <!-- Add-ons Section -->
            <div class="form-group">
              <div class="form-label-with-buttons">
                <label class="form-label">Pilih Add-ons</label>
                <div class="quick-select-buttons">
                  <button type="button" class="btn-quick-select-small" @click="selectAllAddOns" title="Pilih Semua">
                    ✓ Semua
                  </button>
                  <button type="button" class="btn-quick-deselect-small" @click="deselectAllAddOns" title="Batal Semua">
                    <AppIcon name="x" :size="12" /> Batal
                  </button>
                </div>
              </div>
              <div class="addons-container">
                <div v-if="allAddOns.length === 0" class="no-addons">
                  Tidak ada add-on yang tersedia
                </div>
                <label v-for="addon in allAddOns" :key="addon.id" class="addon-checkbox">
                  <input
                    :checked="form.addOnIds.includes(addon.id)"
                    type="checkbox"
                    @change="handleAddOnToggle(addon.id)"
                  />
                  <span class="addon-name">{{ addon.name }}</span>
                  <span class="addon-price">({{ addon.price === 0 ? 'Gratis' : `Rp ${addon.price.toLocaleString('id-ID')}` }})</span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Status</label>
              <div class="radio-group">
                <label class="radio-label">
                  <input v-model="form.status" type="radio" value="active" />
                  <span>Aktif</span>
                </label>
                <label class="radio-label">
                  <input v-model="form.status" type="radio" value="inactive" />
                  <span>Nonaktif</span>
                </label>
              </div>
            </div>

            <!-- Error Message -->
            <div v-if="submitError" class="error-message">
              <AppIcon name="warning" :size="14" /> {{ submitError }}
            </div>

            <!-- Footer Actions -->
            <div class="modal-footer">
              <button type="button" class="btn-cancel" @click="handleClose" :disabled="isSubmitting">
                Batal
              </button>
              <button type="submit" class="btn-submit" :disabled="isSubmitting">
                {{ isSubmitting ? 'Menyimpan...' : (isEdit ? 'Update' : 'Simpan') }}
              </button>
            </div>
          </form>
        </div>
      </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: static;
  background: transparent;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: auto;
  padding: 0;
  flex: 1;
}

.modal-content {
  background: white;
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.15);
  border: none;
  width: 100%;
  max-width: 100%;
  height: auto;
  max-height: 90dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  padding: 1rem;
  border-bottom: 1px solid rgba(123, 47, 190, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;

  h2 {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--color-text-primary);
  }
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: color 0.3s;

  &:hover {
    color: var(--color-text-primary);
  }
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-label {
  font-weight: 600;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  letter-spacing: 0.01em;
}

.form-input,
.form-select,
.form-textarea {
  padding: 0.65rem 0.85rem;
  border: 1px solid rgba(123, 47, 190, 0.15);
  border-radius: 10px;
  font-size: 0.85rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: white;
  font-family: inherit;
  color: var(--color-text-primary);

  &:focus {
    outline: none;
    border-color: var(--brand-primary);
    background: rgba(240, 253, 244, 0.5);
    box-shadow: 0 4px 12px rgba(123, 47, 190, 0.1);
  }
}

.form-textarea {
  resize: vertical;
  font-weight: 500;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;

  &.form-row--single {
    grid-template-columns: 1fr;
  }
}

.form-hint {
  margin-top: 0.35rem;
  font-size: 0.7rem;
  color: var(--color-text-secondary);
}

.success-text {
  margin-top: 0.35rem;
  font-size: 0.7rem;
  color: #16a34a;
  font-weight: 500;
}

.error-text {
  margin-top: 0.35rem;
  font-size: 0.7rem;
  color: #dc2626;
  font-weight: 500;
}

.radio-group {
  display: flex;
  gap: 0.75rem;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  border: 1.5px solid rgba(0, 0, 0, 0.1);
  background: rgba(0, 0, 0, 0.02);
  transition: all 0.2s ease;
  flex: 1;
  user-select: none;

  input[type="radio"] {
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    min-width: 16px;
    flex-shrink: 0;
    border: 2px solid #d0d0d0;
    border-radius: 50%;
    background: white;
    background-image: none;
    transition: all 0.2s ease;
    margin: 0;
  }

  span {
    color: var(--color-text-secondary);
    font-weight: 500;
  }

  &:has(input:checked) {
    border-color: var(--color-primary);
    background: rgba(123, 47, 190, 0.05);
    box-shadow: 0 0 0 2px rgba(123, 47, 190, 0.1);

    input[type="radio"] {
      border-color: var(--color-primary);
      background: white;
      background-image: radial-gradient(circle, var(--color-primary) 40%, transparent 42%);
    }

    span {
      color: var(--color-primary);
      font-weight: 600;
    }
  }

  &:hover:not(:has(input:checked)) {
    border-color: rgba(123, 47, 190, 0.3);
    background: rgba(123, 47, 190, 0.02);
  }
}

.form-label-with-buttons {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.quick-select-buttons {
  display: flex;
  gap: 0.4rem;
}

.btn-quick-select-small,
.btn-quick-deselect-small {
  padding: 0.35rem 0.6rem;
  border: 1px solid transparent;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-quick-select-small {
  background: rgba(123, 47, 190, 0.1);
  color: var(--color-primary);
  border-color: rgba(123, 47, 190, 0.3);

  &:hover {
    background: rgba(123, 47, 190, 0.15);
    border-color: rgba(123, 47, 190, 0.5);
  }

  &:active {
    transform: scale(0.98);
  }
}

.btn-quick-deselect-small {
  background: rgba(239, 68, 68, 0.05);
  color: #dc2626;
  border-color: rgba(239, 68, 68, 0.2);

  &:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
  }

  &:active {
    transform: scale(0.98);
  }
}

.addons-container {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.6rem;
  padding: 0.5rem;
  background: rgba(240, 253, 244, 0.5);
  border-radius: 8px;
  border: 1px solid rgba(123, 47, 190, 0.1);
  max-height: 250px;
  overflow-y: auto;
}

.no-addons {
  text-align: center;
  padding: 1rem;
  color: var(--color-text-secondary);
  font-size: 0.8rem;
}

.addon-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem;
  background: white;
  border-radius: 6px;
  border: 1px solid rgba(123, 47, 190, 0.15);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(123, 47, 190, 0.3);
    background: rgba(240, 253, 244, 0.5);
  }

  input[type="checkbox"] {
    cursor: pointer;
    accent-color: var(--color-primary);
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  &:has(input:checked) {
    background: rgba(123, 47, 190, 0.05);
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(123, 47, 190, 0.1);
  }
}

.addon-name {
  flex: 1;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

.addon-price {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.error-message {
  padding: 0.6rem 0.75rem;
  background: rgba(254, 242, 242, 0.9);
  color: #dc2626;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.modal-footer {
  position: sticky;
  bottom: 0;
  padding: 1.5rem;
  border-top: 1px solid rgba(123, 47, 190, 0.08);
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
  background: white;
  z-index: 10;
}

.btn-cancel,
.btn-submit {
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 0.01em;
}

.btn-cancel {
  background: rgba(0, 0, 0, 0.05);
  color: var(--color-text-primary);
  border: 1px solid rgba(123, 47, 190, 0.1);

  &:hover {
    background: rgba(0, 0, 0, 0.08);
    border-color: rgba(123, 47, 190, 0.2);
  }
}

.btn-submit {
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(123, 47, 190, 0.3);

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, var(--brand-primary-dark) 0%, var(--brand-primary-darker) 100%);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(123, 47, 190, 0.4);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}
</style>
