<script setup lang="ts">
import { ref } from "vue";
import WindowPortal from "../components/lib/window-portal/WindowPortal.vue";
import AppSettings from "../components/lib/app-settings/AppSettings.vue";
const open = ref<boolean>(false);

function handleClose() {
  open.value = false;
}
</script>
<!---------------------------------------------------------------------------------------------------------->
<template>
  <input type="checkbox" v-model="open" /> Check me to open a portal!
  <AppSettings />
  <WindowPortal :open="open" @on-close="handleClose">
    <p>Hello world</p>
  </WindowPortal>
</template>
<!---------------------------------------------------------------------------------------------------------->
<style></style>
