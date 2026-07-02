<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { queueApi, type QueueEntry, type QueueItemDetail } from '@/services/api/queue.api'
import { useToast } from '@/composables/useToast'

const { error: showError } = useToast()

const queue = ref<QueueEntry[]>([])
const isLoading = ref(false)
const advancingKey = ref<string | null>(null)

let pollInterval: ReturnType<typeof setInterval> | null = null

const loadQueue = async (silent = false) => {
  if (!silent) isLoading.value = true
  try {
    queue.value = await queueApi.getQueue()
  } catch {
    showError('Gagal memuat antrian')
  } finally {
    isLoading.value = false
  }
}

const handleAdvanceItem = async (entry: QueueEntry, itemIndex: number) => {
  const key = `${entry.id}-${itemIndex}`
  advancingKey.value = key
  try {
    const result = await queueApi.advanceItemStatus(entry.id, itemIndex)
    if (result.all_done) {
      queue.value = queue.value.filter(q => q.id !== entry.id)
    } else {
      const found = queue.value.find(q => q.id === entry.id)
      if (found) found.items = result.items
    }
  } catch {
    showError('Gagal update status item')
  } finally {
    advancingKey.value = null
  }
}

// Hanya item yang belum done
const visibleItems = (items: QueueItemDetail[]) =>
  items.filter(i => i.status !== 'done')

const activeCount = computed(() => queue.value.length)
const pendingCount = computed(() =>
  queue.value.reduce((n, e) => n + e.items.filter(i => i.status === 'pending').length, 0),
)
const makingCount = computed(() =>
  queue.value.reduce((n, e) => n + e.items.filter(i => i.status === 'making').length, 0),
)

const cardStatus = (entry: QueueEntry): 'all-pending' | 'has-making' | 'almost-done' => {
  const active = visibleItems(entry.items)
  if (active.every(i => i.status === 'making')) return 'almost-done'
  if (active.some(i => i.status === 'making')) return 'has-making'
  return 'all-pending'
}

const itemActionLabel = (status: string) => {
  if (status === 'pending') return 'Mulai'
  if (status === 'making') return 'Selesai'
  return ''
}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
  })

const elapsedMinutes = (iso: string): string => {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (diff < 1) return 'Baru'
  if (diff < 60) return `${diff}m`
  return `${Math.floor(diff / 60)}j ${diff % 60}m`
}

const queueLabel = (entry: QueueEntry, index: number): string => {
  const n = entry.queue_number ?? (index + 1)
  return `#${String(n).padStart(2, '0')}`
}

defineExpose({ loadQueue, activeCount })

onMounted(() => {
  loadQueue()
  pollInterval = setInterval(() => loadQueue(true), 30_000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})
</script>

<template>
  <div class="antrian-panel">

    <!-- Summary bar -->
    <div class="summary-bar">
      <div class="summary-stat">
        <span class="stat-num">{{ activeCount }}</span>
        <span class="stat-label">Pesanan</span>
      </div>
      <div class="summary-div"></div>
      <div class="summary-stat">
        <span class="stat-num stat-num--pending">{{ pendingCount }}</span>
        <span class="stat-label">Belum Dibuat</span>
      </div>
      <div class="summary-div"></div>
      <div class="summary-stat">
        <span class="stat-num stat-num--making">{{ makingCount }}</span>
        <span class="stat-label">Sedang Dibuat</span>
      </div>
      <button class="queue-refresh" :class="{ spinning: isLoading }" @click="loadQueue()" title="Refresh">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
      </button>
    </div>

    <!-- Empty state -->
    <div v-if="!isLoading && queue.length === 0" class="empty-state">
      <div class="empty-circle"><AppIcon name="coffee" :size="28" /></div>
      <p class="empty-title">Antrian kosong</p>
      <p class="empty-sub">Semua pesanan sudah dibuatkan</p>
    </div>

    <!-- Skeleton -->
    <div v-else-if="isLoading && queue.length === 0" class="queue-list">
      <div v-for="i in 2" :key="i" class="skeleton-card">
        <div class="sk sk--header"></div>
        <div class="sk sk--name"></div>
        <div class="sk sk--item"></div>
        <div class="sk sk--item"></div>
      </div>
    </div>

    <!-- Queue list -->
    <div v-else class="queue-list">
      <div
        v-for="(entry, idx) in queue"
        :key="entry.id"
        class="queue-card"
        :class="`queue-card--${cardStatus(entry)}`"
      >
        <!-- Card header -->
        <div class="card-header">
          <!-- Queue number badge -->
          <div class="queue-badge" :class="`queue-badge--${cardStatus(entry)}`">
            {{ queueLabel(entry, idx) }}
          </div>

          <!-- Customer name -->
          <div class="customer-block">
            <span class="customer-name">{{ entry.customer_name }}</span>
            <span class="trx-number">{{ entry.transaction_number }}</span>
          </div>

          <!-- Right meta: time + elapsed -->
          <div class="card-meta-right">
            <span class="order-time">{{ formatTime(entry.ordered_at) }}</span>
            <span class="elapsed-time">{{ elapsedMinutes(entry.ordered_at) }}</span>
          </div>
        </div>

        <!-- Type chip row -->
        <div class="chip-row">
          <span class="type-chip" :class="entry.order_type === 'paid' ? 'type-chip--paid' : 'type-chip--hold'">
            {{ entry.order_type === 'paid' ? 'Lunas' : 'Hold' }}
          </span>
          <span class="items-remaining">{{ visibleItems(entry.items).length }} item tersisa</span>
        </div>

        <!-- Divider -->
        <div class="card-divider"></div>

        <!-- Items -->
        <div class="items-block">
          <div
            v-for="(item, idx2) in entry.items"
            :key="`${entry.id}-${idx2}-${item.name}`"
            v-show="item.status !== 'done'"
            class="item-row"
            :class="`item-row--${item.status}`"
          >
            <!-- Item info -->
            <div class="item-info">
              <div class="item-main">
                <span class="item-qty">{{ item.qty }}×</span>
                <span class="item-name">{{ item.name }}</span>
              </div>
              <div v-if="item.notes" class="item-notes">{{ item.notes }}</div>
              <div v-if="item.addons?.length" class="item-addons">
                <span v-for="addon in item.addons" :key="addon" class="addon-tag">{{ addon }}</span>
              </div>
            </div>

            <!-- Action button -->
            <button
              v-if="item.status !== 'done'"
              class="btn-action"
              :class="`btn-action--${item.status}`"
              :disabled="advancingKey === `${entry.id}-${idx2}`"
              @click="handleAdvanceItem(entry, idx2)"
            >
              <svg v-if="advancingKey === `${entry.id}-${idx2}`" class="spin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              <template v-else>{{ itemActionLabel(item.status) }}</template>
            </button>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>

<style scoped>
.antrian-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--color-bg-secondary);
}

