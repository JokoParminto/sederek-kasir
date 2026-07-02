<script setup lang="ts">
import { ref, watch } from 'vue'
import CollapsibleSection from './CollapsibleSection.vue'
import CheckboxField from './CheckboxField.vue'
import RadioField from './RadioField.vue'
import type { CustomerLayoutConfig } from '@/services/printerlayout.service'

interface Props {
  modelValue?: CustomerLayoutConfig
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: CustomerLayoutConfig]
}>()

// Initialize with default values
const defaultConfig: CustomerLayoutConfig = {
  header: {
    show_logo: true,
    show_store_name: true,
    show_store_address: true,
    show_store_phone: true,
    show_store_slogan: false,
    show_transaction_date: true,
    show_cashier_name: true,
    show_customer_name: true,
    show_table_number: true,
  },
  item: {
    show_item_name: true,
    show_item_quantity: true,
    show_item_price: true,
    show_item_addons: false,
    show_item_notes: false,
    item_name_format: 'short'
  },
  summary: {
    show_subtotal: true,
    show_discount: true,
    show_discount_reason: false,
    show_tax: true,
    show_tax_breakdown: false,
    show_rounding: true,
    show_total: true,
    show_payment_method: true,
    total_display_format: 'compact'
  },
  footer: {
    show_thank_you_message: true
  }
}

const config = ref<CustomerLayoutConfig>(props.modelValue || defaultConfig)

watch(
  () => props.modelValue,
  (newValue) => { if (newValue) config.value = newValue },
  { deep: true }
)

watch(
  () => config.value,
  (newValue) => { emit('update:modelValue', newValue) },
  { deep: true }
)
</script>

<template>
  <div class="section-config-panel">
    <!-- HEADER SECTION -->
    <CollapsibleSection title="HEADER" icon="layers">
      <CheckboxField
        v-model="config.header.show_logo"
        label="Tampilkan Logo"
        description="Menampilkan logo toko di bagian atas struk"
      />
      <CheckboxField
        v-model="config.header.show_store_name"
        label="Nama Toko"
        description="Menampilkan nama toko"
      />
      <CheckboxField
        v-model="config.header.show_store_address"
        label="Alamat Toko"
        description="Menampilkan alamat toko"
      />
      <CheckboxField
        v-model="config.header.show_store_phone"
        label="Nomor Telepon"
        description="Menampilkan nomor telepon toko"
      />
      <CheckboxField
        v-model="config.header.show_transaction_date"
        label="Tanggal & Waktu Transaksi"
        description="Menampilkan kapan transaksi dilakukan"
      />
      <CheckboxField
        v-model="config.header.show_cashier_name"
        label="Nama Kasir"
        description="Menampilkan nama kasir yang melayani"
      />
      <CheckboxField
        v-model="config.header.show_customer_name"
        label="Nama Customer"
        description="Menampilkan nama customer pada struk"
      />
      <CheckboxField
        v-model="config.header.show_table_number"
        label="Nomor Meja"
        description="Menampilkan nomor meja pesanan"
      />
      <CheckboxField
        v-model="config.header.show_store_slogan"
        label="Slogan Toko"
        description="Menampilkan motto/slogan toko"
      />
    </CollapsibleSection>

    <!-- ITEM SECTION -->
    <CollapsibleSection title="ITEM" icon="cart">
      <CheckboxField
        v-model="config.item.show_item_name"
        label="Nama Produk"
        description="Menampilkan nama item yang dibeli"
      />
      <CheckboxField
        v-model="config.item.show_item_quantity"
        label="Jumlah"
        description="Menampilkan quantity dan satuan"
      />
      <CheckboxField
         v-model="config.item.show_item_price"
         label="Harga"
         description="Menampilkan harga satuan dan total"
       />
       <CheckboxField
         v-model="config.item.show_item_addons"
         label="Add-ons"
         description="Menampilkan tambahan item dan harganya"
       />
       <CheckboxField
         v-model="config.item.show_item_notes"
         label="Catatan Item"
         description="Menampilkan catatan khusus per item"
       />
       <RadioField
        v-model="config.item.item_name_format"
        label="Format Nama Produk: Singkat (max 20 karakter)"
        value="short"
        description="Nama produk akan dipotong jika terlalu panjang"
      />
      <RadioField
        v-model="config.item.item_name_format"
        label="Format Nama Produk: Lengkap (tanpa batas)"
        value="long"
        description="Nama produk akan ditampilkan tanpa pembatasan"
      />
    </CollapsibleSection>

    <!-- RINGKASAN PEMBAYARAN SECTION -->
    <CollapsibleSection title="RINGKASAN PEMBAYARAN" icon="banknote">
      <CheckboxField
        v-model="config.summary.show_subtotal"
        label="Subtotal"
        description="Total sebelum diskon dan pajak"
      />
      <CheckboxField
        v-model="config.summary.show_discount"
        label="Diskon"
        description="Menampilkan potongan harga"
      />
      <CheckboxField
        v-model="config.summary.show_discount_reason"
        label="Alasan Diskon"
        description="Menampilkan keterangan/alasan diskon"
      />
      <CheckboxField
        v-model="config.summary.show_tax"
        label="Pajak (PPN)"
        description="Menampilkan pajak yang dikenakan"
      />
      <CheckboxField
        v-model="config.summary.show_tax_breakdown"
        label="Rincian Pajak"
        description="Menampilkan detail perhitungan pajak"
      />
      <CheckboxField
        v-model="config.summary.show_rounding"
        label="Pembulatan"
        description="Menampilkan nilai pembulatan hingga ribuan"
      />
      <CheckboxField
        v-model="config.summary.show_total"
        label="Total Pembayaran"
        description="Menampilkan total akhir yang harus dibayar"
      />
      <CheckboxField
        v-model="config.summary.show_payment_method"
        label="Metode Pembayaran"
        description="Menampilkan metode pembayaran (QRIS, Tunai, dll)"
      />
      <RadioField
        v-model="config.summary.total_display_format"
        label="Format Total: Kompak (hanya nilai)"
        value="compact"
        description="Hanya menampilkan nilai total saja"
      />
      <RadioField
        v-model="config.summary.total_display_format"
        label="Format Total: Terperinci (label + nilai)"
        value="detailed"
        description="Menampilkan label 'TOTAL' dan nilai"
      />
    </CollapsibleSection>

    <!-- FOOTER SECTION -->
    <CollapsibleSection title="FOOTER" icon="file-text">
      <CheckboxField
        v-model="config.footer.show_thank_you_message"
        label="Tampilkan Pesan Footer"
        description="Menampilkan pesan footer dari pengaturan toko"
      />
    </CollapsibleSection>
  </div>
</template>

<style scoped>
.section-config-panel {
  display: flex;
  flex-direction: column;
  gap: 0;
}
</style>
