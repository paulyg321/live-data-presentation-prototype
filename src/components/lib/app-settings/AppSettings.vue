<script setup lang="ts">
import { computed, onMounted, ref, toRaw } from "vue";
// VIEWS
import PortalView from "../views/PortalView.vue";
import {
  CameraSettings,
  CanvasSettings,
  gestureTracker,
  renderVideoOnCanvas,
  setVideoDimensions,
  StorySettings,
  widgetIconMap,
} from "../app-settings/settings-state";

import StoriesTabVue from "./nav-drawer-tab/StoriesTab.vue";
import VideoSettingsTab from "./nav-drawer-tab/VideoSettingsTab.vue";
import ChartSettingsData from "./nav-drawer-tab/chart-settings/ChartSettingsData.vue";
import PresenterMain from "../app-settings/nested-views/PresenterMain.vue";
// MEDIAPIPE
import { Hands, type Results } from "@mediapipe/hands";

// STATE
import { PortalState } from "./settings-state";
import {
  ForeshadowingGestureListener,
  LinearPlaybackGestureListener,
  ListenerType,
  RadialPlaybackGestureListener,
  RadialTrackerMode,
  ChartType,
  getGestureListenerResetKeys,
} from "@/utils";
import WidgetSettingsTab from "./nav-drawer-tab/WidgetSettingsTab.vue";
import PortalSettingsTab from "./nav-drawer-tab/PortalSettingsTab.vue";
import { SelectionGestureListener } from "@/utils/lib/gestures/lib/SelectionGestureListener";

enum AvailableWidgets {
  // Not really widgets
  VIDEO = "video",
  LAYERS = "layers",
  // widgets
  LINE_CHART = "line-chart",
  BAR_CHART = "bar-chart",
  SCATTER_PLOT = "scatter-plot",
  LINEAR_PLAYBACK = "linear-playback",
  RADIAL_PLAYBACK = "radial-playback",
  FORESHADOWING = "foreshadowing",
  PORTALS = "portals",
  SELECTION = "selection",
  // GESTURE = "gesture",
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
      // case AvailableWidgets.GESTURE:
      //   currentTab.value = SettingsTab.GESTURE_SETTINGS;
      //   break;
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
      case AvailableWidgets.LINEAR_PLAYBACK:
        handleGestureWidget(SettingsTab.WIDGET_SETTINGS, ListenerType.TEMPORAL);
        break;
      case AvailableWidgets.RADIAL_PLAYBACK:
        handleGestureWidget(SettingsTab.WIDGET_SETTINGS, ListenerType.RADIAL);
        break;
      case AvailableWidgets.FORESHADOWING:
        handleGestureWidget(
          SettingsTab.WIDGET_SETTINGS,
          ListenerType.FORESHADOWING
        );
        break;
      case AvailableWidgets.SELECTION:
        handleGestureWidget(
          SettingsTab.WIDGET_SETTINGS,
          ListenerType.SELECTION
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
    case ListenerType.TEMPORAL: {
      const newListener = new LinearPlaybackGestureListener({
        position: { x: 0, y: 0 },
        dimensions: {
          width: 400,
          height: 50,
        },
        canvasDimensions: CanvasSettings.dimensions,
        resetKeys: getGestureListenerResetKeys(),
        drawingUtils,
      });

      StorySettings.currentStory?.addLayer(type, newListener);

      break;
    }
    case ListenerType.RADIAL: {
      const newListener = new RadialPlaybackGestureListener({
        position: { x: 0, y: 0 },
        dimensions: { width: 100, height: 100 },
        canvasDimensions: CanvasSettings.dimensions,
        mode: RadialTrackerMode.NORMAL,
        resetKeys: getGestureListenerResetKeys(),
        drawingUtils,
      });

      StorySettings.currentStory?.addLayer(type, newListener);

      break;
    }
    case ListenerType.FORESHADOWING: {
      const newListener = new ForeshadowingGestureListener({
        position: { x: 0, y: 0 },
        dimensions: { width: 200, height: 200 },
        canvasDimensions: CanvasSettings.dimensions,
        resetKeys: getGestureListenerResetKeys(),
        drawingUtils,
      });

      StorySettings.currentStory?.addLayer(type, newListener);
      break;
    }
    case ListenerType.SELECTION: {
      const newListener = new SelectionGestureListener({
        position: { x: 0, y: 0 },
        dimensions: { width: 200, height: 200 },
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
          <v-tooltip text="Line Chart">
            <template v-slot:activator="{ props }">
              <v-list-item
                :prepend-icon="widgetIconMap.line"
                :value="AvailableWidgets.LINE_CHART"
                v-bind="props"
                :disabled="disableChartType"
              >
              </v-list-item>
            </template>
          </v-tooltip>

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

          <v-tooltip text="Temporal Playback Widget">
            <template v-slot:activator="{ props }">
              <v-list-item
                :prepend-icon="widgetIconMap.temporal"
                :value="AvailableWidgets.LINEAR_PLAYBACK"
                v-bind="props"
                :disabled="disableChartType"
              >
              </v-list-item>
            </template>
          </v-tooltip>

          <v-tooltip text="Radial Playback Widget">
            <template v-slot:activator="{ props }">
              <v-list-item
                :prepend-icon="widgetIconMap.radial"
                :value="AvailableWidgets.RADIAL_PLAYBACK"
                v-bind="props"
                :disabled="disableChartType"
              >
              </v-list-item>
            </template>
          </v-tooltip>

          <v-tooltip text="Foreshadowing Widget">
            <template v-slot:activator="{ props }">
              <v-list-item
                :prepend-icon="widgetIconMap.foreshadowing"
                :value="AvailableWidgets.FORESHADOWING"
                v-bind="props"
                :disabled="disableChartType"
              >
              </v-list-item>
            </template>
          </v-tooltip>

          <v-tooltip text="Selection Widget">
            <template v-slot:activator="{ props }">
              <v-list-item
                :prepend-icon="widgetIconMap.selection"
                :value="AvailableWidgets.SELECTION"
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
        <StoriesTabVue />
      </v-navigation-drawer>
      <v-navigation-drawer permanent location="left" width="400">
        <div v-if="currentTab === SettingsTab.WIDGET_SETTINGS">
          <WidgetSettingsTab />
        </div>
        <div v-if="currentTab === SettingsTab.CHART_SETTINGS">
          <ChartSettingsData :handleNext="handleSaveChart" :type="chartType" />
        </div>
        <div v-if="currentTab === SettingsTab.VIDEO_SETTINGS">
          <VideoSettingsTab />
        </div>
        <div v-if="currentTab === SettingsTab.PORTALS">
          <PortalSettingsTab />
        </div>
      </v-navigation-drawer>

      <v-main style="min-width: 700px">
        <PresenterMain />
      </v-main>
    </v-app>
    <PortalView
      id="presenter"
      :open="PortalState.presenterPortalOpen"
      :handle-close="() => PortalState.handlePresenterPortalClose()"
    />
    <PortalView
      id="audience"
      :open="PortalState.audiencePortalOpen"
      :handle-close="() => PortalState.handleAudiencePortalClose()"
    />
    <video
      :ref="(el) => CameraSettings.setVideo(el)"
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
