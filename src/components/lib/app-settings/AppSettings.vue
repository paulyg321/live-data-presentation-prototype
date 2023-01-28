<script setup lang="ts">
import { onMounted, ref, toRaw } from "vue";
// VIEWS
import PortalView from "../views/PortalView.vue";
import ChartSettingsTab from "./nav-drawer-tab/ChartSettingsTab.vue";
import PortalSettingsTab from "./nav-drawer-tab/PortalSettingsTab.vue";
import VideoSettingsTab from "./nav-drawer-tab/VideoSettingsTab.vue";
import {
  CameraSettings,
  CanvasSettings,
  gestureTracker,
  renderVideoOnCanvas,
  setVideoDimensions,
} from "../app-settings/settings-state";

// MEDIAPIPE
import { Hands, type Results } from "@mediapipe/hands";

// STATE
import { PortalState } from "./settings-state";

enum SettingsTab {
  CHART_SETTINGS = "chart-settings",
  PORTALS = "portals",
  VIDEO_SETTINGS = "video-settings",
}

const currentTab = ref<SettingsTab | null>(SettingsTab.CHART_SETTINGS);

const MEDIA_PIPE_URL = (file: string) =>
  `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
const hands = ref<Hands>(
  new Hands({
    locateFile: MEDIA_PIPE_URL,
  })
);

function handleTabChange(value: {
  id: SettingsTab;
  value: boolean;
  path: SettingsTab[];
  event: PointerEvent;
}) {
  currentTab.value = value.value ? value.id : null;
}

function initializeHands() {
  hands.value.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
  hands.value.onResults((results: Results) =>
    gestureTracker.handleMediaPipeResults(results)
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
      <v-navigation-drawer theme="dark" rail permanent>
        <v-list density="compact" nav @click:select="handleTabChange">
          <v-tooltip text="Chart Settings">
            <template v-slot:activator="{ props }">
              <v-list-item
                prepend-icon="mdi-chart-box-outline"
                value="chart-settings"
                v-bind="props"
              >
              </v-list-item>
            </template>
          </v-tooltip>

          <v-tooltip text="Portals">
            <template v-slot:activator="{ props }">
              <v-list-item
                prepend-icon="mdi-presentation-play"
                value="portals"
                v-bind="props"
              >
              </v-list-item>
            </template>
          </v-tooltip>

          <v-tooltip text="Video Settings">
            <template v-slot:activator="{ props }">
              <v-list-item
                prepend-icon="mdi-video"
                value="video-settings"
                v-bind="props"
                :click="() => void 0"
              >
              </v-list-item>
            </template>
          </v-tooltip>
        </v-list>
      </v-navigation-drawer>

      <v-navigation-drawer permanent width="450">
        <!-- Chart Settings -->
        <div class="form-row" v-if="currentTab === SettingsTab.CHART_SETTINGS">
          <ChartSettingsTab />
        </div>
        <!-- Portals -->
        <div class="form-row" v-if="currentTab === SettingsTab.PORTALS">
          <PortalSettingsTab />
        </div>
        <!-- Video Settings -->
        <div class="form-row" v-if="currentTab === SettingsTab.VIDEO_SETTINGS">
          <VideoSettingsTab />
        </div>
      </v-navigation-drawer>

      <v-main>
        <!-- Views -->
        <router-view></router-view>
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
