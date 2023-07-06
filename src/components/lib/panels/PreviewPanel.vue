<script setup lang="ts">
import {
  playbackSubject,
  foreshadowingAreaSubject,
  snackbarSubject,
  CanvasEvent,
  selectionSubject,
  type PlaybackSettingsConfig,
  StateUpdateType,
  annotationSubject,
  highlightSubject,
  HighlightListener,
  type StoryLayer,
  type LayerType,
  type Coordinate2D,
  type Dimensions,
  isInBound,
} from "@/utils";
import { onMounted, ref, watch, watchEffect } from "vue";
import {
  ChartSettings,
  CanvasSettings,
  StorySettings,
  currentChart,
  handlePlay,
} from "@/state";
import { CanvasWrapper, VideoCanvas, AppCanvas } from "@/components";
import interact from "interactjs";

import { gsap } from "gsap";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { CustomEase } from "gsap/CustomEase";

gsap.registerPlugin(MorphSVGPlugin);
gsap.registerPlugin(CustomEase);

const selectionBox = ref<{
  x: number;
  y: number;
  width: number;
  height: number;
} | null>(null);

const snackbar = ref<boolean>(false);
const highlightModeActive = ref<boolean>(false);
const _highlightListener = ref<HighlightListener | undefined>();
watch(highlightModeActive, () => {
  _highlightListener.value?.updateState({
    isActive: highlightModeActive.value,
  });
});
const snackbarText = ref<string>("");
const snackbarVariant = ref<string>("");
const playbackConfig = ref<PlaybackSettingsConfig>({
  duration: 5,
  easeFn: "none",
  playbackMode: StateUpdateType.GROUP_TIMELINE,
});
const keyframes = ref<string[]>();
const currentIndex = ref<number>(0);

watch(currentIndex, () => {
  currentChart.value?.updateState({
    currentKeyframeIndex: currentIndex.value,
  });
});

watchEffect(() => {
  keyframes.value = currentChart.value?.state.keyframes;
});

watch(currentChart, () => {
  currentIndex.value = currentChart.value?.state.startKeyframeIndex ?? 0;
  currentChart.value?.updateState({
    currentKeyframeIndex: currentIndex.value,
  });
});

highlightSubject.subscribe({
  next(value: any) {
    const charts = StorySettings.currentStory?.getCharts();
    if (!charts) return;

    charts.forEach((chart) => {
      chart.state.controller?.setSelection({
        bounds: {
          coordinates: value,
          radius: 10,
        },
      });
    });
  },
});

snackbarSubject.subscribe({
  next(value: any) {
    snackbar.value = value.open;
    snackbarText.value = value.text;
    // success, info, warning, error
    snackbarVariant.value = value.variant;
  },
});

selectionSubject.subscribe({
  next(selectionSettings: any) {
    const charts = StorySettings.currentStory?.getCharts();
    if (!charts) return;

    charts.forEach((chart) => {
      chart.state.controller?.setSelection(selectionSettings);
    });
  },
});

annotationSubject.subscribe({
  next(annotationSettings: any) {
    let keys = [];
    if (annotationSettings) {
      keys = annotationSettings.keys;
    }

    StorySettings.currentStory?.revealAnnotations(keys);
  },
});

// PLAYBACK CONTROLS
playbackSubject.subscribe({
  next(config: any) {
    if (config.type === "pause") {
      currentChart.value?.state.controller?.pause();
    } else {
      playbackConfig.value = config.data;

      handlePlay(config.data);
    }
  },
});

// Foreshadowing area
foreshadowingAreaSubject.subscribe({
  next(foreshadowingSettings: any) {
    const charts = StorySettings.currentStory?.getCharts();
    if (!charts) return;

    charts.forEach((chart) => {
      chart.state.controller?.setForeshadow(foreshadowingSettings);
    });
  },
});

