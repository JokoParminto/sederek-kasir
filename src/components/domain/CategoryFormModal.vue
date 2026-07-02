<template>
  <div v-if="isOpen">
    <div class="modal-overlay" @click="handleBackdropClick">
      <div class="modal-content" @click.stop>
          <!-- Header -->
          <div class="modal-header">
            <h2>Kelola Kategori</h2>
            <button class="btn-close" @click="$emit('close')"><AppIcon name="x" :size="16" /></button>
          </div>

          <!-- Tabs -->
          <div class="tabs-header">
            <button
              class="tab-button"
              :class="{ 'tab-button--active': activeTab === 'form' }"
              @click="activeTab = 'form'; resetForm()"
            >
              <AppIcon name="add" :size="13" /> Tambah
            </button>
            <button
              class="tab-button"
              :class="{ 'tab-button--active': activeTab === 'list' }"
              @click="activeTab = 'list'"
            >
              <AppIcon name="layers" :size="13" /> Daftar ({{ categories.length }})
            </button>
          </div>

          <!-- Body -->
          <div class="modal-body">
            <!-- Form Tab -->
            <div v-if="activeTab === 'form'" class="form-section">
              <div class="form-group">
                <label class="label">Nama Kategori</label>
                <input
                  v-model="formData.name"
                  type="text"
                  class="input"
                  placeholder="Contoh: Kopi, Minuman, Makanan, dll"
                  @keydown.enter="handleSubmit"
                />
              </div>

              <div class="form-group">
                <label class="label">Deskripsi</label>
                <textarea
                  v-model="formData.description"
                  class="textarea"
                  placeholder="Deskripsi kategori (opsional)"
                  rows="3"
                />
              </div>

              <div v-if="formError" class="error-message">
                {{ formError }}
              </div>

              <div class="form-buttons">
                <button class="btn-cancel" @click="$emit('close')">
                  Batal
                </button>
                <button
                  class="btn-submit"
                  @click="handleSubmit"
                  :disabled="isLoading"
                >
                  {{ isLoading ? 'Menyimpan...' : (selectedCategory ? 'Update' : 'Tambah') }}
                </button>
              </div>
            </div>

            <!-- List Tab -->
            <div v-if="activeTab === 'list'" class="list-section">
              <h3>Daftar Kategori</h3>

              <div v-if="categories.length === 0" class="no-categories">
                Belum ada kategori
              </div>

              <div v-else class="table-wrapper">
                <table class="categories-table">
                <thead>
                  <tr>
                    <th class="col-name">Nama</th>
                    <th class="col-description">Deskripsi</th>
                    <th class="col-actions">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="category in categories" :key="category.id" class="category-row">
                    <td class="col-name">{{ category.name }}</td>
                    <td class="col-description">{{ category.description || '-' }}</td>
                    <td class="col-actions">
                      <div class="action-buttons">
                        <button
                          class="btn-action btn-edit"
                          @click="editCategory(category)"
                          title="Edit"
                        >
                          <AppIcon name="edit" :size="14" />
                        </button>
                        <button
                          class="btn-action btn-delete"
                          @click="deleteCategory(category.id)"
                          :disabled="isLoading"
                          title="Hapus"
                        >
                          <AppIcon name="trash" :size="14" />
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <button class="btn-close-modal" @click="$emit('close')">
              Tutup
            </button>
          </div>
        </div>
      </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useProductStore } from '@/stores/product'
import { productApi } from '@/services/api/product.api'
import type { Category } from '@/types'
import { useModal } from '@/composables/useModal'

interface Props {
  isOpen: boolean
}

