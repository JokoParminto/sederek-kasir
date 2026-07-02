<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { userApi } from '@/services/api/user.api'
import { usePullToRefresh } from '@/composables/usePullToRefresh'
import { useToast } from '@/composables/useToast'
import PullToRefreshIndicator from '@/components/common/PullToRefreshIndicator.vue'
import BaseDataTable from '@/components/base/BaseDataTable.vue'
import BaseSearchBar from '@/components/base/BaseSearchBar.vue'
import BaseChipsGroup from '@/components/base/BaseChipsGroup.vue'
import type { Column } from '@/components/base/BaseTableHeader.vue'
import type { User } from '@/services/api/user.api'
import BaseBottomSheet from '@/components/base/BaseBottomSheet.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BasePagination from '@/components/base/BasePagination.vue'
import { getRoleDefaultPermissionNames, getRolePermissionsList } from '@/utils/permissionLabels'
import TableActionButtons from '@/components/table/TableActionButtons.vue'
import ConfirmationModal from '@/components/common/ConfirmationModal.vue'
import type { ActionIconKey } from '@/utils/tableActionIcons'
import { CheckCircle, MinusCircle, Clock, AlertTriangle } from 'lucide-vue-next'

interface Action {
  id: string
  icon: ActionIconKey
  label: string
  variant?: 'default' | 'danger'
  disabled?: boolean
  onClick: () => void | Promise<void>
}

// Composables
const { success: showSuccess, error: showError } = useToast()

// Pull to refresh
const { pullRefreshOffset, isRefreshing, handleTouchStart, handleTouchMove, handleTouchEnd } = usePullToRefresh({
  cooldown: 3000,
  onRefresh: async () => {
    try {
      await loadUsers()
    } catch (error: any) {
      if (error?.response?.data?.error?.code === 'TOO_MANY_REQUESTS') {
        showError('Tunggu sebentar sebelum refresh lagi')
      }
      throw error
    }
  }
})

// State
const users = ref<User[]>([])
const isLoading = ref(false)
const currentPage = ref(1)
const itemsPerPage = ref(10)
const totalUsers = ref(0)
const searchQuery = ref('')
const sortBy = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')

// Load users from API
const loadUsers = async () => {
  try {
    isLoading.value = true
    const response = await userApi.listUsers({
      page: currentPage.value,
      per_page: itemsPerPage.value,
      search: searchQuery.value,
      sort_by: sortBy.value,
      sort_dir: sortDir.value,
    })
    users.value = response.data || []
    totalUsers.value = response.pagination?.total || 0
  } catch (error) {
    showError('Gagal memuat data users')
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await loadUsers()
})

// Modal state
const isModalOpen = ref(false)
const selectedUser = ref<User | null>(null)

// Form state
const formData = ref({
  username: '',
  password: '',
  full_name: '',
  email: '',
  phone_number: '',
  role: 'kasir' as 'kasir' | 'manager' | 'admin',
  status: 'active' as 'active' | 'inactive',
})
const formError = ref('')
const isSubmitting = ref(false)

// Permissions state
const hasPrinterAccess = ref(false)

// Confirmation modal state
const showDeleteConfirm = ref(false)
const userToDelete = ref<string | null>(null)

// Table columns
const tableColumns: Column[] = [
  {
    key: 'full_name',
    label: 'Nama',
    sortable: true,
    width: '30%',
  },
  {
    key: 'username',
    label: 'Username',
    sortable: true,
    width: '25%',
  },
  {
    key: 'role',
    label: 'Role',
    sortable: true,
    width: '15%',
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    width: '15%',
    align: 'center',
  },
]


// Load permissions for a user
const loadUserPermissions = async (userId: string) => {
  try {
    const response = await userApi.getUserPermissions(userId)

    if (formData.value.role === 'admin') {
      hasPrinterAccess.value = false
      return
    }

    const allPrinterPermNames = [
      'printer:read',
      'printer:create',
      'printer:update',
      'printer:delete',
      'printer:manage_templates',
      'printer:test_print',
      'printer:view_history',
    ]

    const userPrinterPerms = response.permissions
      .filter((p) => p.name.startsWith('printer:') && p.assigned)
      .map((p) => p.name)

    hasPrinterAccess.value = allPrinterPermNames.every((name) => userPrinterPerms.includes(name))
  } catch (error: any) {
    formError.value = 'Gagal memuat permissions'
  }
}

