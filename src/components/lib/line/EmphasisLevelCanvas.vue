<script setup lang="ts">
import { onMounted, ref } from "vue";
import { CanvasText, HAND_LANDMARK_IDS, Line } from "@/utils";
import * as d3 from "d3";

const props = defineProps<{
  canvasDimensions: {
    width: number;
    height: number;
  };
  level: number;
  decrementEmphasisCount: () => void;
  canDecrement: boolean;
  className?: string;
  emphasisStack?: any;
}>();
const canvas = ref<HTMLCanvasElement | null>(null);
const canvasCtx = ref<CanvasRenderingContext2D | null>(null);
const text = ref<CanvasText>();
const then = ref(Date.now());

function drawReferenceLine() {
  if (canvas.value && props.emphasisStack && props.emphasisStack.length > 0) {
    const lineData = [
      {
        x: 0,
        y: props.emphasisStack[0].handPosition.left[
          HAND_LANDMARK_IDS.middle_finger_tip
        ].y,
      },
      {
        x: canvas.value.width,
        y: props.emphasisStack[0].handPosition.left[
          HAND_LANDMARK_IDS.middle_finger_tip
        ].y,
      },
    ];

    const referenceLine = new Line({
      data: lineData,
      context: canvasCtx.value,
      xScale: d3.scaleLinear(
        [0, props.canvasDimensions.width],
        [0, props.canvasDimensions.width]
      ),
      canvasDimensions: props.canvasDimensions,
      color: "grey",
      label: "Reference Line",
      endIndex: 2,
    });
    referenceLine.drawLine();
  }
  requestAnimationFrame(drawReferenceLine);
}

function drawText() {
  const now = Date.now();
  const difference = now - then.value;
  if (difference > 2000 && props.canDecrement) {
    if (props.level > 0) {
      props.decrementEmphasisCount();
    }
    then.value = now;
  }
  canvasCtx.value?.clearRect(
    0,
    0,
    props.canvasDimensions.width,
    props.canvasDimensions.height
  );
  text?.value?.setColor(convertLevelToColor(props.level));
  text?.value?.setLabel(convertLevelToLabel(props.level));
  text?.value?.drawText();
  requestAnimationFrame(drawText);
}

function convertLevelToLabel(level: number) {
  switch (level) {
    case 1:
      return "LOW";
    case 2:
      return "MED";
    case 3:
      return "HIGH";
    default:
      return "";
  }
}

function convertLevelToColor(level: number) {
  return "grey";
  // switch (level) {
  //   case 1:
  //     return "green";
  //   case 2:
  //     return "yellow";
  //   case 3:
  //     return "red";
  //   default:
  //     return "";
  // }
}

onMounted(() => {
  if (canvas.value) {
    canvasCtx.value = canvas.value.getContext("2d");
    text.value = new CanvasText({
      context: canvasCtx.value,
      position: { x: props.canvasDimensions.width - 120, y: 50 },
      color: "green",
      label: convertLevelToLabel(props.level),
      fontSize: 40,
    });
  }
  drawText();
  drawReferenceLine();
});
</script>

<template>
  <canvas
    :width="canvasDimensions.width"
    :height="canvasDimensions.height"
    :class="className"
    ref="canvas"
  ></canvas>
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
