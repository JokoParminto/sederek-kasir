<script setup lang="ts">
import { ref, watch } from 'vue'
import CollapsibleSection from './CollapsibleSection.vue'
import CheckboxField from './CheckboxField.vue'
import TextField from './TextField.vue'
import type { BaristaLayoutConfig } from '@/services/printerlayout.service'

interface Props {
  modelValue?: BaristaLayoutConfig
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: BaristaLayoutConfig]
}>()

const defaultConfig: BaristaLayoutConfig = {
  header: {
    show_order_number: true,
    show_customer_name: true,
    show_table_number: true,
    show_transaction_date: true,
  },
  item: {
    show_item_quantity: true,
    show_item_addons: true,
    show_item_notes: true,
  },
  footer: {
    show_preparation_reminder: true,
    preparation_text: 'Siapkan sesuai resep standar',
  }
}

const config = ref<BaristaLayoutConfig>(props.modelValue || defaultConfig)

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
  <div class="section-config-panel-barista">

    <!-- HEADER -->
    <CollapsibleSection title="HEADER" icon="🎫">
      <CheckboxField
        v-model="config.header.show_order_number"
        label="Nomor Antrian"
        description="Nomor urut pesanan, ditampilkan besar di atas tiket"
      />
      <CheckboxField
        v-model="config.header.show_customer_name"
        label="Nama Pelanggan"
        description="Nama pemesan untuk dipanggil saat siap"
      />
      <CheckboxField
        v-model="config.header.show_table_number"
        label="Nomor Meja"
        description="Meja tujuan pengantaran pesanan"
      />
      <CheckboxField
        v-model="config.header.show_transaction_date"
        label="Waktu Pesanan"
        description="Jam masuknya pesanan (misal: 14:30)"
      />
    </CollapsibleSection>

    <!-- ITEM -->
    <CollapsibleSection title="ITEM" icon="coffee">
      <CheckboxField
        v-model="config.item.show_item_quantity"
        label="Jumlah"
        description="Qty di depan nama produk (misal: 2×)"
      />
      <CheckboxField
        v-model="config.item.show_item_addons"
        label="Add-ons / Varian"
        description="Tambahan yang dipilih (extra shot, oat milk, dll)"
      />
      <CheckboxField
        v-model="config.item.show_item_notes"
        label="Catatan Khusus"
        description="Instruksi dari pelanggan (less sugar, no ice, dll)"
      />
    </CollapsibleSection>

    <!-- FOOTER -->
    <CollapsibleSection title="PENGINGAT RESEP" icon="file-text">
      <CheckboxField
        v-model="config.footer.show_preparation_reminder"
        label="Tampilkan Pengingat"
        description="Menampilkan pesan pengingat standar resep di bawah tiket"
      />
      <TextField
        v-model="config.footer.preparation_text"
        label="Teks Pengingat"
        placeholder="Siapkan sesuai resep standar..."
        description="Pesan pengingat untuk barista"
        :max-length="100"
      />
    </CollapsibleSection>

  </div>
</template>

<style scoped>
.section-config-panel-barista {
  display: flex;
  flex-direction: column;
  gap: 0;
}
</style>
