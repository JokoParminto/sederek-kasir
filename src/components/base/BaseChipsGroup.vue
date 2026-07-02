<script setup lang="ts">
//
</script>

<template>
  <div class="base-chips-group">
    <slot />
  </div>
</template>

<style scoped>
.base-chips-group {
  display: flex;
  gap: var(--spacing-2);
  overflow-x: auto;
  flex: 1;
  align-items: center;
  padding: 0 var(--spacing-2);
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}
</style>
