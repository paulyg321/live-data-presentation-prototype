import { Subject } from "rxjs";

export enum PlaybackSubjectType {
  DISCRETE = "discrete",
  CONTINUOUS = "continuous",
}

export enum ForeshadowingAreaSubjectType {
  RECTANGLE = "rect",
  CIRCLE = "circle",
  CLEAR = "clear",
}

// -------------------------- Subjects --------------------------
export const emphasisSubject = new Subject();
export const playbackSubject = new Subject();
export const foreshadowingAreaSubject = new Subject();
export const legendSubject = new Subject();
export const axesSubject = new Subject();
