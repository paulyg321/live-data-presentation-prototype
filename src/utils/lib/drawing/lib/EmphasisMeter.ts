import {
  DrawingUtils,
  EmphasisGestureListener,
  type Dimensions,
} from "@/utils";

interface EmphasisMeterConstructor {
  context?: CanvasRenderingContext2D;
  canvasDimensions: Dimensions;
}

export class EmphasisMeter {
  context: CanvasRenderingContext2D | null | undefined;
  canvasDimensions: Dimensions;
  drawingUtils?: DrawingUtils;
  private dimensions: Dimensions = {
    width: 50,
    height: 0,
    margin: {
      left: 10,
      top: 10,
      right: 10,
      bottom: 10,
    },
  };

  constructor({ context, canvasDimensions }: EmphasisMeterConstructor) {
    this.context = context;
    this.canvasDimensions = canvasDimensions;
    if (context) {
      this.drawingUtils = new DrawingUtils(context);
    }
  }

  private setDimensions(newDimensions: Partial<Dimensions>) {
    const { width, height, margin } = newDimensions;
    if (width) {
      this.dimensions.width = width;
    }
    if (height) {
      this.dimensions.height = height;
    }
    if (margin) {
      this.dimensions.margin = margin;
    }
  }

  protected clearCanvas() {
    if (this.context) {
      this.drawingUtils?.clearArea({
        coordinates: { x: 0, y: 0 },
        dimensions: this.canvasDimensions,
      });
    }
  }

  private draw() {
    if (this.context) {
      this.drawingUtils?.clearArea({
        dimensions: this.canvasDimensions,
        coordinates: {
          x: 0,
          y: 0,
        },
      });

      const fillStyle = EmphasisGestureListener.getConfigValuesBasedOnRange(
        this.dimensions.height
      ).color;
      const padding = this.dimensions.margin?.left ?? 10;
      const coordinates = {
        x: this.canvasDimensions.width - this.dimensions.width - padding,
        y: EmphasisGestureListener.MAX_EMPHASIS + padding,
      };

      this.drawingUtils?.drawRect({
        context: this.context,
        coordinates,
        dimensions: {
          ...this.dimensions,
          height: -this.dimensions.height,
        },
        fillStyle,
        fill: true,
      });
    }
  }

  updateState({
    context,
    canvasDimensions,
  }: Partial<EmphasisMeterConstructor>) {
    if (context) {
      this.context = context;
      this.drawingUtils = new DrawingUtils(context);
    }
    if (canvasDimensions) {
      this.canvasDimensions = canvasDimensions;
    }
  }

  resetState() {
    this.setDimensions({
      height: 0,
    });
    this.clearCanvas();
  }

  valueHandler(value: number) {
    this.setDimensions({
      height: value,
    });
    if (value === 0) {
      this.clearCanvas();
    } else {
      this.draw();
    }
  }
}
