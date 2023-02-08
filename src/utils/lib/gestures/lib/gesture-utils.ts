import type { PartialCoordinate2D } from "@/utils";

export type FingerPositionsData = {
  [key: number]: PartialCoordinate2D;
};

export enum HANDS {
  LEFT = "left",
  RIGHT = "right",
}