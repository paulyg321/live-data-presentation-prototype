<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { CanvasSettings } from "./app-settings/settings-state";
type AppCanvasProps = {
  className?: string;
  id: string;
};
const props = defineProps<AppCanvasProps>();
onMounted(() => {
  CanvasSettings.addContextToDrawingUtils(props.id);
});

onUnmounted(() => {
  CanvasSettings.generalDrawingUtils?.removeContext(props.id);
});
</script>

<template>
  <canvas
    :width="CanvasSettings.dimensions.width"
    :height="CanvasSettings.dimensions.height"
    :ref="(el) => CanvasSettings.setCanvas(el as HTMLCanvasElement, id)"
    :class="className"
  ></canvas>
</template>

<style>
</style>
