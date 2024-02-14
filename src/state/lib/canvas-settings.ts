import { DrawingUtils, snackbarSubject, type Dimensions } from "@/utils";
import { reactive } from "vue";
import { CameraSettings } from "./camera-settings";

export const initialCanvasWidth = 720;
export const initialCanvasDimensions = {
  width: initialCanvasWidth,
  height: initialCanvasWidth * (9 / 16),
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
  generalDrawingUtils: DrawingUtils | undefined;
  upsertGeneralDrawingUtils: (
    key: string,
    context: CanvasRenderingContext2D
  ) => void;
  addContextToDrawingUtils: (key: string) => void;
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

    if (key.includes("video")) {
      context.filter = "grayscale(1)";
      context.scale(-1, 1);
      context.translate(-this.dimensions.width, 0);
    }
  },
  canvasCtx: {},
  setCanvasCtx(key: string) {
    this.canvasCtx[key] = this.canvas[key]?.getContext("2d");
  },
  generalDrawingUtils: undefined,
  upsertGeneralDrawingUtils(key: string, context: CanvasRenderingContext2D) {
    if (this.generalDrawingUtils) {
      const hasExistingContext = this.generalDrawingUtils.getContexts([key]);
      if (hasExistingContext.length === 0) {
        this.generalDrawingUtils.addContext({
          key,
          context,
        });
      }
    } else {
      this.generalDrawingUtils = new DrawingUtils([
        {
          key,
          context,
        },
      ]);
    }
  },
  addContextToDrawingUtils(key: string) {
    const context = this.canvasCtx[key];
    if (context) {
      this.upsertGeneralDrawingUtils(key, context);
      snackbarSubject.next({
        open: true,
        text: `Successfully added ${key} context`,
        variant: "success",
      });
    } else {
      snackbarSubject.next({
        open: true,
        text: `Failed to add ${key} context`,
        variant: "error",
      });
    }
  },
});

export async function renderVideoOnCanvas() {
  Object.entries(CanvasSettings.canvasCtx).forEach(
    ([key, value]: [string, CanvasRenderingContext2D | null | undefined]) => {
      if (key.includes("video") && value && CameraSettings.video) {
        value.clearRect(
          0,
          0,
          CanvasSettings.dimensions.width,
          CanvasSettings.dimensions.height
        );
        value.drawImage(
          CameraSettings.video,
          0,
          0,
          CanvasSettings.dimensions.width,
          CanvasSettings.dimensions.height
        );
      }
    }
  );
}
