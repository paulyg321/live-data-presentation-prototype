import type { Coordinate2D, Dimensions } from "../types";
import * as d3 from "d3";
import {
  axesSubject,
  calculateDistance,
  drawCircle,
  drawRect,
  drawText,
  Effect,
  ForeshadowingAreaSubjectType,
  modifyContextStyleAndDraw,
  type ForeshadowingAreaData,
  type ModifyContextStyleArgs,
} from "@/utils";

const parseTime = d3.timeParse("%Y-%m-%d");

export enum DrawingMode {
  DRAW_ALL = "Draw All",
  UNDULATE_ANIMATION = "Tenderness - Undulate", // level 1
  BASELINE_ANIMATION = "Joy - Baseline", // level 2
  DROP_ANIMATION = "Excitement - Drop", // level 3
}

export const AnimatedLineDrawingModeToEaseFunctionMap = {
  [DrawingMode.DRAW_ALL]: {
    transitionFunction: d3.easeLinear,
    duration: 3000,
  },
  [DrawingMode.UNDULATE_ANIMATION]: {
    transitionFunction: d3.easeBounce,
    duration: 1500,
  },
  [DrawingMode.BASELINE_ANIMATION]: {
    transitionFunction: d3.easeLinear,
    duration: 3000,
  },
  [DrawingMode.DROP_ANIMATION]: {
    transitionFunction: d3.easeLinear,
    duration: 200,
  },
};

export enum LineShape {
  CURVED = "curved",
  SHARP = "sharp",
}

export interface AnimatedLineConstructorArgs {
  states: Coordinate2D[][];
  chartDimensions: Dimensions;
  chartPosition: Coordinate2D;
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

export class AnimatedLine {
  states: Coordinate2D[][];
  dataType:
    | {
        xType: "number" | "date" | undefined;
        yType: "number" | "date" | undefined;
      }
    | undefined;
  yScale: any;
  xScale: any;
  currentState: number;
  canvasDimensions: Dimensions;
  chartDimensions: Dimensions;
  chartPosition: Coordinate2D;
  key: string;
  group: string;
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
  foreshadowingState: number | undefined;
  foreshadowingType: ForeshadowingAreaSubjectType | undefined;

