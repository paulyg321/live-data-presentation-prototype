<script lang="ts" setup>
import { onMounted } from "vue";

const props = defineProps<{
  className?: string;
  path: string;
  width: number;
  height: number;
  id: string;
}>();

onMounted(() => {
  const svg = document.getElementById(`svg-${props.id}`);
  // Get the path element
  const path = document.getElementById(
    `path-${props.id}`
  ) as unknown as SVGPathElement;

  // Get the bounding box of the path
  const bbox = path.getBBox();

  // Apply the transformation
  svg?.setAttribute(
    "viewBox",
    `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`
  );
  svg?.setAttribute("width", `${props.width}px`);
  svg?.setAttribute("height", `${props.height}px`);
});
</script>
<template>
  <div :class="['resizable-svg', className]">
    <svg :id="`svg-${props.id}`" xmlns="http://www.w3.org/2000/svg">
      <path :id="`path-${props.id}`" :d="path" stroke="black" />
    </svg>
  </div>
</template>
<style>
/* .resizable-svg {
  width: 100%;
  height: 100%;
} */
</style>