const openCreateModal = () => {
  selectedUser.value = null
  formData.value = {
    username: '',
    password: '',
    full_name: '',
    email: '',
    phone_number: '',
    role: 'kasir',
    status: 'active',
  }
  formError.value = ''
  hasPrinterAccess.value = false // Reset printer access
  isModalOpen.value = true
}

const openEditModal = (user: User) => {
  selectedUser.value = user
  formData.value = {
    username: user.username,
    password: '',
    full_name: user.full_name,
    email: user.email || '',
    phone_number: user.phone_number || '',
    role: user.role,
    status: user.status,
  }
  formError.value = ''
  isModalOpen.value = true
  // Load permissions for this user
  loadUserPermissions(user.id)
}

const closeModal = () => {
  isModalOpen.value = false
  selectedUser.value = null
}

const handleDeleteClick = (id: string) => {
  userToDelete.value = id
  showDeleteConfirm.value = true
}

const handleDeleteConfirm = async () => {
  if (!userToDelete.value) return

  try {
    await userApi.deleteUser(userToDelete.value)
    users.value = users.value.filter(u => u.id !== userToDelete.value)
    showSuccess('User berhasil dihapus')
    showDeleteConfirm.value = false
    userToDelete.value = null
  } catch (error) {
    showError('Gagal menghapus user')
  }
}

const handleDeleteCancel = () => {
  showDeleteConfirm.value = false
  userToDelete.value = null
}

/**
 * Get actions array for a user row
 * Used by TableActionButtons component
 */
const getRowActions = (user: User): Action[] => [
  {
    id: `edit-${user.id}`,
    icon: 'edit',
    label: 'Edit',
    onClick: () => openEditModal(user),
  },
  {
    id: `delete-${user.id}`,
    icon: 'delete',
    label: 'Hapus',
    variant: 'danger',
    onClick: () => handleDeleteClick(user.id),
  },
]

const getStatusIconComponent = (status: string) => {
  switch (status) {
    case 'active':
      return CheckCircle
    case 'inactive':
      return MinusCircle
    case 'pending':
      return Clock
    case 'due':
    case 'error':
      return AlertTriangle
    default:
      return CheckCircle
  }
}

// Pagination handler
const handlePageChange = (page: number) => {
  currentPage.value = page
  loadUsers()
}

// Sorting handler
const handleSortBy = (column: string) => {
  sortBy.value = column
  currentPage.value = 1
  loadUsers()
}

const handleSortDir = (direction: 'asc' | 'desc') => {
  sortDir.value = direction
  currentPage.value = 1
  loadUsers()
}

// Search handler
const handleSearch = async (query: string) => {
  searchQuery.value = query
  currentPage.value = 1
  await loadUsers()
}

const handleSubmitForm = async () => {
  formError.value = ''

  if (!formData.value.username.trim()) {
    formError.value = 'Username harus diisi'
    return
  }

  if (!formData.value.full_name.trim()) {
    formError.value = 'Nama lengkap harus diisi'
    return
  }

  if (!selectedUser.value && !formData.value.password.trim()) {
    formError.value = 'Password harus diisi untuk user baru'
    return
  }

  try {
    isSubmitting.value = true
    let userId: string

    if (selectedUser.value) {
      const updateData: any = {
        username: formData.value.username.trim(),
        full_name: formData.value.full_name.trim(),
        email: formData.value.email.trim() || null,
        phone_number: formData.value.phone_number.trim() || null,
        role: formData.value.role,
        status: formData.value.status,
      }
      const updated = await userApi.updateUser(selectedUser.value.id, updateData)
      userId = selectedUser.value.id
      const idx = users.value.findIndex(u => u.id === userId)
      if (idx !== -1 && updated.data) users.value[idx] = updated.data
      showSuccess('User berhasil diupdate')
    } else {
      const createData = {
        username: formData.value.username.trim(),
        password: formData.value.password.trim(),
        full_name: formData.value.full_name.trim(),
        email: formData.value.email.trim() || null,
        phone_number: formData.value.phone_number.trim() || null,
        role: formData.value.role,
      }
      const created = await userApi.createUser(createData as any)
      userId = created.data.id
      showSuccess('User berhasil ditambahkan')
    }

    if (formData.value.role === 'admin') {
      await userApi.updateUserPermissions(userId, [])
    } else if (hasPrinterAccess.value) {
      const allPerms = await userApi.getAllPermissions()
      const roleDefaults = getRoleDefaultPermissionNames(formData.value.role)
      const rolePermIds = allPerms.permissions.filter((p) => roleDefaults.includes(p.name)).map((p) => p.id)
      const printerPermIds = allPerms.permissions.filter((p) => p.name.startsWith('printer:')).map((p) => p.id)
      const finalPermIds = [...new Set([...rolePermIds, ...printerPermIds])]
      await userApi.updateUserPermissions(userId, finalPermIds)
    } else {
      await userApi.updateUserPermissions(userId, [])
    }

    closeModal()
    await loadUsers()
  } catch (error: any) {
    formError.value = error.response?.data?.error?.message || 'Gagal menyimpan user'
  } finally {
    isSubmitting.value = false
  }
}

