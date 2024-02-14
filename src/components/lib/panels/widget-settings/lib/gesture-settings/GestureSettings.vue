<script lang="ts" setup>
import { onMounted, ref, watch, watchEffect } from "vue";
import {
  HANDS,
  type GestureListener,
  ListenerMode,
  ListenerType,
} from "@/utils";
import {
  StorySettings,
  GestureSettingsState,
  currentChart,
  handlePlay,
  DEFAULT_GESTURE_SETTINGS,
  isUpdateFromAutocomplete,
} from "@/state";
import {
  ForeshadowingSettings,
  PlaybackSettings,
  SelectionSettings,
  AnnotationPoseSettings,
} from "@/components";
const currentWidget = ref<GestureListener>();
const widgetType = ref<ListenerType>();

watchEffect(() => {
  widgetType.value = StorySettings.currentStory?.currentWidget
    ?.type as ListenerType;
  currentWidget.value = StorySettings.currentStory?.currentWidget
    ?.layer as GestureListener;
});

watch(currentWidget, handleUpdateGestureState, { immediate: false });
onMounted(handleUpdateGestureState);

watch(
  () => {
    return {
      handsToTrack: {
        dominant: GestureSettingsState.dominantHand,
        nonDominant:
          // IF THE DOMINANT HAND IS THE LEFT USE THE RIGHT OTHERWISE USE LEFT
          GestureSettingsState.dominantHand === HANDS.LEFT
            ? HANDS.RIGHT
            : HANDS.LEFT,
      },
      listenerMode: GestureSettingsState.listenerMode,
      strokeTriggerName: GestureSettingsState.strokeTriggerName,
      poseDuration: GestureSettingsState.poseDuration,
      resetPauseDuration: GestureSettingsState.resetPauseDuration,
      triggerDuration: GestureSettingsState.triggerDuration,
      resetKeys: new Set(GestureSettingsState.resetKey),
      selectionKeys: GestureSettingsState.selectionKeys,
      foreshadowingStatesMode: GestureSettingsState.foreshadowingStatesMode,
      foreshadowingStatesCount: GestureSettingsState.foreshadowingStatesCount,
      useBounds: GestureSettingsState.useBounds,
      restrictToBounds: GestureSettingsState.restrictToBounds,
      endKeyframe: GestureSettingsState.endKeyframe,
      selectionLabelKey: GestureSettingsState.selectionLabelKey,
      defaultAffect: GestureSettingsState.defaultAffect,
      label: GestureSettingsState.label,
    };
  },
  (state) => {
    currentWidget.value?.updateState(state);
  },
  { immediate: false }
);

watch(
  () => GestureSettingsState.selectionKeys,
  () => {
    if (isUpdateFromAutocomplete.value) {
      const isAnnotation =
        GestureSettingsState.listenerMode === ListenerMode.ANNOTATE;
      if (!isAnnotation && GestureSettingsState.selectionKeys.length > 0) {
        const bounds = currentChart.value?.state.controller?.getSelectionBounds(
          GestureSettingsState.selectionKeys
        );

        if (bounds) {
          currentWidget.value?.updateState({
            position: bounds.position,
            dimensions: bounds.dimensions,
          });
        }
      }
      // Reset the flag after handling the update
      isUpdateFromAutocomplete.value = false;
    }
  }
);

