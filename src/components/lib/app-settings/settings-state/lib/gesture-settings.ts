import { gestureSubject, GestureTracker } from "@/utils";
import { ref, shallowRef, watchEffect } from "vue";
import { CanvasSettings } from "./canvas-settings";

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