  constructor({
    states,
    chartDimensions,
    chartPosition,
    canvasDimensions,
    duration,
    color,
    lineWidth,
    opacity,
    dataType,
    getScales,
    key,
    group,
  }: AnimatedLineConstructorArgs) {
    this.dataType = dataType;
    this.chartDimensions = chartDimensions;
    this.chartPosition = chartPosition;
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

  private initializeScales() {
    const { xScale, yScale } = this.getScales();

    if (this.dataType?.xType === "date") {
      this.xScale = (value: any) => {
        return xScale(parseTime(value));
      };
    } else {
      this.xScale = xScale;
    }

    if (this.dataType?.yType === "date") {
      this.yScale = (value: any) => {
        return yScale(parseTime(value));
      };
    } else {
      this.yScale = yScale;
    }

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
      this.foreshadowingState = undefined;
    } else if (
      type === ForeshadowingAreaSubjectType.CIRCLE ||
      type === ForeshadowingAreaSubjectType.RECTANGLE ||
      type === ForeshadowingAreaSubjectType.RANGE
    ) {
      this.foreshadowingArea = foreshadowingArea;
      this.foreshadowingType = type;
      const nextState = this.currentState + 1;
      const lastValidState = this.states.length - 1;
      if (nextState <= lastValidState) {
        this.foreshadowingState = nextState;
      }
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
  }: Partial<AnimatedLineConstructorArgs>) {
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

  drawMarkers(
    points: Coordinate2D[],
    drawLabel = false,
    pointBoundaries?: { coordinates: Coordinate2D; radius: number },
    isHighlighted = false
  ) {
    const FONT_SIZE = 14;
    const RADIUS = 5;

    // draw points
    points.forEach((point) => {
      let isWithinBounds = true;
      if (pointBoundaries) {
        const dist = calculateDistance(
          {
            x: this.xScale(point.x),
            y: this.yScale(point.y),
          },
          pointBoundaries?.coordinates
        );
        if (dist.euclideanDistance > pointBoundaries.radius) {
          isWithinBounds = false;
        }
      }
      if (this.context && isWithinBounds) {
        if (drawLabel) {
          drawText({
            context: this.context,
            coordinates: {
              x: this.xScale(point.x) + 15,
              y: this.yScale(point.y) + 10,
            },
            text: `${Math.round(point.y)}`,
            fillStyle: isHighlighted ? "white" : this.color,
            fontSize: FONT_SIZE,
            opacity: 1,
          });
        }
        drawCircle({
          context: this.context,
          coordinates: point,
          radius: RADIUS,
          xScale: this.xScale,
          yScale: this.yScale,
          stroke: isHighlighted,
          strokeStyle: "white",
          fill: true,
          fillStyle: this.color,
          opacity: isHighlighted ? 1 : 0.3,
        });
      }
    });
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
      pointBoundaries?: { coordinates: Coordinate2D; radius: number };
      states?: "current" | "foreshadow";
      isHighlighted?: boolean;
    }) => void,
    clipAreaStart?: Coordinate2D
  ) {
    let pointBoundaries: { coordinates: Coordinate2D; radius: number };
    if (this.context && this.foreshadowingArea) {
      this.context.save();
      const settings: ModifyContextStyleArgs = {
        context: this.context,
      };
      if (this.foreshadowingArea.dimensions) {
        if (this.foreshadowingType === ForeshadowingAreaSubjectType.RECTANGLE) {
          const rectangleContextSettings = {
            ...settings,
            lineWidth: 3,
            lineDash: [3, 3],
          };
          this.clearAndClipRect({
            dimensions: this.foreshadowingArea.dimensions,
            coordinates: this.foreshadowingArea.position,
          });
          drawFn({ drawLabels: false, states: "current", isHighlighted: true });
          modifyContextStyleAndDraw(rectangleContextSettings, () =>
            drawFn({
              drawLabels: false,
              states: "foreshadow",
              isHighlighted: false,
            })
          );
        }
        if (this.foreshadowingType === ForeshadowingAreaSubjectType.RANGE) {
          const rangeContextSettings = {
            ...settings,
            lineWidth: 1,
            lineDash: [3, 3],
          };
          let xCoord = clipAreaStart?.x ?? this.foreshadowingArea.position.x;
          let widthDiff = xCoord - this.foreshadowingArea.position.x;

          if (widthDiff < 0) {
            widthDiff = 0;
            xCoord = this.foreshadowingArea.position.x;
          }

          const reduceWidthBy = Math.min(
            widthDiff,
            this.foreshadowingArea.dimensions.width
          );

          this.clearAndClipRect({
            dimensions: {
              width: this.foreshadowingArea.dimensions.width - reduceWidthBy,
              height: this.chartDimensions.height,
            },
            coordinates: {
              ...this.foreshadowingArea.position,
              x: xCoord,
            },
          });
          modifyContextStyleAndDraw(rangeContextSettings, () =>
            drawFn({
              drawLabels: true,
              pointBoundaries,
              states: "current",
              isHighlighted: false,
            })
          );
        }
      } else if (
        this.foreshadowingArea.radius &&
        this.foreshadowingType === ForeshadowingAreaSubjectType.CIRCLE
      ) {
        pointBoundaries = {
          coordinates: this.foreshadowingArea.position,
          radius: this.foreshadowingArea.radius,
        };
        modifyContextStyleAndDraw(settings, () =>
          drawFn({
            drawLabels: true,
            drawLine: false,
            pointBoundaries,
            states: "current",
            isHighlighted: true,
          })
        );
      }
      this.context.restore();
    }
  }

