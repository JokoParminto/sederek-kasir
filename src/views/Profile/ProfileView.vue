<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { usePullToRefresh } from '@/composables/usePullToRefresh'
import { userApi } from '@/services/api/user.api'
import { uploadApi } from '@/services/api/upload.api'
import BaseButton from '@/components/base/BaseButton.vue'
import PullToRefreshIndicator from '@/components/common/PullToRefreshIndicator.vue'

const authStore = useAuthStore()
const { success: showSuccess, error: showError } = useToast()

const { pullRefreshOffset, isRefreshing, handleTouchStart, handleTouchMove, handleTouchEnd } = usePullToRefresh({
  cooldown: 3000,
  onRefresh: async () => { await authStore.fetchCurrentUser() }
})

// ── Avatar ────────────────────────────────────────────────────────────────────
const fileInputRef = ref<HTMLInputElement | null>(null)
const isUploadingAvatar = ref(false)

const avatarUrl = computed(() => {
  const url = authStore.user?.avatar_url
  if (!url) return null
  if (url.startsWith('http')) return url
  const base = import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:3000'
  return `${base}${url}`
})

const initials = computed(() => {
  const name = authStore.user?.full_name || authStore.user?.username || ''
  return name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
})

const handleAvatarClick = () => fileInputRef.value?.click()

const handleAvatarFile = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  isUploadingAvatar.value = true
  try {
    const url = await uploadApi.uploadImage(file, 'avatar')
    await userApi.updateMyProfile({ avatar_url: url })
    await authStore.fetchCurrentUser()
    showSuccess('Foto profil berhasil diupdate')
  } catch {
    showError('Gagal upload foto')
  } finally {
    isUploadingAvatar.value = false
    if (fileInputRef.value) fileInputRef.value.value = ''
  }
}

// ── Edit Profile ──────────────────────────────────────────────────────────────
const isEditingProfile = ref(false)
const isSavingProfile = ref(false)

const profileForm = ref({
  full_name: '',
  email: '',
  phone_number: '',
})

const startEditProfile = () => {
  profileForm.value = {
    full_name: authStore.user?.full_name || '',
    email: authStore.user?.email || '',
    phone_number: authStore.user?.phone_number || '',
  }
  isEditingProfile.value = true
}

const cancelEditProfile = () => {
  isEditingProfile.value = false
}

const saveProfile = async () => {
  if (!profileForm.value.full_name.trim()) {
    showError('Nama lengkap wajib diisi')
    return
  }
  isSavingProfile.value = true
  try {
    await userApi.updateMyProfile({
      full_name: profileForm.value.full_name.trim(),
      email: profileForm.value.email.trim() || undefined,
      phone_number: profileForm.value.phone_number.trim() || undefined,
    })
    await authStore.fetchCurrentUser()
    isEditingProfile.value = false
    showSuccess('Profil berhasil disimpan')
  } catch (err: any) {
    showError(err?.response?.data?.error?.message || 'Gagal menyimpan profil')
  } finally {
    isSavingProfile.value = false
  }
}

// ── Change Password ───────────────────────────────────────────────────────────
const isChangingPassword = ref(false)
const isSavingPassword = ref(false)
const showCurrent = ref(false)
const showNew = ref(false)
const showConfirm = ref(false)

const passwordForm = ref({
  current_password: '',
  new_password: '',
  confirm_password: '',
})

const passwordError = ref('')

const savePassword = async () => {
  passwordError.value = ''

  if (!passwordForm.value.current_password) {
    passwordError.value = 'Password lama wajib diisi'
    return
  }
  if (passwordForm.value.new_password.length < 6) {
    passwordError.value = 'Password baru minimal 6 karakter'
    return
  }
  if (passwordForm.value.new_password !== passwordForm.value.confirm_password) {
    passwordError.value = 'Konfirmasi password tidak cocok'
    return
  }

  isSavingPassword.value = true
  try {
    await userApi.changeMyPassword(
      passwordForm.value.current_password,
      passwordForm.value.new_password,
    )
    passwordForm.value = { current_password: '', new_password: '', confirm_password: '' }
    isChangingPassword.value = false
    showSuccess('Password berhasil diubah')
  } catch (err: any) {
    passwordError.value = err?.response?.data?.error?.message || 'Gagal mengubah password'
  } finally {
    isSavingPassword.value = false
  }
}

const cancelChangePassword = () => {
  isChangingPassword.value = false
  passwordForm.value = { current_password: '', new_password: '', confirm_password: '' }
  passwordError.value = ''
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const roleMeta = computed(() => {
  const r = authStore.userRole
  if (r === 'owner') return { label: 'Owner', cls: 'role--owner' }
  if (r === 'admin') return { label: 'Admin', cls: 'role--admin' }
  return { label: 'Kasir', cls: 'role--kasir' }
})

const formatDate = (iso?: string | null) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  })
}

