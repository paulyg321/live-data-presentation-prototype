import type { BezierCoordinate, Coordinate } from "../../../types";
import * as d3 from "d3";

/*
  TODO:
  - Use different canvas for axes & line
  - Add modal for configuring chart
  - Work on sequential animations
    - Add Bezier curves for sequential animations
    - auto animate through all states for sequential animations
*/

export enum DrawingMode {
  SEQUENTIAL = "sequential",
  CONCURRENT = "concurrent",
  SEQUENTIAL_TRANSITION = "sequential_transition",
  DROP = "drop",
}

export enum LineShape {
  CURVED = "curved",
  SHARP = "sharp",
}

export enum AnimationType {
  CONTINUOUS = "continuous",
  DISCRETE = "discrete",
}

// export interface LineState {
//   linePoints: Coordinate[];
// }

export class AnimatedLine {
  states: Coordinate[][];
  yScale: any;
  xScale: any;
  currentState: number;
  canvasBounds: {
    start: Coordinate;
    end: Coordinate;
  };
  chartDimensions: { width: number; height: number };
  duration = 2000;
  color;

  constructor({
    states,
    xScale,
    yScale,
    chartDimensions,
    canvasDimensions,
    duration,
    color = "steelblue",
  }: {
    states: Coordinate[][];
    xScale: any;
    yScale: any;
    chartDimensions: { width: number; height: number };
    canvasDimensions: { width: number; height: number };
    duration: number;
    color?: string;
  }) {
    this.chartDimensions = chartDimensions;
    this.xScale = xScale;
    this.yScale = yScale;
    this.states = states;
    this.currentState = 0;
    this.canvasBounds = {
      start: { x: 0, y: 0 },
      end: { x: canvasDimensions.width, y: canvasDimensions.height },
    };
    this.duration = duration;
    this.color = color;
  }

  clearCanvas({ ctx }: { ctx: CanvasRenderingContext2D }) {
    ctx.clearRect(
      this.canvasBounds.start.x,
      this.canvasBounds.start.y,
      this.canvasBounds.end.x,
      this.canvasBounds.end.y
    );
  }

  lineLength({ data, shape }: { data: [number, number][]; shape?: LineShape }) {
    function dist(x1: number, y1: number, x2: number, y2: number) {
      return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    }

    let totalLength = 0;
    for (let i = 0; i < data.length - 1; i++) {
      const [x1, y1] = [this.xScale(data[i][0]), this.yScale(data[i][1])];
      const [x2, y2] = [
        this.xScale(data[i + 1][0]),
        this.yScale(data[i + 1][1]),
      ];
      if (shape === LineShape.CURVED) {
        totalLength += dist(x1, y1, x2, y2) * 1.2;
      } else {
        totalLength += dist(x1, y1, x2, y2);
      }
    }

    return totalLength;
  }

  drawLabels(ctx: CanvasRenderingContext2D, points: Coordinate[]) {
    // draw points
    points.forEach((point) => {
      ctx.beginPath();
      ctx.arc(
        this.xScale(point.x),
        this.yScale(point.y),
        5,
        0,
        2 * Math.PI,
        false
      );
      ctx.fill();
      ctx.font = "14px Arial";
      ctx.fillText(
        `$${Math.round(point.y)}`,
        this.xScale(point.x) + 10,
        this.yScale(point.y) + 10
      );
    });
  }

