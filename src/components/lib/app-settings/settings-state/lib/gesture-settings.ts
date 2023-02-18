import {
  EmphasisGestureListener,
  ForeshadowingGestureListener,
  GestureTracker,
  LinearPlaybackGestureListener,
  RadialPlaybackGestureListener,
  RadialTrackerMode,
} from "@/utils";
import { shallowRef, watchEffect } from "vue";
import { CanvasSettings } from "./canvas-settings";
import { ChartSettings } from "./chart-settings";
import { PlaybackComponentSettings } from "./playback-component-settings";

// -------------------------- GENERAL GESTURE TRACKING --------------------------

function getArgsForGestureTracker() {
  return {
    canvasDimensions: {
      width: CanvasSettings.dimensions.width,
      height: CanvasSettings.dimensions.height,
    },
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

// -------------------------- EMPHASIS TRACKING --------------------------

export const emphasisTracker = shallowRef(
  new EmphasisGestureListener({
    position: {
      x: ChartSettings.position.x + ChartSettings.dimensions.width / 2,
      y: ChartSettings.position.y + ChartSettings.dimensions.height / 2,
    },
    size: {
      width: 100,
      height: 100,
    },
    gestureSubject: gestureTracker.value.gestureSubject,
    canvasDimensions: CanvasSettings.dimensions,
  })
);

watchEffect(() => {
  emphasisTracker.value.updateState({
    position: {
      x: ChartSettings.position.x + ChartSettings.dimensions.width / 2,
      y: ChartSettings.position.y + ChartSettings.dimensions.height / 2,
    },
  });
});

// -------------------------- PLAYBACK TRACKING --------------------------

// Linear Tracker
export const temporalPlaybackTracker = shallowRef(
  new LinearPlaybackGestureListener({
    position: {
      ...ChartSettings.position,
      y: ChartSettings.position.y + ChartSettings.dimensions.height,
    },
    size: {
      width: ChartSettings.dimensions.width,
      height: 50,
    },
    gestureSubject: gestureTracker.value.gestureSubject,
    canvasDimensions: CanvasSettings.dimensions,
  })
);

export const linearTrackerSubject = shallowRef<any | undefined>(undefined);

watchEffect(() => {
  const position = {
    x: ChartSettings.position.x,
    y: ChartSettings.position.y + ChartSettings.dimensions.height,
  };

  const size = {
    width: ChartSettings.dimensions.width,
    height: 50,
  };

  temporalPlaybackTracker.value.updateState({
    position,
    size,
  });

  linearTrackerSubject.value = temporalPlaybackTracker.value.getSubject(
    LinearPlaybackGestureListener.trackingSubjectKey
  );
});

// radial tracker
export const radialPlaybackTracker = shallowRef(
  new RadialPlaybackGestureListener({
    position: PlaybackComponentSettings.position,
    size: PlaybackComponentSettings.dimensions,
    gestureSubject: gestureTracker.value.gestureSubject,
    canvasDimensions: CanvasSettings.dimensions,
    mode: RadialTrackerMode.TRACKING,
  })
);

export const radialDiscreteTrackerSubject = shallowRef<any | undefined>(undefined);
export const radialContinuousTrackerSubject = shallowRef<any | undefined>(undefined);

watchEffect(() => {
  radialPlaybackTracker.value.updateState({
    position: PlaybackComponentSettings.position,
    size: PlaybackComponentSettings.dimensions,
  });

  radialDiscreteTrackerSubject.value = radialPlaybackTracker.value.getSubject(
    RadialPlaybackGestureListener.discreteTrackingSubjectKey
  );
  radialContinuousTrackerSubject.value = radialPlaybackTracker.value.getSubject(
    RadialPlaybackGestureListener.continuousTrackingSubjectKey
  );
});

// ---------------- FORESHADOWING ------------------------
export const foreshadowingTracker = shallowRef(
  new ForeshadowingGestureListener({
    position: ChartSettings.position,
    size: ChartSettings.dimensions,
    gestureSubject: gestureTracker.value.gestureSubject,
    canvasDimensions: CanvasSettings.dimensions,
  })
);

export const foreshadowingTrackerSubject = shallowRef<any | undefined>(undefined);

watchEffect(() => {
  foreshadowingTracker.value.updateState({
    position: ChartSettings.position,
    size: ChartSettings.dimensions,
  });

  foreshadowingTrackerSubject.value = foreshadowingTracker.value.getSubject(
    ForeshadowingGestureListener.trackingSubjectKey
  );
});

