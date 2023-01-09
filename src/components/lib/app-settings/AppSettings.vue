<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
// VIEWS
import PortalView from "../views/PortalView.vue";
import ChartSettingsTab from "./nav-drawer-tab/ChartSettingsTab.vue";
import PortalSettingsTab from "./nav-drawer-tab/PortalSettingsTab.vue";
import VideoSettingsTab from "./nav-drawer-tab/VideoSettingsTab.vue";

// STATE
import {
  CanvasSettings,
  CameraSettings,
  PortalState,
} from "./settings-state";

enum SettingsTab {
  CHART_SETTINGS = "chart-settings",
  PORTALS = "portals",
  VIDEO_SETTINGS = "video-settings",
}

const currentTab = ref<SettingsTab | null>(SettingsTab.CHART_SETTINGS);

async function setVideoDimensions() {
  if (CameraSettings.video) {
    CameraSettings.video.width = CanvasSettings.canvasWidth;
    CameraSettings.video.height = CanvasSettings.canvasHeight; // (3 / 4);
    CameraSettings.video.play();
  }
}
async function renderVideoOnCanvas() {
  // CanvasSettings.generalCanvasCtx?.clearRect(
  //   0,
  //   0,
  //   CanvasSettings.canvasWidth,
  //   CanvasSettings.canvasHeight
  // );
  // if (CanvasSettings.generalCanvasCtx && CameraSettings.video) {
  //   CanvasSettings.generalCanvasCtx.drawImage(
  //     CameraSettings.video,
  //     0,
  //     0,
  //     CanvasSettings.canvasWidth,
  //     CanvasSettings.canvasHeight
  //   );
  // }
  // requestAnimationFrame(() => renderVideoOnCanvas());
}

// onMounted(async () => {
//   if (CanvasSettings.generalCanvas) {
//     CanvasSettings.setGeneralCanvasCtx(
//       CanvasSettings.generalCanvas.getContext("2d")
//     );

//     if (CameraSettings.mirror === true) {
//       CanvasSettings.generalCanvasCtx?.save();
//       CanvasSettings.generalCanvasCtx?.scale(-1, 1);
//       CanvasSettings.generalCanvasCtx?.translate(
//         -CanvasSettings.canvasWidth,
//         0
//       );
//     }

//     const threePointBezierCurve = new ThreePointBezierCurve();
//     animatedLine.animateToNextState({
//       ctx: CanvasSettings.generalCanvasCtx,
//       playRemainingStates: true,
//       // Call like this so we don't lose the this context in ThreePointBezier
//       transitionFunction: (time: number) => threePointBezierCurve.easeOut(time),
//     });
//   }

//   await CameraSettings.setVideoSources();
// });

function handleTabChange(value: {
  id: SettingsTab;
  value: boolean;
  path: SettingsTab[];
  event: PointerEvent;
}) {
  currentTab.value = value.value ? value.id : null;
}
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
      @loadeddata="renderVideoOnCanvas"
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
