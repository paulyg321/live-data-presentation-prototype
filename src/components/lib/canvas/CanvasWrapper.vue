<script setup lang="ts">
type CanvasWrapperProps = {
  width: number;
  height: number;
};
defineProps<CanvasWrapperProps>();
const childClass = "canvas-elements";
</script>

<template>
  <div class="canvas-wrapper">
    <slot :className="childClass"></slot>
  </div>
</template>

<style>
.canvas-wrapper {
  position: relative;
}
.canvas-elements {
  position: absolute;
  left: 0;
  top: 0;
}
</style>
