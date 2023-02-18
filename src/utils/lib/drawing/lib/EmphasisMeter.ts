import { clearArea, drawRect, type Dimensions } from "@/utils";

interface EmphasisMeterConstructor {
  context: CanvasRenderingContext2D | null | undefined;
  canvasDimensions: Dimensions;
}

export class EmphasisMeter {
  context: CanvasRenderingContext2D | null | undefined;
  canvasDimensions: Dimensions;
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

  private draw() {
    if (this.context) {
      clearArea({
        context: this.context,
        dimensions: this.canvasDimensions,
        coordinates: {
          x: 0,
          y: 0,
        },
      });

      let fillStyle = "#c40e0e";
      if (this.dimensions.height <= 50) {
        fillStyle = "#00cf07";
      } else if (this.dimensions.height > 50 && this.dimensions.height <= 100) {
        fillStyle = "#d1b902";
      }

      const padding = this.dimensions.margin?.left ?? 10;
      const coordinates = {
        x: this.canvasDimensions.width - this.dimensions.width - padding,
        y: 150 + padding,
      };

      drawRect({
        context: this.context,
        coordinates,
        dimensions: {
          ...this.dimensions,
          height: -this.dimensions.height,
        },
        fillStyle,
        fill: true,
        stroke: false,
      });
    }
  }

  valueHandler(value: any) {
    this.setDimensions({
      height: value,
    });
    this.draw();
  }
}