function handleUpdateGestureState() {
  if (!currentWidget.value) return;

  if (
    [
      ListenerType.RECT_POSE,
      ListenerType.RANGE_POSE,
      ListenerType.POINT_POSE,
      ListenerType.OPEN_HAND_POSE,
      ListenerType.STROKE_LISTENER,
      ListenerType.THUMB_POSE,
    ].includes(StorySettings.currentStory?.currentWidget?.type as ListenerType)
  ) {
    const {
      listenerMode,
      handsToTrack,
      strokeTriggerName,
      poseDuration,
      resetPauseDuration,
      triggerDuration,
      selectionKeys,
      foreshadowingStatesCount,
      foreshadowingStatesMode,
      useBounds,
      restrictToBounds,
      endKeyframe,
      selectionLabelKey,
      defaultAffect,
      label,
    } = {
      ...DEFAULT_GESTURE_SETTINGS,
      ...currentWidget.value.state,
    };
    GestureSettingsState.dominantHand = handsToTrack.dominant;
    GestureSettingsState.listenerMode = listenerMode;
    GestureSettingsState.strokeTriggerName = strokeTriggerName;
    GestureSettingsState.poseDuration = poseDuration;
    GestureSettingsState.resetPauseDuration = resetPauseDuration;
    GestureSettingsState.triggerDuration = triggerDuration;
    GestureSettingsState.selectionKeys = selectionKeys;
    GestureSettingsState.foreshadowingStatesCount = foreshadowingStatesCount;
    GestureSettingsState.foreshadowingStatesMode = foreshadowingStatesMode;
    GestureSettingsState.useBounds = useBounds;
    GestureSettingsState.restrictToBounds = restrictToBounds;
    GestureSettingsState.endKeyframe = endKeyframe;
    GestureSettingsState.selectionLabelKey = selectionLabelKey;
    GestureSettingsState.defaultAffect = defaultAffect;
    GestureSettingsState.label = label;
  }
}
</script>
<template>
  <v-container>
    <v-row class="mb-5">
      <v-col lg="12">
        <div class="text-h5">Gesture Settings</div>
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <v-text-field
          v-model="GestureSettingsState.label"
          label="Listener Label"
          hint="This label is shown on the canvas to help identify the listener"
        ></v-text-field>
      </v-col>
    </v-row>
    <v-row
      v-if="
        GestureSettingsState.listenerMode &&
        [ListenerMode.FORESHADOWING, ListenerMode.SELECTION].includes(
          GestureSettingsState.listenerMode
        )
      "
    >
      <v-col lg="6">
        <v-btn
          class="mb-4"
          block
          size="large"
          @click="() => currentWidget?.triggerListener()"
          >Preview</v-btn
        >
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <v-select
          v-model="GestureSettingsState.dominantHand"
          label="Dominant Hand"
          :items="[HANDS.LEFT, HANDS.RIGHT]"
        ></v-select>
      </v-col>
    </v-row>

    <v-row
      v-if="
        [
          ListenerType.RECT_POSE,
          ListenerType.RANGE_POSE,
          ListenerType.POINT_POSE,
          ListenerType.OPEN_HAND_POSE,
        ].includes(widgetType as ListenerType)
      "
    >
      <v-col>
        <v-text-field
          v-model="GestureSettingsState.poseDuration"
          label="Pose Hold Duration (milliseconds)"
          type="number"
        ></v-text-field>
      </v-col>
    </v-row>

    <v-row
      v-if="
        [
          ListenerType.RECT_POSE,
          ListenerType.RANGE_POSE,
          ListenerType.POINT_POSE,
          ListenerType.OPEN_HAND_POSE,
          ListenerType.THUMB_POSE,
        ].includes(widgetType as ListenerType)
      "
    >
      <v-col>
        <v-text-field
          v-model="GestureSettingsState.resetPauseDuration"
          label="After Pose Reset Timer (milliseconds)"
          type="number"
        ></v-text-field>
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <v-select
          v-model="GestureSettingsState.listenerMode"
          label="Listener Mode"
          :items="[
            ListenerMode.FORESHADOWING,
            ListenerMode.SELECTION,
            ListenerMode.PLAYBACK,
            ListenerMode.ANNOTATE,
          ]"
        ></v-select>
      </v-col>
    </v-row>

    <ForeshadowingSettings
      v-if="GestureSettingsState.listenerMode === ListenerMode.FORESHADOWING"
    />

    <SelectionSettings
      v-if="GestureSettingsState.listenerMode === ListenerMode.SELECTION"
    />

    <AnnotationPoseSettings
      v-if="GestureSettingsState.listenerMode === ListenerMode.ANNOTATE"
    />

    <PlaybackSettings
      v-if="
        GestureSettingsState.listenerMode === ListenerMode.PLAYBACK &&
        currentWidget?.state.playbackSettings
      "
      @on-save-config="
        (args: any) => {
          currentWidget?.updateState({ playbackConfig: args });
        }
      "
      @on-play-backward="
        (args: any) => {
          handlePlay(args);
        }
      "
      @on-play-forward="
        (args: any) => {
          handlePlay(args);
        }
      "
      :initialPlaybackSettings="currentWidget?.state.playbackSettings"
    />
  </v-container>
</template>
<style></style>
