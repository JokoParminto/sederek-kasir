<script setup lang="ts">
import { ref, onMounted, computed, watch, useTemplateRef } from 'vue'
import { useMemberTierStore } from '@/stores/memberTier'
import { memberTierApi } from '@/services/api/memberTier.api'
import { productApi } from '@/services/api/product.api'
import { useToast } from '@/composables/useToast'
import type { MemberTierRule, MemberTier, MemberTierRuleProduct } from '@/types/memberTier'

const memberTierStore = useMemberTierStore()
const { success: showSuccess, error: showError } = useToast()

const isLoading = ref(false)
const showRuleForm = ref(false)
const editingRule = ref<MemberTierRule | null>(null)

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
  daily_limit: null as number | null,
})

// Produk yang sudah dipilih — simpan {id, name, price} agar bisa tampil sebagai chip
interface SelectedProduct { id: string; name: string; price: number }
const selectedProducts = ref<SelectedProduct[]>([])
const selectedProductIds = computed(() => new Set(selectedProducts.value.map(p => p.id)))

// Search state — server-side dengan infinite scroll
const PER_PAGE = 15
const productSearch = ref('')
const searchResults = ref<SelectedProduct[]>([])
const searchLoading = ref(false)
const searchPage = ref(1)
const searchHasMore = ref(false)
const searchSentinel = useTemplateRef<HTMLElement>('searchSentinel')
let searchTimer: ReturnType<typeof setTimeout> | null = null
let sentinelObserver: IntersectionObserver | null = null

const doSearch = async (q: string, page = 1) => {
  if (!q.trim()) { searchResults.value = []; searchHasMore.value = false; return }
  searchLoading.value = true
  try {
    const res = await productApi.getAllProducts({ search: q.trim(), per_page: PER_PAGE, page })
    const mapped = res.data.map(p => ({ id: p.id, name: p.name, price: p.price }))
    if (page === 1) searchResults.value = mapped
    else searchResults.value.push(...mapped)
    searchPage.value = page
    searchHasMore.value = mapped.length === PER_PAGE
  } catch {
    if (page === 1) searchResults.value = []
  } finally {
    searchLoading.value = false
  }
}

const loadMore = () => {
  if (!searchLoading.value && searchHasMore.value) {
    doSearch(productSearch.value, searchPage.value + 1)
  }
}

const setupSentinelObserver = () => {
  if (sentinelObserver) sentinelObserver.disconnect()
  sentinelObserver = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) loadMore()
  }, { threshold: 0.1 })
}

watch(searchSentinel, (el) => {
  if (!el) return
  if (!sentinelObserver) setupSentinelObserver()
  sentinelObserver!.observe(el)
})

watch(productSearch, (val) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchResults.value = []
  searchHasMore.value = false
  if (!val.trim()) return
  searchTimer = setTimeout(() => doSearch(val, 1), 300)
})

const toggleProduct = (p: SelectedProduct) => {
  const idx = selectedProducts.value.findIndex(s => s.id === p.id)
  if (idx >= 0) selectedProducts.value.splice(idx, 1)
  else selectedProducts.value.push(p)
}

const removeSelected = (id: string) => {
  selectedProducts.value = selectedProducts.value.filter(p => p.id !== id)
}

const tierLabel = (t: string) => ({ umum: 'Umum', akamsi: 'Akamsi', vip: 'VIP' })[t] || t
const statusColor = (r: MemberTierRule) => r.is_active ? '#22c55e' : '#94a3b8'

const rulesByTier = computed(() => {
  const map: Record<string, MemberTierRule[]> = { umum: [], akamsi: [], vip: [] }
  for (const r of memberTierStore.rules) {
    if (map[r.tier]) map[r.tier]!.push(r)
  }
  return map
})

onMounted(async () => {
  isLoading.value = true
  try {
    await memberTierStore.reloadRules()
  } finally {
    isLoading.value = false
  }
})

const resetPickerState = () => {
  selectedProducts.value = []
  productSearch.value = ''
  searchResults.value = []
  searchHasMore.value = false
  searchPage.value = 1
  if (sentinelObserver) { sentinelObserver.disconnect(); sentinelObserver = null }
}

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
    daily_limit: null,
  }
  resetPickerState()
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
    daily_limit: rule.daily_limit ?? null,
  }
  // Populate dari products yang sudah tersimpan di rule
  selectedProducts.value = (rule.products ?? []).map((p: MemberTierRuleProduct) => ({
    id: p.id,
    name: p.name,
    price: (p as any).price ?? 0,
  }))
  productSearch.value = ''
  searchResults.value = []
  showRuleForm.value = true
}

