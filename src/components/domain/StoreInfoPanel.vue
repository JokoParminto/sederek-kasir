<script setup lang="ts">
import { ref, watch } from 'vue'
import { uploadApi } from '@/services/api/upload.api'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'

interface StoreInfo {
  store_name: string
  store_address: string
  store_phone: string
  footer_text: string
  logo_url: string
}

const props = defineProps<{
  modelValue: StoreInfo
}>()

const emit = defineEmits<{
  'update:modelValue': [value: StoreInfo]
}>()

const local = ref<StoreInfo>({ ...props.modelValue })
const isUploading = ref(false)
const uploadError = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)

watch(() => props.modelValue, (v) => {
  local.value = { ...v }
}, { deep: true })

const update = (field: keyof StoreInfo, value: string) => {
  local.value = { ...local.value, [field]: value }
  emit('update:modelValue', { ...local.value })
}

const handleLogoClick = () => fileInputRef.value?.click()

const handleLogoFile = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadError.value = ''
  isUploading.value = true
  try {
    const url = await uploadApi.uploadImage(file, 'logo')
    update('logo_url', url)
  } catch (err: any) {
    uploadError.value = err?.response?.data?.error?.message || err.message || 'Upload gagal'
  } finally {
    isUploading.value = false
    if (fileInputRef.value) fileInputRef.value.value = ''
  }
}

const removeLogo = () => update('logo_url', '')

// Build full logo URL for preview
const getLogoPreviewUrl = (url: string) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:3000'}${url}`
}
</script>

<template>
  <div class="store-info-panel">
    <h3 class="panel-title">Info Toko</h3>
    <p class="panel-desc">Wording ini akan tampil di preview dan cetak struk</p>

    <!-- Error -->
    <BaseAlert v-if="uploadError" type="error" :description="uploadError" @close="uploadError = ''" />

    <!-- Logo -->
    <div class="form-group">
      <label class="form-label">Logo Toko</label>
      <div class="logo-section">
        <div v-if="local.logo_url" class="logo-preview">
          <img :src="getLogoPreviewUrl(local.logo_url)" alt="Logo" class="logo-img" />
          <button class="logo-remove" @click="removeLogo" title="Hapus logo"><AppIcon name="x" :size="14" /></button>
        </div>
        <div v-else class="logo-placeholder">
          <AppIcon name="image" :size="24" />
          <span>Belum ada logo</span>
        </div>
        <BaseButton
          variant="secondary"
          size="sm"
          :loading="isUploading"
          :disabled="isUploading"
          @click="handleLogoClick"
        >
          {{ isUploading ? 'Mengupload...' : local.logo_url ? 'Ganti Logo' : 'Upload Logo' }}
        </BaseButton>
        <input
          ref="fileInputRef"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="file-input-hidden"
          @change="handleLogoFile"
        />
      </div>
      <span class="field-hint">Format: JPG, PNG, WebP. Maks 5MB.</span>
    </div>

    <!-- Nama Toko -->
    <div class="form-group">
      <label class="form-label">Nama Toko</label>
      <input
        :value="local.store_name"
        type="text"
        class="form-input"
        placeholder="Contoh: Sederek Kopi"
        @input="update('store_name', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <!-- Alamat -->
    <div class="form-group">
      <label class="form-label">Alamat</label>
      <textarea
        :value="local.store_address"
        class="form-input"
        rows="2"
        placeholder="Jl. Contoh No. 1, Kota"
        @input="update('store_address', ($event.target as HTMLTextAreaElement).value)"
      ></textarea>
    </div>

    <!-- No. Telepon -->
    <div class="form-group">
      <label class="form-label">No. Telepon <span class="optional">(opsional)</span></label>
      <input
        :value="local.store_phone"
        type="text"
        class="form-input"
        placeholder="08xx-xxxx-xxxx"
        @input="update('store_phone', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <!-- Tagline / Footer -->
    <div class="form-group">
      <label class="form-label">Tagline / Pesan Footer Struk</label>
      <textarea
        :value="local.footer_text"
        class="form-input"
        rows="2"
        placeholder="Terima kasih telah memilih Sederek Kopi!"
        @input="update('footer_text', ($event.target as HTMLTextAreaElement).value)"
      ></textarea>
    </div>
  </div>
</template>

<style scoped>
.store-info-panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
  padding: var(--spacing-4);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-light);
}

.panel-title {
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

.panel-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin: calc(-1 * var(--spacing-2)) 0 0 0;
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

.optional {
  font-weight: 400;
  text-transform: none;
  color: var(--color-text-tertiary);
}

.form-input {
  padding: var(--spacing-2) var(--spacing-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-family: inherit;
  background: var(--color-surface-0);
  color: var(--color-text-primary);
  width: 100%;
  resize: vertical;
  transition: border-color var(--transition-duration-short) var(--transition-standard);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(123, 47, 190, 0.1);
}

/* Logo upload */
.logo-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.logo-preview {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-light);
  overflow: hidden;
  flex-shrink: 0;
}

.logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.logo-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  background: rgba(239, 68, 68, 0.85);
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-placeholder {
  width: 64px;
  height: 64px;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.logo-placeholder span:first-child { font-size: 1.2rem; }

.file-input-hidden { display: none; }

.field-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}
</style>
