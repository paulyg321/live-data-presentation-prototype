import type { PartialCoordinate2D } from "@/utils";

export type FingerPositionsData = {
  [key: number]: PartialCoordinate2D;
};

export enum HANDS {
  LEFT = "left",
  RIGHT = "right",
}

export const RESET_ALL_KEY = "Space";

export function getGestureListenerResetKeys(
  keys: string | string[]
): Set<string> {
  if (Array.isArray(keys)) {
    return new Set([RESET_ALL_KEY, ...keys]);
  }

  return new Set([RESET_ALL_KEY, ...keys]);
}
