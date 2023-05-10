import type { Coordinate2D, Dimensions, PartialCoordinate2D } from "@/utils";
import { reactive } from "vue";
import { initialCanvasWidth } from "./canvas-settings";

const initialPlaybackComponentWidth = 200;

export const PlaybackComponentSettings = reactive<{
  dimensions: Dimensions;
  changeDimensions: (width: number) => void;
  position: Coordinate2D;
  changePosition: (coord: PartialCoordinate2D) => void;
}>({
  dimensions: {
    width: initialPlaybackComponentWidth,
    height: initialPlaybackComponentWidth,
  },
  changeDimensions(width: number) {
    this.dimensions = {
      width: width,
      height: width,
    };
  },
  position: {
    x: initialCanvasWidth - initialPlaybackComponentWidth,
    y: initialCanvasWidth * (3 / 4) - initialPlaybackComponentWidth - 50,
  },
  changePosition(coords: PartialCoordinate2D) {
    this.position = {
      ...this.position,
      ...(coords.x ? { x: coords.x } : {}),
      ...(coords.y ? { x: coords.y } : {}),
    };
  },
});