// TODO_Paul: Move all the draw functions in here
function draw() {
  const generalDrawingUtils = CanvasSettings.generalDrawingUtils;
  if (generalDrawingUtils) {
    generalDrawingUtils.drawInContext((context: CanvasRenderingContext2D) => {
      generalDrawingUtils.clearArea({
        coordinates: { x: 0, y: 0 },
        dimensions: CanvasSettings.dimensions,
        context,
      });
    });
    StorySettings.currentStory?.draw();
    ChartSettings.extentVisualizer?.draw();
  }

  if (selectionBox.value !== null) {
    CanvasSettings.generalDrawingUtils?.modifyContextStyleAndDraw(
      {
        strokeStyle: "grey",
        fillStyle: "white",
      },
      (context) => {
        CanvasSettings.generalDrawingUtils?.drawCircle({
          coordinates: {
            x: selectionBox.value!.x + selectionBox.value!.width,
            y: selectionBox.value!.y + selectionBox.value!.height,
          },
          radius: 10,
          stroke: true,
          context,
        });
      },
      ["presenter", "preview"]
    );
    CanvasSettings.generalDrawingUtils?.modifyContextStyleAndDraw(
      {
        lineDash: [3, 3],
        strokeStyle: "skyblue",
      },
      (context) => {
        CanvasSettings.generalDrawingUtils?.drawRect({
          coordinates: {
            x: selectionBox.value!.x,
            y: selectionBox.value!.y,
          },
          dimensions: {
            width: selectionBox.value!.width,
            height: selectionBox.value!.height,
          },
          stroke: true,
          context,
        });
      },
      ["presenter", "preview"]
    );
  }

  requestAnimationFrame(() => draw());
}

