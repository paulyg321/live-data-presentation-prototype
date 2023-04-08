import type { Dimensions } from "@/utils";
import { reactive } from "vue";
import { CameraSettings } from "./camera-settings";

export const initialCanvasWidth = 640;
export const initialCanvasDimensions = {
  width: initialCanvasWidth,
  height: initialCanvasWidth * (3 / 4),
};

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
  dimensions: initialCanvasDimensions,
  setCanvasDimensions(width: number) {
    this.dimensions = {
      width,
      height: width * (3 / 4),
    };
  },
  canvas: {},
  setCanvas(canvas: HTMLCanvasElement | null, key: string) {
    this.canvas[key] = canvas;
    this.setCanvasCtx(key);
    const context = this.canvasCtx[key];

    if (!context) return;

    if (key === "video") {
      context.filter = "grayscale(1)";
      context.scale(-1, 1);
      context.translate(-this.dimensions.width, 0);
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
