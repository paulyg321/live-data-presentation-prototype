<script lang="ts" setup>
import {
  LinearPlaybackGestureListener,
  SupportedGestures,
  playbackSubject,
  type Coordinate2D,
  ListenerType,
  RadialPlaybackGestureListener,
  RadialTrackerMode,
  ForeshadowingGestureListener,
  emphasisSubject,
  foreshadowingAreaSubject,
  ForeshadowingShapes,
} from "@/utils";
import { onMounted, ref } from "vue";
import {
  ChartSettings,
  gestureTracker,
  CanvasSettings,
  getGestureListenerResetKeys,
  StorySettings,
} from "../settings-state";
import ChartSettingsPosition from "./chart-settings/ChartSettingsPosition.vue";

type GestureSettingProps = {
  type?: ListenerType;
};
const props = defineProps<GestureSettingProps>();

onMounted(() => {
  let listenerExists = false;
  switch (props.type) {
    case ListenerType.TEMPORAL:
      listenerExists = !!StorySettings.currentStory?.temporalPlaybackTracker;
      break;
    case ListenerType.RADIAL:
      listenerExists = !!StorySettings.currentStory?.radialPlaybackTracker;
      break;
    case ListenerType.FORESHADOWING:
      listenerExists = !!StorySettings.currentStory?.foreshadowingTracker;
      break;
    default:
      break;
  }
  if (!listenerExists) {
    initializeListener();
  }
});

function initializeListener() {
  switch (props.type) {
    case ListenerType.TEMPORAL: {
      const newListener = new LinearPlaybackGestureListener({
        position: { x: 0, y: 0 },
        dimensions: {
          width: 400,
          height: 50,
        },
        gestureTypes: [
          {
            leftHand: SupportedGestures.OPEN_HAND,
            rightHand: SupportedGestures.OPEN_HAND,
          },
        ],
        gestureSubject: gestureTracker.value.gestureSubject,
        canvasDimensions: CanvasSettings.dimensions,
        subjects: {
          [LinearPlaybackGestureListener.playbackSubjectKey]: playbackSubject,
        },
        resetKeys: getGestureListenerResetKeys("KeyL"),
        eventContext: CanvasSettings.canvasCtx["events"] ?? undefined,
      });
      if (CanvasSettings.canvasCtx["linear"]) {
        newListener.setContext(CanvasSettings.canvasCtx["linear"]);
      }

      StorySettings.currentStory?.addListener(newListener, props.type);
      break;
    }
    case ListenerType.RADIAL: {
      const newListener = new RadialPlaybackGestureListener({
        position: { x: 0, y: 0 },
        dimensions: { width: 100, height: 100 },
        gestureSubject: gestureTracker.value.gestureSubject,
        canvasDimensions: CanvasSettings.dimensions,
        mode: RadialTrackerMode.NORMAL,
        subjects: {
          [RadialPlaybackGestureListener.playbackSubjectKey]: playbackSubject,
        },
        resetKeys: getGestureListenerResetKeys("KeyR"),
        eventContext: CanvasSettings.canvasCtx["events"] ?? undefined,
      });

      if (CanvasSettings.canvasCtx["dialing"]) {
        newListener.setContext(CanvasSettings.canvasCtx["dialing"]);
      }

      StorySettings.currentStory?.addListener(newListener, props.type);
      break;
    }
    case ListenerType.FORESHADOWING: {
      const chartPosition = StorySettings.currentStory?.chart?.position;
      const chartDimensions = StorySettings.currentStory?.chart?.dimensions;
      if (!chartDimensions || !chartPosition) return;

      const newListener = new ForeshadowingGestureListener({
        position: chartPosition,
        dimensions: chartDimensions,
        gestureSubject: gestureTracker.value.gestureSubject,
        canvasDimensions: CanvasSettings.dimensions,
        subjects: {
          [ForeshadowingGestureListener.playbackSubjectKey]: playbackSubject,
          [ForeshadowingGestureListener.emphasisSubjectKey]: emphasisSubject,
          [ForeshadowingGestureListener.foreshadowingAreaSubjectKey]:
            foreshadowingAreaSubject,
        },
        resetKeys: getGestureListenerResetKeys("KeyF"),
        mode: ForeshadowingShapes.RECTANGLE,
        playbackControllerType: "absolute",
        eventContext: CanvasSettings.canvasCtx["events"] ?? undefined,
      });

      if (CanvasSettings.canvasCtx["foreshadowing"]) {
        newListener.setContext(CanvasSettings.canvasCtx["foreshadowing"]);
      }

      StorySettings.currentStory?.addListener(newListener, props.type);
      break;
    }
    default:
      break;
  }
}
</script>
<template>
  <ChartSettingsPosition v-if="props.type === ListenerType.FORESHADOWING" />
  <v-card color="lighten-1" v-else>
    <v-container>
      <v-row class="mb-5">
        <v-col lg="12">
          <div class="text-h6">Gesture Listener Settings</div>
        </v-col>
      </v-row>
      <v-row>
        <v-col lg="12">
          <div class="text-caption">Width</div>
          <v-slider
            :min="0"
            :max="1000"
            :step="1"
            :model-value="
              StorySettings.currentStory?.getListenerDimensions(props.type)
                ?.width
            "
            @update:modelValue="(value: number) => {
                StorySettings.currentStory?.changeListenerDimensions({ width: value, ...(props.type === ListenerType.RADIAL ? { height: value } : {}) }, props.type)
            }"
            track-color="grey"
            thumb-label
          ></v-slider>
        </v-col>
        <v-col
          lg="12"
          v-if="
            [ListenerType.TEMPORAL].includes(
              props.type ?? ListenerType.TEMPORAL
            )
          "
        >
          <div class="text-caption">Height</div>
          <v-slider
            :min="0"
            :max="1000"
            :step="1"
            :model-value="
              StorySettings.currentStory?.getListenerDimensions(props.type)
                ?.height
            "
            @update:modelValue="(value: number) => StorySettings.currentStory?.changeListenerDimensions({ height: value }, props.type)"
            track-color="grey"
            thumb-label
          ></v-slider>
        </v-col>
        <v-col lg="12">
          <div class="text-caption">X Position</div>
          <v-slider
            :min="0"
            :max="1000"
            :step="1"
            :model-value="
              StorySettings.currentStory?.getListenerPosition(props.type)?.x
            "
            @update:modelValue="(value: number) => StorySettings.currentStory?.changeListenerPosition({ x: value }, props.type)"
            track-color="grey"
            thumb-label
          ></v-slider>
        </v-col>
        <v-col lg="12">
          <div class="text-caption">Y Position</div>
          <v-slider
            :min="0"
            :max="1000"
            :step="1"
            :model-value="
              StorySettings.currentStory?.getListenerPosition(props.type)?.y
            "
            @update:modelValue="(value: number) => StorySettings.currentStory?.changeListenerPosition({ y: value }, props.type)"
            track-color="grey"
            thumb-label
          ></v-slider>
        </v-col>
      </v-row>
    </v-container>
  </v-card>
</template>
<style></style>
