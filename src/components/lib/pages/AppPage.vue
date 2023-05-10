<script setup lang="ts">
import { computed, onMounted, ref, toRaw } from "vue";
import {
  PortalContainer,
  StoriesPanel,
  VideoSettings,
  PreviewPanel,
  WidgetSettings,
  PortalSettings,
  ChartDataSettings,
} from "@/components";

// VIEWS
import {
  CameraSettings,
  CanvasSettings,
  gestureTracker,
  renderVideoOnCanvas,
  setVideoDimensions,
  StorySettings,
  widgetIconMap,
  PortalState,
} from "@/state";

// MEDIAPIPE
import { Hands, type Results } from "@mediapipe/hands";

// STATE
import {
  ListenerType,
  ChartType,
  getGestureListenerResetKeys,
  StrokeListener,
  RectPoseListener,
  RangePoseListener,
  OpenHandPoseListener,
  PointPoseListener,
} from "@/utils";

enum AvailableWidgets {
  // Not really widgets
  VIDEO = "video",
  LAYERS = "layers",
  // widgets
  LINE_CHART = "line-chart",
  BAR_CHART = "bar-chart",
  SCATTER_PLOT = "scatter-plot",
  PORTALS = "portals",
  RECT_POSE = "rect-pose",
  RANGE_POSE = "range-pose",
  POINT_POSE = "point-pose",
  OPEN_HAND_POSE = "open-hand-pose",
  STROKE_LISTENER = "stroke-listener",
}

enum SettingsTab {
  CHART_SETTINGS = "chart-settings",
  // GESTURE_SETTINGS = "gesture-settings",
  PORTALS = "portals",
  VIDEO_SETTINGS = "video-settings",
  WIDGET_SETTINGS = "widget-settings",
}

const currentTab = ref<SettingsTab | null>();
const chartType = ref<ChartType | undefined>();
const disableChartType = computed(() => {
  return StorySettings.currentStory === undefined;
});

function handleSaveChart() {
  currentTab.value = SettingsTab.WIDGET_SETTINGS;
}

function handleChartWidget(value: SettingsTab, type?: ChartType) {
  chartType.value = type;
  currentTab.value = value;
}

function handleGestureWidget(value: SettingsTab, type: ListenerType) {
  currentTab.value = value;
  addWidget(type);
}

function handleAddWidget(value: {
  id: AvailableWidgets;
  value: boolean;
  path: SettingsTab[];
}) {
  if (value.value) {
    switch (value.id) {
      case AvailableWidgets.VIDEO:
        currentTab.value = SettingsTab.VIDEO_SETTINGS;
        break;
      case AvailableWidgets.PORTALS:
        currentTab.value = SettingsTab.PORTALS;
        break;
      case AvailableWidgets.LAYERS:
        currentTab.value = SettingsTab.WIDGET_SETTINGS;
        break;
      case AvailableWidgets.BAR_CHART:
        handleChartWidget(SettingsTab.CHART_SETTINGS, ChartType.BAR);
        break;
      case AvailableWidgets.SCATTER_PLOT:
        handleChartWidget(SettingsTab.CHART_SETTINGS, ChartType.SCATTER);
        break;
      case AvailableWidgets.LINE_CHART:
        handleChartWidget(SettingsTab.CHART_SETTINGS, ChartType.LINE);
        break;
      case AvailableWidgets.RECT_POSE:
        handleGestureWidget(
          SettingsTab.WIDGET_SETTINGS,
          ListenerType.RECT_POSE
        );
        break;
      case AvailableWidgets.RANGE_POSE:
        handleGestureWidget(
          SettingsTab.WIDGET_SETTINGS,
          ListenerType.RANGE_POSE
        );
        break;
      case AvailableWidgets.POINT_POSE:
        handleGestureWidget(
          SettingsTab.WIDGET_SETTINGS,
          ListenerType.POINT_POSE
        );
        break;
      case AvailableWidgets.OPEN_HAND_POSE:
        handleGestureWidget(
          SettingsTab.WIDGET_SETTINGS,
          ListenerType.OPEN_HAND_POSE
        );
        break;
      case AvailableWidgets.STROKE_LISTENER:
        handleGestureWidget(
          SettingsTab.WIDGET_SETTINGS,
          ListenerType.STROKE_LISTENER
        );
        break;
      default:
        currentTab.value = undefined;
        break;
    }
  } else {
    currentTab.value = undefined;
  }
}

