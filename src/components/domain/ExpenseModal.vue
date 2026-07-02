<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click="handleBackdropClick">
        <div class="modal-content" @click.stop>
          <!-- Header -->
          <div class="modal-header">
            <h2>Menu Belanja</h2>
            <button class="btn-close" @click="$emit('close')"><AppIcon name="x" :size="16" /></button>
          </div>

          <!-- Tab Navigation -->
          <div class="tab-navigation">
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'input' }"
              @click="activeTab = 'input'"
            >
              + Tambah
            </button>
            <button
              class="tab-btn"
              :class="{ active: activeTab === 'list' }"
              @click="activeTab = 'list'"
            >
              <AppIcon name="layers" :size="13" /> Daftar ({{ expenses.length }})
            </button>
          </div>

          <!-- Body -->
          <div class="modal-body">
            <!-- Tab 1: Input Form -->
            <div v-if="activeTab === 'input'" class="tab-content">
              <div class="expense-form">
                <div class="form-group">
                  <label class="label">Deskripsi</label>
                  <textarea
                    v-model="formData.deskripsi"
                    class="input textarea"
                    placeholder="Deskripsi belanja"
                    rows="3"
                    autofocus
                  />
                </div>

                <div class="form-group">
                  <label class="label">Jumlah (Rp)</label>
                  <input
                    :value="jumlahDisplay"
                    type="text"
                    class="input"
                    placeholder="0"
                    @input="handleJumlahInput"
                    @keydown.enter="handleAddExpense"
                  />
                </div>

                <button
                  class="btn-submit"
                  @click="handleAddExpense"
                  :disabled="isLoading"
                >
                  {{ isLoading ? 'Menambahkan...' : 'Tambah' }}
                </button>

                <div v-if="formError" class="error-message">
                  {{ formError }}
                </div>
              </div>
            </div>

            <!-- Tab 2: Daftar Belanja -->
            <div v-if="activeTab === 'list'" class="tab-content">
              <div class="expenses-datatable">
                <!-- Datatable Header -->
                <div class="datatable-header">
                  <div class="col-description">Deskripsi</div>
                  <div class="col-amount">Jumlah</div>
                  <div class="col-action">Aksi</div>
                </div>

                <!-- Datatable Body (Scrollable) -->
                <div class="datatable-body">
                  <div v-if="expenses.length === 0" class="no-expenses">
                    Belum ada belanja
                  </div>

                  <div v-else class="expense-items">
                    <div v-for="expense in expenses" :key="expense.id" class="expense-item">
                      <div class="col-description">{{ expense.deskripsi }}</div>
                      <div class="col-amount">
                        {{ formatCurrency(expense.jumlah) || `Rp ${(expense.jumlah || 0).toLocaleString('id-ID')}` }}
                      </div>
                      <div class="col-action">
                        <button
                          class="btn-delete"
                          @click="handleDeleteExpense(expense.id)"
                          :disabled="isLoading"
                          title="Hapus belanja"
                        >
                          <AppIcon name="trash" :size="14" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Total (Outside Scroll) -->
              <div class="expense-total">
                <span class="total-label">Total Belanja:</span>
                <span class="total-amount">{{ formatCurrency(totalExpenses) }}</span>
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
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useShiftStore } from '@/stores/shift'
import { shiftApi } from '@/services/api/shift.api'
import type { ShiftExpense } from '@/services/api/shift.api'
import { formatCurrency } from '@/utils/formatters'

interface Props {
  isOpen: boolean
}

