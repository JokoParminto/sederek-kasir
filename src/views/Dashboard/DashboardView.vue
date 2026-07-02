<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import VueApexCharts from 'vue3-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { useWindowSize } from '@vueuse/core'
import { useShiftStore } from '@/stores/shift'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { usePullToRefresh } from '@/composables/usePullToRefresh'
import { reportApi } from '@/services/api/report.api'
import { formatRupiah, formatDateJakarta, formatTimeJakarta } from '@/utils/formatters'
import BaseCard from '@/components/base/BaseCard.vue'
import StatusBadge from '@/components/base/StatusBadge.vue'
import PullToRefreshIndicator from '@/components/common/PullToRefreshIndicator.vue'

const shiftStore = useShiftStore()
const authStore = useAuthStore()
const { error: showError } = useToast()

const { pullRefreshOffset, isRefreshing, handleTouchStart, handleTouchMove, handleTouchEnd } = usePullToRefresh({
  cooldown: 3000,
  onRefresh: async () => {
    await Promise.all([shiftStore.fetchCurrentShift(), fetchChartData()])
  }
})

const { width: windowWidth } = useWindowSize()
const isTablet = computed(() => windowWidth.value >= 768 && windowWidth.value <= 1023)
const chartHeight = computed(() => isTablet.value ? 150 : 220)
const chartFontSm = computed(() => isTablet.value ? '10px' : '11px')
const chartFontMd = computed(() => isTablet.value ? '11px' : '13px')
const chartFontLg = computed(() => isTablet.value ? '13px' : '18px')

const isAdmin = computed(() => authStore.userRole === 'admin')
const isLoading = ref(false)

// ── Date range ────────────────────────────────────────────────────────────────

type Preset = 'today' | '7d' | '30d' | 'month'
const activePreset = ref<Preset>('today')

const dateRange = computed(() => {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const today = fmt(now)

  if (activePreset.value === 'today') {
    return { start_date: today, end_date: today }
  }
  if (activePreset.value === '7d') {
    const s = new Date(now); s.setDate(s.getDate() - 6)
    return { start_date: fmt(s), end_date: today }
  }
  if (activePreset.value === '30d') {
    const s = new Date(now); s.setDate(s.getDate() - 29)
    return { start_date: fmt(s), end_date: today }
  }
  // month
  return {
    start_date: fmt(new Date(now.getFullYear(), now.getMonth(), 1)),
    end_date: today,
  }
})

const presetLabel = computed(() => {
  const map: Record<Preset, string> = {
    today: 'Hari Ini',
    '7d': '7 Hari Terakhir',
    '30d': '30 Hari Terakhir',
    month: 'Bulan Ini',
  }
  return map[activePreset.value]
})

// ── Raw data ──────────────────────────────────────────────────────────────────

const dashStats = ref<any>(null)
const dailySales = ref<any[]>([])
const bestProducts = ref<any[]>([])
const salesByCategory = ref<any[]>([])

// ── KPI computed ─────────────────────────────────────────────────────────────

const kpi = computed(() => ({
  revenue: dashStats.value?.sales?.total_sales ?? 0,
  count: dashStats.value?.sales?.total_transactions ?? 0,
  avg: dashStats.value?.sales?.average_sales ?? 0,
  customers: dashStats.value?.customers?.total_customers ?? 0,
  products_sold: dashStats.value?.products?.total_products_sold ?? 0,
}))

const currentShift = computed(() => shiftStore.currentShift)

// ── Chart options factory ─────────────────────────────────────────────────────

const brandPurple = '#7B2FBE'
const brandDark = '#3D0A4F'

const areaChartOptions = computed<ApexOptions>(() => {
  const isToday = activePreset.value === 'today'
  const categories = isToday
    ? Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)
    : dailySales.value.map((d: any) => {
        const date = new Date(d.date)
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
      }).reverse()

  return {
    chart: {
      type: 'area',
      toolbar: { show: false },
      sparkline: { enabled: false },
      zoom: { enabled: false },
      fontFamily: 'Poppins, Inter, sans-serif',
      animations: { enabled: false },
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 3 },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.35,
        opacityTo: 0.02,
        stops: [0, 100],
      },
    },
    colors: [brandPurple],
    xaxis: {
      categories,
      labels: {
        style: { colors: '#94a3b8', fontSize: chartFontSm.value },
        rotate: -30,
        rotateAlways: false,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tickAmount: Math.min(categories.length, 10),
    },
    yaxis: {
      labels: {
        style: { colors: '#94a3b8', fontSize: chartFontSm.value },
        formatter: (v: number) => {
          if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`
          if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`
          return String(v)
        },
      },
    },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4, yaxis: { lines: { show: true } }, xaxis: { lines: { show: false } } },
    tooltip: {
      theme: 'light',
      y: {
        formatter: (v: number) => formatRupiah(v),
      },
    },
  }
})