// Get role display name
const getRoleDisplayName = (role: string) => {
  const roleMap: Record<string, string> = {
    admin: 'Admin',
    manager: 'Manager',
    kasir: 'Kasir'
  }
  return roleMap[role] || role
}

// Get status display
const getStatusDisplay = (status: string) => {
  if (status === 'active') return 'Aktif'
  return 'Nonaktif'
}
</script>

<template>
  <div
    class="user-view"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <PullToRefreshIndicator :pull-refresh-offset="pullRefreshOffset" :is-refreshing="isRefreshing" />
    

    <div class="container">
      <!-- Content Card -->
      <div ref="contentCardRef" class="content-card">
        <!-- Search Bar -->
        <BaseSearchBar
          :model-value="searchQuery"
          placeholder="Cari user..."
          @update:model-value="handleSearch($event)"
        >
          <template #actions>
            <button class="btn-add-user" @click="openCreateModal">
              <AppIcon name="add" :size="15" /> Tambah User
            </button>
          </template>
        </BaseSearchBar>

        <!-- Chips Group -->
        <div class="chips-container">
          <BaseChipsGroup>
            <button
              :class="['chip', { 'chip--active': true }]"
              disabled
            >
              Semua User
            </button>
          </BaseChipsGroup>
        </div>

        <!-- User List Content -->
        <div class="list-content">
          <!-- BaseDataTable Component -->
          <BaseDataTable
              :columns="tableColumns"
              :data="users"
              :current-page="currentPage"
              :items-per-page="itemsPerPage"
              :sort-by="sortBy"
              :sort-dir="sortDir"
              :fill-height="true"
              @update:current-page="handlePageChange"
              @update:sortBy="handleSortBy"
              @update:sortDir="handleSortDir"
            >
              <!-- Custom Name Cell -->
              <template #cell-full_name="{ row }">
                <div class="user-info">
                  <div class="user-avatar">
                    <img v-if="row.avatar_url" :src="row.avatar_url" :alt="row.full_name" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />
                    <AppIcon v-else name="user" :size="18" />
                  </div>
                  <span class="user-name">{{ row.full_name }}</span>
                </div>
              </template>

              <!-- Custom Role Cell -->
              <template #cell-role="{ row }">
                <span class="role-badge">{{ getRoleDisplayName(row.role) }}</span>
              </template>

              <!-- Custom Status Cell -->
              <template #cell-status="{ row }">
                <span :class="['status-badge', row.status]">
                  <component
                    :is="getStatusIconComponent(row.status)"
                    class="status-icon"
                    :size="16"
                    :stroke-width="1.5"
                    aria-hidden="true"
                  />
                  <span class="status-label">{{ getStatusDisplay(row.status) }}</span>
                </span>
              </template>

              <!-- Custom Actions Cell -->
              <template #actions="{ row }">
                <TableActionButtons :actions="getRowActions(row as User)" :dropdown-breakpoint="0" />
              </template>
            </BaseDataTable>

          <!-- Mobile Card Layout -->
          <div class="card-grid">
            <div v-for="user in users" :key="user.id" class="user-card">
              <div class="card-header">
                <div class="user-avatar-large">
                  <img v-if="user.avatar_url" :src="user.avatar_url" :alt="user.full_name" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />
                  <AppIcon v-else name="user" :size="22" />
                </div>
                <div class="card-user-info">
                  <h3 class="card-title">{{ user.full_name }}</h3>
                  <p class="card-username">@{{ user.username }}</p>
                </div>
              </div>

              <div class="card-body">
                <div class="card-row">
                  <span class="card-label">Role:</span>
                  <span class="role-badge">{{ getRoleDisplayName(user.role) }}</span>
                </div>
                <div class="card-row">
                  <span class="card-label">Status:</span>
                  <span :class="['status-badge', user.status]">
                    <component
                      :is="getStatusIconComponent(user.status)"
                      :size="14"
                      :stroke-width="1.5"
                      aria-hidden="true"
                    />
                    <span>{{ getStatusDisplay(user.status) }}</span>
                  </span>
                </div>
              </div>

              <div class="card-actions">
                <button class="btn-card-action btn-edit" @click="openEditModal(user)" title="Edit">
                  <AppIcon name="edit" :size="14" /> Edit
                </button>
                <button class="btn-card-action btn-delete" @click="handleDeleteClick(user.id)" title="Hapus">
                  <AppIcon name="trash" :size="14" /> Hapus
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <BasePagination
          :current-page="currentPage"
          :total-items="totalUsers"
          :items-per-page="itemsPerPage"
          :loading="isLoading"
          @update:current-page="handlePageChange"
          @update:itemsPerPage="itemsPerPage = $event; currentPage = 1; loadUsers()"
        />
      </div>
    </div>

    <!-- User Form Sheet -->
    <BaseBottomSheet
      v-model="isModalOpen"
      :title="selectedUser ? 'Edit User' : 'Tambah User Baru'"
      @close="closeModal"
    >
      <form @submit.prevent="handleSubmitForm">
        <div class="form-group">
          <label class="form-label">Username</label>
          <input
            v-model="formData.username"
            type="text"
            class="form-input"
            placeholder="Contoh: john_doe"
            required
          />
        </div>

        <div v-if="!selectedUser" class="form-group">
          <label class="form-label">Password</label>
          <input
            v-model="formData.password"
            type="password"
            class="form-input"
            placeholder="Minimal 6 karakter"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label">Nama Lengkap</label>
          <input
            v-model="formData.full_name"
            type="text"
            class="form-input"
            placeholder="Contoh: John Doe"
            required
          />
        </div>

        <div class="form-group">
          <label class="form-label">Email</label>
          <input
            v-model="formData.email"
            type="email"
            class="form-input"
            placeholder="Contoh: john@example.com"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Nomor Telepon</label>
          <input
            v-model="formData.phone_number"
            type="tel"
            class="form-input"
            placeholder="Contoh: 081234567890"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Role</label>
          <select v-model="formData.role" class="form-input" required>
            <option value="kasir">Kasir</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>

          <!-- Role permissions info box -->
          <div
            class="role-permissions-info"
            :class="{ 'admin': formData.role === 'admin' }"
          >
            <h4>
              {{ formData.role === 'admin' ? 'AKSES PENUH (FULL ACCESS)' : 'AKSES MENU OTOMATIS' }}
            </h4>
            <p class="info-description">
              {{ formData.role === 'admin'
                  ? 'Admin memiliki akses penuh ke semua fitur:'
                  : `${formData.role === 'manager' ? 'Manager' : 'Kasir'} mendapatkan akses ke:`
              }}
            </p>
            <ul>
              <li v-for="perm in getRolePermissionsList(formData.role)" :key="perm">
                {{ perm }}
              </li>
            </ul>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Status</label>
          <select v-model="formData.status" class="form-input" required>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>

        <!-- Additional Permissions (only for kasir/manager) -->
        <div v-if="formData.role !== 'admin'" class="form-group additional-permissions-group">
          <label class="form-label">Permission Tambahan</label>
          <small class="additional-permissions-hint">
            Permission tambahan di luar akses menu default berdasarkan role
          </small>

          <div class="permission-toggles">
            <label class="permission-toggle-item">
              <div class="toggle-info">
                <span class="toggle-label"><AppIcon name="printer" :size="15" style="margin-right:0.35rem" /> Akses Printer Penuh</span>
                <small class="toggle-description">
                  {{ formData.role === 'kasir'
                      ? 'Kelola printer: tambah, edit, hapus, kelola template cetak'
                      : 'Tambah permission: create, update, delete, kelola template cetak'
                  }}
                </small>
              </div>
              <input
                type="checkbox"
                v-model="hasPrinterAccess"
                class="toggle-checkbox"
              />
              <span class="toggle-switch"></span>
            </label>
          </div>
        </div>

        <!-- Info for admin (no additional permissions needed) -->
        <div v-else class="form-group">
          <small class="admin-note">
            Tidak ada permission tambahan untuk role Admin
          </small>
        </div>

        <p v-if="formError" class="form-error">{{ formError }}</p>
      </form>

      <template #footer>
        <BaseButton variant="secondary" type="button" @click="closeModal">
          Batal
        </BaseButton>
        <BaseButton variant="primary" :loading="isSubmitting" :disabled="isSubmitting" @click="handleSubmitForm">
          {{ selectedUser ? 'Update' : 'Simpan' }}
        </BaseButton>
      </template>
    </BaseBottomSheet>

    <!-- Delete Confirmation Modal -->
    <ConfirmationModal
      :is-open="showDeleteConfirm"
      title="Hapus User"
      message="Apakah Anda yakin ingin menghapus user ini? Tindakan ini tidak dapat dibatalkan."
      confirm-text="Hapus"
      cancel-text="Batal"
      variant="danger"
      icon-type="warning"
      @confirm="handleDeleteConfirm"
      @cancel="handleDeleteCancel"
    />
  </div>