  draw(
    ctx: CanvasRenderingContext2D,
    coordinates: Coordinate[],
    mode: DrawingMode,
    shape: LineShape,
    beforeClear?: () => void,
    endBound = 1,
    startBound = 0
  ) {
    const data: [number, number][] = coordinates.map((coord) => [
      coord.x,
      coord.y,
    ]);

    let line = d3
      .line()
      .x((d) => this.xScale(d[0]))
      .y((d) => this.yScale(d[1]));

    if (shape === LineShape.CURVED) {
      // https://github.com/d3/d3-shape/blob/main/README.md#curves
      line = line.curve(d3.curveBumpX);
    }

    const drawLine = line.context(ctx);

    if (mode === DrawingMode.SEQUENTIAL) {
      const lineTimer = d3.timer((elapsed: number) => {
        this.clearCanvas({ ctx });
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

        const maxIndex = Math.round(boundedTimeStep * data.length);

        // Draw points
        this.drawLabels(ctx, coordinates.slice(0, maxIndex));

        // draw line
        const totalLength = this.lineLength({
          data,
          shape,
        });
        ctx.beginPath();
        ctx.setLineDash([totalLength]);
        ctx.lineDashOffset = d3.interpolate(totalLength, 0)(boundedTimeStep);
        drawLine(data);
        ctx.lineWidth = 1;
        ctx.opacity = 0.7;
        ctx.strokeStyle = this.color;
        ctx.stroke();
        if (boundedTimeStep === endBound) {
          lineTimer.stop();
        }
      });
    } else if (mode === DrawingMode.CONCURRENT) {
      this.clearCanvas({ ctx });
      if (beforeClear) {
        beforeClear();
      }
      ctx.beginPath();
      drawLine(data);
      ctx.lineWidth = 1;
      ctx.opacity = 0.7;
      ctx.strokeStyle = this.color;
      ctx.stroke();
    }
  }

  drawCurrentState({
    ctx,
    bounds,
  }: {
    ctx: CanvasRenderingContext2D;
    bounds?: { start: number; end: number };
  }) {
    this.draw(
      ctx,
      this.states[this.currentState],
      DrawingMode.SEQUENTIAL,
      LineShape.CURVED,
      () => void 0,
      bounds?.end,
      bounds?.start
    );
  }