const joinDate = computed(() => {
  const d = authStore.user?.created_at
  if (!d) return '—'
  return new Date(d).toLocaleString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'Asia/Jakarta',
  })
})
</script>

<template>
  <div class="profile-page" @touchstart="handleTouchStart" @touchmove="handleTouchMove" @touchend="handleTouchEnd">
    <PullToRefreshIndicator :pull-refresh-offset="pullRefreshOffset" :is-refreshing="isRefreshing" />
    <div class="profile-container">

      <!-- Page title -->
      <div class="page-header">
        <h1 class="page-title">Profil Saya</h1>
        <p class="page-subtitle">Kelola informasi akun dan keamanan kamu</p>
      </div>

      <!-- ── Identity Card ── -->
      <div class="card identity-card">
        <!-- Avatar section -->
        <div class="avatar-section">
          <div class="avatar-wrap" @click="handleAvatarClick">
            <img v-if="avatarUrl" :src="avatarUrl" alt="avatar" class="avatar-img" />
            <div v-else class="avatar-initials">{{ initials }}</div>
            <div class="avatar-overlay">
              <span v-if="isUploadingAvatar" class="avatar-spinner">⟳</span>
              <span v-else class="avatar-cam-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </span>
            </div>
          </div>
          <input ref="fileInputRef" type="file" accept="image/jpeg,image/png,image/webp"
            class="file-hidden" @change="handleAvatarFile" />
          <p class="avatar-hint">Tap foto untuk ganti</p>
        </div>

        <!-- Identity info -->
        <div class="identity-info">
          <div class="name-row">
            <h2 class="user-name">{{ authStore.user?.full_name || authStore.user?.username }}</h2>
            <span class="role-chip" :class="roleMeta.cls">{{ roleMeta.label }}</span>
          </div>
          <p class="username-text">@{{ authStore.user?.username }}</p>
          <div class="badge-row">
            <span class="status-chip" :class="authStore.user?.status === 'active' ? 'status--active' : 'status--inactive'">
              {{ authStore.user?.status === 'active' ? '● Aktif' : '● Nonaktif' }}
            </span>
          </div>
          <div class="meta-row">
            <span class="meta-item">
              <span class="meta-label">Bergabung</span>
              <span class="meta-value">{{ joinDate }}</span>
            </span>
            <span v-if="authStore.user?.last_login_at" class="meta-item">
              <span class="meta-label">Login terakhir</span>
              <span class="meta-value">{{ formatDate(authStore.user?.last_login_at) }}</span>
            </span>
          </div>
        </div>
      </div>

      <!-- ── Edit Profile Card ── -->
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Informasi Profil</h3>
            <p class="card-subtitle">Nama, email, dan nomor telepon</p>
          </div>
          <BaseButton
            v-if="!isEditingProfile"
            variant="secondary"
            size="sm"
            @click="startEditProfile"
          >
            Edit
          </BaseButton>
        </div>

        <!-- View mode -->
        <div v-if="!isEditingProfile" class="fields-grid">
          <div class="field-item">
            <span class="field-label">Nama Lengkap</span>
            <span class="field-value">{{ authStore.user?.full_name || '—' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">Username</span>
            <span class="field-value">{{ authStore.user?.username }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">Email</span>
            <span class="field-value">{{ authStore.user?.email || '—' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">No. Telepon</span>
            <span class="field-value">{{ authStore.user?.phone_number || '—' }}</span>
          </div>
        </div>

        <!-- Edit mode -->
        <div v-else class="edit-form">
          <div class="form-group">
            <label class="form-label">Nama Lengkap <span class="required">*</span></label>
            <input
              v-model="profileForm.full_name"
              type="text"
              class="form-input"
              placeholder="Nama lengkap kamu"
              autofocus
            />
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input
              v-model="profileForm.email"
              type="email"
              class="form-input"
              placeholder="email@contoh.com"
            />
          </div>
          <div class="form-group">
            <label class="form-label">No. Telepon</label>
            <input
              v-model="profileForm.phone_number"
              type="text"
              class="form-input"
              placeholder="08xx-xxxx-xxxx"
            />
          </div>
          <div class="form-actions">
            <BaseButton variant="secondary" size="sm" :disabled="isSavingProfile" @click="cancelEditProfile">
              Batal
            </BaseButton>
            <BaseButton variant="primary" size="sm" :loading="isSavingProfile" @click="saveProfile">
              Simpan
            </BaseButton>
          </div>
        </div>
      </div>

      <!-- ── Change Password Card ── -->
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Keamanan</h3>
            <p class="card-subtitle">Ubah password akun kamu</p>
          </div>
          <BaseButton
            v-if="!isChangingPassword"
            variant="secondary"
            size="sm"
            @click="isChangingPassword = true"
          >
            Ganti Password
          </BaseButton>
        </div>

        <div v-if="!isChangingPassword" class="password-placeholder">
          <span class="password-dots">••••••••</span>
          <span class="password-hint">Password tidak ditampilkan demi keamanan</span>
        </div>

        <div v-else class="edit-form">
          <div v-if="passwordError" class="form-error">
            {{ passwordError }}
          </div>

          <div class="form-group">
            <label class="form-label">Password Lama</label>
            <div class="input-wrap">
              <input
                v-model="passwordForm.current_password"
                :type="showCurrent ? 'text' : 'password'"
                class="form-input"
                placeholder="Password saat ini"
                autofocus
              />
              <button class="toggle-pw" type="button" @click="showCurrent = !showCurrent">
                <svg v-if="showCurrent" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Password Baru</label>
            <div class="input-wrap">
              <input
                v-model="passwordForm.new_password"
                :type="showNew ? 'text' : 'password'"
                class="form-input"
                placeholder="Minimal 6 karakter"
              />
              <button class="toggle-pw" type="button" @click="showNew = !showNew">
                <svg v-if="showNew" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Konfirmasi Password Baru</label>
            <div class="input-wrap">
              <input
                v-model="passwordForm.confirm_password"
                :type="showConfirm ? 'text' : 'password'"
                class="form-input"
                placeholder="Ulangi password baru"
                @keyup.enter="savePassword"
              />
              <button class="toggle-pw" type="button" @click="showConfirm = !showConfirm">
                <svg v-if="showConfirm" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="form-actions">
            <BaseButton variant="secondary" size="sm" :disabled="isSavingPassword" @click="cancelChangePassword">
              Batal
            </BaseButton>
            <BaseButton variant="primary" size="sm" :loading="isSavingPassword" @click="savePassword">
              Simpan Password
            </BaseButton>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.profile-page {
  padding: var(--spacing-4);
  min-height: 100vh;
  background: var(--color-bg-secondary);
}

.profile-container {
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

/* ── Page header ── */
.page-header { display: flex; flex-direction: column; gap: 0.15rem; }

/* ── Card ── */
.card {
  background: var(--color-surface-0);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-1);
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: var(--spacing-4) var(--spacing-5);
  border-bottom: 1px solid var(--color-border-light);
  gap: var(--spacing-4);
}

.card-title {
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 2px 0;
}

.card-subtitle {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin: 0;
}

/* ── Identity Card ── */
.identity-card {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-5);
  padding: var(--spacing-5);
}

/* Avatar */
.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-1);
  flex-shrink: 0;
}

.avatar-wrap {
  position: relative;
  width: 84px;
  height: 84px;
  border-radius: 50%;
  cursor: pointer;
  overflow: hidden;
  border: 3px solid var(--color-primary-200);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.avatar-wrap:hover {
  border-color: var(--brand-primary);
  box-shadow: var(--brand-shadow-primary);
}

.avatar-img,
.avatar-initials {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-img { object-fit: cover; }

.avatar-initials {
  background: var(--brand-gradient-primary);
  color: white;
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-family: var(--font-family-heading);
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
  color: white;
}

.avatar-wrap:hover .avatar-overlay { opacity: 1; }

.avatar-cam-icon { display: flex; }

.avatar-spinner {
  display: inline-block;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.avatar-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin: 0;
  white-space: nowrap;
}

.file-hidden { display: none; }

/* Identity info */
.identity-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  min-width: 0;
  padding-top: var(--spacing-1);
}

.name-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  flex-wrap: wrap;
}

.user-name {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
  letter-spacing: -0.01em;
}

.username-text {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  margin: 0;
}

.badge-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

/* Role chip */
.role-chip {
  padding: 2px 10px;
  border-radius: 99px;
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}

.role--owner {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  color: #451a03;
}
.role--admin {
  background: var(--brand-overlay-primary-15);
  color: var(--brand-primary-dark);
  border: 1px solid var(--brand-overlay-primary-20);
}
.role--kasir {
  background: rgba(16, 185, 129, 0.12);
  color: #065f46;
  border: 1px solid rgba(16, 185, 129, 0.25);
}

/* Status chip */
.status-chip {
  padding: 2px 10px;
  border-radius: 99px;
  font-size: var(--font-size-xs);
  font-weight: 600;
}
.status--active  {
  background: rgba(16, 185, 129, 0.12);
  color: #065f46;
  border: 1px solid rgba(16, 185, 129, 0.25);
}
.status--inactive {
  background: rgba(239, 68, 68, 0.1);
  color: #991b1b;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

/* Meta row */
.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-3);
  margin-top: var(--spacing-1);
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.meta-label {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--color-text-tertiary);
}

.meta-value {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-weight: 500;
}

/* ── Fields grid (view mode) ── */
.fields-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
}