interface Emits {
  close: []
  expenseChanged: []
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const shiftStore = useShiftStore()

const activeTab = ref<'input' | 'list'>('input')
const expenses = ref<ShiftExpense[]>([])
const isLoading = ref(false)
const formError = ref('')
const formData = ref({
  deskripsi: '',
  jumlah: 0,
})
const jumlahDisplay = ref('')

const formatJumlahDisplay = (value: number): string => {
  if (!value) return ''
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const handleJumlahInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const numValue = parseInt(input.value.replace(/\D/g, '')) || 0
  formData.value.jumlah = numValue
  jumlahDisplay.value = formatJumlahDisplay(numValue)
}

const totalExpenses = computed(() => {
  return expenses.value.reduce((sum, expense) => sum + (expense.jumlah || 0), 0)
})

const loadExpenses = async () => {
  if (!shiftStore.currentShift) return

  try {

    const loadedExpenses = await shiftApi.getExpenses(shiftStore.currentShift.id)


    expenses.value = loadedExpenses

  } catch (error) {

  }
}

const handleAddExpense = async () => {
  formError.value = ''

  if (!formData.value.deskripsi.trim()) {
    formError.value = 'Deskripsi harus diisi'
    return
  }

  if (formData.value.jumlah <= 0) {
    formError.value = 'Jumlah harus lebih dari 0'
    return
  }

  if (!shiftStore.currentShift) {
    formError.value = 'Shift tidak ditemukan'
    return
  }

  isLoading.value = true

  try {

    const newExpense = await shiftApi.addExpense(
      shiftStore.currentShift.id,
      formData.value.deskripsi,
      formData.value.jumlah
    )



    // Convert jumlah to number if it's a string (from API response)
    const expenseToAdd = {
      ...newExpense,
      jumlah: typeof newExpense.jumlah === 'string' ? parseFloat(newExpense.jumlah) : newExpense.jumlah
    }

    expenses.value.push(expenseToAdd)

    emit('expenseChanged')

    // Reset form
    formData.value.deskripsi = ''
    formData.value.jumlah = 0
    jumlahDisplay.value = ''
  } catch (error) {

    formError.value = 'Gagal menambahkan belanja'
  } finally {
    isLoading.value = false
  }
}

const handleDeleteExpense = async (expenseId: string) => {
  if (!shiftStore.currentShift) return

  if (!window.confirm('Yakin ingin menghapus belanja ini?')) {
    return
  }

  isLoading.value = true

  try {

    await shiftApi.deleteExpense(shiftStore.currentShift.id, expenseId)

    expenses.value = expenses.value.filter(e => e.id !== expenseId)

    emit('expenseChanged')
  } catch (error) {

    formError.value = 'Gagal menghapus belanja'
  } finally {
    isLoading.value = false
  }
}

const handleBackdropClick = () => {
  emit('close')
}

watch(
  () => shiftStore.currentShift?.id,
  () => {
    if (shiftStore.currentShift) {
      loadExpenses()
    }
  }
)

onMounted(() => {
  if (shiftStore.currentShift) {
    loadExpenses()
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1rem;
}

.modal-content {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 4px 16px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.5);
  width: 100%;
  max-width: 600px;
  height: 500px;
  max-height: 90dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  @media (max-width: 1024px) {
    height: 450px;
    max-height: 85dvh;
  }

  @media (max-width: 640px) {
    max-width: 95vw;
    height: 400px;
    max-height: 80dvh;
  }
}

.modal-header {
  padding: 1rem 1.2rem;
  border-bottom: 1px solid rgba(123, 47, 190, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;

  h2 {
    margin: 0;
    font-family: var(--font-family-body);
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  @media (max-width: 768px) {
    padding: 0.8rem 1rem;
  }

  @media (max-width: 640px) {
    padding: 0.7rem 0.8rem;
  }
}

.tab-navigation {
  display: flex;
  gap: 0.3rem;
  padding: 0 0.8rem;
  border-bottom: 1px solid rgba(123, 47, 190, 0.08);
  flex-shrink: 0;
  background: rgba(240, 253, 244, 0.3);

  @media (max-width: 640px) {
    padding: 0 0.6rem;
  }
}

.tab-btn {
  flex: 1;
  padding: 0.5rem 0.8rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  font-weight: 600;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 0.01em;

  &:hover {
    color: var(--color-text-primary);
  }

  &.active {
    color: var(--brand-primary);
    border-bottom-color: var(--brand-primary);
  }
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  height: 100%;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  color: var(--color-text-secondary);
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    color: var(--color-text-primary);
    background: rgba(0, 0, 0, 0.06);
  }

  &:active {
    transform: scale(0.94);
  }
}

.modal-body {
  flex: 1;
  padding: 0.8rem 1.2rem;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  min-height: 0;

  @media (max-width: 768px) {
    padding: 0.6rem 1rem;
  }

  @media (max-width: 640px) {
    padding: 0.5rem 0.8rem;
  }
}

.expense-form {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.textarea {
  resize: none;
  font-family: inherit;
  line-height: 1.4;
}


.expenses-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 300px;
  overflow: hidden;

  h3 {
    margin: 0;
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--color-text-primary);
    letter-spacing: 0.02em;
    flex-shrink: 0;
  }

  @media (max-width: 1024px) {
    max-height: 200px;
  }

  @media (max-width: 768px) {
    max-height: 180px;
  }

  @media (max-width: 640px) {
    max-height: 150px;
  }
}

.expenses-header {
  flex-shrink: 0;
}

.expenses-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.label {
  font-weight: 600;
  color: var(--color-text-secondary);
  font-size: 0.7rem;
  letter-spacing: 0.01em;
}

.input {
  padding: 0.6rem 0.75rem;
  border: 1px solid rgba(123, 47, 190, 0.15);
  border-radius: 8px;
  font-size: 0.8rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: white;
  font-weight: 500;

  &:focus {
    outline: none;
    border-color: var(--brand-primary);
    background: rgba(240, 253, 244, 0.5);
    box-shadow: 0 4px 12px rgba(123, 47, 190, 0.1);
  }
}

.error-message {
  padding: 0.5rem 0.7rem;
  background: rgba(254, 242, 242, 0.9);
  color: #dc2626;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 600;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.btn-submit {
  width: 100%;
  padding: 0.7rem;
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(123, 47, 190, 0.2);
  letter-spacing: 0.01em;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, var(--brand-primary-dark) 0%, var(--brand-primary-darker) 100%);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(123, 47, 190, 0.4);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.expenses-datatable {
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(123, 47, 190, 0.1);
  border-radius: 8px;
  overflow: hidden;
}

.datatable-header {
  display: grid;
  grid-template-columns: 1fr auto 35px;
  gap: 0.4rem;
  padding: 0.5rem;
  background: rgba(123, 47, 190, 0.08);
  border-bottom: 1px solid rgba(123, 47, 190, 0.1);
  font-weight: 700;
  font-size: 0.65rem;
  color: var(--color-text-secondary);
  flex-shrink: 0;

  @media (max-width: 640px) {
    padding: 0.4rem;
  }
}

.datatable-body {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.no-expenses {
  text-align: center;
  padding: 1.2rem 0.8rem;
  color: var(--color-text-secondary);
  font-size: 0.8rem;

  @media (max-width: 768px) {
    padding: 1rem 0.6rem;
  }

  @media (max-width: 640px) {
    padding: 0.8rem 0.5rem;
    font-size: 0.75rem;
  }
}

.expense-items {
  display: flex;
  flex-direction: column;
}

.expense-item {
  display: grid;
  grid-template-columns: 1fr auto 35px;
  gap: 0.4rem;
  align-items: center;
  padding: 0.5rem;
  border-bottom: 1px solid rgba(123, 47, 190, 0.08);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: rgba(240, 253, 244, 0.5);
  }

  @media (max-width: 640px) {
    padding: 0.4rem;
  }
}

.col-description {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-text-primary);
  word-break: break-word;
}

.col-amount {
  font-size: 0.7rem;
  color: var(--brand-primary);
  font-weight: 700;
  white-space: nowrap;
  text-align: right;
}

.col-action {
  display: flex;
  justify-content: center;
}

.expense-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn-delete {
  background: none;
  border: none;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0.3rem;
  border-radius: 4px;
  opacity: 0.5;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    opacity: 1;
    background: rgba(239, 68, 68, 0.1);
    transform: scale(1.05);
  }

