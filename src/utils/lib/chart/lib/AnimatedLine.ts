import type { Coordinate2D, Dimensions } from "../types";
import * as d3 from "d3";
import {
  clearArea,
  drawCircle,
  drawRect,
  drawText,
  ForeshadowingAreaSubjectType,
  modifyContextStyleAndDraw,
  type ForeshadowingAreaData,
} from "@/utils";

export enum DrawingMode {
  DRAW_ALL = "Draw All",
  UNDULATE_ANIMATION = "Tenderness - Undulate", // level 1
  BASELINE_ANIMATION = "Joy - Baseline", // level 2
  DROP_ANIMATION = "Excitement - Drop", // level 3
}

export enum LineShape {
  CURVED = "curved",
  SHARP = "sharp",
}

export enum LineEffect {
  DEFAULT = "default",
  FOCUSED = "focused",
  BACKGROUND = "background",
}

export interface AnimatedLineConstructorArgs {
  states: Coordinate2D[][];
  xScale: any;
  yScale: any;
  chartDimensions: Dimensions;
  canvasDimensions: Dimensions;
  duration: number;
  color?: string;
  lineWidth?: number;
  opacity?: number;
}

export class AnimatedLine {
  states: Coordinate2D[][];
  yScale: any;
  xScale: any;
  currentState: number;
  canvasDimensions: Dimensions;
  chartDimensions: Dimensions;
  duration = 2000;
  mainColor = "steelblue";
  color = "steelblue";
  lineWidth = 2;
  opacity = 0.7;

  context: CanvasRenderingContext2D | undefined;
  foreshadowingArea: ForeshadowingAreaData | undefined;

  constructor({
    states,
    xScale,
    yScale,
    chartDimensions,
    canvasDimensions,
    duration,
    color,
    lineWidth,
    opacity,
  }: AnimatedLineConstructorArgs) {
    this.chartDimensions = chartDimensions;
    this.xScale = xScale;
    this.yScale = yScale;
    this.states = states;
    this.currentState = 0;
    this.canvasDimensions = canvasDimensions;
    this.duration = duration;
    if (color) {
      this.mainColor = color;
    }
    this.setLineAppearance({
      color,
      lineWidth,
      opacity,
    });
  }

  private configureLineContextSettings() {
    if (this.context) {
      this.context.lineWidth = this.lineWidth;
      this.context.globalAlpha = this.opacity;
      this.context.strokeStyle = this.color;
    }
  }

  setContext(ctx: CanvasRenderingContext2D) {
    this.context = ctx;
  }

  setForeshadowingArea(
    type: ForeshadowingAreaSubjectType,
    foreshadowingArea: ForeshadowingAreaData | undefined
  ) {
    if (type === ForeshadowingAreaSubjectType.CLEAR) {
      this.foreshadowingArea = undefined;
    } else if (
      type === ForeshadowingAreaSubjectType.CIRCLE ||
      type === ForeshadowingAreaSubjectType.RECTANGLE
    ) {
      this.foreshadowingArea = foreshadowingArea;
    }
  }

  updateState({
    states,
    xScale,
    yScale,
    chartDimensions,
    canvasDimensions,
    duration,
    color,
    lineWidth,
    opacity,
  }: Partial<AnimatedLineConstructorArgs>) {
    if (states) {
      this.states = states;
    }
    if (xScale) {
      this.xScale = xScale;
    }
    if (yScale) {
      this.yScale = yScale;
    }
    if (chartDimensions) {
      this.chartDimensions = chartDimensions;
    }
    if (canvasDimensions) {
      this.canvasDimensions = canvasDimensions;
    }
    if (duration) {
      this.duration = duration;
    }
    this.setLineAppearance({
      color,
      lineWidth,
      opacity,
    });
  }

  setLineAppearance({
    lineWidth,
    opacity,
    color,
  }: {
    lineWidth?: number;
    opacity?: number;
    color?: string;
  }) {
    if (lineWidth) {
      this.lineWidth = lineWidth;
    }
    if (opacity) {
      this.opacity = opacity;
    }
    if (color) {
      this.color = color;
    }
  }

  convertLineEffectForContext(lineEffect: LineEffect) {
    if (lineEffect === LineEffect.FOCUSED) {
      return {
        lineWidth: 3,
        opacity: 0.9,
        color: this.mainColor,
      };
    }

    if (lineEffect === LineEffect.BACKGROUND) {
      return {
        lineWidth: 1,
        opacity: 0.5,
        color: "grey",
      };
    }

    return {
      lineWidth: 2,
      opacity: 0.7,
      color: this.mainColor,
    };
  }