.field-item {
  padding: var(--spacing-3) var(--spacing-5);
  border-bottom: 1px solid var(--color-border-light);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.field-item:nth-child(odd) {
  border-right: 1px solid var(--color-border-light);
}

.field-item:last-child,
.field-item:nth-last-child(2):nth-child(odd) {
  border-bottom: none;
}

.field-label {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-tertiary);
  letter-spacing: 0.05em;
}

.field-value {
  font-size: var(--font-size-base);
  font-weight: 500;
  color: var(--color-text-primary);
  word-break: break-word;
}

/* ── Edit form ── */
.edit-form {
  padding: var(--spacing-4) var(--spacing-5);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.form-label {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-secondary);
  letter-spacing: 0.04em;
}

.required { color: var(--color-danger); }

.form-input {
  padding: var(--spacing-2) var(--spacing-3);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-base);
  font-family: var(--font-family-body);
  background: var(--color-surface-0);
  color: var(--color-text-primary);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  width: 100%;
}

.form-input:focus {
  outline: none;
  border-color: var(--brand-primary);
  box-shadow: 0 0 0 3px var(--brand-overlay-primary-10);
}

/* Password input wrap */
.input-wrap {
  position: relative;
}

.input-wrap .form-input {
  padding-right: 2.8rem;
}