  &:disabled {
    opacity: 0.25;
    cursor: not-allowed;
  }
}

.expense-total {
  margin-top: 0.2rem;
  padding: 0.5rem;
  background: linear-gradient(135deg, rgba(123, 47, 190, 0.1) 0%, rgba(52, 211, 153, 0.1) 100%);
  border-radius: 6px;
  border: 1px solid rgba(123, 47, 190, 0.2);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;

  @media (max-width: 640px) {
    padding: 0.4rem;
  }
}

.total-label {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--color-text-secondary);
}

.total-amount {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--brand-primary);

  @media (max-width: 640px) {
    font-size: 0.7rem;
  }
}

.modal-footer {
  position: sticky;
  bottom: 0;
  background: white;
  z-index: 10;
  padding: 1rem 1.2rem;
  border-top: 1px solid rgba(123, 47, 190, 0.08);
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;

  @media (max-width: 768px) {
    padding: 0.8rem 1rem;
  }

  @media (max-width: 640px) {
    padding: 0.6rem 0.8rem;
  }
}

.btn-close-modal {
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.05);
  color: var(--color-text-primary);
  border: 1px solid rgba(123, 47, 190, 0.1);
  border-radius: 8px;
  font-weight: 700;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 0.01em;

  &:hover {
    background: rgba(0, 0, 0, 0.08);
    border-color: rgba(123, 47, 190, 0.2);
  }

  @media (max-width: 640px) {
    padding: 0.4rem 0.8rem;
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

  .expense-item {
    padding: 0.8rem;
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
