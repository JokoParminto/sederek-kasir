<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useMemberTierStore } from '@/stores/memberTier'
import { memberTierApi } from '@/services/api/memberTier.api'
import { useProductStore } from '@/stores/product'
import { productApi } from '@/services/api/product.api'
import { useToast } from '@/composables/useToast'
import type { MemberTierRule, MemberTier } from '@/types/memberTier'

const memberTierStore = useMemberTierStore()
const productStore = useProductStore()
const { success: showSuccess, error: showError } = useToast()

const isLoading = ref(false)
const showRuleForm = ref(false)
const editingRule = ref<MemberTierRule | null>(null)
const showProductPicker = ref<string | null>(null) // rule id

// Form
const form = ref({
  tier: 'umum' as MemberTier,
  label: '',
  rule_type: 'discount_amount' as 'discount_amount' | 'fixed_price',
  scope: 'non_food' as 'all' | 'non_food' | 'specific',
  min_price: null as number | null,
  discount_amount: null as number | null,
  fixed_price: null as number | null,
  sort_order: 0,
  is_active: true,
})

const selectedProductIds = ref<Set<string>>(new Set())

const tierLabel = (t: string) => ({ umum: 'Umum', akamsi: 'Akamsi', vip: 'VIP' })[t] || t
const statusColor = (r: MemberTierRule) => r.is_active ? '#22c55e' : '#94a3b8'

const rulesByTier = computed(() => {
  const map: Record<string, MemberTierRule[]> = { umum: [], akamsi: [], vip: [] }
  for (const r of memberTierStore.rules) {
    if (map[r.tier]) map[r.tier].push(r)
  }
  return map
})

onMounted(async () => {
  isLoading.value = true
  try {
    await memberTierStore.reloadRules()
    if (productStore.products.length === 0) {
      const res = await productApi.getAllProducts()
      productStore.setProducts(res.data)
    }
  } finally {
    isLoading.value = false
  }
})

const openCreate = () => {
  editingRule.value = null
  form.value = {
    tier: 'umum',
    label: '',
    rule_type: 'discount_amount',
    scope: 'non_food',
    min_price: null,
    discount_amount: null,
    fixed_price: null,
    sort_order: 0,
    is_active: true,
  }
  showRuleForm.value = true
}

const openEdit = (rule: MemberTierRule) => {
  editingRule.value = rule
  form.value = {
    tier: rule.tier,
    label: rule.label,
    rule_type: rule.rule_type,
    scope: rule.scope,
    min_price: rule.min_price,
    discount_amount: rule.discount_amount,
    fixed_price: rule.fixed_price,
    sort_order: rule.sort_order,
    is_active: rule.is_active,
  }
  showRuleForm.value = true
}

const saveRule = async () => {
  try {
    if (editingRule.value) {
      await memberTierApi.updateRule(editingRule.value.id, form.value)
      showSuccess('Rule diupdate')
    } else {
      await memberTierApi.createRule(form.value)
      showSuccess('Rule dibuat')
    }
    await memberTierStore.reloadRules()
    showRuleForm.value = false
  } catch {
    showError('Gagal menyimpan rule')
  }
}

const deleteRule = async (id: string) => {
  if (!confirm('Hapus rule ini?')) return
  try {
    await memberTierApi.deleteRule(id)
    await memberTierStore.reloadRules()
    showSuccess('Rule dihapus')
  } catch {
    showError('Gagal menghapus rule')
  }
}

const openProductPicker = (rule: MemberTierRule) => {
  showProductPicker.value = rule.id
  selectedProductIds.value = new Set(rule.products.map(p => p.id))
}

const saveRuleProducts = async (ruleId: string) => {
  try {
    await memberTierApi.setRuleProducts(ruleId, Array.from(selectedProductIds.value))
    await memberTierStore.reloadRules()
    showProductPicker.value = null
    showSuccess('Produk rule disimpan')
  } catch {
    showError('Gagal menyimpan produk')
  }
}