.toggle-pw {
  position: absolute;
  right: var(--spacing-2);
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
  transition: color 0.15s ease;
}

.toggle-pw:hover { color: var(--brand-primary); }

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-2);
}

.form-error {
  padding: var(--spacing-3);
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-sm);
  color: #991b1b;
  font-size: var(--font-size-sm);
  font-weight: 500;
}

/* ── Password placeholder ── */
.password-placeholder {
  padding: var(--spacing-4) var(--spacing-5);
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.password-dots {
  font-size: 1.4rem;
  letter-spacing: 0.2em;
  color: var(--color-text-tertiary);
}

.password-hint {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

/* ── Dark mode ── */
html.dark-mode .profile-page { background: var(--color-bg); }

html.dark-mode .card {
  background: var(--color-surface-1);
  border-color: var(--color-border);
}

html.dark-mode .card-header { border-bottom-color: var(--color-border); }
html.dark-mode .field-item { border-color: var(--color-border); }
html.dark-mode .field-item:nth-child(odd) { border-right-color: var(--color-border); }

html.dark-mode .form-input {
  background: var(--color-surface-2);
  border-color: var(--color-border);
  color: var(--color-text-primary);
}

html.dark-mode .form-input:focus {
  background: var(--color-surface-3);
  border-color: var(--brand-primary-light);
}

html.dark-mode .form-error {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}

html.dark-mode .role--owner {
  background: rgba(251, 191, 36, 0.15);
  color: #fcd34d;
  border: 1px solid rgba(251, 191, 36, 0.3);
}

html.dark-mode .role--admin {
  background: var(--brand-overlay-primary-20);
  color: var(--brand-primary-light);
  border-color: var(--brand-overlay-primary-30);
}

html.dark-mode .role--kasir {
  background: rgba(16, 185, 129, 0.15);
  color: #6ee7b7;
  border-color: rgba(16, 185, 129, 0.3);
}

html.dark-mode .status--active {
  background: rgba(16, 185, 129, 0.15);
  color: #6ee7b7;
  border-color: rgba(16, 185, 129, 0.3);
}

html.dark-mode .status--inactive {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
  border-color: rgba(239, 68, 68, 0.3);
}

html.dark-mode .password-dots,
html.dark-mode .password-hint { color: var(--color-text-tertiary); }

/* Tablet Landscape compact — Samsung Tab A9 */
@media (min-width: 768px) and (max-width: 1023px) {
  .profile-page { padding: var(--spacing-2); }
  .profile-container { gap: var(--spacing-2); }
  .profile-card { padding: var(--spacing-3) var(--spacing-3); }
}

/* ── Responsive ── */
@media (max-width: 640px) {
  .profile-page { padding: var(--spacing-3); }
  .identity-card { flex-direction: column; align-items: center; text-align: center; }
  .name-row { justify-content: center; }
  .badge-row { justify-content: center; }
  .meta-row { justify-content: center; }
  .fields-grid { grid-template-columns: 1fr; }
  .field-item:nth-child(odd) { border-right: none; }
  .field-item:nth-last-child(2):nth-child(odd) { border-bottom: 1px solid var(--color-border-light); }
  html.dark-mode .field-item:nth-last-child(2):nth-child(odd) { border-bottom-color: var(--color-border); }
  .field-item:last-child { border-bottom: none; }
  .form-actions { flex-direction: column-reverse; }
  .password-placeholder { flex-direction: column; align-items: flex-start; gap: var(--spacing-1); }
}
</style>
