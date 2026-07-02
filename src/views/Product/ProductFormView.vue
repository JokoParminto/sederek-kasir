<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProductStore } from '@/stores/product'
import { useAddOnStore } from '@/stores/addOn'
import { productApi } from '@/services/api/product.api'
import { useToast } from '@/composables/useToast'
import type { Product } from '@/types'

const router = useRouter()
const route = useRoute()
const productStore = useProductStore()
const addOnStore = useAddOnStore()
const { success: showSuccess, error: showError } = useToast()

const isEdit = computed(() => !!route.params.id)
const productId = computed(() => route.params.id as string)

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

// Load product if editing and fetch categories/add-ons
onMounted(async () => {
  // Fetch categories from API
  await productStore.fetchCategories()

  // Fetch active add-ons
  await addOnStore.fetchAddOns()

  // Load product if editing — fetch fresh from API (not cache) so addons are up-to-date
  if (isEdit.value) {
    try {
      const product = await productApi.getProductById(productId.value)
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
    } catch (err) {
      showError('Gagal memuat data produk')
      router.push('/product')
    }
  }
})

const handleAddOnToggle = (addOnId: string) => {
  const index = form.value.addOnIds.indexOf(addOnId)
  if (index > -1) {
    form.value.addOnIds.splice(index, 1)
  } else {
    form.value.addOnIds.push(addOnId)
  }
}

const isSaving = ref(false)

const handleSubmit = async () => {
  try {
    isSaving.value = true
    if (isEdit.value) {
      // Update
      await productStore.updateProduct(productId.value, {
        ...form.value,
        categoryName: categories.value.find(c => c.id === form.value.categoryId)?.name || '',
        updatedAt: new Date(),
      })
      showSuccess('Produk berhasil diperbarui')
    } else {
      // Create
      await productStore.addProduct({
        ...form.value,
        categoryName: categories.value.find(c => c.id === form.value.categoryId)?.name || '',
      })
      showSuccess('Produk berhasil ditambahkan')
    }
    router.push('/product')
  } catch (err) {
    showError((err as any)?.message || 'Gagal menyimpan produk')
  } finally {
    isSaving.value = false
  }
}

const handleCancel = () => {
  router.push('/product')
}
</script>

<template>
  <div class="product-form-view">
    <div class="container">
      <!-- Header -->
      <div class="page-header">
        <h1 class="page-title">{{ isEdit ? 'Edit Menu' : 'Tambah Menu' }}</h1>
      </div>

      <!-- Form -->
      <div class="form-container">
        <form @submit.prevent="handleSubmit">
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

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">HPP (Harga Pokok)</label>
              <input
                v-model.number="form.hpp"
                type="text" inputmode="numeric"
                class="form-input"
                placeholder="0"
                min="0"
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label">Harga Jual</label>
              <input
                v-model.number="form.price"
                type="text" inputmode="numeric"
                class="form-input"
                placeholder="0"
                min="0"
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

          <!-- Add-ons Section -->
          <div class="form-group">
            <label class="form-label">Pilih Add-ons</label>
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

          <div class="form-actions">
            <button type="button" class="btn-cancel" @click="handleCancel" :disabled="isSaving">
              Batal
            </button>
            <button type="submit" class="btn-submit" :disabled="isSaving">
              <span v-if="isSaving" class="btn-spinner"></span>
              {{ isSaving ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.product-form-view {
  padding: var(--spacing-4);
  min-height: 100vh;
  background: #f8fafb;
}

.container {
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: var(--spacing-4);
}


.form-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: var(--spacing-5);
}

.form-group {
  margin-bottom: var(--spacing-4);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-3);
}

.form-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 0.5rem;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 0.65rem 0.85rem;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  font-size: 0.85rem;
  transition: all 0.2s ease;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(123, 47, 190, 0.1);
  }

  &::placeholder {
    color: var(--color-text-hint);
  }
}

.form-textarea {
  resize: vertical;
}

.form-hint {
  margin-top: 0.35rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.radio-group {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  input[type="radio"] {
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    min-width: 20px;
    flex-shrink: 0;
    border: 2px solid #d0d0d0;
    border-radius: 50%;
    background: white;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    margin: 0;

    &:hover {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px rgba(123, 47, 190, 0.1);
    }

    &:checked {
      border-color: var(--color-primary);
      background: white;
      background-image: radial-gradient(circle, var(--color-primary) 40%, transparent 42%);
      box-shadow: 0 0 0 3px rgba(123, 47, 190, 0.1);
    }

    &:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(123, 47, 190, 0.2);
    }
  }

  span {
    color: var(--color-text-primary);
    font-weight: 500;
  }

  &:has(input:checked) {
    background: rgba(123, 47, 190, 0.05);
  }
}

/* Add-ons Section */
.addons-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--spacing-2);
  padding: var(--spacing-3);
  background: rgba(240, 253, 244, 0.5);
  border-radius: 8px;
  border: 1px solid rgba(123, 47, 190, 0.1);
}

.no-addons {
  grid-column: 1 / -1;
  text-align: center;
  padding: var(--spacing-3);
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}

.addon-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: var(--spacing-2);
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
    width: 18px;
    height: 18px;
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
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-primary);
}

.addon-price {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.form-actions {
  display: flex;
  gap: var(--spacing-3);
  margin-top: var(--spacing-5);
  padding-top: var(--spacing-4);
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.btn-cancel,
.btn-submit {
  flex: 1;
  padding: 0.7rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-cancel {
  background: rgba(0, 0, 0, 0.05);
  color: var(--color-text-secondary);

  &:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.08);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-submit {
  background: var(--color-primary);
  color: white;

  &:hover:not(:disabled) {
    background: var(--color-primary-dark);
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
}

.btn-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .form-container {
    padding: var(--spacing-4);
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column;
  }
}
</style>