const saveRule = async () => {
  try {
    let ruleId: string
    if (editingRule.value) {
      await memberTierApi.updateRule(editingRule.value.id, form.value)
      ruleId = editingRule.value.id
      showSuccess('Rule diupdate')
    } else {
      const created = await memberTierApi.createRule(form.value)
      ruleId = created.id
      showSuccess('Rule dibuat')
    }
    if (form.value.scope === 'specific') {
      await memberTierApi.setRuleProducts(ruleId, selectedProducts.value.map(p => p.id))
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

        <div v-if="!(rulesByTier[tier] ?? []).length" class="empty-rules">
          Belum ada rule untuk tier ini.
        </div>

        <div v-for="rule in (rulesByTier[tier] ?? [])" :key="rule.id" class="rule-card">
          <div class="rule-header">
            <span class="rule-status-dot" :style="{ background: statusColor(rule) }" />
            <span class="rule-label">{{ rule.label }}</span>
            <div class="rule-actions">
              <button class="btn-icon" @click="openEdit(rule)" title="Edit">✏️</button>
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
            Belum ada produk dipilih — klik ✏️ untuk edit dan pilih produk
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

          <!-- Inline product picker — tampil hanya saat scope = specific -->
          <div v-if="form.scope === 'specific'" class="form-group">
            <label class="form-label">
              Pilih Produk
              <span v-if="selectedProducts.length" class="selected-count">{{ selectedProducts.length }} dipilih</span>
            </label>

            <!-- Chips produk yang sudah dipilih -->
            <div v-if="selectedProducts.length" class="selected-chips">
              <span v-for="p in selectedProducts" :key="p.id" class="selected-chip">
                {{ p.name }}
                <button type="button" class="chip-remove" @click="removeSelected(p.id)">×</button>
              </span>
            </div>

            <!-- Search input -->
            <div class="search-wrapper">
              <input
                v-model="productSearch"
                class="form-input"
                placeholder="Ketik nama produk untuk mencari..."
              />
              <span v-if="searchLoading" class="search-spinner">⟳</span>
            </div>

            <!-- Search results -->
            <div v-if="searchResults.length" class="search-results">
              <button
                v-for="p in searchResults"
                :key="p.id"
                type="button"
                class="search-result-item"
                :class="{ 'is-selected': selectedProductIds.has(p.id) }"
                @click="toggleProduct(p)"
              >
                <span class="result-check">{{ selectedProductIds.has(p.id) ? '✓' : '+' }}</span>
                <span class="result-name">{{ p.name }}</span>
                <span class="result-price">Rp{{ p.price.toLocaleString('id') }}</span>
              </button>
              <!-- Sentinel untuk infinite scroll -->
              <div v-if="searchHasMore" ref="searchSentinel" class="scroll-sentinel">
                <span v-if="searchLoading" class="load-more-text">Memuat...</span>
              </div>
              <div v-else-if="searchResults.length >= PER_PAGE" class="scroll-end-text">
                Semua hasil ditampilkan
              </div>
            </div>
            <div v-else-if="productSearch.trim() && !searchLoading" class="picker-empty">
              Produk tidak ditemukan
            </div>
            <p v-else-if="!productSearch.trim()" class="form-hint">Ketik nama produk untuk mencari</p>
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

          <div class="form-group">
            <label class="form-label">Batas Harian (cup/hari)</label>
            <input v-model.number="form.daily_limit" type="number" class="form-input" min="1" placeholder="Kosong = tidak terbatas" />
            <p class="form-hint">Maks berapa cup per hari yang mendapat diskon ini. Kosongkan jika tidak ada limit.</p>
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

/* Product picker — search + chips */
.selected-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.selected-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 0.78rem; padding: 3px 8px 3px 10px; border-radius: 999px; background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
.chip-remove { background: none; border: none; cursor: pointer; font-size: 0.9rem; color: #86efac; line-height: 1; padding: 0 1px; }
.chip-remove:hover { color: #dc2626; }

.search-wrapper { position: relative; }
.search-spinner { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font-size: 0.85rem; color: #94a3b8; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }

.search-results { border: 1px solid var(--color-border, #e2e8f0); border-radius: 8px; overflow-y: auto; max-height: 280px; margin-top: 4px; }
.scroll-sentinel { padding: 10px; text-align: center; min-height: 1px; }
.load-more-text { font-size: 0.78rem; color: #94a3b8; }
.scroll-end-text { text-align: center; padding: 8px; font-size: 0.75rem; color: #cbd5e1; }
.search-result-item { width: 100%; display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: none; border: none; border-bottom: 1px solid var(--color-border, #f1f5f9); cursor: pointer; text-align: left; }
.search-result-item:last-child { border-bottom: none; }
.search-result-item:hover { background: #f8fafc; }
.search-result-item.is-selected { background: #f0fdf4; }
.result-check { width: 18px; font-size: 0.8rem; color: #16a34a; font-weight: 700; flex-shrink: 0; }
.result-name { flex: 1; font-size: 0.87rem; }
.result-price { font-size: 0.8rem; color: #64748b; flex-shrink: 0; }
.picker-empty { text-align: center; padding: 14px; color: #94a3b8; font-size: 0.82rem; }

.selected-count { font-size: 0.75rem; font-weight: 600; color: #16a34a; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 999px; padding: 1px 8px; margin-left: auto; }

.form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }

/* Reuse modal styles from global or define minimal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: var(--color-surface, #fff); border-radius: 14px; width: min(560px, 94vw); max-height: 90vh; overflow-y: auto; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--color-border, #e2e8f0); }
.modal-header h2 { font-size: 1rem; font-weight: 600; }
.modal-body { padding: 20px; }
.btn-close { background: none; border: none; cursor: pointer; font-size: 1rem; color: #64748b; }

.form-group { margin-bottom: 14px; }
.form-label { display: flex; align-items: center; font-size: 0.82rem; font-weight: 500; margin-bottom: 5px; color: var(--color-text-secondary, #64748b); }
.form-input { width: 100%; border: 1px solid var(--color-border, #e2e8f0); border-radius: 7px; padding: 8px 10px; font-size: 0.87rem; box-sizing: border-box; }
.form-hint { font-size: 0.75rem; color: #94a3b8; margin-top: 4px; }

.btn-primary { background: var(--color-primary, #16a34a); color: #fff; border: none; border-radius: 8px; padding: 9px 18px; font-size: 0.87rem; font-weight: 600; cursor: pointer; }
.btn-secondary { background: var(--color-bg-subtle, #f1f5f9); border: 1px solid var(--color-border, #e2e8f0); border-radius: 8px; padding: 9px 18px; font-size: 0.87rem; cursor: pointer; }
</style>