function initializeCanvasListeners() {
  const eventsCanvas = CanvasSettings.canvas.events;

  if (eventsCanvas) {
    let selectionStart: Coordinate2D | null = null;
    let selectedItems: {
      type: LayerType;
      id: string;
      layer: StoryLayer;
    }[] = [];

    interact(eventsCanvas)
      .draggable({
        listeners: {
          move: (event) => {
            const layers = StorySettings.currentStory?.getLayers();
            let modifications = event.target.getAttribute("data-index");
            if (
              !layers ||
              modifications === "undefined" ||
              modifications === null
            )
              return;

            modifications = JSON.parse(modifications);

            if (modifications.isGroup) {
              selectedItems.forEach((item) => {
                if (modifications.isDrag) {
                  item?.layer.updatePosition(event.dx, event.dy);
                } else if (modifications.isResize) {
                  item?.layer.updateSize(event.dx, event.dy);
                }
              });
              if (modifications.isDrag) {
                if (selectionBox.value) {
                  selectionBox.value = {
                    ...selectionBox.value,
                    x: selectionBox.value?.x + event.dx,
                    y: selectionBox.value?.y + event.dy,
                  };
                }
              } else if (modifications.isResize) {
                if (selectionBox.value) {
                  selectionBox.value = {
                    ...selectionBox.value,
                    width: selectionBox.value?.width + event.dx,
                    height: selectionBox.value?.height + event.dy,
                  };
                }
              }
            } else {
              const target = layers[modifications.index];
              if (modifications.isDrag) {
                target?.layer.updatePosition(event.dx, event.dy);
              } else if (modifications.isResize) {
                target?.layer.updateSize(event.dx, event.dy);
              }
            }
          },
        },
      })
      .on("down", function (event) {
        const rect = eventsCanvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const layers = StorySettings.currentStory?.getLayers();

        if (!layers) return;
        // If there are selected items and the click is inside the selection box return (it's probably a drag going on)
        if (
          selectedItems.length > 0 &&
          selectionBox.value &&
          isInBound(
            { x, y },
            {
              position: selectionBox.value,
              dimensions: {
                width: selectionBox.value.width,
                height: selectionBox.value.height,
              },
            }
          )
        ) {
          if (
            isInBound(
              { x, y },
              {
                position: {
                  x: selectionBox.value.x + selectionBox.value.width,
                  y: selectionBox.value.y + selectionBox.value.height,
                },
                radius: 10,
              }
            )
          ) {
            event.target.setAttribute(
              "data-index",
              JSON.stringify({
                isGroup: true,
                isDrag: false,
                isResize: true,
              })
            );
          } else {
            event.target.setAttribute(
              "data-index",
              JSON.stringify({
                isGroup: true,
                isDrag: true,
                isResize: false,
              })
            );
          }
          return;
        }
        // If there are selected items and the click is outside the selection box
        if (
          selectedItems.length > 0 &&
          selectionBox.value &&
          !isInBound(
            { x, y },
            { position: selectionBox.value, dimensions: selectionBox.value }
          )
        ) {
          // Deselect all items
          selectedItems.forEach((item) => {
            item?.layer.updateState({ isHover: false });
          });
          selectedItems = [];
          selectionBox.value = null;
          return;
        }

        for (let index = 0; index < layers.length; index++) {
          const item: {
            type: LayerType;
            id: string;
            layer: StoryLayer;
          } = layers[index];

          if (item.layer.isWithinObjectBounds({ x, y })) {
            if (item.layer.isWithinResizeBounds({ x, y })) {
              event.target.setAttribute(
                "data-index",
                JSON.stringify({
                  index,
                  isDrag: false,
                  isGroup: false,
                  isResize: true,
                })
              );
            } else {
              event.target.setAttribute(
                "data-index",
                JSON.stringify({
                  index,
                  isDrag: true,
                  isGroup: false,
                  isResize: false,
                })
              );
            }
            return;
          }
        }

        // No item was clicked, start a bounding box
        selectionStart = { x, y };
      })
      .on("up", function (event) {
        const rect = eventsCanvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const layers = StorySettings.currentStory?.getLayers();

        if (!layers) return;

        // If a bounding box was being drawn
        if (selectionStart) {
          selectionBox.value = {
            x: Math.min(selectionStart.x, x),
            y: Math.min(selectionStart.y, y),
            width: Math.abs(selectionStart.x - x),
            height: Math.abs(selectionStart.y - y),
          };

          // Select all items within the bounding box
          selectedItems = layers.filter((item) =>
            item.layer.isWithinSelectionBounds(selectionBox.value!)
          );
        } else {
          event.target.setAttribute("data-index", undefined);
        }

        // Reset the starting point of the bounding box
        selectionStart = null;
      })
      .on("mousemove", function (event) {
        const rect = eventsCanvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const layers = StorySettings.currentStory?.getLayers();

        if (!layers || selectedItems.length > 0) return;

        // If a bounding box was being drawn
        if (selectionStart) {
          selectionBox.value = {
            x: Math.min(selectionStart.x, x),
            y: Math.min(selectionStart.y, y),
            width: Math.abs(selectionStart.x - x),
            height: Math.abs(selectionStart.y - y),
          };

          // Select all items within the bounding box
          layers.forEach((item) => {
            if (item.layer.isWithinSelectionBounds(selectionBox.value!)) {
              item.layer.updateState({
                isHover: true,
              });
            } else {
              item.layer.updateState({
                isHover: false,
              });
            }
          });
          return;
        }

        for (let index = 0; index < layers.length; index++) {
          const item: {
            type: LayerType;
            id: string;
            layer: StoryLayer;
          } = layers[index];

          if (item.layer.isWithinObjectBounds({ x, y })) {
            if (item.layer.isWithinResizeBounds({ x, y })) {
              eventsCanvas.style.cursor = "nwse-resize";
            } else {
              eventsCanvas.style.cursor = "move";
            }

            item.layer.updateState({
              isHover: true,
            });
            return;
          } else {
            item.layer.updateState({
              isHover: false,
            });
          }
        }
        // Reset cursor
        eventsCanvas.style.cursor = "auto";
      });
  }
  //   [
  //     CanvasEvent.MOUSE_DOWN,
  //     CanvasEvent.MOUSE_MOVE,
  //     CanvasEvent.MOUSE_UP,
  //     CanvasEvent.CLICK,
  //   ].forEach((event: CanvasEvent) => {
  //     CanvasSettings.canvas.events?.addEventListener(
  //       event,
  //       (mouseEvent: MouseEvent) => {
  //         const rect = eventsCanvas.getBoundingClientRect();
  //         const x = mouseEvent.clientX - rect.left;
  //         const y = mouseEvent.clientY - rect.top;
  //         StorySettings.currentStory?.canvasEventListener(event, { x, y });
  //       }
  //     );
  //   });
  // }
}

