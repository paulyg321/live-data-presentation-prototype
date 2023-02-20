import { Subject } from "rxjs";

export enum PlaybackSubjectType {
  DISCRETE = "discrete",
  CONTINUOUS = "continuous",
}

export enum ForeshadowingAreaSubjectType {
  SET = "set",
  CLEAR = "clear",
}

// -------------------------- Subjects --------------------------
export const currentAnimationSubject = new Subject();
export const playbackSubject = new Subject();
export const foreshadowingAreaSubject = new Subject();