const areaSeries = computed(() => {
  const isToday = activePreset.value === 'today'
  if (isToday) {
    const hourMap: Record<number, number> = {}
    ;(dashStats.value?.hourly_sales ?? []).forEach((h: any) => {
      hourMap[parseInt(h.hour)] = parseFloat(h.sales)
    })
    return [{ name: 'Revenue', data: Array.from({ length: 24 }, (_, i) => hourMap[i] ?? 0) }]
  }
  const data = [...dailySales.value].reverse().map((d: any) => parseFloat(d.sales))
  return [{ name: 'Revenue', data }]
})

// Bar chart: transactions per hour (today) or per day
const barChartOptions = computed<ApexOptions>(() => {
  const isToday = activePreset.value === 'today'
  const categories = isToday
    ? Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}`)
    : dailySales.value.map((d: any) => {
        const date = new Date(d.date)
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
      }).reverse()

  return {
    chart: {
      type: 'bar',
      toolbar: { show: false },
      fontFamily: 'Poppins, Inter, sans-serif',
      animations: { enabled: false },
    },
    plotOptions: {
      bar: {
        borderRadius: 6,
        columnWidth: '55%',
        distributed: false,
      },
    },
    dataLabels: { enabled: false },
    colors: [brandPurple],
    xaxis: {
      categories,
      labels: {
        style: { colors: '#94a3b8', fontSize: chartFontSm.value },
        rotate: -30,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tickAmount: Math.min(categories.length, 10),
    },
    yaxis: {
      labels: {
        style: { colors: '#94a3b8', fontSize: chartFontSm.value },
      },
    },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
    tooltip: {
      theme: 'light',
      y: { title: { formatter: () => 'Transaksi:' } },
    },
  }
})

const barSeries = computed(() => {
  const isToday = activePreset.value === 'today'
  if (isToday) {
    const hourMap: Record<number, number> = {}
    ;(dashStats.value?.hourly_sales ?? []).forEach((h: any) => {
      hourMap[parseInt(h.hour)] = parseInt(h.transactions)
    })
    return [{ name: 'Transaksi', data: Array.from({ length: 24 }, (_, i) => hourMap[i] ?? 0) }]
  }
  const data = [...dailySales.value].reverse().map((d: any) => parseInt(d.transactions))
  return [{ name: 'Transaksi', data }]
})

// Donut chart: payment methods
const donutOptions = computed<ApexOptions>(() => ({
  chart: {
    type: 'donut',
    fontFamily: 'Poppins, Inter, sans-serif',
    animations: { enabled: false },
  },
  labels: (dashStats.value?.payment_methods ?? []).map((p: any) => p.payment_method || 'Lainnya'),
  colors: [brandPurple, '#A855F7', '#6366F1', '#EC4899', '#F59E0B', '#10B981'],
  plotOptions: {
    pie: {
      donut: {
        size: '65%',
        labels: {
          show: true,
          total: {
            show: true,
            label: 'Total',
            fontSize: chartFontMd.value,
            fontWeight: 700,
            color: brandDark,
            formatter: (w: any) => {
              const total = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)
              if (total >= 1_000_000) return `${(total / 1_000_000).toFixed(1)}jt`
              if (total >= 1_000) return `${(total / 1_000).toFixed(0)}rb`
              return String(total)
            },
          },
          value: {
            fontSize: chartFontLg.value,
            fontWeight: 800,
            color: brandPurple,
            formatter: (v: string) => {
              const n = parseFloat(v)
              if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`
              if (n >= 1_000) return `${(n / 1_000).toFixed(0)}rb`
              return v
            },
          },
        },
      },
    },
  },
  dataLabels: { enabled: false },
  legend: {
    position: 'bottom',
    fontFamily: 'Poppins, Inter, sans-serif',
    fontSize: chartFontSm.value,
    markers: { size: 8 },
  },
  tooltip: {
    theme: 'light',
    y: { formatter: (v: number) => formatRupiah(v) },
  },
}))