const toggleProduct = (id: string) => {
  if (selectedProductIds.value.has(id)) selectedProductIds.value.delete(id)
  else selectedProductIds.value.add(id)
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">Pengaturan Member Tier</h1>
      <button class="btn-primary" @click="openCreate">+ Tambah Rule</button>
    </div>

    <div v-if="isLoading" class="loading-state">Memuat rules...</div>

    <div v-else>
      <div v-for="tier in ['umum', 'akamsi', 'vip']" :key="tier" class="tier-section">
        <h2 class="tier-heading">Member {{ tierLabel(tier) }}</h2>

        <div v-if="!rulesByTier[tier].length" class="empty-rules">
          Belum ada rule untuk tier ini.
        </div>

        <div v-for="rule in rulesByTier[tier]" :key="rule.id" class="rule-card">
          <div class="rule-header">
            <span class="rule-status-dot" :style="{ background: statusColor(rule) }" />
            <span class="rule-label">{{ rule.label }}</span>
            <div class="rule-actions">
              <button class="btn-icon" @click="openEdit(rule)" title="Edit">✏️</button>
              <button v-if="rule.scope === 'specific'" class="btn-icon" @click="openProductPicker(rule)" title="Kelola Produk">🛍️</button>
              <button class="btn-icon btn-danger" @click="deleteRule(rule.id)" title="Hapus">🗑️</button>
            </div>
          </div>

          <div class="rule-meta">
            <span class="badge">{{ rule.rule_type === 'discount_amount' ? 'Diskon' : 'Harga Fixed' }}</span>
            <span class="badge">{{ rule.scope === 'non_food' ? 'Semua minuman' : rule.scope === 'specific' ? 'Produk pilihan' : 'Semua produk' }}</span>
            <span v-if="rule.min_price" class="badge">Min harga: Rp{{ rule.min_price.toLocaleString('id') }}</span>
            <span v-if="rule.discount_amount" class="badge badge-green">Potongan: Rp{{ rule.discount_amount.toLocaleString('id') }}</span>
            <span v-if="rule.fixed_price" class="badge badge-blue">Harga: Rp{{ rule.fixed_price.toLocaleString('id') }}</span>
          </div>

          <div v-if="rule.scope === 'specific' && rule.products.length" class="rule-products">
            <span v-for="p in rule.products" :key="p.id" class="product-chip">{{ p.name }}</span>
          </div>
          <div v-else-if="rule.scope === 'specific'" class="rule-products-empty">
            Belum ada produk — klik 🛍️ untuk menambah
          </div>
        </div>
      </div>
    </div>

    <!-- Rule Form Modal -->
    <div v-if="showRuleForm" class="modal-overlay" @click.self="showRuleForm = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ editingRule ? 'Edit Rule' : 'Tambah Rule' }}</h2>
          <button class="btn-close" @click="showRuleForm = false">✕</button>
        </div>
        <form class="modal-body" @submit.prevent="saveRule">
          <div class="form-group">
            <label class="form-label">Tier</label>
            <select v-model="form.tier" class="form-input">
              <option value="umum">Umum</option>
              <option value="akamsi">Akamsi</option>
              <option value="vip">VIP</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Label (deskripsi rule)</label>
            <input v-model="form.label" class="form-input" placeholder="Contoh: Potongan 2k semua minuman > 15k" required />
          </div>

          <div class="form-group">
            <label class="form-label">Tipe Rule</label>
            <select v-model="form.rule_type" class="form-input">
              <option value="discount_amount">Potongan harga (nominal)</option>
              <option value="fixed_price">Harga tetap (override)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Berlaku untuk</label>
            <select v-model="form.scope" class="form-input">
              <option value="non_food">Semua minuman (non-makanan)</option>
              <option value="specific">Produk tertentu saja</option>
              <option value="all">Semua produk</option>
            </select>
          </div>

          <div class="form-group" v-if="form.scope !== 'specific'">
            <label class="form-label">Harga minimum (opsional)</label>
            <input v-model.number="form.min_price" type="number" class="form-input" placeholder="Contoh: 15000" min="0" />
            <p class="form-hint">Kosongkan jika tidak ada minimum harga</p>
          </div>

          <div class="form-group" v-if="form.rule_type === 'discount_amount'">
            <label class="form-label">Nominal Potongan (Rp)</label>
            <input v-model.number="form.discount_amount" type="number" class="form-input" placeholder="Contoh: 2000" min="0" required />
          </div>

          <div class="form-group" v-if="form.rule_type === 'fixed_price'">
            <label class="form-label">Harga Tetap (Rp)</label>
            <input v-model.number="form.fixed_price" type="number" class="form-input" placeholder="Contoh: 13000" min="0" required />
          </div>

          <div class="form-group">
            <label class="form-label">Urutan (sort order)</label>
            <input v-model.number="form.sort_order" type="number" class="form-input" min="0" />
            <p class="form-hint">Rule dengan fixed_price selalu menang atas diskon biasa</p>
          </div>

          <div class="form-group toggle-group">
            <label class="form-label">Status Aktif</label>
            <input type="checkbox" v-model="form.is_active" />
          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" @click="showRuleForm = false">Batal</button>
            <button type="submit" class="btn-primary">Simpan</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Product Picker Modal -->
    <div v-if="showProductPicker" class="modal-overlay" @click.self="showProductPicker = null">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Pilih Produk untuk Rule</h2>
          <button class="btn-close" @click="showProductPicker = null">✕</button>
        </div>
        <div class="modal-body">
          <p class="form-hint" style="margin-bottom: 12px">Centang produk yang mendapat benefit rule ini</p>
          <div class="product-picker-list">
            <label v-for="product in productStore.products" :key="product.id" class="product-picker-item">
              <input type="checkbox" :checked="selectedProductIds.has(product.id)" @change="toggleProduct(product.id)" />
              <span>{{ product.name }}</span>
              <span class="product-picker-price">Rp{{ product.price.toLocaleString('id') }}</span>
            </label>
          </div>
          <div class="form-actions">
            <button class="btn-secondary" @click="showProductPicker = null">Batal</button>
            <button class="btn-primary" @click="saveRuleProducts(showProductPicker!)">Simpan</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container { padding: 24px; max-width: 800px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-title { font-size: 1.4rem; font-weight: 700; }

.tier-section { margin-bottom: 32px; }
.tier-heading { font-size: 1rem; font-weight: 600; color: var(--color-text-secondary, #64748b); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }

.rule-card { background: var(--color-surface, #fff); border: 1px solid var(--color-border, #e2e8f0); border-radius: 10px; padding: 14px 16px; margin-bottom: 10px; }
.rule-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.rule-status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.rule-label { flex: 1; font-weight: 500; font-size: 0.9rem; }
.rule-actions { display: flex; gap: 4px; }
.rule-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }

.badge { font-size: 0.72rem; padding: 2px 8px; border-radius: 999px; background: var(--color-bg-subtle, #f1f5f9); color: var(--color-text-secondary, #64748b); }
.badge-green { background: #dcfce7; color: #15803d; }
.badge-blue { background: #dbeafe; color: #1d4ed8; }

.rule-products { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.product-chip { font-size: 0.75rem; padding: 2px 10px; border-radius: 999px; background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
.rule-products-empty { font-size: 0.75rem; color: #94a3b8; margin-top: 4px; }

.empty-rules { color: #94a3b8; font-size: 0.85rem; padding: 8px 0; }

.btn-icon { background: none; border: none; cursor: pointer; font-size: 1rem; padding: 2px 4px; border-radius: 4px; }
.btn-icon:hover { background: var(--color-bg-subtle, #f1f5f9); }
.btn-danger:hover { background: #fee2e2; }

.loading-state { text-align: center; padding: 40px; color: #94a3b8; }

.toggle-group { display: flex; align-items: center; gap: 10px; }
.toggle-group input { width: 18px; height: 18px; }

.product-picker-list { max-height: 360px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; }
.product-picker-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 6px; cursor: pointer; }
.product-picker-item:hover { background: var(--color-bg-subtle, #f8fafc); }
.product-picker-item input { width: 16px; height: 16px; flex-shrink: 0; }
.product-picker-item span { flex: 1; font-size: 0.87rem; }
.product-picker-price { color: #64748b; font-size: 0.8rem; }

.form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }

/* Reuse modal styles from global or define minimal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: var(--color-surface, #fff); border-radius: 14px; width: min(480px, 92vw); max-height: 90vh; overflow-y: auto; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--color-border, #e2e8f0); }
.modal-header h2 { font-size: 1rem; font-weight: 600; }
.modal-body { padding: 20px; }
.btn-close { background: none; border: none; cursor: pointer; font-size: 1rem; color: #64748b; }

.form-group { margin-bottom: 14px; }
.form-label { display: block; font-size: 0.82rem; font-weight: 500; margin-bottom: 5px; color: var(--color-text-secondary, #64748b); }
.form-input { width: 100%; border: 1px solid var(--color-border, #e2e8f0); border-radius: 7px; padding: 8px 10px; font-size: 0.87rem; box-sizing: border-box; }
.form-hint { font-size: 0.75rem; color: #94a3b8; margin-top: 4px; }

.btn-primary { background: var(--color-primary, #16a34a); color: #fff; border: none; border-radius: 8px; padding: 9px 18px; font-size: 0.87rem; font-weight: 600; cursor: pointer; }
.btn-secondary { background: var(--color-bg-subtle, #f1f5f9); border: 1px solid var(--color-border, #e2e8f0); border-radius: 8px; padding: 9px 18px; font-size: 0.87rem; cursor: pointer; }
</style>
