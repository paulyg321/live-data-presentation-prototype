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
  top: 0;
  left: 0;
  position: relative;
  width: 100%;
  height: 100%;
}
.canvas-elements {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}
</style>