</template>

<style scoped>
.user-view {
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

.content-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  border: 1px solid rgba(123, 47, 190, 0.08);
  box-shadow: 0 20px 60px rgba(123, 47, 190, 0.08), 0 4px 16px rgba(0, 0, 0, 0.04);
  overflow: visible;
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

.chip {
  flex-shrink: 0;
  padding: 0.5rem 1rem;
  border: 1px solid rgba(123, 47, 190, 0.15);
  background: white;
  color: var(--color-text-secondary);
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.8rem;
  min-height: 44px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(240, 253, 244, 0.8);
    border-color: rgba(123, 47, 190, 0.3);
  }

  &--active {
    background: linear-gradient(135deg, var(--brand-primary) 0%, #a78bfa 100%);
    border-color: transparent;
    color: white;
    box-shadow: 0 8px 24px rgba(123, 47, 190, 0.35);
  }

  &:disabled {
    cursor: not-allowed;
  }
}

.btn-add-user {
  padding: 0.6rem 1.2rem;
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.85rem;
  min-height: 44px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(123, 47, 190, 0.4);
    background: linear-gradient(135deg, var(--brand-primary-dark) 0%, var(--brand-primary-darker) 100%);
  }

  &:active {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(123, 47, 190, 0.3);
  }
}



/* List Content Container */
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

