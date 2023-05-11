import { reactive, ref, shallowRef, watchEffect } from "vue";
import {
  gestureSubject,
  GestureTracker,
  HANDS,
  ListenerMode,
  ForeshadowingStatesMode,
  StateUpdateType,
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

export const GestureSettingsState = reactive<{
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
  playbackDuration: number;
  playbackMode:
    | StateUpdateType.INDIVIDUAL_TWEENS
    | StateUpdateType.GROUP_TIMELINE;
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
  playbackDuration: 5,
  playbackMode: StateUpdateType.GROUP_TIMELINE,
});
