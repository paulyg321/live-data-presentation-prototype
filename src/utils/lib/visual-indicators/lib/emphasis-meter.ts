import type { Dimensions } from "@/utils";
import type { Subject, Subscription } from "rxjs";

interface EmphasisMeterConstructor {
  decrementSubject: Subject<any>;
  incrementSubject: Subject<any>;
  context: CanvasRenderingContext2D | null | undefined;
  canvasDimensions: Dimensions;
}

export class EmphasisMeter {
  decrementSubject: Subject<any>;
  decrementSubscription: Subscription | undefined;
  incrementSubject: Subject<any>;
  incrementSubscription: Subscription | undefined;
  context: CanvasRenderingContext2D | null | undefined;
  canvasDimensions: Dimensions;
  private meterHeight = 0;
  private meterWidth = 50;
  private padding = 10;

  constructor({
    decrementSubject,
    incrementSubject,
    context,
    canvasDimensions,
  }: EmphasisMeterConstructor) {
    this.decrementSubject = decrementSubject;
    this.incrementSubject = incrementSubject;
    this.context = context;
    this.canvasDimensions = canvasDimensions;

    // Subscribe to the subjects;
    this.decrementSubscription = this.decrementSubject.subscribe({
      next: (value: any) => this.decrementHandler(value),
    });

    this.incrementSubscription = this.incrementSubject.subscribe({
      next: (value: any) => this.incrementHandler(value),
    });
  }

  incrementHandler(value: any) {
    if (this.meterHeight < 150) {
      this.meterHeight = value;
      this.draw();
    }
  }

  decrementHandler(value: any) {
    if (this.meterHeight > 0) {
      this.meterHeight = value;
      this.draw();
    }
  }

  draw() {
    if (this.context) {
      this.context.clearRect(
        0,
        0,
        this.canvasDimensions.width,
        this.canvasDimensions.height
      );

      if (this.meterHeight <= 50) {
        this.context.fillStyle = "#00cf07";
      } else if (this.meterHeight > 50 && this.meterHeight <= 100) {
        this.context.fillStyle = "#d1b902";
      } else {
        this.context.fillStyle = "#c40e0e";
      }

      this.context.fillRect(
        this.canvasDimensions.width - this.meterWidth - this.padding,
        150 + this.padding,
        this.meterWidth,
        -this.meterHeight
      );
    }
  }

  unsubscribe({
    from = { increment: true, decrement: true },
  }: {
    from?: { increment?: boolean; decrement?: boolean };
  }) {
    if (from.increment) {
      this.incrementSubscription?.unsubscribe();
    }

    if (from.decrement) {
      this.decrementSubscription?.unsubscribe();
    }
  }
}
