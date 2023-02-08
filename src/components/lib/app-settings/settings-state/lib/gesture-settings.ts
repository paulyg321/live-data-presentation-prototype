import {
  DrawingMode,
  EmphasisMeter,
  foreshadowingLeftC,
  foreshadowingLeftL,
  foreshadowingRightC,
  foreshadowingRightL,
  GestureTracker,
  MotionAndPositionTracker,
  openHandGesture,
  pointingGesture,
  SupportedGestures,
  TrackingType,
} from "@/utils";
import { computed, shallowRef, watchEffect } from "vue";
import { CanvasSettings } from "./canvas-settings";
import { animationTrack, ChartSettings } from "./chart-settings";
import { PlaybackComponentSettings } from "./playback-component-settings";

// -------------------------- GENERAL GESTURE TRACKING --------------------------

function getArgsForGestureTracker() {
  return {
    canvasDimensions: {
      width: CanvasSettings.canvasWidth,
      height: CanvasSettings.canvasHeight,
    },
    gestures: [
      pointingGesture,
      openHandGesture,
      foreshadowingLeftL,
      foreshadowingRightL,
      foreshadowingLeftC,
      foreshadowingRightC,
    ],
  };
}

export const gestureTracker = computed(
  () => new GestureTracker(getArgsForGestureTracker())
);

// -------------------------- EMPHASIS TRACKING --------------------------
function getArgsForEmphasisTracker() {
  return {
    position: {
      x: ChartSettings.xPosition + ChartSettings.chartWidth / 2,
      y: ChartSettings.yPosition + ChartSettings.chartHeight / 2,
    },
    size: {
      width: 100,
      height: 100,
    },
    gestureSubject: gestureTracker.value.gestureSubject,
    trackerType: TrackingType.EMPHASIS,
    gestureTypes: [
      {
        rightHand: SupportedGestures.OPEN_HAND,
        leftHand: SupportedGestures.OPEN_HAND,
      },
    ],
  };
}

export const emphasisPlaybackTracker = shallowRef(
  new MotionAndPositionTracker(getArgsForEmphasisTracker())
);

watchEffect(() => {
  if (emphasisPlaybackTracker.value) {
    emphasisPlaybackTracker.value.unsubscribe();
  }

  emphasisPlaybackTracker.value = new MotionAndPositionTracker(
    getArgsForEmphasisTracker()
  );

  emphasisPlaybackTracker.value.emphasisDecrementSubject.subscribe({
    next: (value: any) => {
      if (value <= 50) {
        ChartSettings.setDrawingMode(DrawingMode.SEQUENTIAL_TRANSITION);
      } else if (value > 50 && value <= 100) {
        ChartSettings.setDrawingMode(DrawingMode.CONCURRENT);
      } else if (value > 100 && value <= 150) {
        ChartSettings.setDrawingMode(DrawingMode.DROP);
      }
    },
  });

  if (CanvasSettings.canvasCtx["emphasis"]) {
    emphasisPlaybackTracker.value.renderReferencePoints({
      ctx: CanvasSettings.canvasCtx["emphasis"],
      canvasDim: {
        width: CanvasSettings.canvasWidth,
        height: CanvasSettings.canvasHeight,
      },
    });
  }
});

export const emphasisMeter = shallowRef(
  new EmphasisMeter(getArgsForEmphasisMeter())
);

function getArgsForEmphasisMeter() {
  return {
    decrementSubject: emphasisPlaybackTracker.value.emphasisDecrementSubject,
    incrementSubject: emphasisPlaybackTracker.value.emphasisIncrementSubject,
    canvasDimensions: {
      width: CanvasSettings.canvasWidth,
      height: CanvasSettings.canvasHeight,
    },
    context: CanvasSettings.canvasCtx["emphasis"],
  };
}

watchEffect(() => {
  if (emphasisMeter.value) {
    emphasisMeter.value.unsubscribe({});
  }
  emphasisMeter.value = new EmphasisMeter(getArgsForEmphasisMeter());
});

// -------------------------- PLAYBACK TRACKING --------------------------
function getArgsForTemporalTracking() {
  return {
    position: {
      x: ChartSettings.xPosition,
      y: ChartSettings.yPosition + ChartSettings.chartHeight,
    },
    size: {
      width: ChartSettings.chartWidth,
      height: 50,
    },
    gestureSubject: gestureTracker.value.gestureSubject,
    trackerType: TrackingType.LINEAR,
    gestureTypes: [
      {
        rightHand: SupportedGestures.POINTING,
        leftHand: SupportedGestures.POINTING,
      },
    ],
  };
}

export const temporalPlaybackTracker = computed(() => {
  if (temporalPlaybackTracker.value) {
    temporalPlaybackTracker.value.unsubscribe();
  }
  return new MotionAndPositionTracker(getArgsForTemporalTracking());
});

function getArgsForPlaybackTracker() {
  return {
    position: {
      x: PlaybackComponentSettings.xPosition,
      y: PlaybackComponentSettings.yPosition,
    },
    size: {
      width: PlaybackComponentSettings.width,
      height: PlaybackComponentSettings.height,
    },
    gestureSubject: gestureTracker.value.gestureSubject,
    trackerType: TrackingType.RADIAL,
    gestureTypes: [
      {
        rightHand: SupportedGestures.POINTING,
        leftHand: SupportedGestures.POINTING,
      },
    ],
  };
}

export const radialPlaybackTracker = computed(() => {
  if (radialPlaybackTracker.value) {
    radialPlaybackTracker.value.unsubscribe();
  }
  return new MotionAndPositionTracker(getArgsForPlaybackTracker());
});

// ---------------- FORESHADOWING ------------------------
function getArgsForForeshadowingTracker() {
  return {
    position: {
      x: ChartSettings.xPosition,
      y: ChartSettings.yPosition,
    },
    size: {
      width: ChartSettings.chartWidth,
      height: ChartSettings.chartHeight,
    },
    gestureSubject: gestureTracker.value.gestureSubject,
    trackerType: TrackingType.FORESHADOWING,
    gestureTypes: [
      {
        rightHand: SupportedGestures.FORESHADOWING_RIGHT_L,
        leftHand: SupportedGestures.FORESHADOWING_LEFT_L,
      },
      {
        rightHand: SupportedGestures.FORESHADOWING_RIGHT_C,
        leftHand: SupportedGestures.FORESHADOWING_LEFT_C,
      },
      {
        rightHand: SupportedGestures.OPEN_HAND,
        leftHand: SupportedGestures.OPEN_HAND,
      },
    ],
  };
}

export const foreshadowingRectTracker = shallowRef(
  new MotionAndPositionTracker(getArgsForForeshadowingTracker())
);

watchEffect(() => {
  if (foreshadowingRectTracker.value) {
    foreshadowingRectTracker.value.unsubscribe();
  }

  foreshadowingRectTracker.value = new MotionAndPositionTracker(
    getArgsForForeshadowingTracker()
  );

  foreshadowingRectTracker.value.trackingSubject.subscribe({
    next(value: any) {
      animationTrack.value = value;
    },
  });

  if (CanvasSettings.canvasCtx["foreshadowing"]) {
    foreshadowingRectTracker.value.setContext(
      CanvasSettings.canvasCtx["foreshadowing"]
    );
    foreshadowingRectTracker.value.renderReferencePoints({
      ctx: CanvasSettings.canvasCtx["foreshadowing"],
      canvasDim: {
        width: CanvasSettings.canvasWidth,
        height: CanvasSettings.canvasHeight,
      },
    });
  }
});
