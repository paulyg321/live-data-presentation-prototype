import type { Coordinate2D, Dimensions, DrawingUtils } from "@/utils";

const HEIGHT = 10;

export class AnimationExtentVisualizer {
  canvasDimensions: Dimensions;
  position: Coordinate2D;
  dimensions: Dimensions;
  drawingUtils: DrawingUtils;
  extent = 0;
  constructor({
    drawingUtils,
    canvasDimensions,
  }: {
    drawingUtils: DrawingUtils;
    canvasDimensions: Dimensions;
  }) {
    this.canvasDimensions = canvasDimensions;
    this.dimensions = {
      width: canvasDimensions.width,
      height: HEIGHT,
    };
    this.position = {
      x: 0,
      y: 0 + canvasDimensions.height - HEIGHT,
    };
    this.drawingUtils = drawingUtils;
  }

  updateState({ extent }: { extent?: number }) {
    if (extent) {
      this.extent = extent;
    }
  }

  getDimensionsBasedOnExtent() {
    return {
      ...this.dimensions,
      width: this.dimensions.width * this.extent,
    };
  }

  getExtent() {
    return this.extent;
  }

  draw() {
    this.drawingUtils.modifyContextStyleAndDraw(
      {
        fillStyle: "red",
        opacity: 0.5,
      },
      (context: CanvasRenderingContext2D) => {
        this.drawingUtils.drawRect({
          context,
          coordinates: this.position,
          dimensions: this.getDimensionsBasedOnExtent(),
          fill: true,
        });
      }
    );
  }
}
