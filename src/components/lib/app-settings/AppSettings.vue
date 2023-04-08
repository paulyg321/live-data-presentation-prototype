<script setup lang="ts">
import { computed, onMounted, ref, toRaw } from "vue";
// VIEWS
import PortalView from "../views/PortalView.vue";
import {
  CameraSettings,
  gestureTracker,
  renderVideoOnCanvas,
  setVideoDimensions,
  StorySettings,
} from "../app-settings/settings-state";

import StoriesTabVue from "./nav-drawer-tab/StoriesTab.vue";
import ChartSettingsTab from "./nav-drawer-tab/ChartSettingsTab.vue";
import GestureSettingsTab from "./nav-drawer-tab/GestureSettingsTab.vue";
import PresenterMain from "../app-settings/nested-views/PresenterMain.vue";
// MEDIAPIPE
import { Hands, type Results } from "@mediapipe/hands";

// STATE
import { PortalState } from "./settings-state";
import { ChartTypeValue, ListenerType, type ChartType } from "@/utils";
import VideoSettingsTab from "./nav-drawer-tab/VideoSettingsTab.vue";
import LayerSettingsTab from "./nav-drawer-tab/LayerSettingsTab.vue";

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
}

enum SettingsTab {
  CHART_SETTINGS = "chart-settings",
  GESTURE_SETTINGS = "gesture-settings",
  PORTALS = "portals",
  VIDEO_SETTINGS = "video-settings",
  LAYER_SETTINGS = "layer-settings",
}

const currentTab = ref<SettingsTab | null>();
const chartType = ref<ChartType | undefined>();
const disableChartType = computed(() => {
  return StorySettings.currentStory === undefined;
});

const gestureListenerType = ref<ListenerType | undefined>();

function handleChartWidget(value: SettingsTab, type?: ChartType) {
  chartType.value = type;
  currentTab.value = value;
}

function handleGestureWidget(value: SettingsTab, type?: ListenerType) {
  gestureListenerType.value = type;
  currentTab.value = value;
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
      case AvailableWidgets.LAYERS:
        currentTab.value = SettingsTab.LAYER_SETTINGS;
        break;
      case AvailableWidgets.BAR_CHART:
        handleChartWidget(SettingsTab.CHART_SETTINGS, {
          title: "Bar Chart",
          value: ChartTypeValue.BAR,
        });
        break;
      case AvailableWidgets.SCATTER_PLOT:
        handleChartWidget(SettingsTab.CHART_SETTINGS, {
          title: "Scatter Plot",
          value: ChartTypeValue.SCATTER,
        });
        break;
      case AvailableWidgets.LINE_CHART:
        handleChartWidget(SettingsTab.CHART_SETTINGS, {
          title: "Line Chart",
          value: ChartTypeValue.LINE,
        });
        break;
      case AvailableWidgets.LINEAR_PLAYBACK:
        handleGestureWidget(
          SettingsTab.GESTURE_SETTINGS,
          ListenerType.TEMPORAL
        );
        break;
      case AvailableWidgets.RADIAL_PLAYBACK:
        handleGestureWidget(SettingsTab.GESTURE_SETTINGS, ListenerType.RADIAL);
        break;
      case AvailableWidgets.FORESHADOWING:
        handleGestureWidget(
          SettingsTab.GESTURE_SETTINGS,
          ListenerType.FORESHADOWING
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
        <v-list density="compact" nav @click:select="handleAddWidget">
          <v-tooltip text="Line Chart">
            <template v-slot:activator="{ props }">
              <v-list-item
                prepend-icon="mdi-chart-line"
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
                prepend-icon="mdi-chart-scatter-plot"
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
                prepend-icon="mdi-chart-bar"
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
                prepend-icon="mdi-play-box"
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
                prepend-icon="mdi-play-circle"
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
                prepend-icon="mdi-crystal-ball"
                :value="AvailableWidgets.FORESHADOWING"
                v-bind="props"
                :disabled="
                  disableChartType || !StorySettings.currentStory?.chart
                "
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

          <v-tooltip text="Layers">
            <template v-slot:activator="{ props }">
              <v-list-item
                prepend-icon="mdi-layers-edit"
                :value="AvailableWidgets.LAYERS"
                v-bind="props"
              >
              </v-list-item>
            </template>
          </v-tooltip>
        </v-list>
      </v-navigation-drawer>

      <v-navigation-drawer permanent location="left" width="300">
        <StoriesTabVue />
      </v-navigation-drawer>
      <v-navigation-drawer permanent location="right" width="300">
        <div v-if="currentTab === SettingsTab.CHART_SETTINGS">
          <ChartSettingsTab :type="chartType" />
        </div>
        <div v-if="currentTab === SettingsTab.GESTURE_SETTINGS">
          <GestureSettingsTab :type="gestureListenerType" />
        </div>
        <div v-if="currentTab === SettingsTab.VIDEO_SETTINGS">
          <VideoSettingsTab />
        </div>
        <div v-if="currentTab === SettingsTab.LAYER_SETTINGS">
          <LayerSettingsTab />
        </div>
      </v-navigation-drawer>

      <v-main style="min-width: 700px">
        <PresenterMain />
      </v-main>
    </v-app>
    <PortalView
      :open="PortalState.presenterPortalOpen"
      :handle-close="() => PortalState.handlePresenterPortalClose()"
    />
    <PortalView
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
