export enum ForeshadowingStatesMode {
  TRAJECTORY = "trajectory",
  POINT = "point",
}

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

export enum HANDS {
  LEFT = "left",
  RIGHT = "right",
}

export enum SupportedGestures {
  POINTING = "pointing",
  OPEN_HAND = "open-hand",
  FORESHADOWING_LEFT_L = "foreshadowing-left-l",
  FORESHADOWING_RIGHT_L = "foreshadowing-right-l",
  FORESHADOWING_LEFT_C = "foreshadowing-left-c",
  FORESHADOWING_RIGHT_C = "foreshadowing-right-c",
}

export const RESET_ALL_KEY = "";

export function getGestureListenerResetKeys(
  keys?: string | string[]
): Set<string> {
  if (!keys) return new Set([RESET_ALL_KEY]);

  if (Array.isArray(keys)) {
    return new Set([RESET_ALL_KEY, ...keys]);
  }

  return new Set([RESET_ALL_KEY, keys]);
}
