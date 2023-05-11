<script lang="ts" setup>
import { computed, onMounted, ref, watch, watchEffect } from "vue";
import {
  HANDS,
  type GestureListener,
  ListenerMode,
  ListenerType,
} from "@/utils";
import { StorySettings, GestureSettingsState } from "@/state";
import { ForeshadowingSettings, PlaybackSettings, SelectionSettings } from "@/components";
const currentWidget = ref<GestureListener>();
const widgetType = ref<ListenerType>();

watchEffect(() => {
  widgetType.value = StorySettings.currentStory?.currentWidget
    ?.type as ListenerType;
  currentWidget.value = StorySettings.currentStory?.currentWidget
    ?.layer as GestureListener;
});

const step = ref<number>(1);
const nextBtnText = ref<string>("Next");

const currentTitle = computed(() => {
  switch (step.value) {
    case 1:
      return "Gesture Name";
    case 2:
      return "Instructions";
    default:
      return "Complete";
  }
});

watch(currentWidget, () => {
  if (!currentWidget.value) return;

  if (
    [
      ListenerType.RECT_POSE,
      ListenerType.RANGE_POSE,
      ListenerType.POINT_POSE,
      ListenerType.OPEN_HAND_POSE,
      ListenerType.STROKE_LISTENER,
    ].includes(StorySettings.currentStory?.currentWidget?.type as ListenerType)
  ) {
    const {
      listenerMode,
      handsToTrack,
      strokeTriggerName,
      poseDuration,
      resetPauseDuration,
      triggerDuration,
      // resetKeys,
      // mode,
      selectionKeys,
      foreshadowingStatesCount,
      foreshadowingStatesMode,
      useBounds,
      restrictToBounds,
    } = currentWidget.value.state;

    if (widgetType.value === ListenerType.STROKE_LISTENER) {
      GestureSettingsState.gestures = getGestures();
    }
    GestureSettingsState.dominantHand = handsToTrack.dominant;
    if (listenerMode) {
      GestureSettingsState.listenerMode = listenerMode;
    }
    if (strokeTriggerName) {
      GestureSettingsState.strokeTriggerName = strokeTriggerName;
    }
    if (poseDuration) {
      GestureSettingsState.poseDuration = poseDuration;
    }
    if (resetPauseDuration) {
      GestureSettingsState.resetPauseDuration = resetPauseDuration;
    }
    if (triggerDuration) {
      GestureSettingsState.triggerDuration = triggerDuration;
    }
    if (selectionKeys) {
      GestureSettingsState.selectionKeys = selectionKeys.toString();
    }
    if (foreshadowingStatesCount) {
      GestureSettingsState.foreshadowingStatesCount = foreshadowingStatesCount;
    }
    if (foreshadowingStatesMode) {
      GestureSettingsState.foreshadowingStatesMode = foreshadowingStatesMode;
    }
    if (useBounds) {
      GestureSettingsState.useBounds = useBounds;
    }
    if (restrictToBounds) {
      GestureSettingsState.restrictToBounds = restrictToBounds;
    }

    // GestureSettingsState.resetKey = resetKeys?.values().next().value;
  }
});

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
      selectionKeys: GestureSettingsState.selectionKeys.split(","),
      foreshadowingStatesMode: GestureSettingsState.foreshadowingStatesMode,
      foreshadowingStatesCount: GestureSettingsState.foreshadowingStatesCount,
      useBounds: GestureSettingsState.useBounds,
      restrictToBounds: GestureSettingsState.restrictToBounds,
    };
  },
  (state) => {
    currentWidget.value?.updateState(state);
  }
);

function handleNext() {
  let addGesture = false;

  if (step.value === 1) {
    addGesture = true;
    nextBtnText.value = "Finish";
    step.value = 2;
    currentWidget.value?.updateState({
      gestureName: GestureSettingsState.gestureName,
    });
  } else if (step.value === 2) {
    step.value = 1;
    nextBtnText.value = "Next";
    GestureSettingsState.gestureName = "";
    GestureSettingsState.gestures = getGestures();
  }

  currentWidget.value?.updateState({
    addGesture,
  });
}

function handleGestureDelete(name: string) {
  if (!currentWidget.value) return;

  currentWidget.value.state.strokeRecognizer.deleteGestureByName(name);
  GestureSettingsState.gestures = getGestures();
}

function getGestures() {
  if (!currentWidget.value) return [];

  return currentWidget.value.state.strokeRecognizer
    .getGestureNames()
    .map((name: string, index: number) => {
      return {
        title: name,
        value: index,
      };
    });
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
          label="Pose Hold Duration"
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
        ].includes(widgetType as ListenerType)
      "
    >
      <v-col>
        <v-text-field
          v-model="GestureSettingsState.resetPauseDuration"
          label="After Pose Reset Timer"
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

    <PlaybackSettings
      v-if="GestureSettingsState.listenerMode === ListenerMode.PLAYBACK"
    />

    <v-row
      v-if="
        [
          ListenerType.STROKE_LISTENER,
        ].includes(widgetType as ListenerType)
        && GestureSettingsState.gestures.length > 0
      "
    >
      <v-col lg="12" align-self="center">
        <v-card class="mx-auto">
          <v-card-title
            class="text-h6 font-weight-regular justify-space-between"
          >
            <span>Gesture List</span>
          </v-card-title>
          <v-list>
            <template
              v-for="(gesture, index) in GestureSettingsState.gestures"
              :key="gesture.title"
            >
              <v-list-item :title="gesture.title">
                <template v-slot:append>
                  <v-btn
                    color="deep-purple-lighten-2"
                    icon="mdi-delete-empty"
                    variant="elevated"
                    density="compact"
                    @click="() => handleGestureDelete(gesture.title)"
                  ></v-btn>
                </template>
              </v-list-item>
              <v-divider
                v-if="index < GestureSettingsState.gestures.length - 1"
              />
            </template>
          </v-list>
        </v-card>
      </v-col>
    </v-row>

    <v-row
      v-if="
        [
          ListenerType.STROKE_LISTENER
        ].includes(widgetType as ListenerType)
      "
    >
      <v-col lg="12" align-self="center">
        <v-card class="mx-auto">
          <v-card-title
            class="text-h6 font-weight-regular justify-space-between"
          >
            <span>{{ currentTitle }}</span>
          </v-card-title>

          <v-window v-model="step">
            <v-window-item :value="1">
              <v-card-text>
                <v-text-field
                  label="Gesture Name"
                  v-model="GestureSettingsState.gestureName"
                ></v-text-field>
                <v-text-field
                  v-model="GestureSettingsState.triggerDuration"
                  label="Trigger Duration"
                  type="number"
                ></v-text-field>
                <v-text-field
                  v-model="GestureSettingsState.strokeTriggerName"
                  label="Trigger Key"
                  hint="Use 'radial' for gestures you want to use as an affective trigger. Use any other name for gestures you don't want to trigger an affect."
                ></v-text-field>

                <span class="text-caption text-grey-darken-1"> </span>
              </v-card-text>
            </v-window-item>

            <v-window-item :value="2">
              <v-card-text>
                <span class="text-caption text-grey-darken-1">
                  Touch your thumbs together then perform the gesture before the
                  timer ends
                </span>
              </v-card-text>
            </v-window-item>
          </v-window>

          <v-divider></v-divider>

          <v-card-actions>
            <v-btn v-if="step > 1" variant="text" @click="step--"> Back </v-btn>
            <v-spacer></v-spacer>
            <v-btn
              color="deep-purple-lighten-2"
              variant="flat"
              @click="handleNext"
            >
              {{ nextBtnText }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
<style></style>