function addWidget(type: string) {
  const drawingUtils = CanvasSettings.generalDrawingUtils;
  if (!drawingUtils) return;

  switch (type) {
    case ListenerType.RECT_POSE: {
      const newListener = new RectPoseListener({
        position: { x: 0, y: 0 },
        dimensions: { width: 50, height: 50 },
        canvasDimensions: CanvasSettings.dimensions,
        resetKeys: getGestureListenerResetKeys(),
        drawingUtils,
      });

      StorySettings.currentStory?.addLayer(type, newListener);

      break;
    }
    case ListenerType.RANGE_POSE: {
      const newListener = new RangePoseListener({
        position: { x: 0, y: 0 },
        dimensions: { width: 50, height: 50 },
        canvasDimensions: CanvasSettings.dimensions,
        resetKeys: getGestureListenerResetKeys(),
        drawingUtils,
      });

      StorySettings.currentStory?.addLayer(type, newListener);

      break;
    }
    case ListenerType.POINT_POSE: {
      const newListener = new PointPoseListener({
        position: { x: 0, y: 0 },
        dimensions: { width: 50, height: 50 },
        canvasDimensions: CanvasSettings.dimensions,
        resetKeys: getGestureListenerResetKeys(),
        drawingUtils,
      });

      StorySettings.currentStory?.addLayer(type, newListener);

      break;
    }
    case ListenerType.OPEN_HAND_POSE: {
      const newListener = new OpenHandPoseListener({
        position: { x: 0, y: 0 },
        dimensions: { width: 50, height: 50 },
        canvasDimensions: CanvasSettings.dimensions,
        resetKeys: getGestureListenerResetKeys(),
        drawingUtils,
      });

      StorySettings.currentStory?.addLayer(type, newListener);
      break;
    }
    case ListenerType.STROKE_LISTENER: {
      const newListener = new StrokeListener({
        position: { x: 0, y: 0 },
        dimensions: { width: 50, height: 50 },
        canvasDimensions: CanvasSettings.dimensions,
        resetKeys: getGestureListenerResetKeys(),
        drawingUtils,
      });

      StorySettings.currentStory?.addLayer(type, newListener);
      break;
    }
    default:
      break;
  }
}

// ========================================================================================

