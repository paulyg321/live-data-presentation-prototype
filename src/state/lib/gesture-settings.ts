import { reactive, ref, shallowRef, watchEffect } from "vue";
import {
  gestureSubject,
  GestureTracker,
  HANDS,
  ListenerMode,
  ForeshadowingStatesMode,
  StateUpdateType,
  AffectOptions,
} from "@/utils";
import { CanvasSettings } from "@/state";

export interface ListItems {
  title: string;
  value: number;
  props?: {
    prependIcon?: string;
    appendIcon?: string;
    color?: string;
  };
}

export const addGesture = ref<boolean>(false);
export const gestureName = ref<string>();

function getArgsForGestureTracker() {
  return {
    canvasDimensions: {
      width: CanvasSettings.dimensions.width,
      height: CanvasSettings.dimensions.height,
    },
    gestureSubject: gestureSubject,
  };
}

export const gestureTracker = shallowRef(
  new GestureTracker(getArgsForGestureTracker())
);

watchEffect(() => {
  gestureTracker.value.changeCanvasDimensions({
    width: CanvasSettings.dimensions.width,
    height: CanvasSettings.dimensions.height,
  });
});


export const DEFAULT_GESTURE_SETTINGS = {
  endKeyframe: undefined,
  gestureName: "",
  gestures: [],
  dominantHand: HANDS.RIGHT,
  listenerMode: undefined,
  strokeTriggerName: "",
  poseDuration: 500,
  resetPauseDuration: 1000,
  triggerDuration: 1000,
  selectionKeys: [],
  foreshadowingStatesCount: 1,
  foreshadowingStatesMode: ForeshadowingStatesMode.TRAJECTORY,
  useBounds: false,
  restrictToBounds: false,
  playbackDuration: 5,
  defaultAffect: AffectOptions.NEUTRAL,
  label: "",
};

export const GestureSettingsState = reactive<{
  gestureName: string;
  endKeyframe?: { value: string; index: number };
  gestures: ListItems[];
  dominantHand: HANDS;
  resetKey?: string;
  listenerMode?: ListenerMode;
  strokeTriggerName: string;
  poseDuration: number;
  resetPauseDuration: number;
  triggerDuration: number;
  selectionKeys: string[];
  foreshadowingStatesMode: ForeshadowingStatesMode;
  foreshadowingStatesCount: number;
  useBounds: boolean;
  restrictToBounds: boolean;
  playbackDuration: number;
  selectionLabelKey?: string;
  defaultAffect: AffectOptions;
  label: string;
}>(DEFAULT_GESTURE_SETTINGS);

export const isUpdateFromAutocomplete = ref(false);