/* ── Summary bar ── */
.summary-bar {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3) var(--spacing-4);
  background: var(--color-surface-0);
  border-bottom: 1px solid var(--color-border-light);
  flex-shrink: 0;
}

.summary-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex: 1;
}

.stat-num {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  line-height: 1;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
}
.stat-num--pending { color: var(--color-warning); }
.stat-num--making  { color: var(--color-info); }

.stat-label {
  font-size: var(--font-size-xs);
  font-weight: 500;
  color: var(--color-text-tertiary);
  white-space: nowrap;
}

.summary-div {
  width: 1px;
  height: 28px;
  background: var(--color-border-light);
  flex-shrink: 0;
}

.queue-refresh {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: all 0.15s ease;
}
.queue-refresh:hover {
  background: var(--brand-overlay-primary-10);
  border-color: var(--brand-primary);
  color: var(--brand-primary);
}
.queue-refresh.spinning svg { animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Empty state ── */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  padding: var(--spacing-8);
}
.empty-circle {
  width: 64px;
  height: 64px;
  background: var(--brand-overlay-primary-10);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  margin-bottom: var(--spacing-2);
}
.empty-title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text-primary);
}
.empty-sub {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

/* ── Skeleton ── */
.skeleton-card {
  background: var(--color-surface-0);
  border-radius: var(--radius-md);
  padding: var(--spacing-4);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}
.sk {
  border-radius: var(--radius-xs);
  background: linear-gradient(90deg, var(--color-surface-2) 25%, var(--color-surface-3) 50%, var(--color-surface-2) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}
.sk--header { height: 36px; width: 100%; border-radius: var(--radius-sm); }
.sk--name   { height: 20px; width: 55%; }
.sk--item   { height: 52px; width: 100%; border-radius: var(--radius-sm); }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* ── Queue list ── */
.queue-list {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  padding: var(--spacing-3);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

/* ── Queue card ── */
.queue-card {
  background: var(--color-surface-0);
  border-radius: var(--radius-md);
  border: 1.5px solid var(--color-border-light);
  border-left-width: 4px;
  padding: var(--spacing-3) var(--spacing-3) var(--spacing-3) var(--spacing-3);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  box-shadow: var(--shadow-1);
  transition: border-color 0.2s ease;
}

.queue-card--all-pending  { border-left-color: var(--color-warning); }
.queue-card--has-making   { border-left-color: var(--color-info); }
.queue-card--almost-done  { border-left-color: var(--color-success); }

/* ── Card header ── */
.card-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

/* Queue number badge */
.queue-badge {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-base);
  font-weight: 800;
  letter-spacing: -0.02em;
  font-family: var(--font-family-body);
}
.queue-badge--all-pending {
  background: rgba(245, 158, 11, 0.12);
  color: #92400e;
  border: 1.5px solid rgba(245, 158, 11, 0.3);
}
.queue-badge--has-making {
  background: rgba(59, 130, 246, 0.1);
  color: #1e40af;
  border: 1.5px solid rgba(59, 130, 246, 0.3);
}
.queue-badge--almost-done {
  background: rgba(16, 185, 129, 0.1);
  color: #065f46;
  border: 1.5px solid rgba(16, 185, 129, 0.3);
}

/* Customer block */
.customer-block {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.customer-name {
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.01em;
}
.trx-number {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-weight: 500;
}

/* Right meta */
.card-meta-right {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}
.order-time {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
}
.elapsed-time {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
}

/* Chip row */
.chip-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}
.type-chip {
  padding: 2px var(--spacing-2);
  border-radius: var(--radius-xs);
  font-size: var(--font-size-xs);
  font-weight: 600;
  letter-spacing: 0.02em;
}
.type-chip--paid {
  background: rgba(245, 158, 11, 0.1);
  color: #92400e;
  border: 1px solid rgba(245, 158, 11, 0.25);
}
.type-chip--hold {
  background: var(--brand-overlay-primary-10);
  color: var(--brand-primary-dark);
  border: 1px solid var(--brand-overlay-primary-20);
}
.items-remaining {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-weight: 500;
  margin-left: auto;
}

/* Divider */
.card-divider {
  height: 1px;
  background: var(--color-border-light);
  margin: var(--spacing-1) 0;
}

/* ── Items block ── */
.items-block {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.item-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
  padding: var(--spacing-2) var(--spacing-3);
  border: 1px solid var(--color-border-light);
  transition: background 0.15s ease, border-color 0.15s ease;
  min-height: 52px;
}
.item-row--making {
  background: rgba(59, 130, 246, 0.04);
  border-color: rgba(59, 130, 246, 0.25);
}

/* Item info */
.item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.item-main {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-1);
  flex-wrap: wrap;
}
.item-qty {
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--brand-primary);
  flex-shrink: 0;
}
.item-name {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}
.item-notes {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  font-style: italic;
}
.item-addons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-1);
  margin-top: 2px;
}
.addon-tag {
  padding: 1px 6px;
  background: var(--brand-overlay-primary-10);
  color: var(--brand-primary-dark);
  border-radius: var(--radius-xs);
  font-size: var(--font-size-xs);
  font-weight: 600;
  border: 1px solid var(--brand-overlay-primary-15);
}