const MEDIA_PIPE_URL = (file: string) =>
  `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
const hands = ref<Hands>(
  new Hands({
    locateFile: MEDIA_PIPE_URL,
  })
);

function initializeHands() {
  hands.value.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
  hands.value.onResults((results: Results) =>
    gestureTracker.value.handleMediaPipeResults(results)
  );
}

async function runDetection() {
  if (hands.value && CameraSettings.video) {
    try {
      await toRaw(hands.value).send({ image: CameraSettings.video });
    } catch (error) {
      console.log("error", error);
    }
  }

  await renderVideoOnCanvas();
  requestAnimationFrame(runDetection);
}

onMounted(() => {
  initializeHands();
});
</script>

<template>
  <v-container>
    <v-app>
      <v-navigation-drawer theme="light" rail permanent>
        <v-list density="compact" @click:select="handleAddWidget">
          <v-tooltip text="Scatter Plot">
            <template v-slot:activator="{ props }">
              <v-list-item
                :prepend-icon="widgetIconMap.scatter"
                :value="AvailableWidgets.SCATTER_PLOT"
                v-bind="props"
                :disabled="disableChartType"
              >
              </v-list-item>
            </template>
          </v-tooltip>

          <v-tooltip text="Bar Chart">
            <template v-slot:activator="{ props }">
              <v-list-item
                :prepend-icon="widgetIconMap.bar"
                :value="AvailableWidgets.BAR_CHART"
                v-bind="props"
                :disabled="disableChartType"
              >
              </v-list-item>
            </template>
          </v-tooltip>

          <v-divider></v-divider>

          <v-tooltip text="Rect Pose Widget">
            <template v-slot:activator="{ props }">
              <v-list-item
                :prepend-icon="widgetIconMap['rect-pose']"
                :value="AvailableWidgets.RECT_POSE"
                v-bind="props"
                :disabled="disableChartType"
              >
              </v-list-item>
            </template>
          </v-tooltip>

          <v-tooltip text="Range Pose Widget">
            <template v-slot:activator="{ props }">
              <v-list-item
                :prepend-icon="widgetIconMap['range-pose']"
                :value="AvailableWidgets.RANGE_POSE"
                v-bind="props"
                :disabled="disableChartType"
              >
              </v-list-item>
            </template>
          </v-tooltip>

          <v-tooltip text="Point Pose Widget">
            <template v-slot:activator="{ props }">
              <v-list-item
                :prepend-icon="widgetIconMap['point-pose']"
                :value="AvailableWidgets.POINT_POSE"
                v-bind="props"
                :disabled="disableChartType"
              >
              </v-list-item>
            </template>
          </v-tooltip>

          <v-tooltip text="Open Hand Pose Widget">
            <template v-slot:activator="{ props }">
              <v-list-item
                :prepend-icon="widgetIconMap['open-hand-pose']"
                :value="AvailableWidgets.OPEN_HAND_POSE"
                v-bind="props"
                :disabled="disableChartType"
              >
              </v-list-item>
            </template>
          </v-tooltip>

          <v-tooltip text="Stroke Listener Widget">
            <template v-slot:activator="{ props }">
              <v-list-item
                :prepend-icon="widgetIconMap['stroke-listener']"
                :value="AvailableWidgets.STROKE_LISTENER"
                v-bind="props"
                :disabled="disableChartType"
              >
              </v-list-item>
            </template>
          </v-tooltip>

          <v-divider></v-divider>

          <v-tooltip text="Camera Settings">
            <template v-slot:activator="{ props }">
              <v-list-item
                prepend-icon="mdi-video-account"
                :value="AvailableWidgets.VIDEO"
                v-bind="props"
              >
              </v-list-item>
            </template>
          </v-tooltip>

          <!-- <v-tooltip text="Gesture Settings">
            <template v-slot:activator="{ props }">
              <v-list-item
                prepend-icon="mdi-gesture"
                :value="AvailableWidgets.GESTURE"
                v-bind="props"
              >
              </v-list-item>
            </template>
          </v-tooltip> -->

          <v-tooltip text="Portals">
            <template v-slot:activator="{ props }">
              <v-list-item
                prepend-icon="mdi-dock-window"
                :value="AvailableWidgets.PORTALS"
                v-bind="props"
              >
              </v-list-item>
            </template>
          </v-tooltip>

          <v-tooltip text="Widgets">
            <template v-slot:activator="{ props }">
              <v-list-item
                prepend-icon="mdi-layers"
                :value="AvailableWidgets.LAYERS"
                v-bind="props"
              >
              </v-list-item>
            </template>
          </v-tooltip>
        </v-list>
      </v-navigation-drawer>

      <v-navigation-drawer permanent location="right" width="300">
        <StoriesPanel />
      </v-navigation-drawer>
      <v-navigation-drawer permanent location="left" width="400">
        <div v-if="currentTab === SettingsTab.WIDGET_SETTINGS">
          <WidgetSettings />
        </div>
        <div v-if="currentTab === SettingsTab.CHART_SETTINGS">
          <ChartDataSettings :handleNext="handleSaveChart" :type="chartType" />
        </div>
        <div v-if="currentTab === SettingsTab.VIDEO_SETTINGS">
          <VideoSettings />
        </div>
        <div v-if="currentTab === SettingsTab.PORTALS">
          <PortalSettings />
        </div>
      </v-navigation-drawer>

      <v-main style="min-width: 700px">
        <PreviewPanel />
      </v-main>
    </v-app>
    <PortalContainer
      id="presenter"
      :open="PortalState.presenterPortalOpen"
      :handle-close="() => PortalState.handlePresenterPortalClose()"
    />
    <PortalContainer
      id="audience"
      :open="PortalState.audiencePortalOpen"
      :handle-close="() => PortalState.handleAudiencePortalClose()"
    />
    <video
      :ref="(el) => CameraSettings.setVideo(el as HTMLVideoElement)"
      autoplay="true"
      :srcObject="CameraSettings.stream"
      @loadeddata="runDetection"
      @loadedmetadata="setVideoDimensions"
    ></video>
  </v-container>
</template>

<style>
.form-row {
  padding: 30px 30px;
  align-items: flex-start;
  width: 100%;
}

.default-checkbox {
  margin-right: 10px;
}

video {
  display: none;
}
</style>
