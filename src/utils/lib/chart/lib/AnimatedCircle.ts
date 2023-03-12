import type { Coordinate2D, Dimensions } from "../types";
import * as d3 from "d3";
import {
  axesSubject,
  calculateDistance,
  drawCircle,
  DrawingMode,
  drawLine,
  drawRect,
  drawText,
  Effect,
  ForeshadowingAreaSubjectType,
  modifyContextStyleAndDraw,
  type ForeshadowingAreaData,
  type ModifyContextStyleArgs,
} from "@/utils";

export interface AnimatedCircleConstructorArgs {
  states: Coordinate2D[];
  chartDimensions: Dimensions;
  canvasDimensions: Dimensions;
  duration: number;
  color?: string;
  key: string;
  group?: string;
  lineWidth?: number;
  opacity?: number;
  dataType?: {
    xType: "number" | "date" | undefined;
    yType: "number" | "date" | undefined;
  };
  getScales: () => {
    xScale: (value: any) => number;
    yScale: (value: any) => number;
  };
}

export const AnimatedCircleDrawingModeToEaseFunctionMap = {
  [DrawingMode.DRAW_ALL]: {
    transitionFunction: d3.easeLinear,
    duration: 3000,
  },
  [DrawingMode.UNDULATE_ANIMATION]: {
    transitionFunction: d3.easeLinear,
    duration: 2000,
  },
  [DrawingMode.BASELINE_ANIMATION]: {
    transitionFunction: d3.easeBounce,
    duration: 2000,
  },
  [DrawingMode.DROP_ANIMATION]: {
    transitionFunction: d3.easeBounce,
    duration: 1000,
  },
};

export class AnimatedCircle {
  states: Coordinate2D[];
  dataType:
    | {
        xType: "number" | "date" | undefined;
        yType: "number" | "date" | undefined;
      }
    | undefined;
  yScale: any;
  xScale: any;
  key: string;
  group: string;
  currentState: number;
  canvasDimensions: Dimensions;
  chartDimensions: Dimensions;
  duration = 2000;
  mainColor = "steelblue";
  color = "steelblue";
  lineWidth = 2;
  opacity = 0.7;
  getScales: () => {
    xScale: (value: any) => number;
    yScale: (value: any) => number;
  };

  context: CanvasRenderingContext2D | undefined;

  foreshadowingArea: ForeshadowingAreaData | undefined;
  foreshadowingType: ForeshadowingAreaSubjectType | undefined;

  constructor({
    states,
    chartDimensions,
    canvasDimensions,
    duration,
    color,
    lineWidth,
    opacity,
    dataType,
    getScales,
    key,
    group,
  }: AnimatedCircleConstructorArgs) {
    this.dataType = dataType;
    this.chartDimensions = chartDimensions;
    this.getScales = getScales;
    this.initializeScales();
    this.states = states;
    this.currentState = 0;
    this.canvasDimensions = canvasDimensions;
    this.duration = duration;
    this.key = key;
    if (group) {
      this.group = group;
    } else {
      this.group = key;
    }
    if (color) {
      this.mainColor = color;
    }
    this.setAppearance({
      color,
      lineWidth,
      opacity,
    });
  }

  private getForeshadowingState() {
    if (
      this.foreshadowingType === ForeshadowingAreaSubjectType.CIRCLE ||
      this.foreshadowingType === ForeshadowingAreaSubjectType.RECTANGLE ||
      this.foreshadowingType === ForeshadowingAreaSubjectType.RANGE
    ) {
      const nextState = this.currentState + 1;
      const lastValidState = this.states.length - 1;
      if (nextState <= lastValidState) {
        return nextState;
      }
    }

    return undefined;
  }

  private initializeScales() {
    const { xScale, yScale } = this.getScales();

    this.xScale = xScale;
    this.yScale = yScale;

    axesSubject.next(true);
  }