  draw(
    coordinates: { x: any; y: any }[],
    shape: LineShape,
    drawMore?: () => void,
    endBound = 1,
    drawPoints = true
  ) {
    this.configureContextSettings();

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
      const drawFn = (state: "current" | "foreshadow" = "current") => {
        if (state === "current") {
          this.context?.beginPath();
          drawLine(coordinates);
          this.context?.stroke();
        }
        if (state === "foreshadow" && this.foreshadowingState) {
          this.context?.beginPath();
          drawLine(this.states[this.foreshadowingState]);
          this.context?.stroke();
        }
        if (drawMore) {
          drawMore();
        }
      };

      const maxIndex = Math.round(endBound * coordinates.length);
      this.clearCanvas();
      this.context.save();
      this.clearAndClipRect({
        dimensions: {
          width: this.chartDimensions.width * endBound,
          height: this.chartDimensions.height,
        },
        coordinates: this.chartPosition,
      });
      drawFn("current");
      if (drawPoints) {
        this.drawMarkers(
          coordinates.slice(0, maxIndex),
          false,
          undefined,
          false
        );
      }
      this.context.restore();
      this.drawForeshadow(
        ({
          drawLabels,
          pointBoundaries,
          states,
          isHighlighted,
          drawLine = true,
        }: {
          drawLabels: boolean;
          drawLine?: boolean;
          pointBoundaries?: { coordinates: Coordinate2D; radius: number };
          states?: "current" | "foreshadow";
          isHighlighted?: boolean;
        }) => {
          if (drawLine) {
            drawFn(states);
          }
          this.drawMarkers(
            coordinates.slice(0, maxIndex),
            drawLabels,
            pointBoundaries,
            isHighlighted
          );
        },
        {
          x: this.chartPosition.x + this.chartDimensions.width * endBound,
          y: this.chartPosition.y,
        }
      );
    }
  }

  drawCurrentState(bounds?: { start?: number; end: number }) {
    this.initializeScales();
    this.draw(
      this.states[this.currentState],
      LineShape.CURVED,
      () => void 0,
      bounds?.end
    );
  }

  interpolateAndDraw({
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
    const formatTime = d3.timeFormat("%Y-%m-%d");
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
            x:
              this.dataType?.xType === "date"
                ? formatTime(
                    d3.interpolateDate(
                      parseTime(x as unknown as string) ?? new Date(),
                      parseTime(xNext as unknown as string) ?? new Date()
                    )(transitionStep)
                  )
                : d3.interpolate(x, xNext)(transitionStep),
            y:
              this.dataType?.yType === "date"
                ? formatTime(
                    d3.interpolateDate(
                      parseTime(y as unknown as string) ?? new Date(),
                      parseTime(yNext as unknown as string) ?? new Date()
                    )(transitionStep)
                  )
                : d3.interpolate(y, yNext)(transitionStep),
          };
        }
      );

      this.draw(
        interPolatedState,
        LineShape.CURVED,
        () => {
          if (transitionStep === 1) {
            this.drawMarkers(nextState, false, undefined, true);
          }
        },
        undefined,
        false
      );
    } else {
      // Not all points are updated at the same rate so we update get the timestep from the passed array
      // boundedTimeSteps[index]
      const interPolatedState = currentState.map(
        (coordinate: Coordinate2D, index: number) => {
          const boundedTimeStep = boundedTimeSteps[index];
          let transitionStep: number;

          if (transitionFunction) {
            transitionStep = transitionFunction(boundedTimeStep);
          } else {
            transitionStep = boundedTimeStep;
          }

          /**
           * NEED TO USE SCALES HERE!
           */

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
            x:
              this.dataType?.xType === "date"
                ? formatTime(
                    d3.interpolateDate(
                      parseTime(x as unknown as string) ?? new Date(),
                      parseTime(xNext as unknown as string) ?? new Date()
                    )(transitionStep)
                  )
                : d3.interpolate(x, xNext)(transitionStep),
            y:
              this.dataType?.yType === "date"
                ? formatTime(
                    d3.interpolateDate(
                      parseTime(y as unknown as string) ?? new Date(),
                      parseTime(yNext as unknown as string) ?? new Date()
                    )(transitionStep)
                  )
                : d3.interpolate(y, yNext)(transitionStep),
          };
        }
      );

      this.draw(interPolatedState, LineShape.CURVED, () =>
        // ONLY DRAW MARKERS ON FINISHED ANIMATIONS
        this.drawMarkers(
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
        this.interpolateAndDraw({
          boundedTimeSteps: [boundedTimeStep],
          transitionFunction,
          currentState: nextStateData.map((coord: Coordinate2D) => ({
            ...coord,
            y: this.chartDimensions.height,
          })),
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

    if (mode === DrawingMode.DRAW_ALL) {
      this.currentState++;
      this.initializeScales();

      const currentIndex = this.currentState - 1;
      const nextIndex = this.currentState;

      const currentStateData = this.states[currentIndex];
      const nextStateData = this.states[nextIndex];

      if (!nextStateData) return;

      const timer = d3.timer((elapsed: number) => {
        const boundedTimeStep = Math.min(elapsed / this.duration, 1);
        this.interpolateAndDraw({
          boundedTimeSteps: [boundedTimeStep],
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

    if (mode === DrawingMode.UNDULATE_ANIMATION) {
      this.currentState++;
      this.initializeScales();

      const currentIndex = this.currentState - 1;
      const nextIndex = this.currentState;

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
        this.interpolateAndDraw({
          boundedTimeSteps,
          transitionFunction,
          currentState: currentStateData,
          nextState: nextStateData,
        });
        callbackFn(lastPointTimeStep);
        if (lastPointTimeStep === 1) {
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

    // TODO: Use callbackFn for this
    if (mode === DrawingMode.BASELINE_ANIMATION) {
      this.currentState++;
      this.initializeScales();

      const nextStateData = this.states[this.currentState];

      if (!nextStateData) return;

      const seqTimer = d3.timer((elapsed: number) => {
        const boundedTimeStep = Math.min(elapsed / this.duration, 1);
        let transitionStep: number;

        if (transitionFunction) {
          transitionStep = transitionFunction(boundedTimeStep);
        } else {
          transitionStep = boundedTimeStep;
        }

        this.draw(nextStateData, LineShape.CURVED, undefined, transitionStep);
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
        this.interpolateAndDraw({
          boundedTimeSteps: [boundedTimeStep],
          transitionFunction,
          // TODO: Make the current state and next state differ by Y position
          currentState: prevStateData.map((coord: Coordinate2D) => ({
            ...coord,
            y: this.chartDimensions.height,
          })),
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
    }

    if (mode === DrawingMode.DRAW_ALL) {
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
        this.interpolateAndDraw({
          boundedTimeSteps: [boundedTimeStep],
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
    }

    // TODO: Use callbackFn here
    if (mode === DrawingMode.BASELINE_ANIMATION) {
      this.currentState--;
      this.initializeScales();

      const prevStateData = this.states[this.currentState];

      if (!prevStateData) return;

      const seqTimer = d3.timer((elapsed: number) => {
        const boundedTimeStep = Math.min(elapsed / this.duration, 1);
        let transitionStep: number;

        if (transitionFunction) {
          transitionStep = transitionFunction(boundedTimeStep);
        } else {
          transitionStep = boundedTimeStep;
        }

        this.draw(prevStateData, LineShape.CURVED, undefined, transitionStep);
        if (boundedTimeStep === 1) {
          const moreStatesExist = this.currentState > 0;
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
      this.currentState--;
      this.initializeScales();

      const currentIndex = this.currentState + 1;
      const prevIndex = this.currentState;

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
        this.interpolateAndDraw({
          boundedTimeSteps,
          transitionFunction,
          currentState: currentState,
          nextState: prevStateData,
        });
        callbackFn(lastPointTimeStep);
        if (lastPointTimeStep === 1) {
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
    }
  }
}
