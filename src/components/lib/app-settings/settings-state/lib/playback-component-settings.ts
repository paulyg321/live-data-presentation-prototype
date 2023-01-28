import { reactive } from "vue";
import { initialCanvasWidth } from "./canvas-settings";

const initialPlaybackComponentWidth = 250;

export const PlaybackComponentSettings = reactive<{
  xPosition: number;
  yPosition: number;
  centerPoint: { x: number; y: number };
  changeXPosition: (value: number) => void;
  changeYPosition: (value: number) => void;
  setCenterPoint: (position: { x: number; y: number }) => void;
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
  setCenterPoint(position: { x: number; y: number }) {
    this.centerPoint = position;
  },
  width: initialPlaybackComponentWidth,
  height: initialPlaybackComponentWidth,
  setWidth(value: number) {
    this.width = value;
    this.height = value;
  },
});