  drawTransitionBetweenStates({
    boundedTimeSteps,
    ctx,
    transitionFunction,
    currentState,
    nextState,
  }: {
    boundedTimeSteps: number[];
    ctx: CanvasRenderingContext2D;
    transitionFunction?: (time: number) => number;
    currentState: Coordinate[];
    nextState: Coordinate[];
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
        (coordinate: Coordinate, index: number) => {
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
        ctx,
        interPolatedState,
        DrawingMode.CONCURRENT,
        LineShape.CURVED,
        () => {
          if (transitionStep === 1) {
            this.drawLabels(ctx, nextState);
          }
        }
      );
    } else {
      const interPolatedState = currentState.map(
        (coordinate: Coordinate, index: number) => {
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

      this.draw(
        ctx,
        interPolatedState,
        DrawingMode.CONCURRENT,
        LineShape.CURVED,
        () =>
          this.drawLabels(
            ctx,
            boundedTimeSteps
              .filter((step) => step === 1)
              .map((_, index) => nextState[index])
          )
      );
    }
  }

  animateToNextState({
    ctx,
    playRemainingStates = false,
    transitionFunction,
    mode,
  }: {
    ctx: CanvasRenderingContext2D;
    playRemainingStates: boolean;
    transitionFunction?: (time: number) => number;
    mode: DrawingMode;
  }) {
    if (mode === DrawingMode.DROP) {
      const nextIndex = this.currentState + 1;

      const nextStateData = this.states[nextIndex];

      if (!nextStateData) return;
      const timer = d3.timer((elapsed: number) => {
        const boundedTimeStep = Math.min(elapsed / this.duration, 1);
        this.drawTransitionBetweenStates({
          boundedTimeSteps: [boundedTimeStep],
          ctx,
          transitionFunction,
          currentState: nextStateData.map((coord: Coordinate) => ({
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
              ctx,
              playRemainingStates,
              transitionFunction,
              mode,
            });
          }
          timer.stop();
        }
      });
    }

    if (mode === DrawingMode.CONCURRENT) {
      const currentIndex = this.currentState;
      const nextIndex = this.currentState + 1;

      const currentStateData = this.states[currentIndex];
      const nextStateData = this.states[nextIndex];

      if (!nextStateData) return;

      const timer = d3.timer((elapsed: number) => {
        const boundedTimeStep = Math.min(elapsed / this.duration, 1);
        this.drawTransitionBetweenStates({
          boundedTimeSteps: [boundedTimeStep],
          ctx,
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
              ctx,
              playRemainingStates,
              transitionFunction,
              mode,
            });
          }
          timer.stop();
        }
      });
    }

    if (mode === DrawingMode.SEQUENTIAL_TRANSITION) {
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
          ctx,
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
              ctx,
              playRemainingStates,
              transitionFunction,
              mode,
            });
          }
          timer.stop();
        }
      });
    }

    if (mode === DrawingMode.SEQUENTIAL) {
      const nextIndex = this.currentState + 1;

      const nextStateData = this.states[nextIndex];

      if (!nextStateData) return;

      const sequentialDelay = this.duration;
      this.draw(ctx, nextStateData, DrawingMode.SEQUENTIAL, LineShape.CURVED);
      this.currentState++;

      const seqTimer = d3.timer((elapsed: number) => {
        const boundedTimeStep = Math.min(elapsed / sequentialDelay, 1);
        if (boundedTimeStep === 1) {
          const lastStateIndex = this.states.length - 1;
          const moreStatesExist = this.currentState < lastStateIndex;
          if (playRemainingStates && moreStatesExist) {
            this.animateToNextState({
              ctx,
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
    ctx,
    playRemainingStates = false,
    transitionFunction,
    mode,
  }: {
    ctx: CanvasRenderingContext2D;
    playRemainingStates: boolean;
    transitionFunction?: (time: number) => number;
    mode: DrawingMode;
  }) {
    if (mode === DrawingMode.DROP) {
      const prevIndex = this.currentState - 1;

      const prevStateData = this.states[prevIndex];

      if (!prevStateData) return;

      const timer = d3.timer((elapsed: number) => {
        const boundedTimeStep = Math.min(elapsed / this.duration, 1);
        this.drawTransitionBetweenStates({
          boundedTimeSteps: [boundedTimeStep],
          ctx,
          transitionFunction,
          // TODO: Make the current state and next state differ by Y position
          currentState: prevStateData.map((coord: Coordinate) => ({
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
              ctx,
              playRemainingStates,
              transitionFunction,
              mode,
            });
          }
          timer.stop();
        }
      });
    }

    if (mode === DrawingMode.CONCURRENT) {
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
          ctx,
          transitionFunction,
          currentState,
          nextState: prevStateData,
        });
        if (boundedTimeStep === 1) {
          const moreStatesExist = this.currentState > 0;
          this.currentState--;
          if (playRemainingStates && moreStatesExist) {
            this.animateToPreviousState({
              ctx,
              playRemainingStates,
              transitionFunction,
              mode,
            });
          }
          timer.stop();
        }
      });
    }

    if (mode === DrawingMode.SEQUENTIAL) {
      const prevIndex = this.currentState - 1;

      const prevStateData = this.states[prevIndex];

      if (!prevStateData) return;

      const sequentialDelay = this.duration;
      this.draw(ctx, prevStateData, DrawingMode.SEQUENTIAL, LineShape.CURVED);
      this.currentState--;
      const seqTimer = d3.timer((elapsed: number) => {
        const boundedTimeStep = Math.min(elapsed / sequentialDelay, 1);
        if (boundedTimeStep === 1) {
          const moreStatesExist = this.currentState > 0;
          this.currentState--;
          if (playRemainingStates && moreStatesExist) {
            this.animateToPreviousState({
              ctx,
              playRemainingStates,
              transitionFunction,
              mode,
            });
          }
          seqTimer.stop();
        }
      });
    }

    if (mode === DrawingMode.SEQUENTIAL_TRANSITION) {
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
          ctx,
          transitionFunction,
          currentState: currentState,
          nextState: prevStateData,
        });
        if (lastPointTimeStep === 1) {
          const moreStatesExist = this.currentState > 0;
          this.currentState--;
          if (playRemainingStates && moreStatesExist) {
            this.animateToNextState({
              ctx,
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