function handleReset(type: string) {
  switch (type) {
    case "selection":
      selectionSubject.next(undefined);
      break;
    case "foreshadowing":
      foreshadowingAreaSubject.next(undefined);
      break;
    case "annotation":
      annotationSubject.next(undefined);
      break;
    default:
      break;
  }
}

onMounted(() => {
  initializeCanvasListeners();
  draw();
  ChartSettings.setExtentVisualizer();
  const drawingUtils = CanvasSettings.generalDrawingUtils;
  if (!drawingUtils) return;
  _highlightListener.value = new HighlightListener({
    position: {
      x: CanvasSettings.dimensions.width / 2 - 25,
      y: CanvasSettings.dimensions.height / 2 - 25,
    },
    dimensions: { width: 50, height: 50 },
    canvasDimensions: CanvasSettings.dimensions,
    drawingUtils,
    isActive: false,
  });
});
</script>
<!---------------------------------------------------------------------------------------------------------->
<template>
  <!-- <v-btn @click="() => ChartSettings.handlePlay()">HII</v-btn> -->
  <CanvasWrapper
    :width="CanvasSettings.dimensions.width"
    :height="CanvasSettings.dimensions.height"
    v-slot="{ className }"
  >
    <svg
      id="drawing-board"
      :width="CanvasSettings.dimensions.width"
      :height="CanvasSettings.dimensions.height"
      :className="className"
      ref="svg"
      :view-box="`0 0 ${CanvasSettings.dimensions.width} ${CanvasSettings.dimensions.height}`"
    >
      <path id="rect" d="M0 1750.176h1920V169H0z"></path>
      <path
        id="circle"
        d="M256,0C114.837,0,0,114.837,0,256s114.837,256,256,256s256-114.837,256-256S397.163,0,256,0z"
      ></path>
      <path id="st0"></path>
    </svg>
    <VideoCanvas id="default" :className="className" />
    <AppCanvas
      v-for="key in ['preview']"
      :id="key"
      v-bind:key="key"
      :class="className"
    />
    <canvas
      :width="CanvasSettings.dimensions.width"
      :height="CanvasSettings.dimensions.height"
      :class="className"
      :ref="(el: HTMLCanvasElement) => CanvasSettings.setCanvas(el, 'events')"
    ></canvas>
  </CanvasWrapper>
  <v-container>
    <v-row>
      <v-col lg="12">
        <v-slider
          v-model="currentIndex"
          :ticks="Object.assign({}, keyframes)"
          :show-ticks="false"
          thumb-label="always"
          min="0"
          :max="(keyframes?.length ?? 1) - 1"
          :step="1"
          density="compact"
        >
          <template v-slot:thumb-label="{ modelValue }">
            <div class="text-body" v-if="keyframes">
              {{ keyframes[modelValue] }}
            </div>
          </template>
        </v-slider>
      </v-col>
    </v-row>
    <v-row>
      <v-col lg="3">
        <v-btn block @click="() => handleReset('selection')"
          >Reset Selection</v-btn
        >
      </v-col>
      <v-col lg="3">
        <v-btn block @click="() => handleReset('foreshadowing')"
          >Reset Foreshadowing</v-btn
        >
      </v-col>
      <v-col lg="3">
        <v-btn block @click="() => handleReset('annotation')"
          >Reset Annotation</v-btn
        >
      </v-col>
      <v-col lg="3">
        <v-checkbox
          label="Highlight Mode"
          v-model="highlightModeActive"
        ></v-checkbox>
      </v-col>
    </v-row>
  </v-container>
  <v-snackbar :timeout="2000" :color="snackbarVariant" v-model="snackbar">
    {{ snackbarText }}
  </v-snackbar>
</template>
<!---------------------------------------------------------------------------------------------------------->
<style>
.panel-container {
  width: 100%;
  height: 100%;
}

canvas {
  border: 2px solid #9e9e9e;
}

#drawing-board {
  opacity: 0;
}

.svg-icon {
  width: 10px;
  height: 10px;
}
</style>