/* ── Action button ── */
.btn-action {
  flex-shrink: 0;
  min-width: 64px;
  min-height: 44px;
  padding: 0 var(--spacing-3);
  border-radius: var(--radius-sm);
  border: 1.5px solid;
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
  font-family: var(--font-family-body);
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  letter-spacing: 0.01em;
}
.btn-action:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-action--pending {
  background: rgba(245, 158, 11, 0.08);
  border-color: rgba(245, 158, 11, 0.4);
  color: #92400e;
}
.btn-action--pending:hover:not(:disabled) {
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.6);
}

.btn-action--making {
  background: var(--color-success);
  border-color: transparent;
  color: white;
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
}
.btn-action--making:hover:not(:disabled) {
  background: #059669;
  box-shadow: 0 4px 10px rgba(16, 185, 129, 0.4);
  transform: translateY(-1px);
}

.spin-icon { animation: spin 0.6s linear infinite; }

/* ── Dark mode ── */
html.dark-mode .summary-bar   { background: var(--color-surface-1); border-color: var(--color-border); }
html.dark-mode .queue-card    { background: var(--color-surface-1); border-color: var(--color-border); }
html.dark-mode .queue-card--all-pending { border-left-color: var(--color-warning); }
html.dark-mode .queue-card--has-making  { border-left-color: var(--color-info); }
html.dark-mode .queue-card--almost-done { border-left-color: var(--color-success); }
html.dark-mode .card-divider  { background: var(--color-border); }
html.dark-mode .item-row      { background: var(--color-surface-2); border-color: var(--color-border); }
html.dark-mode .item-row--making { background: rgba(59,130,246,0.08); border-color: rgba(59,130,246,0.3); }
html.dark-mode .queue-badge--all-pending { background: rgba(245,158,11,0.15); color: #fbbf24; }
html.dark-mode .queue-badge--has-making  { background: rgba(59,130,246,0.15); color: #60a5fa; }
html.dark-mode .queue-badge--almost-done { background: rgba(16,185,129,0.15); color: #34d399; }
html.dark-mode .type-chip--paid  { background: rgba(245,158,11,0.15); color: #fbbf24; }
html.dark-mode .btn-action--pending { color: #fbbf24; }
</style>