const donutSeries = computed(() =>
  (dashStats.value?.payment_methods ?? []).map((p: any) => parseFloat(p.total))
)

// Horizontal bar: top products
const hbarOptions = computed<ApexOptions>(() => ({
  chart: {
    type: 'bar',
    toolbar: { show: false },
    fontFamily: 'Poppins, Inter, sans-serif',
    animations: { enabled: false },
  },
  plotOptions: {
    bar: {
      horizontal: true,
      borderRadius: 6,
      barHeight: '55%',
      distributed: true,
    },
  },
  colors: [brandPurple, '#A855F7', '#6366F1', '#8B5CF6', '#C084FC', '#DDD6FE', '#E9D5FF', '#EDE9FE'],
  dataLabels: { enabled: false },
  xaxis: {
    // In ApexCharts horizontal bar, categories appear on the Y-axis (left side)
    categories: bestProducts.value.slice(0, 8).map((p: any) => {
      const name: string = p.product_name || ''
      return name.length > 16 ? name.slice(0, 15) + '…' : name
    }),
    labels: {
      style: { colors: '#94a3b8', fontSize: '11px' },
      formatter: (v: number | string) => {
        const n = typeof v === 'string' ? parseFloat(v) : v
        if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`
        if (n >= 1_000) return `${(n / 1_000).toFixed(0)}rb`
        return String(n)
      },
    },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    labels: {
      show: true,
      style: { colors: '#374151', fontSize: chartFontSm.value, fontWeight: 600 },
      maxWidth: 120,
    },
  },
  grid: { borderColor: '#f1f5f9', xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
  legend: { show: false },
  tooltip: {
    theme: 'light',
    x: { show: true },
    y: { formatter: (v: number) => formatRupiah(v) },
  },
}))

const hbarSeries = computed(() => [
  { name: 'Revenue', data: bestProducts.value.slice(0, 8).map((p: any) => parseFloat(p.total_sales)) },
])

// Category radial / bar
const categoryBarOptions = computed<ApexOptions>(() => ({
  chart: {
    type: 'bar',
    toolbar: { show: false },
    fontFamily: 'Poppins, Inter, sans-serif',
    animations: { enabled: false },
  },
  plotOptions: {
    bar: {
      borderRadius: 8,
      columnWidth: '50%',
      distributed: true,
    },
  },
  colors: ['#7B2FBE', '#A855F7', '#6366F1', '#8B5CF6', '#C084FC', '#DDD6FE'],
  dataLabels: { enabled: false },
  xaxis: {
    categories: salesByCategory.value.slice(0, 6).map((c: any) => c.category_name || 'Lain'),
    labels: { style: { colors: '#94a3b8', fontSize: '11px' } },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    labels: {
      style: { colors: '#94a3b8', fontSize: '11px' },
      formatter: (v: number) => {
        if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`
        if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`
        return String(v)
      },
    },
  },
  grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
  legend: { show: false },
  tooltip: {
    theme: 'light',
    y: { formatter: (v: number) => formatRupiah(v) },
  },
}))

const categorySeries = computed(() => [
  { name: 'Penjualan', data: salesByCategory.value.slice(0, 6).map((c: any) => parseFloat(c.total_sales)) },
])

// ── Fetch ─────────────────────────────────────────────────────────────────────

const fetchChartData = async () => {
  isLoading.value = true
  try {
    const { start_date, end_date } = dateRange.value
    const [statsRes, dailyRes, productsRes, categoryRes] = await Promise.all([
      reportApi.getDashboardStats({ start_date, end_date }),
      reportApi.getDailySales({ start_date, end_date, limit: 30 }),
      reportApi.getBestProducts({ start_date, end_date, limit: 8 }),
      reportApi.getSalesByCategory({ start_date, end_date }),
    ])
    dashStats.value = statsRes.data?.data
    dailySales.value = dailyRes.data?.data?.data ?? []
    bestProducts.value = productsRes.data?.data?.data ?? []
    salesByCategory.value = categoryRes.data?.data?.data ?? []
  } catch {
    showError('Gagal memuat data dashboard')
  } finally {
    isLoading.value = false
  }
}

watch(dateRange, fetchChartData)

onMounted(async () => {
  await shiftStore.fetchCurrentShift()
  fetchChartData()
})

const todayLabel = computed(() => formatDateJakarta(new Date().toISOString()))

const hasPaymentData = computed(() => donutSeries.value.length > 0 && donutSeries.value.some((v: number) => v > 0))
const hasCategoryData = computed(() => salesByCategory.value.some((c: any) => parseFloat(c.total_sales) > 0))
const hasProductData = computed(() => bestProducts.value.length > 0)
const hasRevenueData = computed(() => (areaSeries.value[0]?.data ?? []).some((v: number) => v > 0))
</script>

<template>
  <div class="page" @touchstart="handleTouchStart" @touchmove="handleTouchMove" @touchend="handleTouchEnd">
    <PullToRefreshIndicator :pull-refresh-offset="pullRefreshOffset" :is-refreshing="isRefreshing" />
    <div class="container">

      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">{{ todayLabel }}</p>
        </div>

        <!-- Date Range Presets -->
        <div class="date-filter">
          <button
            v-for="p in (['today', '7d', '30d', 'month'] as const)"
            :key="p"
            class="preset-btn"
            :class="{ active: activePreset === p }"
            @click="activePreset = p"
          >
            {{ { today: 'Hari Ini', '7d': '7 Hari', '30d': '30 Hari', month: 'Bulan Ini' }[p] }}
          </button>
        </div>
      </div>

      <!-- Shift Banner -->
      <BaseCard v-if="currentShift" class="shift-banner">
        <div class="shift-info">
          <div class="shift-left">
            <StatusBadge
              :status="currentShift.status"
              :label="currentShift.status === 'active' ? 'Shift Aktif' : 'Shift Ditutup'"
              :variant="currentShift.status === 'active' ? 'success' : 'neutral'"
            />
            <span class="shift-time">Dibuka {{ formatTimeJakarta(currentShift.opened_at) }}</span>
            <span class="shift-modal">Modal awal: {{ formatRupiah(currentShift.modal_awal || 0) }}</span>
          </div>
          <div v-if="currentShift.current_income !== undefined" class="shift-right">
            <span class="shift-income-label">Pendapatan shift</span>
            <span class="shift-income-value">{{ formatRupiah(currentShift.current_income || 0) }}</span>
          </div>
        </div>
      </BaseCard>

      <!-- Loading overlay -->
      <div v-if="isLoading" class="loading-bar">
        <div class="loading-bar-inner"></div>
      </div>

      <!-- KPI Cards -->
      <div class="kpi-grid">
        <div class="kpi-card kpi-featured">
          <div class="kpi-badge">Revenue</div>
          <div class="kpi-amount">{{ formatRupiah(kpi.revenue) }}</div>
          <div class="kpi-sub">{{ kpi.count }} transaksi · {{ presetLabel }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-badge kpi-badge--secondary">Transaksi</div>
          <div class="kpi-amount kpi-amount--secondary">{{ kpi.count }}</div>
          <div class="kpi-sub">Total order</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-badge kpi-badge--secondary">Rata-rata</div>
          <div class="kpi-amount kpi-amount--secondary">{{ formatRupiah(kpi.avg) }}</div>
          <div class="kpi-sub">Per transaksi</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-badge kpi-badge--secondary">Pelanggan</div>
          <div class="kpi-amount kpi-amount--secondary">{{ kpi.customers }}</div>
          <div class="kpi-sub">Member bertransaksi</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-badge kpi-badge--secondary">Item Terjual</div>
          <div class="kpi-amount kpi-amount--secondary">{{ kpi.products_sold }}</div>
          <div class="kpi-sub">Total item</div>
        </div>
      </div>

      <!-- Chart Row 1: Area + Donut -->
      <div class="chart-row-wide">

        <!-- Revenue Trend -->
        <BaseCard :padded="false" class="chart-card chart-card--wide">
          <template #header>
            <div class="chart-header">
              <div>
                <h3 class="chart-title">Tren Revenue</h3>
                <p class="chart-subtitle">{{ activePreset === 'today' ? 'Per jam hari ini' : `${dailySales.length} hari terakhir` }}</p>
              </div>
            </div>
          </template>
          <div class="chart-body">
            <div v-if="!hasRevenueData" class="chart-empty">Belum ada data penjualan</div>
            <VueApexCharts
              v-else
              type="area"
              :height="chartHeight"
              :options="areaChartOptions"
              :series="areaSeries"
            />
          </div>
        </BaseCard>

        <!-- Payment Methods -->
        <BaseCard :padded="false" class="chart-card chart-card--narrow">
          <template #header>
            <div class="chart-header">
              <div>
                <h3 class="chart-title">Metode Bayar</h3>
                <p class="chart-subtitle">Distribusi pembayaran</p>
              </div>
            </div>
          </template>
          <div class="chart-body chart-body--center">
            <div v-if="!hasPaymentData" class="chart-empty">Belum ada data</div>
            <VueApexCharts
              v-else
              type="donut"
              :height="chartHeight"
              :options="donutOptions"
              :series="donutSeries"
            />
          </div>
        </BaseCard>
      </div>

      <!-- Chart Row 2: Bar volume + Top products -->
      <div class="chart-row-wide">

        <!-- Transaction Volume -->
        <BaseCard :padded="false" class="chart-card chart-card--wide">
          <template #header>
            <div class="chart-header">
              <div>
                <h3 class="chart-title">Volume Transaksi</h3>
                <p class="chart-subtitle">{{ activePreset === 'today' ? 'Per jam hari ini' : 'Per hari' }}</p>
              </div>
            </div>
          </template>
          <div class="chart-body">
            <VueApexCharts
              type="bar"
              :height="chartHeight"
              :options="barChartOptions"
              :series="barSeries"
            />
          </div>
        </BaseCard>

        <!-- Top Products -->
        <BaseCard :padded="false" class="chart-card chart-card--narrow">
          <template #header>
            <div class="chart-header">
              <div>
                <h3 class="chart-title">Produk Terlaris</h3>
                <p class="chart-subtitle">Revenue top 8</p>
              </div>
            </div>
          </template>
          <div class="chart-body">
            <div v-if="!hasProductData" class="chart-empty">Belum ada data produk</div>
            <VueApexCharts
              v-else
              type="bar"
              :height="chartHeight"
              :options="hbarOptions"
              :series="hbarSeries"
            />
          </div>
        </BaseCard>
      </div>

      <!-- Chart Row 3: Category sales -->
      <BaseCard v-if="hasCategoryData" :padded="false" class="chart-card">
        <template #header>
          <div class="chart-header">
            <div>
              <h3 class="chart-title">Penjualan per Kategori</h3>
              <p class="chart-subtitle">Revenue berdasarkan kategori produk</p>
            </div>
          </div>
        </template>
        <div class="chart-body">
          <VueApexCharts
            type="bar"
            :height="chartHeight"
            :options="categoryBarOptions"
            :series="categorySeries"
          />
        </div>
      </BaseCard>

    </div>
  </div>
</template>

<style scoped>
.page {
  padding: var(--spacing-4);
  background: var(--color-bg-secondary);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

/* ── Header ── */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-4);
  flex-wrap: wrap;
}


/* ── Date Filter ── */
.date-filter {
  display: flex;
  gap: var(--spacing-2);
  background: var(--color-surface-0);
  padding: 4px;
  border-radius: 12px;
  border: 1px solid var(--color-border-light);
  flex-shrink: 0;
}

.preset-btn {
  padding: 0.45rem 1rem;
  border-radius: 8px;
  border: none;
  background: transparent;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  font-family: inherit;
}

.preset-btn:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.preset-btn.active {
  background: var(--brand-primary);
  color: white;
  box-shadow: 0 2px 8px rgba(123, 47, 190, 0.35);
}

/* ── Loading bar ── */
.loading-bar {
  height: 3px;
  border-radius: 2px;
  background: var(--color-border-light);
  overflow: hidden;
}

.loading-bar-inner {
  height: 100%;
  width: 40%;
  background: var(--brand-primary);
  animation: slide 1.2s ease-in-out infinite;
  border-radius: 2px;
}

@keyframes slide {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(350%); }
}

/* ── Shift Banner ── */
.shift-banner { }

.shift-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-4);
}

.shift-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  flex-wrap: wrap;
}

.shift-time,
.shift-modal {
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
  font-weight: 500;
}

.shift-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.shift-income-label {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-tertiary);
  letter-spacing: 0.05em;
}

.shift-income-value {
  font-size: var(--font-size-2xl);
  font-weight: 800;
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ── KPI Grid ── */
.kpi-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
  gap: var(--spacing-3);
}

.kpi-card {
  background: var(--color-surface-0);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: var(--spacing-4) var(--spacing-5);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  transition: box-shadow 0.2s;
}

.kpi-card:hover { box-shadow: var(--shadow-2); }

.kpi-featured {
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%);
  border: none;
}

.kpi-badge {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: rgba(255, 255, 255, 0.75);
  letter-spacing: 0.06em;
}

.kpi-badge--secondary {
  color: var(--color-text-tertiary);
}

.kpi-amount {
  font-size: 1.55rem;
  font-weight: 800;
  line-height: 1.2;
  color: white;
  letter-spacing: -0.02em;
}

.kpi-amount--secondary {
  color: var(--color-text-primary);
  font-size: 1.4rem;
}

.kpi-sub {
  font-size: var(--font-size-xs);
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
}

.kpi-featured .kpi-sub {
  color: rgba(255,255,255,0.6);
}

.kpi-card:not(.kpi-featured) .kpi-sub {
  color: var(--color-text-tertiary);
}

/* ── Chart Rows ── */
.chart-row-wide {
  display: grid;
  grid-template-columns: 1.8fr 1fr;
  gap: var(--spacing-4);
}

.chart-card {
  overflow: hidden;
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chart-title {
  font-size: var(--font-size-base);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 0.15rem 0;
}

.chart-subtitle {
  font-size: var(--font-size-xs);
  color: var(--color-text-tertiary);
  margin: 0;
}

.chart-body {
  padding: var(--spacing-2) var(--spacing-3) var(--spacing-3);
}

.chart-body--center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-empty {
  padding: var(--spacing-8);
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-tertiary);
}

/* ── Responsive ── */
@media (max-width: 1100px) {
  .kpi-grid {
    grid-template-columns: 1fr 1fr 1fr 1fr;
  }
  .kpi-featured {
    grid-column: span 4;
  }
}

/* Tablet Landscape (768px-1023px) — Samsung Tab A9 */
@media (min-width: 768px) and (max-width: 1023px) {
  .page {
    padding: var(--spacing-2);
  }

  .container {
    gap: var(--spacing-2);
  }

  .kpi-grid {
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: var(--spacing-2);
  }

  .kpi-featured {
    grid-column: span 4;
  }

  .kpi-card {
    padding: 0.5rem 0.75rem;
    gap: 0.1rem;
  }

  .kpi-amount {
    font-size: 1.1rem;
  }

  .kpi-amount--secondary {
    font-size: 1rem;
  }

  .chart-row-wide {
    grid-template-columns: 1.8fr 1fr;
    gap: var(--spacing-2);
  }

  .chart-header {
    padding: var(--spacing-2) var(--spacing-3);
  }

  .chart-body {
    padding: 0 var(--spacing-2) var(--spacing-2);
  }
}

@media (max-width: 768px) {
  .page { padding: var(--spacing-3); }

  .page-header { flex-direction: column; align-items: flex-start; }

  .date-filter { width: 100%; justify-content: space-between; }
  .preset-btn { flex: 1; text-align: center; padding: 0.45rem 0.5rem; font-size: 0.75rem; }

  .kpi-grid {
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-2);
  }
  .kpi-featured { grid-column: span 2; }
  .kpi-amount { font-size: 1.3rem; }
  .kpi-amount--secondary { font-size: 1.2rem; }

  .chart-row-wide {
    grid-template-columns: 1fr;
    gap: var(--spacing-3);
  }

  .shift-info { flex-direction: column; align-items: flex-start; }
  .shift-right { align-items: flex-start; }
}

@media (max-width: 480px) {
  .kpi-grid { grid-template-columns: 1fr 1fr; }
  .kpi-featured { grid-column: span 2; }
  .kpi-card:nth-child(n+4) { display: flex; }
}
</style>