interface Emits {
  close: []
  submitted: []
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const productStore = useProductStore()

const categories = computed(() => productStore.categories)
const selectedCategory = ref<Category | null>(null)
const isLoading = ref(false)
const formError = ref('')
const activeTab = ref<'form' | 'list'>('form')

const formData = ref({
  name: '',
  description: '',
})

const resetForm = () => {
  formData.value = {
    name: '',
    description: '',
  }
  formError.value = ''
  selectedCategory.value = null
}

const editCategory = (category: Category) => {
  selectedCategory.value = category
  formData.value.name = category.name
  formData.value.description = category.description || ''
  formError.value = ''
  activeTab.value = 'form'
}

const handleSubmit = async () => {
  formError.value = ''

  if (!formData.value.name.trim()) {
    formError.value = 'Nama kategori harus diisi'
    return
  }

  isLoading.value = true

  try {
    if (selectedCategory.value) {
      // Update category

      const updated = await productApi.updateCategory(selectedCategory.value.id, {
        name: formData.value.name,
        description: formData.value.description,
      })

      productStore.updateCategory(selectedCategory.value.id, updated)

    } else {
      // Create category

      const newCategory = await productApi.createCategory({
        name: formData.value.name,
        description: formData.value.description,
      })

      productStore.addCategory(newCategory)

    }

    resetForm()
    emit('submitted')
  } catch (error) {

    formError.value = selectedCategory.value
      ? 'Gagal mengupdate kategori'
      : 'Gagal menambah kategori'
  } finally {
    isLoading.value = false
  }
}

const deleteCategory = async (categoryId: string) => {
  if (!window.confirm('Yakin hapus kategori ini?')) {
    return
  }

  isLoading.value = true

  try {

    await productApi.deleteCategory(categoryId)
    productStore.removeCategory(categoryId)

  } catch (error) {

    alert('Gagal menghapus kategori')
  } finally {
    isLoading.value = false
  }
}

const { handleBackdropClick } = useModal(() => emit('close'))

onMounted(() => {
  resetForm()
})
</script>

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

/* Tabs Header */
.tabs-header {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(123, 47, 190, 0.08);
  background: rgba(240, 253, 244, 0.5);
  flex-shrink: 0;
}

.tab-button {
  flex: 1;
  padding: 0.6rem 1rem;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 8px;
  min-height: 40px;

  &:hover {
    background: rgba(123, 47, 190, 0.08);
    color: var(--color-text-primary);
  }

  &--active {
    background: white;
    color: var(--color-primary);
    border: 1px solid rgba(123, 47, 190, 0.2);
    box-shadow: 0 2px 8px rgba(123, 47, 190, 0.1);
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

.form-section,
.list-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  h3 {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--color-text-primary);
    letter-spacing: 0.02em;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.label {
  font-weight: 600;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  letter-spacing: 0.01em;
}

.input,
.textarea {
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

.textarea {
  resize: vertical;
  font-weight: 500;
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

.form-buttons {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
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

.no-categories {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}

.table-wrapper {
  max-height: 300px;
  overflow-y: auto;
  overflow-x: auto;
  border: 1px solid rgba(123, 47, 190, 0.1);
  border-radius: 10px;

  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(123, 47, 190, 0.05);
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(123, 47, 190, 0.3);
    border-radius: 3px;

    &:hover {
      background: rgba(123, 47, 190, 0.5);
    }
  }
}

.categories-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  background: white;
}

.categories-table thead {
  background: rgba(123, 47, 190, 0.08);
  border-bottom: 1px solid rgba(123, 47, 190, 0.15);
  position: sticky;
  top: 0;
  z-index: 10;
}

.categories-table th {
  padding: 0.5rem 0.65rem;
  text-align: left;
  font-weight: 700;
  color: var(--color-text-primary);
  font-size: 0.65rem;
  letter-spacing: 0.01em;
}

.categories-table tbody tr {
  border-bottom: 1px solid rgba(123, 47, 190, 0.08);
  transition: background-color 0.2s;
}

.categories-table tbody tr:last-child {
  border-bottom: none;
}

.categories-table tbody tr:hover {
  background: rgba(240, 253, 244, 0.4);
}

.categories-table td {
  padding: 0.65rem 0.85rem;
  color: var(--color-text-primary);
}

.categories-table td.col-description {
  color: var(--color-text-secondary);
  font-size: 0.8rem;
}

.categories-table td.col-actions {
  text-align: center;
  width: 80px;
}

.action-buttons {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}

.btn-action {
  width: 36px;
  height: 36px;
  border: 1.5px solid;
  border-radius: 10px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: white;

  &.btn-edit {
    border-color: #3b82f6;
    color: #3b82f6;

    &:hover {
      background: #3b82f6;
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
    }

    &:active {
      transform: translateY(0);
    }
  }

  &.btn-toggle-off {
    border-color: #ef4444;
    color: #ef4444;

    &:hover {
      background: #ef4444;
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
    }

    &:active {
      transform: translateY(0);
    }
  }

  &.btn-toggle-on {
    border-color: var(--brand-primary);
    color: var(--brand-primary);

    &:hover {
      background: var(--brand-primary);
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(123, 47, 190, 0.25);
    }

    &:active {
      transform: translateY(0);
    }
  }

  &.btn-delete {
    border-color: #6b7280;
    color: #6b7280;

    &:hover {
      background: #6b7280;
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(107, 114, 128, 0.25);
    }

    &:active {
      transform: translateY(0);
    }
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;

    &:hover {
      background: white;
      transform: none;
    }
  }
}

.modal-footer {
  position: sticky;
  bottom: 0;
  background: white;
  z-index: 10;
  padding: 1.5rem;
  border-top: 1px solid rgba(123, 47, 190, 0.08);
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

.btn-close-modal {
  padding: 0.65rem 1.5rem;
  background: rgba(0, 0, 0, 0.05);
  color: var(--color-text-primary);
  border: 1px solid rgba(123, 47, 190, 0.1);
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 0.01em;

  &:hover {
    background: rgba(0, 0, 0, 0.08);
    border-color: rgba(123, 47, 190, 0.2);
  }
}

/* Animations */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-content {
  animation: modalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes modalSlideIn {
  from {
    transform: scale(0.95) translateY(10px);
    opacity: 0;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

@media (max-width: 480px) {
  .modal-content {
    max-width: 95vw;
    max-height: 85dvh;
  }

  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 1.2rem;
  }

  .modal-header h2 {
    font-size: 1rem;
  }

  .table-wrapper {
    max-height: 250px;
  }

  .categories-table {
    font-size: 0.75rem;
  }

  .categories-table th {
    padding: 0.45rem 0.55rem;
    font-size: 0.6rem;
  }

  .categories-table td {
    padding: 0.45rem 0.55rem;
  }

  .categories-table td.col-description {
    font-size: 0.65rem;
  }
}
</style>
