import type { Coordinate2D } from "@/utils";
import { reactive } from "vue";
import { initialCanvasWidth } from "./canvas-settings";

const initialPlaybackComponentWidth = 250;

export const PlaybackComponentSettings = reactive<{
  xPosition: number;
  yPosition: number;
  centerPoint: Coordinate2D;
  changeXPosition: (value: number) => void;
  changeYPosition: (value: number) => void;
  setCenterPoint: (position: Coordinate2D) => void;
  width: number;
  height: number;
  setWidth: (value: number) => void;
}>({
  xPosition: initialCanvasWidth - initialPlaybackComponentWidth,
  yPosition: initialCanvasWidth * (3 / 4) - initialPlaybackComponentWidth,
  centerPoint: {
    x: initialCanvasWidth - initialPlaybackComponentWidth / 2,
    y: initialCanvasWidth * (3 / 4) - initialPlaybackComponentWidth / 2,
  },
  changeXPosition(value: number) {
    this.xPosition = value;
  },
  changeYPosition(value: number) {
    this.yPosition = value;
  },
  setCenterPoint(position: Coordinate2D) {
    this.centerPoint = position;
  },
  width: initialPlaybackComponentWidth,
  height: initialPlaybackComponentWidth,
  setWidth(value: number) {
    this.width = value;
    this.height = value;
  },
});