/* Card Grid for Mobile */
.card-grid {
  display: none;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  width: 100%;
  padding: 1rem;
}

.user-card {
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

.card-header {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  border-bottom: 1px solid rgba(123, 47, 190, 0.08);
  align-items: flex-start;
}

.user-avatar-large {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--brand-primary) 0%, #a78bfa 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.card-user-info {
  flex: 1;
}

.card-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.3;
}

.card-username {
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  letter-spacing: 0.01em;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  flex: 1;
}

.card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.card-label {
  color: var(--color-text-secondary);
  font-weight: 600;
  font-size: 0.75rem;
  letter-spacing: 0.01em;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid rgba(123, 47, 190, 0.08);
}

.btn-card-action {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid rgba(123, 47, 190, 0.2);
  background: white;
  color: var(--color-text-primary);
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: center;

  &:active {
    background: rgba(123, 47, 190, 0.1);
    border-color: rgba(123, 47, 190, 0.3);
  }

  &.btn-edit {
    color: var(--brand-primary-dark);
    border-color: rgba(123, 47, 190, 0.3);
  }

  &.btn-delete {
    color: #dc2626;
    border-color: rgba(239, 68, 68, 0.3);
  }
}

/* ============================================
   RESPONSIVE: Tablet Landscape (768px–1023px) — keep table visible
   ============================================ */
@media (min-width: 768px) and (max-width: 1023px) {
  .user-view { padding: var(--spacing-2); }
}

