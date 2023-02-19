import type { Dimensions } from "@/utils";
import { reactive } from "vue";
import { CameraSettings } from "./camera-settings";

export const initialCanvasWidth = 640;

export const CanvasSettings = reactive<{
  dimensions: Dimensions;
  setCanvasDimensions: (width: number) => void;
  canvas: { [key: string]: HTMLCanvasElement | null };
  canvasCtx: { [key: string]: CanvasRenderingContext2D | null | undefined };
  setCanvas: (
    canvas: HTMLCanvasElement | null,
    key: string,
    allowMirror?: boolean
  ) => void;
  setCanvasCtx: (key: string) => void;
}>({
  dimensions: {
    width: initialCanvasWidth,
    height: initialCanvasWidth * (3 / 4),
  },
  setCanvasDimensions(width: number) {
    this.dimensions = {
      width,
      height: width * (3 / 4),
    };
  },
  canvas: {},
  setCanvas(canvas: HTMLCanvasElement | null, key: string, allowMirror = true) {
    this.canvas[key] = canvas;
    this.setCanvasCtx(key);
    if (CameraSettings.mirror === true && allowMirror) {
      this.canvasCtx[key]?.save();
      this.canvasCtx[key]?.scale(-1, 1);
      this.canvasCtx[key]?.translate(-this.dimensions.width, 0);
    }
  },
  canvasCtx: {},
  setCanvasCtx(key: string) {
    this.canvasCtx[key] = this.canvas[key]?.getContext("2d");
  },
});

export async function renderVideoOnCanvas() {
  if (CanvasSettings.canvas["video"] && CameraSettings.video) {
    CanvasSettings.canvasCtx["video"]?.clearRect(
      0,
      0,
      CanvasSettings.dimensions.width,
      CanvasSettings.dimensions.height
    );
    CanvasSettings.canvasCtx["video"]?.drawImage(
      CameraSettings.video,
      0,
      0,
      CanvasSettings.dimensions.width,
      CanvasSettings.dimensions.height
    );
  }
}
