<script lang="ts" setup>
import { computed, onMounted, reactive, ref, watch, watchEffect } from "vue";
import {
  HANDS,
  type GestureListener,
  ListenerMode,
  ListenerType,
  ForeshadowingStatesMode,
} from "@/utils";
import { StorySettings } from "../settings-state";
import _ from "lodash";

interface ListItems {
  title: string;
  value: number;
  props?: {
    prependIcon?: string;
    appendIcon?: string;
    color?: string;
  };
}

const currentWidget = ref<GestureListener>();
const widgetType = ref<ListenerType>();

watchEffect(() => {
  widgetType.value = StorySettings.currentStory?.currentWidget
    ?.type as ListenerType;
  currentWidget.value = StorySettings.currentStory?.currentWidget
    ?.layer as GestureListener;
});

const widgetState = reactive<{
  gestureName: string;
  gestures: ListItems[];
  dominantHand: HANDS;
  resetKey?: string;
  listenerMode?: ListenerMode;
  strokeTriggerName: string;
  poseDuration: number;
  resetPauseDuration: number;
  triggerDuration: number;
  selectionKeys: string;
  foreshadowingStatesMode: ForeshadowingStatesMode;
  foreshadowingStatesCount: number;
  useBounds: boolean;
  restrictToBounds: boolean;
}>({
  gestureName: "",
  gestures: [],
  dominantHand: HANDS.RIGHT,
  listenerMode: undefined,
  strokeTriggerName: "",
  poseDuration: 1000,
  resetPauseDuration: 1000,
  triggerDuration: 1000,
  selectionKeys: "",
  foreshadowingStatesCount: 0,
  foreshadowingStatesMode: ForeshadowingStatesMode.ALL,
  useBounds: false,
  restrictToBounds: false,
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

onMounted(() => {
  if (!currentWidget.value) return;

  const {
    listenerMode,
    handsToTrack,
    strokeTriggerName,
    poseDuration,
    resetPauseDuration,
    triggerDuration,
    resetKeys,
    mode,
    selectionKeys,
    foreshadowingStatesCount,
    foreshadowingStatesMode,
    useBounds,
    restrictToBounds
  } = currentWidget.value.state;

  widgetState.gestures = getGestures();
  widgetState.dominantHand = handsToTrack.dominant;
  if (listenerMode) {
    widgetState.listenerMode = listenerMode;
  }
  if (strokeTriggerName) {
    widgetState.strokeTriggerName = strokeTriggerName;
  }
  if (poseDuration) {
    widgetState.poseDuration = poseDuration;
  }
  if (resetPauseDuration) {
    widgetState.resetPauseDuration = resetPauseDuration;
  }
  if (triggerDuration) {
    widgetState.triggerDuration = triggerDuration;
  }
  if (selectionKeys) {
    widgetState.selectionKeys = selectionKeys.toString();
  }
  if (foreshadowingStatesCount) {
    widgetState.foreshadowingStatesCount = foreshadowingStatesCount;
  }
  if (foreshadowingStatesMode) {
    widgetState.foreshadowingStatesMode = foreshadowingStatesMode;
  }
  if (useBounds) {
    widgetState.useBounds = useBounds;
  }
  if (restrictToBounds) {
    widgetState.restrictToBounds = restrictToBounds;
  }

  // widgetState.resetKey = resetKeys?.values().next().value;
});

watch(
  () => {
    return {
      handsToTrack: {
        dominant: widgetState.dominantHand,
        nonDominant:
          // IF THE DOMINANT HAND IS THE LEFT USE THE RIGHT OTHERWISE USE LEFT
          widgetState.dominantHand === HANDS.LEFT ? HANDS.RIGHT : HANDS.LEFT,
      },
      listenerMode: widgetState.listenerMode,
      strokeTriggerName: widgetState.strokeTriggerName,
      poseDuration: widgetState.poseDuration,
      resetPauseDuration: widgetState.resetPauseDuration,
      triggerDuration: widgetState.triggerDuration,
      resetKeys: new Set(widgetState.resetKey),
      selectionKeys: widgetState.selectionKeys.split(","),
      foreshadowingStatesMode: widgetState.foreshadowingStatesMode,
      foreshadowingStatesCount: widgetState.foreshadowingStatesCount,
      useBounds: widgetState.useBounds,
      restrictToBounds: widgetState.restrictToBounds,
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
      gestureName: widgetState.gestureName,
    });
  } else if (step.value === 2) {
    step.value = 1;
    nextBtnText.value = "Next";
    widgetState.gestureName = "";
    widgetState.gestures = getGestures();
  }

  currentWidget.value?.updateState({
    addGesture,
  });
}

function handleGestureDelete(name: string) {
  if (!currentWidget.value) return;

  currentWidget.value.state.strokeRecognizer.deleteGestureByName(name);
  widgetState.gestures = getGestures();
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
          v-model="widgetState.dominantHand"
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
          v-model="widgetState.poseDuration"
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
          v-model="widgetState.resetPauseDuration"
          label="After Pose Reset Timer"
          type="number"
        ></v-text-field>
      </v-col>
    </v-row>

    <v-row>
      <v-col>
        <v-select
          v-model="widgetState.listenerMode"
          label="Listener Mode"
          :items="[
            ListenerMode.FORESHADOWING,
            ListenerMode.SELECTION,
            ListenerMode.PLAYBACK,
          ]"
        ></v-select>
      </v-col>
    </v-row>

    <v-row
      v-if="[ListenerMode.FORESHADOWING].includes(widgetState.listenerMode as ListenerMode)"
    >
      <v-col>
        <v-select
          v-model="widgetState.foreshadowingStatesMode"
          label="Foreshadowing Mode"
          :items="
            widgetState.listenerMode === ListenerMode.FORESHADOWING
              ? [
                  ForeshadowingStatesMode.NEXT,
                  ForeshadowingStatesMode.COUNT,
                  ForeshadowingStatesMode.ALL,
                ]
              : []
          "
        ></v-select>
      </v-col>
    </v-row>

    <v-row
      v-if="
        [ListenerMode.FORESHADOWING].includes(widgetState.listenerMode as ListenerMode) &&
        (widgetState.foreshadowingStatesMode ===
          ForeshadowingStatesMode.COUNT ||
          widgetState.foreshadowingStatesMode === ForeshadowingStatesMode.NEXT)
      "
    >
      <v-col>
        <v-text-field
          v-model="widgetState.foreshadowingStatesCount"
          label="Number of States"
          type="number"
          hint="Number of states to draw after the current state"
        ></v-text-field>
      </v-col>
    </v-row>

    <v-row
      v-if="
        [ListenerMode.FORESHADOWING, ListenerMode.SELECTION].includes(
          widgetState.listenerMode as ListenerMode
        )
      "
    >
      <v-col lg="12">
        <v-text-field
          v-model="widgetState.selectionKeys"
          label="Items to select"
          hint="Enter the keys for the items you wish to select"
        ></v-text-field>
      </v-col>
      <v-col lg="12">
        <v-checkbox
          label="Emit to items within bounds"
          v-model="widgetState.useBounds"
        ></v-checkbox>
      </v-col>
      <v-col lg="12" v-if="widgetState.useBounds === true">
        <v-checkbox
          label="Only emit to items within bounds"
          v-model="widgetState.restrictToBounds"
        ></v-checkbox>
      </v-col>
    </v-row>

    <v-row
      v-if="
        [
          ListenerType.STROKE_LISTENER,
        ].includes(widgetType as ListenerType)
        && widgetState.gestures.length > 0
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
              v-for="(gesture, index) in widgetState.gestures"
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
              <v-divider v-if="index < widgetState.gestures.length - 1" />
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
                  v-model="widgetState.gestureName"
                ></v-text-field>
                <v-text-field
                  v-model="widgetState.triggerDuration"
                  label="Trigger Duration"
                  type="number"
                ></v-text-field>
                <v-text-field
                  v-model="widgetState.strokeTriggerName"
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
