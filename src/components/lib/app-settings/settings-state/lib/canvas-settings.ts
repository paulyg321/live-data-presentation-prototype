import { reactive } from "vue";
import { CameraSettings } from "./camera-settings";

export const initialCanvasWidth = 640;

export const CanvasSettings = reactive<{
  canvasWidth: number;
  setCanvasWidth: (width: number) => void;
  canvasHeight: number;
  canvas: { [key: string]: HTMLCanvasElement | null };
  canvasCtx: { [key: string]: CanvasRenderingContext2D | null | undefined };
  setCanvas: (canvas: HTMLCanvasElement | null, key: string) => void;
  setCanvasCtx: (key: string) => void;
  initializeCanvas: (key: string, allowMirror: boolean) => void;
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
  setCanvasCtx(key: string) {
    this.canvasCtx[key] = this.canvas[key]?.getContext("2d");
  },
  initializeCanvas(key: string, allowMirror = true) {
    if (this.canvas[key]) {
      this.setCanvasCtx(key);

      if (CameraSettings.mirror === true && allowMirror) {
        this.canvasCtx[key]?.save();
        this.canvasCtx[key]?.scale(-1, 1);
        this.canvasCtx[key]?.translate(-this.canvasWidth, 0);
      }
    }
  },
});

export async function renderVideoOnCanvas() {
  if (CanvasSettings.canvas["video"] && CameraSettings.video) {
    CanvasSettings.canvasCtx["video"]?.clearRect(
      0,
      0,
      CanvasSettings.canvasWidth,
      CanvasSettings.canvasHeight
    );
    CanvasSettings.canvasCtx["video"]?.drawImage(
      CameraSettings.video,
      0,
      0,
      CanvasSettings.canvasWidth,
      CanvasSettings.canvasHeight
    );
  }
  requestAnimationFrame(() => renderVideoOnCanvas());
}
