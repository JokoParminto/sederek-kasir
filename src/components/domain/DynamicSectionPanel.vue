<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { AppIconName } from '@/utils/icons'
import CollapsibleSection from './CollapsibleSection.vue'
import CheckboxField from './CheckboxField.vue'
import TextField from './TextField.vue'

interface Props {
  modelValue?: Record<string, any>
  rawContent?: Record<string, any>
}

const props = withDefaults(defineProps<Props>(), {})

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>]
}>()

const config = ref<Record<string, any>>(props.modelValue || props.rawContent || {})

// Watch for prop changes
watch(
  () => [props.modelValue, props.rawContent],
  ([newModel, newRaw]) => {
    if (newModel) {
      config.value = newModel
    } else if (newRaw) {
      config.value = newRaw
    }
  },
  { deep: true }
)

// Watch for config changes and emit
watch(
  () => config.value,
  (newValue) => {
    emit('update:modelValue', newValue)
  },
  { deep: true }
)

// Get sections from raw content
const sections = computed(() => {
  if (props.rawContent?.sections) {
    return props.rawContent.sections
  }
  return {}
})

/**
 * Convert snake_case field name to human-readable label
 * Examples: show_logo → Show Logo, footer_text → Footer Text
 */
function fieldToLabel(fieldName: string): string {
  return fieldName
    .replace(/^show_/, '') // Remove 'show_' prefix
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Check if a value is a boolean (field should be rendered as checkbox)
 */
function isBoolean(value: any): boolean {
  return typeof value === 'boolean'
}

/**
 * Check if a value is a string (field should be rendered as text input)
 */
function isString(value: any): boolean {
  return typeof value === 'string'
}

/**
 * Get icon for each section type
 */
function getSectionIcon(sectionName: string): AppIconName {
  const icons: Record<string, AppIconName> = {
    header: 'layers',
    items: 'cart',
    payment: 'banknote',
    footer: 'file-text',
    item: 'cart',
  }
  return icons[sectionName] || 'settings'
}

/**
 * Check if a field name suggests it's a show_* field
 */
function isShowField(fieldName: string): boolean {
  return fieldName.startsWith('show_')
}
</script>

<template>
  <div class="dynamic-section-panel">
    <!-- Render sections in fixed order: header, items, payment, footer -->
    <template v-for="sectionName in ['header', 'items', 'payment', 'footer']" :key="sectionName">
      <CollapsibleSection 
        v-if="sections[sectionName]"
        :title="(sectionName as string).toUpperCase()" 
        :icon="getSectionIcon(sectionName as string)"
      >
        <!-- Render fields in this section -->
        <template v-for="(fieldValue, fieldName) in sections[sectionName]" :key="fieldName">
           <!-- Checkbox for boolean fields -->
           <CheckboxField
             v-if="isBoolean(fieldValue)"
             :model-value="fieldValue"
             :label="fieldToLabel(fieldName as string)"
             @update:model-value="(newValue) => {
               // Ensure structure exists: config.sections[sectionName]
               if (!config.sections) config.sections = {}
               if (!config.sections[sectionName as string]) config.sections[sectionName as string] = {}
               config.sections[sectionName as string][fieldName as string] = newValue
             }"
           />

           <!-- Text input for string fields -->
           <TextField
             v-else-if="isString(fieldValue)"
             :model-value="fieldValue"
             :label="fieldToLabel(fieldName as string)"
             :placeholder="`Enter ${fieldToLabel(fieldName as string).toLowerCase()}...`"
             :max-length="fieldName === 'footer_text' ? 200 : 100"
             @update:model-value="(newValue) => {
               // Ensure structure exists: config.sections[sectionName]
               if (!config.sections) config.sections = {}
               if (!config.sections[sectionName as string]) config.sections[sectionName as string] = {}
               config.sections[sectionName as string][fieldName as string] = newValue
             }"
           />
        </template>
      </CollapsibleSection>
    </template>
   </div>
</template>

<style scoped>
.dynamic-section-panel {
  display: flex;
  flex-direction: column;
  gap: 0;
}
</style>
