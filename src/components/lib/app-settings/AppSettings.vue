<script setup lang="ts">
import { ref } from "vue";
// VIEWS
import PortalView from "../views/PortalView.vue";
import ChartSettingsTab from "./nav-drawer-tab/ChartSettingsTab.vue";
import PortalSettingsTab from "./nav-drawer-tab/PortalSettingsTab.vue";
import VideoSettingsTab from "./nav-drawer-tab/VideoSettingsTab.vue";
import { CanvasSettings, CameraSettings } from "../app-settings/settings-state";

// STATE
import { PortalState } from "./settings-state";

enum SettingsTab {
  CHART_SETTINGS = "chart-settings",
  PORTALS = "portals",
  VIDEO_SETTINGS = "video-settings",
}

const currentTab = ref<SettingsTab | null>(SettingsTab.CHART_SETTINGS);

function handleTabChange(value: {
  id: SettingsTab;
  value: boolean;
  path: SettingsTab[];
  event: PointerEvent;
}) {
  currentTab.value = value.value ? value.id : null;
}

async function setVideoDimensions() {
  if (CameraSettings.video) {
    CameraSettings.video.width = CanvasSettings.canvasWidth;
    CameraSettings.video.height = CanvasSettings.canvasHeight; // (3 / 4);
    CameraSettings.video.play();
  }
}

async function renderVideoOnCanvas() {
  if (CanvasSettings.canvas["video"] && CameraSettings.video) {
    CanvasSettings.canvasCtx["video"]?.clearRect(
      0,
      0,
      CanvasSettings.canvasWidth,
      CanvasSettings.canvasHeight
    );
    CanvasSettings.canvasCtx["video"]?.drawImage(
      CameraSettings.video,
      0,
      0,
      CanvasSettings.canvasWidth,
      CanvasSettings.canvasHeight
    );
  }
  requestAnimationFrame(() => renderVideoOnCanvas());
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