/* ============================================
   RESPONSIVE: Mobile (≤767px) — switch to card grid
   ============================================ */
@media (max-width: 767px) {
  .table-wrapper {
    display: none;
  }

  .card-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
    padding: 0.75rem;
  }
}

/* ============================================
   RESPONSIVE: Mobile (≤767px)
   ============================================ */
@media (max-width: 767px) {
  .card-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
    padding: 0.75rem;
  }

  .user-card {
    border-radius: 10px;
  }

  .card-header {
    padding: 0.875rem;
    gap: 0.625rem;
  }

  .user-avatar-large {
    width: 40px;
    height: 40px;
  }

  .card-title {
    font-size: 0.9rem;
  }

  .card-body {
    gap: 0.625rem;
    padding: 0.625rem 0.875rem;
  }

  .card-actions {
    padding: 0.625rem 0.875rem;
  }
}

.form-body {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin: 0;
}

form .form-group:not(:last-child) {
  margin-bottom: 1rem;
}

.form-label {
  font-weight: 600;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  letter-spacing: 0.01em;
}

.form-input {
  padding: 0.65rem 0.85rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.85rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: var(--color-surface-0);
  font-family: inherit;
  color: var(--color-text-primary);

  &:focus {
    outline: none;
    border-color: var(--color-primary-500);
    background: var(--color-surface-1);
    box-shadow: 0 4px 12px rgba(123, 47, 190, 0.1);
  }

  &::placeholder {
    color: var(--color-text-hint);
  }
}

.form-error {
  margin-top: 0.35rem;
  font-size: 0.7rem;
  color: #dc2626;
  font-weight: 600;
}

select.form-input {
  color: var(--color-text-primary);
  background: var(--color-surface-0);
}

select.form-input option {
  color: var(--color-text-primary);
  background: var(--color-surface-1);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--brand-primary) 0%, #a78bfa 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.user-name {
  font-weight: 600;
  color: var(--color-text-primary);
}

.role-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
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

  &.active {
    background: linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(123, 47, 190, 0.08) 100%);
    color: var(--brand-primary-dark);
    border: 1px solid rgba(123, 47, 190, 0.3);
  }

  &.inactive {
    background: linear-gradient(135deg, rgba(107, 114, 128, 0.12) 0%, rgba(75, 85, 99, 0.08) 100%);
    color: #4b5563;
    border: 1px solid rgba(107, 114, 128, 0.3);
  }

  .status-icon {
    flex-shrink: 0;
  }

  .status-label {
    line-height: 1.2;
  }
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

.toast-notification {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 2000;
  animation: slideInUp 0.3s ease;

  &.error {
    background: #fee2e2;
    border: 1px solid #fca5a5;
    color: #991b1b;
  }

  &.success {
    background: #dcfce7;
    border: 1px solid #86efac;
    color: #166534;
  }
}

@keyframes slideInUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.toast-icon {
  font-size: 1.25rem;
}

.toast-message {
  flex: 1;
  font-size: 0.9rem;
  font-weight: 500;
}

.toast-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-enter-from {
  transform: translateY(100%);
  opacity: 0;
}

.toast-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

/* Responsive Styles */
@media (min-width: 1024px) and (max-width: 1279px) {
  .user-view {
    padding: var(--spacing-4);
  }

  .container {
    padding: var(--spacing-4);
  }

  .chip {
    min-height: 48px;
    padding: 0.6rem 1.2rem;
  }

  .form-body {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1.25rem 1.5rem;
    padding: 1.25rem;
  }

  .form-input {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
    min-height: 48px;
  }

  .form-footer {
    padding: 1.25rem;
    gap: 1rem;
  }

  .user-avatar {
    width: 44px;
    height: 44px;
    font-size: 1.1rem;
  }
}

@media (min-width: 1280px) {
  .user-avatar {
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }
}

/* Permissions Styles */
.permissions-group {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
}

.permission-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 0.85rem;
  border: 1.5px solid rgba(123, 47, 190, 0.15);
  border-radius: 8px;
  background: var(--color-surface-0);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.875rem;
  font-weight: 500;

  input[type="checkbox"] {
    cursor: pointer;
    accent-color: var(--brand-primary);
  }

  &:hover {
    border-color: rgba(123, 47, 190, 0.4);
    background: rgba(240, 253, 244, 0.5);
  }

  &:has(input:checked) {
    border-color: rgba(123, 47, 190, 0.6);
    background: rgba(240, 253, 244, 0.8);
    box-shadow: 0 2px 8px rgba(123, 47, 190, 0.15);
  }
}

