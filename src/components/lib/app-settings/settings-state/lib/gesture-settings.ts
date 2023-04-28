/**
 * TODO: To have widgets, all the things here can be made dynamic under a gestureSettings object
 */
import {
  DollarRecognizer,
  emphasisSubject,
  foreshadowingAreaSubject,
  ForeshadowingGestureListener,
  ForeshadowingShapes,
  gestureSubject,
  GestureTracker,
  LinearPlaybackGestureListener,
  playbackSubject,
  RadialPlaybackGestureListener,
  RadialTrackerMode,
  SupportedGestures,
} from "@/utils";
import { ref, shallowRef, watchEffect } from "vue";
import { CanvasSettings } from "./canvas-settings";
import { ChartSettings } from "./chart-settings";
import { PlaybackComponentSettings } from "./playback-component-settings";

export const addGesture = ref<boolean>(false);
export const gestureName = ref<string>();

export const gestureCanvasKeys = [
  "dialing",
  "emphasis",
  "foreshadowing",
  "linear",
];

// // -------------------------- GENERAL GESTURE TRACKING --------------------------

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

// // -------------------------- EMPHASIS TRACKING --------------------------

// // export const emphasisTracker = shallowRef(
// //   new EmphasisGestureListener({
// //     position: {
// //       x: ChartSettings.position.x + ChartSettings.dimensions.width / 2,
// //       y: ChartSettings.position.y + ChartSettings.dimensions.height / 2,
// //     },
// //     dimensions: {
// //       width: 100,
// //       height: 100,
// //     },
// //     gestureSubject: gestureTracker.value.gestureSubject,
// //     canvasDimensions: CanvasSettings.dimensions,
// //     subjects: {
// //       [EmphasisGestureListener.currentAnimationSubjectKey]:
// //         currentAnimationSubject,
// //     },
// //     resetKeys: getGestureListenerResetKeys("KeyE"),
// //   })
// // );

// // watchEffect(() => {
// //   emphasisTracker.value.updateState({
// //     position: {
// //       x: ChartSettings.position.x + ChartSettings.dimensions.width / 2,
// //       y: ChartSettings.position.y + ChartSettings.dimensions.height / 2,
// //     },
// //     canvasDimensions: CanvasSettings.dimensions,
// //   });

// //   emphasisTracker.value.renderReferencePoints();
// // });

// // -------------------------- PLAYBACK TRACKING --------------------------

// // Linear Tracker
// export const temporalPlaybackTracker = shallowRef(
//   new LinearPlaybackGestureListener({
//     position: {
//       ...ChartSettings.position,
//       y: ChartSettings.position.y + ChartSettings.dimensions.height,
//     },
//     dimensions: {
//       width: ChartSettings.dimensions.width,
//       height: 50,
//     },
//     gestureTypes: [
//       {
//         leftHand: SupportedGestures.OPEN_HAND,
//         rightHand: SupportedGestures.OPEN_HAND,
//       },
//     ],
//     gestureSubject: gestureTracker.value.gestureSubject,
//     canvasDimensions: CanvasSettings.dimensions,
//     subjects: {
//       [LinearPlaybackGestureListener.playbackSubjectKey]: playbackSubject,
//     },
//     resetKeys: getGestureListenerResetKeys("KeyL"),
//   })
// );

// watchEffect(() => {
//   const position = {
//     x: ChartSettings.position.x,
//     y: ChartSettings.position.y + ChartSettings.dimensions.height,
//   };

//   const dimensions = {
//     width: ChartSettings.dimensions.width,
//     height: 50,
//   };

//   temporalPlaybackTracker.value.updateState({
//     position,
//     dimensions,
//     canvasDimensions: CanvasSettings.dimensions,
//   });
// });

// // radial tracker
// export const radialPlaybackTracker = shallowRef(
//   new RadialPlaybackGestureListener({
//     position: PlaybackComponentSettings.position,
//     dimensions: PlaybackComponentSettings.dimensions,
//     gestureSubject: gestureTracker.value.gestureSubject,
//     canvasDimensions: CanvasSettings.dimensions,
//     mode: RadialTrackerMode.NORMAL,
//     subjects: {
//       [RadialPlaybackGestureListener.playbackSubjectKey]: playbackSubject,
//     },
//     resetKeys: getGestureListenerResetKeys("KeyR"),
//   })
// );

// watchEffect(() => {
//   radialPlaybackTracker.value.updateState({
//     position: PlaybackComponentSettings.position,
//     dimensions: PlaybackComponentSettings.dimensions,
//     canvasDimensions: CanvasSettings.dimensions,
//   });

//   radialPlaybackTracker.value.renderReferencePoints();
// });

// // ---------------- FORESHADOWING ------------------------
// export const foreshadowingTracker = shallowRef(
//   new ForeshadowingGestureListener({
//     position: ChartSettings.position,
//     dimensions: ChartSettings.dimensions,
//     gestureSubject: gestureTracker.value.gestureSubject,
//     canvasDimensions: CanvasSettings.dimensions,
//     subjects: {
//       [ForeshadowingGestureListener.playbackSubjectKey]: playbackSubject,
//       [ForeshadowingGestureListener.emphasisSubjectKey]: emphasisSubject,
//       [ForeshadowingGestureListener.foreshadowingAreaSubjectKey]:
//         foreshadowingAreaSubject,
//     },
//     resetKeys: getGestureListenerResetKeys("KeyF"),
//     mode: ForeshadowingShapes.RECTANGLE,
//     playbackControllerType: "absolute",
//   })
// );

// watchEffect(() => {
//   foreshadowingTracker.value.updateState({
//     position: ChartSettings.position,
//     dimensions: ChartSettings.dimensions,
//     canvasDimensions: CanvasSettings.dimensions,
//   });

//   foreshadowingTracker.value.renderReferencePoints();
// });