  private configureContextSettings() {
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
      this.foreshadowingType = undefined;
    } else if (
      type === ForeshadowingAreaSubjectType.CIRCLE ||
      type === ForeshadowingAreaSubjectType.RECTANGLE ||
      type === ForeshadowingAreaSubjectType.RANGE
    ) {
      this.foreshadowingArea = foreshadowingArea;
      this.foreshadowingType = type;
    }
  }

  updateState({
    states,
    chartDimensions,
    canvasDimensions,
    duration,
    color,
    lineWidth,
    opacity,
  }: Partial<AnimatedCircleConstructorArgs>) {
    if (states) {
      this.states = states;
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
    this.setAppearance({
      color,
      lineWidth,
      opacity,
    });
  }

  setAppearance({
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

  convertEffectForContext(lineEffect: Effect) {
    if (lineEffect === Effect.FOCUSED) {
      return {
        lineWidth: 3,
        opacity: 0.9,
        color: this.mainColor,
      };
    }

    if (lineEffect === Effect.BACKGROUND) {
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

  setAppearanceFromEffect(lineEffect: Effect) {
    this.setAppearance(this.convertEffectForContext(lineEffect));
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

  drawMarkers(
    point: Coordinate2D,
    drawLabel = false,
    pointBoundaries?: {
      coordinates: Coordinate2D;
      radius?: number;
      dimensions?: Dimensions;
    },
    isHighlighted = false
  ) {
    let scaledPoint = {
      x: this.xScale(point.x),
      y: this.yScale(point.y),
    };
    const FONT_SIZE = 14;
    const RADIUS = 5;
    const foreshadowingState = this.getForeshadowingState();

    // draw points
    let isWithinBounds = true;
    if (
      pointBoundaries &&
      pointBoundaries.radius &&
      this.foreshadowingType === ForeshadowingAreaSubjectType.CIRCLE
    ) {
      const dist = calculateDistance(scaledPoint, pointBoundaries?.coordinates);

      if (dist.euclideanDistance > pointBoundaries.radius) {
        isWithinBounds = false;
      }
    } else if (
      pointBoundaries &&
      pointBoundaries?.dimensions &&
      (this.foreshadowingType === ForeshadowingAreaSubjectType.RECTANGLE ||
      this.foreshadowingType === ForeshadowingAreaSubjectType.RANGE) &&
      foreshadowingState
    ) {
      isWithinBounds = this.isWithinBounds(scaledPoint, {
        coordinates: pointBoundaries.coordinates,
        dimensions: pointBoundaries.dimensions,
      });

      const nextState = this.states[foreshadowingState];

      if (this.context && isWithinBounds) {
        if (this.foreshadowingType === ForeshadowingAreaSubjectType.RANGE) {
          drawLine({
            context: this.context,
            startCoordinates: scaledPoint,
            endCoordinates: {
              x: this.xScale(nextState.x),
              y: this.yScale(nextState.y),
            },
            lineWidth: 7,
            strokeStyle: "red",
            opacity: 0.5,
            lineDash: [],
          });
        }

        // Draw new state when foreshadowing
        scaledPoint = {
          x: this.xScale(nextState.x),
          y: this.yScale(nextState.y),
        };
      }
    }
    if (this.context && isWithinBounds) {
      if (drawLabel) {
        drawText({
          context: this.context,
          coordinates: {
            x: scaledPoint.x + 15,
            y: scaledPoint.y + 10,
          },
          text: `${Math.round(scaledPoint.y)}`,
          fillStyle: isHighlighted ? "white" : this.color,
          fontSize: FONT_SIZE,
          opacity: 1,
        });
      }
      drawCircle({
        context: this.context,
        coordinates: scaledPoint,
        radius: RADIUS,
        stroke: isHighlighted,
        strokeStyle: "white",
        fill: true,
        fillStyle: this.color,
        opacity: isHighlighted ? 1 : 0.5,
      });
    }
  }

  drawForeshadow(
    drawFn: ({
      drawLabels,
      pointBoundaries,
      states,
      isHighlighted,
      drawLine,
    }: {
      drawLabels: boolean;
      drawLine?: boolean;
      pointBoundaries?: {
        coordinates: Coordinate2D;
        radius?: number;
        dimensions?: Dimensions;
      };
      states?: "current" | "foreshadow";
      isHighlighted?: boolean;
    }) => void
  ) {
    let pointBoundaries: {
      coordinates: Coordinate2D;
      radius?: number;
      dimensions?: Dimensions;
    };
    if (this.context && this.foreshadowingArea) {
      this.context.save();
      const settings: ModifyContextStyleArgs = {
        context: this.context,
      };
      if (this.foreshadowingArea.dimensions) {
        if (this.foreshadowingType === ForeshadowingAreaSubjectType.RECTANGLE) {
          // this.clearAndClipRect({
          //   dimensions: this.foreshadowingArea.dimensions,
          //   coordinates: this.foreshadowingArea.position,
          // });
          drawFn({
            drawLabels: false,
            states: "current",
            isHighlighted: false,
          });
          modifyContextStyleAndDraw(settings, () => {
            if (this.foreshadowingArea) {
              drawFn({
                drawLabels: false,
                pointBoundaries: {
                  dimensions: this.foreshadowingArea.dimensions,
                  coordinates: this.foreshadowingArea.position,
                },
                states: "foreshadow",
                isHighlighted: true,
              });
            }
          });
        }
        if (this.foreshadowingType === ForeshadowingAreaSubjectType.RANGE) {
          pointBoundaries = {
            coordinates: this.foreshadowingArea.position,
            dimensions: {
              width: this.foreshadowingArea.dimensions.width,
              height: this.chartDimensions.height,
            },
          };

          modifyContextStyleAndDraw(settings, () =>
            drawFn({
              drawLabels: false,
              pointBoundaries,
              states: "foreshadow",
              isHighlighted: true,
            })
          );
        }
      } else if (this.foreshadowingArea.radius) {
        pointBoundaries = {
          coordinates: this.foreshadowingArea.position,
          radius: this.foreshadowingArea.radius,
        };
        modifyContextStyleAndDraw(settings, () =>
          drawFn({
            drawLabels: true,
            pointBoundaries,
            states: "current",
            isHighlighted: true,
          })
        );
      }
      this.context.restore();
    }
  }

  draw(coordinate: { x: any; y: any }, beforeClear?: () => void) {
    this.configureContextSettings();

    if (this.context) {
      const drawFn = (state: "current" | "foreshadow" = "current") => {
        const foreshadowingState = this.getForeshadowingState();
        if (!this.context) return;
        if (state === "current") {
          this.drawMarkers(coordinate, false, undefined, false);
        }
        if (state === "foreshadow" && foreshadowingState) {
          this.drawMarkers(coordinate, false, undefined, true);
        }
      };

      this.clearCanvas();
      if (beforeClear) {
        beforeClear();
      }
      drawFn("current");
      this.drawForeshadow(
        ({
          drawLabels,
          pointBoundaries,
          states,
          isHighlighted,
        }: {
          drawLabels: boolean;
          drawLine?: boolean;
          pointBoundaries?: {
            coordinates: Coordinate2D;
            radius?: number;
            dimensions?: Dimensions;
          };
          states?: "current" | "foreshadow";
          isHighlighted?: boolean;
        }) => {
          this.drawMarkers(
            coordinate,
            drawLabels,
            pointBoundaries,
            isHighlighted
          );
        }
      );
    }
  }

  drawCurrentState(bounds?: { start?: number; end: number }) {
    this.initializeScales();
    // This is to support the playback control of the range
    const foreshadowingState = this.getForeshadowingState();
    if (bounds && foreshadowingState) {
      const currentStateIndex = this.currentState;
      this.interpolateStates({
        boundedTimeStep: bounds.end ?? 1,
        nextState: this.states[foreshadowingState],
        currentState: this.states[currentStateIndex],
      });
    } else {
      this.draw(this.states[this.currentState], () => void 0);
    }
  }

  interpolateStates({
    boundedTimeStep,
    transitionFunction,
    currentState,
    nextState,
  }: {
    boundedTimeStep: number;
    transitionFunction?: (time: number) => number;
    currentState: Coordinate2D;
    nextState: Coordinate2D;
  }) {
    const formatTime = d3.timeFormat("%Y-%m-%d");
    let transitionStep: number;

    if (transitionFunction) {
      transitionStep = transitionFunction(boundedTimeStep);
    } else {
      transitionStep = boundedTimeStep;
    }

    // We don't use scale here because the draw() & drawSequential() methods use the scales
    const { x, y } = {
      x: currentState.x,
      y: currentState.y,
    };

    const { xNext, yNext } = {
      xNext: nextState.x,
      yNext: nextState.y,
    };

    const interpolatedState = {
      x: d3.interpolate(x, xNext)(transitionStep),
      y: d3.interpolate(y, yNext)(transitionStep),
    };

    this.draw(interpolatedState, () => {
      if (transitionStep === 1) {
        this.drawMarkers(nextState);
      }
    });
  }

  animateToNextState({
    playRemainingStates = false,
    transitionFunction,
    mode,
    callbackFn,
  }: {
    playRemainingStates: boolean;
    transitionFunction?: (time: number) => number;
    mode: DrawingMode;
    callbackFn?: any;
  }) {
    if (mode === DrawingMode.DROP_ANIMATION) {
      this.currentState++;
      this.initializeScales();

      const nextStateData = this.states[this.currentState];

      if (!nextStateData) return;
      const timer = d3.timer((elapsed: number) => {
        const boundedTimeStep = Math.min(elapsed / this.duration, 1);
        this.interpolateStates({
          boundedTimeStep,
          transitionFunction,
          currentState: {
            ...nextStateData,
            y: this.chartDimensions.height,
          },
          nextState: nextStateData,
        });
        callbackFn(boundedTimeStep);
        if (boundedTimeStep === 1) {
          const lastStateIndex = this.states.length - 1;
          const moreStatesExist = this.currentState < lastStateIndex;
          if (playRemainingStates && moreStatesExist) {
            this.animateToNextState({
              playRemainingStates,
              transitionFunction,
              mode,
              callbackFn,
            });
          }
          timer.stop();
        }
      });
    } else {
      // if (mode === DrawingMode.DRAW_ALL) {
      this.currentState++;
      this.initializeScales();

      const currentIndex = this.currentState - 1;
      const nextIndex = this.currentState;

      const currentStateData = this.states[currentIndex];
      const nextStateData = this.states[nextIndex];

      if (!nextStateData) return;

      const timer = d3.timer((elapsed: number) => {
        const boundedTimeStep = Math.min(elapsed / this.duration, 1);
        this.interpolateStates({
          boundedTimeStep,
          transitionFunction,
          currentState: currentStateData,
          nextState: nextStateData,
        });
        callbackFn(boundedTimeStep);
        if (boundedTimeStep === 1) {
          const lastStateIndex = this.states.length - 1;
          const moreStatesExist = this.currentState < lastStateIndex;
          if (playRemainingStates && moreStatesExist) {
            this.animateToNextState({
              playRemainingStates,
              transitionFunction,
              mode,
              callbackFn,
            });
          }
          timer.stop();
        }
      });
    }
  }

  animateToPreviousState({
    playRemainingStates = false,
    transitionFunction,
    mode,
    callbackFn,
  }: {
    playRemainingStates: boolean;
    transitionFunction?: (time: number) => number;
    mode: DrawingMode;
    callbackFn?: any;
  }) {
    if (mode === DrawingMode.DROP_ANIMATION) {
      this.currentState--;
      this.initializeScales();

      const prevStateData = this.states[this.currentState];

      if (!prevStateData) return;

      const timer = d3.timer((elapsed: number) => {
        const boundedTimeStep = Math.min(elapsed / this.duration, 1);
        this.interpolateStates({
          boundedTimeStep,
          transitionFunction,
          // TODO: Make the current state and next state differ by Y position
          currentState: {
            ...prevStateData,
            y: this.chartDimensions.height,
          },
          nextState: prevStateData,
        });
        callbackFn(boundedTimeStep);
        if (boundedTimeStep === 1) {
          const moreStatesExist = this.currentState > 0;
          if (playRemainingStates && moreStatesExist) {
            this.animateToPreviousState({
              playRemainingStates,
              transitionFunction,
              mode,
              callbackFn,
            });
          }
          timer.stop();
        }
      });
    } else {
      // if (mode === DrawingMode.DRAW_ALL) {
      this.currentState--;
      this.initializeScales();

      const currentIndex = this.currentState + 1;
      const prevIndex = this.currentState;

      if (prevIndex < 0) return;

      const currentState = this.states[currentIndex];
      const prevStateData = this.states[prevIndex];

      if (!prevStateData) return;

      const timer = d3.timer((elapsed: number) => {
        const boundedTimeStep = Math.min(elapsed / this.duration, 1);
        this.interpolateStates({
          boundedTimeStep,
          transitionFunction,
          currentState,
          nextState: prevStateData,
        });
        callbackFn(boundedTimeStep);
        if (boundedTimeStep === 1) {
          const moreStatesExist = this.currentState > 0;
          if (playRemainingStates && moreStatesExist) {
            this.animateToPreviousState({
              playRemainingStates,
              transitionFunction,
              mode,
              callbackFn,
            });
          }
          timer.stop();
        }
      });
      // }
    }
  }

  isWithinBounds(
    position: Coordinate2D,
    bounds: { coordinates: Coordinate2D; dimensions: Dimensions }
  ) {
    const { x: minX, y: minY } = bounds.coordinates;
    const { maxX, maxY } = {
      maxX: bounds.coordinates.x + bounds.dimensions.width,
      maxY: bounds.coordinates.y + bounds.dimensions.height,
    };

    console.log({
      minX,
      maxX,
      x: position.x,
      minY,
      maxY,
      y: position.y,
    });

    if (
      position.x > minX &&
      position.x < maxX &&
      position.y > minY &&
      position.y < maxY
    ) {
      return true;
    }

    return false;
  }
}
