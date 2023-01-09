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

  constructor({
    states,
    xScale,
    yScale,
    chartDimensions,
    canvasDimensions,
    duration,
  }: {
    states: Coordinate[][];
    xScale: any;
    yScale: any;
    chartDimensions: { width: number; height: number };
    canvasDimensions: { width: number; height: number };
    duration: number;
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
  }

  generateBezierCoordinates(coordinates: Coordinate[]): BezierCoordinate[] {
    const lastIndex = coordinates.length - 1;
    return coordinates.map((coordinate, index) => {
      let cpLeft;
      let cpRight;

      const isFirstIndex = index === 0;
      const isLastIndex = index === lastIndex;

      if (!isFirstIndex) {
        const prevIndex = index - 1;
        cpLeft = {
          x: (coordinates[prevIndex].x + coordinate.x) / 2,
          y: coordinate.y,
        };
      }

      if (!isLastIndex) {
        const nextIndex = index + 1;
        cpRight = {
          x: (coordinates[nextIndex].x + coordinate.x) / 2,
          y: coordinate.y,
        };
      }

      return {
        coordinate,
        cpLeft,
        cpRight,
      };
    });
  }

  drawSequential(
    ctx: any,
    coordinates: Coordinate[],
    currentIndex: number,
    done: boolean
  ) {
    if (done) return;
    const timer = d3.timer((elapsed: number) => {
      const boundedTimeStep = Math.min(elapsed / this.duration, 1);

      const coordinate = coordinates[currentIndex];
      const nextIndex = currentIndex + 1;
      const { x, y } = {
        x: this.xScale(coordinate.x),
        y: this.yScale(coordinate.y),
      };

      if (currentIndex === 0) {
        ctx.moveTo(x, y);
      }

      if (nextIndex < coordinates.length) {
        const { xNext, yNext } = {
          xNext: this.xScale(coordinates[nextIndex].x),
          yNext: this.yScale(coordinates[nextIndex].y),
        };

        const ix = d3.interpolate(x, xNext);
        const iy = d3.interpolate(y, yNext);

        ctx.lineTo(ix(boundedTimeStep), iy(boundedTimeStep));
        ctx.stroke();
      }

      if (boundedTimeStep === 1) {
        this.drawSequential(
          ctx,
          coordinates,
          nextIndex,
          nextIndex >= coordinates.length
        );
        timer.stop();
      }
    });
  }

  draw(
    ctx: any,
    coordinates: Coordinate[],
    mode: DrawingMode,
    shape: LineShape
  ) {
    let bezierCoordinates: BezierCoordinate[];

    if (shape === LineShape.CURVED) {
      bezierCoordinates = this.generateBezierCoordinates(coordinates);
    }
    if (mode === DrawingMode.SEQUENTIAL) {
      ctx.beginPath();
      const currentIndex = 0;
      this.drawSequential(ctx, coordinates, currentIndex, false);
    } else if (mode === DrawingMode.CONCURRENT) {
      ctx.beginPath();
      coordinates.forEach((coordinate, index) => {
        const { x, y } = {
          x: this.xScale(coordinate.x),
          y: this.yScale(coordinate.y),
        };
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          if (shape === LineShape.CURVED) {
            const previousIndex = index - 1;
            const cp1 = bezierCoordinates[previousIndex].cpRight;
            const scaledCP1 = {
              x: this.xScale(cp1?.x),
              y: this.yScale(cp1?.y),
            };
            const cp2 = bezierCoordinates[index].cpLeft;
            const scaledCP2 = {
              x: this.xScale(cp2?.x),
              y: this.yScale(cp2?.y),
            };
            ctx.bezierCurveTo(
              scaledCP1?.x,
              scaledCP1?.y,
              scaledCP2?.x,
              scaledCP2?.y,
              x,
              y
            );
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();
    }
  }

  drawCurrentState({ ctx }: { ctx: any }) {
    ctx.clearRect(
      this.canvasBounds.start.x,
      this.canvasBounds.start.y,
      this.canvasBounds.end.x,
      this.canvasBounds.end.y
    );
    this.draw(
      ctx,
      this.states[this.currentState],
      DrawingMode.CONCURRENT,
      LineShape.CURVED
    );
  }

  animateToNextState({
    ctx,
    playRemainingStates = false,
    transitionFunction,
  }: {
    ctx: any;
    playRemainingStates: boolean;
    transitionFunction?: (time: number) => number[];
  }) {
    const currentIndex = this.currentState;
    const nextIndex = this.currentState + 1;

    const currentState = this.states[currentIndex];
    const nextState = this.states[nextIndex];

    if (!nextState) return;

    const timer = d3.timer((elapsed: number) => {
      let transitionStep: number;
      const boundedTimeStep = Math.min(elapsed / this.duration, 1);

      if (transitionFunction) {
        transitionStep = transitionFunction(boundedTimeStep)[1];
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
      ctx.clearRect(
        this.canvasBounds.start.x,
        this.canvasBounds.start.y,
        this.canvasBounds.end.x,
        this.canvasBounds.end.y
      );

      this.draw(
        ctx,
        interPolatedState,
        DrawingMode.CONCURRENT,
        LineShape.CURVED
      );

      if (boundedTimeStep === 1) {
        const lastStateIndex = this.states.length - 1;
        const moreStatesExist = this.currentState < lastStateIndex;
        this.currentState++;
        if (playRemainingStates && moreStatesExist) {
          this.animateToNextState({
            ctx,
            playRemainingStates,
            transitionFunction,
          });
        }
        timer.stop();
      }
    });
  }

  animateToPreviousState({
    ctx,
    playRemainingStates = false,
    transitionFunction,
  }: {
    ctx: any;
    playRemainingStates: boolean;
    transitionFunction?: (time: number) => number[];
  }) {
    const currentIndex = this.currentState;
    const prevIndex = this.currentState - 1;

    if (prevIndex < 0) return;

    const currentState = this.states[currentIndex];
    const prevState = this.states[prevIndex];

    if (!prevState) return;

    const timer = d3.timer((elapsed: number) => {
      let transitionStep: number;
      const boundedTimeStep = Math.min(elapsed / this.duration, 1);

      if (transitionFunction) {
        transitionStep = transitionFunction(boundedTimeStep)[1];
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

          const { xPrev, yPrev } = {
            xPrev: prevState[index].x,
            yPrev: prevState[index].y,
          };

          return {
            x: d3.interpolate(x, xPrev)(transitionStep),
            y: d3.interpolate(y, yPrev)(transitionStep),
          };
        }
      );
      ctx.clearRect(
        this.canvasBounds.start.x,
        this.canvasBounds.start.y,
        this.canvasBounds.end.x,
        this.canvasBounds.end.y
      );

      this.draw(
        ctx,
        interPolatedState,
        DrawingMode.CONCURRENT,
        LineShape.CURVED
      );

      if (boundedTimeStep === 1) {
        const moreStatesExist = this.currentState >= 1;
        this.currentState--;
        if (playRemainingStates && moreStatesExist) {
          this.animateToPreviousState({
            ctx,
            playRemainingStates,
            transitionFunction,
          });
        }
        timer.stop();
      }
    });
  }
}
