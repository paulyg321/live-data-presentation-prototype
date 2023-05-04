import { Subject } from "rxjs";

export enum PlaybackSubjectType {
  DISCRETE = "discrete",
  CONTINUOUS = "continuous",
}

export enum ForeshadowingAreaSubjectType {
  RECTANGLE = "rect",
  CIRCLE = "circle",
  RANGE = "range",
  CLEAR = "clear",
}

// -------------------------- Subjects --------------------------
export const gestureSubject = new Subject();
export const emphasisSubject = new Subject();
export const playbackSubject = new Subject();
export const foreshadowingAreaSubject = new Subject();
export const legendSubject = new Subject();
export const axesSubject = new Subject();
export const snackbarSubject = new Subject();
export const highlightSubject = new Subject();
export const selectionSubject = new Subject();
