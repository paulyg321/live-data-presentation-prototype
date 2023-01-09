import { reactive } from "vue";
import { CameraSettings } from "./camera-settings";

const initialCanvasWidth = 640;

export const CanvasSettings = reactive<{
  canvasWidth: number;
  setCanvasWidth: (width: number) => void;
  canvasHeight: number;
  canvas: { [key: string]: HTMLCanvasElement | null };
  canvasCtx: { [key: string]: CanvasRenderingContext2D | null | undefined };
  setCanvas: (canvas: HTMLCanvasElement | null, key: string) => void;
  setCanvasCtx: (
    canvasCtx: CanvasRenderingContext2D | null | undefined,
    key: string
  ) => void;
  initializeCanvas: (key: string) => void;
}>({
  canvasWidth: initialCanvasWidth,
  setCanvasWidth(width: number) {
    this.canvasWidth = width;
    this.canvasHeight = width * (3 / 4);
  },
  canvasHeight: initialCanvasWidth * (3 / 4),
  canvas: {},
  setCanvas(canvas: HTMLCanvasElement | null, key: string) {
    this.canvas[key] = canvas;
  },
  canvasCtx: {},
  setCanvasCtx(
    canvasCtx: CanvasRenderingContext2D | null | undefined,
    key: string
  ) {
    this.canvasCtx[key] = canvasCtx;
  },
  initializeCanvas(key: string) {
    if (this.canvas[key]) {
      this.setCanvasCtx(this.canvas[key]?.getContext("2d"), key);

      // if (CameraSettings.mirror === true) {
      //   this.canvasCtx[key]?.save();
      //   this.canvasCtx[key]?.scale(-1, 1);
      //   this.canvasCtx[key]?.translate(-this.canvasWidth, 0);
      // }
    }
  },
});