  setLineAppearanceFromEffect(lineEffect: LineEffect) {
    this.setLineAppearance(this.convertLineEffectForContext(lineEffect));
  }

  clearCanvas() {
    if (this.context) {
      this.context.clearRect(
        0,
        0,
        this.canvasDimensions.width,
        this.canvasDimensions.height
      );
    }
  }

  lineLength({
    coordinates,
    shape,
  }: {
    coordinates: Coordinate2D[];
    shape?: LineShape;
  }) {
    function dist(x1: number, y1: number, x2: number, y2: number) {
      return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    }

    let totalLength = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
      const [x1, y1] = [
        this.xScale(coordinates[i].x),
        this.yScale(coordinates[i].y),
      ];
      const [x2, y2] = [
        this.xScale(coordinates[i + 1].x),
        this.yScale(coordinates[i + 1].y),
      ];
      if (shape === LineShape.CURVED) {
        totalLength += dist(x1, y1, x2, y2) * 1.2;
      } else {
        totalLength += dist(x1, y1, x2, y2);
      }
    }

    return totalLength;
  }

  drawLabels(points: Coordinate2D[], isSelected = false) {
    const LARGE_FONT = 20;
    const DEFAULT_FONT = 12;

    const DEFAULT_RADIUS = 5;
    const LARGE_RADIUS = 10;
    // draw points
    points.forEach((point) => {
      if (this.context) {
        if (isSelected) {
          drawText({
            context: this.context,
            coordinates: {
              x: this.xScale(point.x) + 15,
              y: this.yScale(point.y) + 10,
            },
            text: `$${Math.round(point.y)}`,
            fillStyle: "black",
            strokeStyle: this.color,
            fontSize: isSelected ? LARGE_FONT : DEFAULT_FONT,
            opacity: 1,
          });
        }
        drawCircle({
          context: this.context,
          coordinates: point,
          radius: isSelected ? LARGE_RADIUS : DEFAULT_RADIUS,
          xScale: this.xScale,
          yScale: this.yScale,
          stroke: isSelected,
          fill: true,
          strokeStyle: this.color,
          fillStyle: "white",
        });
      }
    });
  }

  drawForeshadow(drawFn: () => void) {
    if (this.context && this.foreshadowingArea) {
      const settings = {
        context: this.context,
        lineWidth: 5,
      };
      this.context.save();
      if (this.foreshadowingArea.dimensions) {
        this.clearAndClipRect({
          dimensions: this.foreshadowingArea.dimensions,
          coordinates: this.foreshadowingArea.position,
        });
      } else if (this.foreshadowingArea.radius) {
        this.clearAndClipCircle({
          radius: this.foreshadowingArea.radius,
          coordinates: this.foreshadowingArea.position,
        });
      }

      modifyContextStyleAndDraw(settings, drawFn);
      this.context.restore();
    }
  }

  // MOVE TO DRAWING UTIL
  private clearAndClipRect({
    dimensions,
    coordinates,
  }: {
    dimensions: Dimensions;
    coordinates: Coordinate2D;
  }) {
    if (this.context) {
      drawRect({
        context: this.context,
        coordinates,
        dimensions,
        clip: true,
      });
      this.clearCanvas();
    }
  }

  private clearAndClipCircle({
    radius,
    coordinates,
  }: {
    radius: number;
    coordinates: Coordinate2D;
  }) {
    if (this.context) {
      drawCircle({
        context: this.context,
        coordinates,
        radius,
        clip: true,
      });
      this.clearCanvas();
    }
  }

  draw(
    coordinates: Coordinate2D[],
    mode: DrawingMode,
    shape: LineShape,
    beforeClear?: () => void,
    endBound = 1,
    startBound = 0
  ) {
    this.configureLineContextSettings();
    // draw line
    const totalLength = this.lineLength({
      coordinates,
      shape,
    });

    let line = d3
      .line<Coordinate2D>()
      .x((d: Coordinate2D) => this.xScale(d.x))
      .y((d: Coordinate2D) => this.yScale(d.y));

    if (shape === LineShape.CURVED) {
      // https://github.com/d3/d3-shape/blob/main/README.md#curves
      line = line.curve(d3.curveBumpX);
    }

    if (this.context) {
      const drawLine = line.context(this.context);
      const drawFn = () => {
        this.context?.beginPath();
        drawLine(coordinates);
        this.context?.stroke();
      };

      if (mode === DrawingMode.BASELINE_ANIMATION) {
        const lineTimer = d3.timer((elapsed: number) => {
          this.clearCanvas();
          if (beforeClear) {
            beforeClear();
          }
          let boundedTimeStep;

          if (startBound < endBound) {
            boundedTimeStep = Math.min(
              elapsed / this.duration + startBound,
              endBound
            );
          } else {
            boundedTimeStep = Math.max(
              startBound - elapsed / this.duration,
              endBound
            );
          }

          const maxIndex = Math.round(boundedTimeStep * coordinates.length);

          if (this.context) {
            this.context.setLineDash([totalLength]);
            this.context.lineDashOffset = d3.interpolate(
              totalLength,
              0
            )(boundedTimeStep);
            drawFn();
            // Draw points
            this.drawLabels(coordinates.slice(0, maxIndex));
            this.drawForeshadow(() => {
              drawFn();
              this.drawLabels(coordinates.slice(0, maxIndex), true);
            });
          }

          if (boundedTimeStep === endBound) {
            lineTimer.stop();
          }
        });
      } else if (mode === DrawingMode.DRAW_ALL) {
        const maxIndex = Math.round(endBound * coordinates.length);
        this.clearCanvas();
        if (beforeClear) {
          beforeClear();
        }
        this.context.setLineDash([totalLength]);
        this.context.lineDashOffset = d3.interpolate(totalLength, 0)(endBound);
        drawFn();
        this.drawLabels(coordinates.slice(0, maxIndex));
        this.drawForeshadow(() => {
          drawFn();
          this.drawLabels(coordinates.slice(0, maxIndex), true);
        });
      }
    }
  }

  drawCurrentState({
    bounds,
    drawingMode = DrawingMode.DRAW_ALL,
  }: {
    bounds?: { start?: number; end: number };
    drawingMode?: DrawingMode;
  }) {
    this.draw(
      this.states[this.currentState],
      drawingMode,
      LineShape.CURVED,
      () => void 0,
      bounds?.end,
      bounds?.start
    );
  }

  drawTransitionBetweenStates({
    boundedTimeSteps,
    transitionFunction,
    currentState,
    nextState,
  }: {
    boundedTimeSteps: number[];
    transitionFunction?: (time: number) => number;
    currentState: Coordinate2D[];
    nextState: Coordinate2D[];
  }) {
    if (boundedTimeSteps.length === 1) {
      const [boundedTimeStep] = boundedTimeSteps;
      let transitionStep: number;

      if (transitionFunction) {
        transitionStep = transitionFunction(boundedTimeStep);
      } else {
        transitionStep = boundedTimeStep;
      }

      const interPolatedState = currentState.map(
        (coordinate: Coordinate2D, index: number) => {
          // We don't use scale here because the draw() & drawSequential() methods use the scales
          const { x, y } = {
            x: coordinate.x,
            y: coordinate.y,
          };

          const { xNext, yNext } = {
            xNext: nextState[index].x,
            yNext: nextState[index].y,
          };

          return {
            x: d3.interpolate(x, xNext)(transitionStep),
            y: d3.interpolate(y, yNext)(transitionStep),
          };
        }
      );

      this.draw(
        interPolatedState,
        DrawingMode.DRAW_ALL,
        LineShape.CURVED,
        () => {
          if (transitionStep === 1) {
            this.drawLabels(nextState);
          }
        }
      );
    } else {
      const interPolatedState = currentState.map(
        (coordinate: Coordinate2D, index: number) => {
          const boundedTimeStep = boundedTimeSteps[index];
          let transitionStep: number;

          if (transitionFunction) {
            transitionStep = transitionFunction(boundedTimeStep);
          } else {
            transitionStep = boundedTimeStep;
          }
          // We don't use scale here because the draw() & drawSequential() methods use the scales
          const { x, y } = {
            x: coordinate.x,
            y: coordinate.y,
          };

          const { xNext, yNext } = {
            xNext: nextState[index].x,
            yNext: nextState[index].y,
          };

          return {
            x: d3.interpolate(x, xNext)(transitionStep),
            y: d3.interpolate(y, yNext)(transitionStep),
          };
        }
      );

      this.draw(interPolatedState, DrawingMode.DRAW_ALL, LineShape.CURVED, () =>
        this.drawLabels(
          boundedTimeSteps
            .filter((step) => step === 1)
            .map((_, index) => nextState[index])
        )
      );
    }
  }

  animateToNextState({
    playRemainingStates = false,
    transitionFunction,
    mode,
  }: {
    playRemainingStates: boolean;
    transitionFunction?: (time: number) => number;
    mode: DrawingMode;
  }) {
    if (mode === DrawingMode.DROP_ANIMATION) {
      const nextIndex = this.currentState + 1;

      const nextStateData = this.states[nextIndex];

      if (!nextStateData) return;
      const timer = d3.timer((elapsed: number) => {
        const boundedTimeStep = Math.min(elapsed / this.duration, 1);
        this.drawTransitionBetweenStates({
          boundedTimeSteps: [boundedTimeStep],
          transitionFunction,
          currentState: nextStateData.map((coord: Coordinate2D) => ({
            ...coord,
            y: this.chartDimensions.height,
          })),
          nextState: nextStateData,
        });
        if (boundedTimeStep === 1) {
          const lastStateIndex = this.states.length - 1;
          const moreStatesExist = this.currentState < lastStateIndex;
          this.currentState++;
          if (playRemainingStates && moreStatesExist) {
            this.animateToNextState({
              playRemainingStates,
              transitionFunction,
              mode,
            });
          }
          timer.stop();
        }
      });
    }

    if (mode === DrawingMode.DRAW_ALL) {
      const currentIndex = this.currentState;
      const nextIndex = this.currentState + 1;

      const currentStateData = this.states[currentIndex];
      const nextStateData = this.states[nextIndex];

      if (!nextStateData) return;

      const timer = d3.timer((elapsed: number) => {
        const boundedTimeStep = Math.min(elapsed / this.duration, 1);
        this.drawTransitionBetweenStates({
          boundedTimeSteps: [boundedTimeStep],
          transitionFunction,
          currentState: currentStateData,
          nextState: nextStateData,
        });
        if (boundedTimeStep === 1) {
          const lastStateIndex = this.states.length - 1;
          const moreStatesExist = this.currentState < lastStateIndex;
          this.currentState++;
          if (playRemainingStates && moreStatesExist) {
            this.animateToNextState({
              playRemainingStates,
              transitionFunction,
              mode,
            });
          }
          timer.stop();
        }
      });
    }

    if (mode === DrawingMode.UNDULATE_ANIMATION) {
      const currentIndex = this.currentState;
      const nextIndex = this.currentState + 1;

      const currentStateData = this.states[currentIndex];
      const nextStateData = this.states[nextIndex];

      if (!nextStateData) return;
      const numberOfPoints = nextStateData.length;

      const timer = d3.timer((elapsed: number) => {
        const timeStep = elapsed / this.duration;
        const boundedTimeSteps = Array.from(Array(numberOfPoints)).map(
          (_: any, index: number) => {
            return Math.min(timeStep * (timeStep / index), 1);
          }
        );
        const [lastPointTimeStep] = boundedTimeSteps.slice(-1);
        this.drawTransitionBetweenStates({
          boundedTimeSteps,
          transitionFunction,
          currentState: currentStateData,
          nextState: nextStateData,
        });
        if (lastPointTimeStep === 1) {
          const lastStateIndex = this.states.length - 1;
          const moreStatesExist = this.currentState < lastStateIndex;
          this.currentState++;
          if (playRemainingStates && moreStatesExist) {
            this.animateToNextState({
              playRemainingStates,
              transitionFunction,
              mode,
            });
          }
          timer.stop();
        }
      });
    }

    if (mode === DrawingMode.BASELINE_ANIMATION) {
      const nextIndex = this.currentState + 1;

      const nextStateData = this.states[nextIndex];

      if (!nextStateData) return;

      this.draw(
        nextStateData,
        DrawingMode.BASELINE_ANIMATION,
        LineShape.CURVED
      );
      this.currentState++;

      const seqTimer = d3.timer((elapsed: number) => {
        const boundedTimeStep = Math.min(elapsed / this.duration, 1);
        if (boundedTimeStep === 1) {
          const lastStateIndex = this.states.length - 1;
          const moreStatesExist = this.currentState < lastStateIndex;
          if (playRemainingStates && moreStatesExist) {
            this.animateToNextState({
              playRemainingStates,
              transitionFunction,
              mode,
            });
          }
          seqTimer.stop();
        }
      });
    }
  }

  animateToPreviousState({
    playRemainingStates = false,
    transitionFunction,
    mode,
  }: {
    playRemainingStates: boolean;
    transitionFunction?: (time: number) => number;
    mode: DrawingMode;
  }) {
    if (mode === DrawingMode.DROP_ANIMATION) {
      const prevIndex = this.currentState - 1;

      const prevStateData = this.states[prevIndex];

      if (!prevStateData) return;

      const timer = d3.timer((elapsed: number) => {
        const boundedTimeStep = Math.min(elapsed / this.duration, 1);
        this.drawTransitionBetweenStates({
          boundedTimeSteps: [boundedTimeStep],
          transitionFunction,
          // TODO: Make the current state and next state differ by Y position
          currentState: prevStateData.map((coord: Coordinate2D) => ({
            ...coord,
            y: this.chartDimensions.height,
          })),
          nextState: prevStateData,
        });
        if (boundedTimeStep === 1) {
          const moreStatesExist = this.currentState > 0;
          this.currentState--;
          if (playRemainingStates && moreStatesExist) {
            this.animateToPreviousState({
              playRemainingStates,
              transitionFunction,
              mode,
            });
          }
          timer.stop();
        }
      });
    }

    if (mode === DrawingMode.DRAW_ALL) {
      const currentIndex = this.currentState;
      const prevIndex = this.currentState - 1;

      if (prevIndex < 0) return;

      const currentState = this.states[currentIndex];
      const prevStateData = this.states[prevIndex];

      if (!prevStateData) return;

      const timer = d3.timer((elapsed: number) => {
        const boundedTimeStep = Math.min(elapsed / this.duration, 1);
        this.drawTransitionBetweenStates({
          boundedTimeSteps: [boundedTimeStep],
          transitionFunction,
          currentState,
          nextState: prevStateData,
        });
        if (boundedTimeStep === 1) {
          const moreStatesExist = this.currentState > 0;
          this.currentState--;
          if (playRemainingStates && moreStatesExist) {
            this.animateToPreviousState({
              playRemainingStates,
              transitionFunction,
              mode,
            });
          }
          timer.stop();
        }
      });
    }

    if (mode === DrawingMode.BASELINE_ANIMATION) {
      const prevIndex = this.currentState - 1;

      const prevStateData = this.states[prevIndex];

      if (!prevStateData) return;

      const sequentialDelay = this.duration;
      this.draw(
        prevStateData,
        DrawingMode.BASELINE_ANIMATION,
        LineShape.CURVED
      );
      this.currentState--;
      const seqTimer = d3.timer((elapsed: number) => {
        const boundedTimeStep = Math.min(elapsed / sequentialDelay, 1);
        if (boundedTimeStep === 1) {
          const moreStatesExist = this.currentState > 0;
          this.currentState--;
          if (playRemainingStates && moreStatesExist) {
            this.animateToPreviousState({
              playRemainingStates,
              transitionFunction,
              mode,
            });
          }
          seqTimer.stop();
        }
      });
    }

    if (mode === DrawingMode.UNDULATE_ANIMATION) {
      const currentIndex = this.currentState;
      const prevIndex = this.currentState - 1;

      if (prevIndex < 0) return;

      const currentState = this.states[currentIndex];
      const prevStateData = this.states[prevIndex];

      if (!prevStateData) return;
      const numberOfPoints = prevStateData.length;

      const timer = d3.timer((elapsed: number) => {
        const timeStep = elapsed / this.duration;
        const boundedTimeSteps = Array.from(Array(numberOfPoints)).map(
          (_: any, index: number) => {
            return Math.min(timeStep * (timeStep / index), 1);
          }
        );
        const [lastPointTimeStep] = boundedTimeSteps.slice(-1);
        this.drawTransitionBetweenStates({
          boundedTimeSteps,
          transitionFunction,
          currentState: currentState,
          nextState: prevStateData,
        });
        if (lastPointTimeStep === 1) {
          const moreStatesExist = this.currentState > 0;
          this.currentState--;
          if (playRemainingStates && moreStatesExist) {
            this.animateToNextState({
              playRemainingStates,
              transitionFunction,
              mode,
            });
          }
          timer.stop();
        }
      });
    }
  }
}
