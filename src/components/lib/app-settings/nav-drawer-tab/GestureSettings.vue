<script lang="ts" setup>
import { computed, onMounted, reactive, ref, watch, watchEffect } from "vue";
import {
  HANDS,
  type GestureListener,
  ListenerMode,
  type Unistroke,
  ListenerType,
  ForeshadowingType,
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
  mode: any;
  listenerMode: ListenerMode;
  strokeTriggerName: string;
  poseDuration: number;
  resetPauseDuration: number;
  triggerDuration: number;
  selectionKeys: string;
  foreshadowingStatesMode: ForeshadowingStatesMode;
  foreshadowingStatesCount: number;
}>({
  gestureName: "",
  gestures: [],
  dominantHand: HANDS.RIGHT,
  listenerMode: ListenerMode.POSE,
  strokeTriggerName: "",
  poseDuration: 1000,
  resetPauseDuration: 1000,
  triggerDuration: 1000,
  mode: "",
  selectionKeys: "",
  foreshadowingStatesCount: 0,
  foreshadowingStatesMode: ForeshadowingStatesMode.ALL,
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
  } = currentWidget.value;

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

  widgetState.resetKey = resetKeys?.values().next().value;

  if (mode) {
    widgetState.mode = mode;
  }
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
      mode: widgetState.mode,
      selectionKeys: widgetState.selectionKeys.split(","),
      foreshadowingStatesMode: widgetState.foreshadowingStatesMode,
      foreshadowingStatesCount: widgetState.foreshadowingStatesCount,
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

  currentWidget.value.strokeRecognizer.deleteGestureByName(name);
  widgetState.gestures = getGestures();
}

function getGestures() {
  if (!currentWidget.value) return [];

  return currentWidget.value.strokeRecognizer
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
          ListenerType.SELECTION,
        ].includes(widgetType as ListenerType)
      "
    >
      <v-col>
        <v-select
          v-model="widgetState.listenerMode"
          label="Listener Mode"
          :items="[ListenerMode.POSE, ListenerMode.STROKE]"
        ></v-select>
      </v-col>
    </v-row>

    <v-row
      v-if="
        [
          ListenerType.FORESHADOWING,
        ].includes(widgetType as ListenerType)
      "
    >
      <v-col>
        <v-select
          v-model="widgetState.mode"
          label="Mode"
          :items="
            widgetType === ListenerType.FORESHADOWING
              ? [ForeshadowingType.RANGE, ForeshadowingType.SHAPE]
              : []
          "
        ></v-select>
      </v-col>
    </v-row>

    <v-row
      v-if="
        [
          ListenerType.FORESHADOWING,
        ].includes(widgetType as ListenerType)
      "
    >
      <v-col lg="12">
        <v-select
          v-model="widgetState.foreshadowingStatesMode"
          label="Mode"
          :items="[
            ForeshadowingStatesMode.NEXT,
            ForeshadowingStatesMode.ALL,
            ForeshadowingStatesMode.COUNT,
          ]"
        ></v-select>
      </v-col>
      <v-col
        lg="12"
        v-if="
          widgetState.foreshadowingStatesMode === ForeshadowingStatesMode.COUNT
        "
      >
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
        [
          ListenerType.SELECTION,
          ListenerType.FORESHADOWING,
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
          ListenerType.SELECTION,
        ].includes(widgetType as ListenerType)
      "
    >
      <v-col>
        <v-text-field
          v-model="widgetState.selectionKeys"
          label="Items to select"
          hint="Enter the keys for the items you wish to select"
        ></v-text-field>
      </v-col>
    </v-row>

    <v-row
      v-if="
        [
          ListenerType.SELECTION,
          ListenerType.FORESHADOWING,
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
          ListenerType.SELECTION,
          ListenerType.FORESHADOWING,
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

    <v-row
      v-if="
        [
          ListenerType.RADIAL,
          ListenerType.TEMPORAL,
          ListenerType.SELECTION,
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
          ListenerType.RADIAL,
          ListenerType.TEMPORAL,
          ListenerType.SELECTION,
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