.permissions-form-group {
  grid-column: span 2;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  color: var(--color-text-secondary);

  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(123, 47, 190, 0.1);
    border-top-color: var(--brand-primary);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.hint-text {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  font-style: italic;
  margin-top: 0.5rem;
}

:global(html.dark-mode) .user-form-sheet {
  background: var(--color-surface-1);
}

:global(html.dark-mode) .form-footer {
  background: var(--color-surface-1);
}

:global(html.dark-mode) .permissions-group {
  background: var(--color-surface-1);
}

:global(html.dark-mode) .permission-checkbox {
  border-color: rgba(255, 255, 255, 0.12);
  background: var(--color-surface-2);
}

:global(html.dark-mode) .permission-checkbox:hover {
  border-color: rgba(123, 47, 190, 0.5);
  background: rgba(123, 47, 190, 0.12);
}

/* Role permissions info box */
.role-permissions-info {
  padding: 1rem;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(96, 165, 250, 0.08) 100%);
  border-left: 3px solid #3b82f6;
  border-radius: 8px;
  margin-top: 0.75rem;

  &.admin {
    background: linear-gradient(135deg, rgba(123, 47, 190, 0.05) 0%, rgba(52, 211, 153, 0.08) 100%);
    border-left: 3px solid var(--brand-primary);
  }

  h4 {
    margin: 0 0 0.5rem 0;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: var(--color-text-primary);
  }

  .info-description {
    margin: 0 0 0.5rem 0;
    font-size: 0.85rem;
    color: var(--color-text-secondary);
  }

  ul {
    margin: 0;
    padding-left: 1.25rem;
    list-style: none;

    li {
      font-size: 0.85rem;
      color: var(--color-text-secondary);
      line-height: 1.8;
      position: relative;

      &::before {
        content: '•';
        position: absolute;
        left: -1rem;
        color: #3b82f6;
        font-weight: bold;
      }
    }
  }

  &.admin ul li::before {
    color: var(--brand-primary);
  }
}

/* Additional permissions section */
.additional-permissions-group {
  .form-label {
    margin-bottom: 0.5rem;
  }
}

.additional-permissions-hint {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.75rem;
  display: block;
}

.permission-toggles {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* iOS-style toggle item */
.permission-toggle-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem;
  background: var(--color-surface-0);
  border: 1.5px solid rgba(123, 47, 190, 0.15);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    border-color: rgba(123, 47, 190, 0.3);
    background: rgba(240, 253, 244, 0.3);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(123, 47, 190, 0.08);
  }

  &:has(input:checked) {
    border-color: rgba(123, 47, 190, 0.5);
    background: rgba(240, 253, 244, 0.5);
    box-shadow: 0 2px 8px rgba(123, 47, 190, 0.12);
  }
}

.toggle-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  padding-right: 1rem;
}

.toggle-label {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.toggle-description {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
}

/* Hide default checkbox */
.toggle-checkbox {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

/* iOS-style toggle switch */
.toggle-switch {
  position: relative;
  width: 52px;
  height: 32px;
  background: #cbd5e1;
  border-radius: 16px;
  transition: background 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;

  &::after {
    content: '';
    position: absolute;
    top: 4px;
    left: 4px;
    width: 24px;
    height: 24px;
    background: white;
    border-radius: 50%;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
}

.toggle-checkbox:checked + .toggle-switch {
  background: var(--brand-primary);

  &::after {
    transform: translateX(20px);
  }
}

.admin-note {
  display: block;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  font-style: italic;
  text-align: center;
  padding: 0.75rem;
  background: rgba(156, 163, 175, 0.1);
  border-radius: 8px;
}

/* Responsive Permissions */
@media (min-width: 1024px) and (max-width: 1279px) {
  .permissions-form-group,
  .permissions-form-group :has(.permissions-group),
  .permissions-form-group :has(.radio-group) {
    grid-column: span 2;
  }

  .permission-checkbox {
    padding: 0.75rem 1rem;
    min-height: 48px;
  }
}
</style>
