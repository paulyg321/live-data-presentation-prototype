import type { Timer } from "d3";
import * as d3 from "d3";
import _ from "lodash";
import { isInBound } from "../../calculations";
import {
  defaultScale,
  DrawingUtils,
  type DrawCircleArgs,
  type ModifyContextStyleArgs,
} from "../../drawing";
import { ForeshadowingAreaSubjectType } from "../../gestures";
import { startTimerInstance } from "../../timer";
import type {
  ChartRangeType,
  Coordinate2D,
  Dimensions,
  ForeshadowingSettings,
  ScaleFn,
  ForeshadowingAreaData,
} from "../types";
import { Affect, NON_FOCUSED_COLOR } from "./Chart";
import { drawXAxis, drawYAxis } from "./draw-axes";

export interface ScatterPlotItemState {
  keyframe: string;
  data: Coordinate2D;
}

export interface ScatterPlotConstructorArgs {
  items: Record<string, { color: string; states: ScatterPlotItemState[] }>;
  canvasDimensions: Dimensions;
  chartDimensions: Dimensions;
  position: Coordinate2D;
  drawingUtils: DrawingUtils;
  keyframes: string[];
  affect?: Affect;
}

export class ScatterPlot {
  // CANVAS
  canvasDimensions: Dimensions;
  chartDimensions: Dimensions;
  position: Coordinate2D;
  drawingUtils: DrawingUtils;

  items: Record<string, { color: string; states: ScatterPlotItemState[] }>;
  currentStateIndex = 0;
  lastStateIndex = 0;
  firstStateIndex = 0;
  nextStateIndex: number | undefined;

  animationExtent = 0;
  affect?: Affect;

  foreshadowingSettings: ForeshadowingSettings | undefined;
  selectedItems: string[] = [];
  xScale: ScaleFn = defaultScale;
  yScale: ScaleFn = defaultScale;

  highlightPosition?: Coordinate2D;
  timer?: Timer;
  foreshadowingAnimationExtent = 1;

  keyframes: string[];

  constructor({
    items,
    canvasDimensions,
    chartDimensions,
    position,
    drawingUtils,
    keyframes,
  }: ScatterPlotConstructorArgs) {
    this.items = items;
    this.canvasDimensions = canvasDimensions;
    this.chartDimensions = chartDimensions;
    this.position = position;
    this.drawingUtils = drawingUtils;
    this.keyframes = keyframes;
    this.setStateCount();
    this.setStates("initialize");
    this.setScales();
  }

  // -------------------------------------- SETTERS --------------------------------------
  updateState({
    chartDimensions,
    canvasDimensions,
    drawingUtils,
    extent,
    affect,
    position,
    highlightPosition,
  }: Partial<ScatterPlotConstructorArgs> & {
    extent?: number;
    highlightPosition?: Coordinate2D;
  }) {
    if (chartDimensions) {
      this.chartDimensions = {
        ...this.canvasDimensions,
        ...chartDimensions,
      };
      this.setScales();
    }
    if (position) {
      this.position = position;
      this.setScales();
    }
    if (canvasDimensions) {
      this.canvasDimensions = canvasDimensions;
    }
    if (drawingUtils) {
      this.drawingUtils = drawingUtils;
    }
    if (extent) {
      this.animationExtent = extent;
    }
    if (affect) {
      this.affect = affect;
    }
    if (highlightPosition) {
      this.highlightPosition = highlightPosition;
    }
  }

  setForeshadowing(foreshadowingSettings?: ForeshadowingSettings) {
    if (foreshadowingSettings?.type === ForeshadowingAreaSubjectType.RANGE) {
      if (this.timer) return;

      const startDimensions =
        this.foreshadowingSettings?.type === ForeshadowingAreaSubjectType.RANGE
          ? this.foreshadowingSettings.area.dimensions
          : this.chartDimensions;
      const endDimensions = foreshadowingSettings.area.dimensions;
      const startPosition =
        this.foreshadowingSettings?.type === ForeshadowingAreaSubjectType.RANGE
          ? this.foreshadowingSettings.area.position
          : this.position;
      const endPosition = foreshadowingSettings.area.position;

      this.timer = startTimerInstance({
        onTick: (timeStep?: number) => {
          if (!timeStep) return;
          if (
            foreshadowingSettings?.type === ForeshadowingAreaSubjectType.RANGE
          ) {
            if (!endDimensions || !startDimensions) return;
            this.foreshadowingSettings = {
              ...foreshadowingSettings,
              area: {
                position: {
                  x: d3.interpolate(startPosition.x, endPosition.x)(timeStep),
                  y: endPosition.y,
                },
                dimensions: {
                  width: d3.interpolate(
                    startDimensions.width,
                    endDimensions?.width
                  )(timeStep),
                  height: endDimensions?.height,
                },
              },
            };
          }
        },
        onCompletion: () => {
          this.foreshadowingSettings = foreshadowingSettings;
          this.timer?.stop();
          this.timer = undefined;
        },
        timeout: 1000,
      });
    } else {
      this.foreshadowingSettings = foreshadowingSettings;
      this.timer = startTimerInstance({
        onTick: (timeStep?: number) => {
          if (!timeStep) return;
          this.foreshadowingAnimationExtent = timeStep;
        },
        onCompletion: () => {
          this.foreshadowingAnimationExtent = 1;
          this.timer?.stop();
          this.timer = undefined;
        },
        timeout: 1000,
      });
      return;
    }
  }

  setSelection(keys: string[]) {
    this.selectedItems = keys;
  }

  private interpolateBetweenStates({
    interpolateStep,
    currentState,
    nextState,
  }: {
    interpolateStep: number;
    currentState: {
      x: any;
      y: any;
    };
    nextState?: {
      x: any;
      y: any;
    };
  }) {
    if (!nextState) return currentState;
    return {
      x: d3.interpolate(currentState.x, nextState.x)(interpolateStep),
      y: d3.interpolate(currentState.y, nextState.y)(interpolateStep),
    };
  }

  private setScales() {
    const { xDomain, yDomain } = this.getDomain();
    const { xRange, yRange } = this.getRange();

    const xScaleFn: any = d3.scaleLinear;
    const yScaleFn: any = d3.scaleLinear;

    const scales = {
      xScale: xScaleFn(xDomain, xRange),
      yScale: yScaleFn(yDomain, yRange),
    };

    this.xScale = scales.xScale;
    this.yScale = scales.yScale;
  }

  private getItemKeys(): {
    selectedItemsKeys: string[];
    unselectedItemsKeys: string[];
  } {
    let selectedItemsKeys = Object.keys(this.items);
    let unselectedItemsKeys: string[] = [];

    if (this.selectedItems.length > 0) {
      selectedItemsKeys = this.selectedItems;
      unselectedItemsKeys = Object.keys(this.items).filter(
        (value: string) => !this.selectedItems.includes(value)
      );
    }

    return {
      selectedItemsKeys,
      unselectedItemsKeys,
    };
  }

  private setStateCount() {
    const states: ScatterPlotItemState[][] = _.values(this.items).map(
      (item: { color: string; states: ScatterPlotItemState[] }) => item.states
    );
    const sampleItem = states.pop();

    if (sampleItem) {
      const DEFAULT_FIRST_STATE = 0;
      const numberOfStates = sampleItem.length;

      this.firstStateIndex = DEFAULT_FIRST_STATE;
      this.lastStateIndex = numberOfStates - 1;
    } else {
      // TODO: HANDLE ERROR
    }
  }

  setStates(operation: "initialize" | "increment" | "decrement") {
    this.animationExtent = 0;
    switch (operation) {
      case "initialize": {
        this.currentStateIndex = this.firstStateIndex;
        const expectedNext = this.currentStateIndex + 1;
        if (expectedNext <= this.lastStateIndex) {
          this.nextStateIndex = expectedNext;
        } else {
          this.nextStateIndex = undefined;
        }
        break;
      }
      case "increment": {
        const increment = this.currentStateIndex + 1;
        if (increment <= this.lastStateIndex) {
          this.currentStateIndex = increment;

          const expectedNext = this.currentStateIndex + 1;
          if (expectedNext <= this.lastStateIndex) {
            this.nextStateIndex = expectedNext;
          } else {
            this.nextStateIndex = undefined;
          }
        }
        break;
      }
      case "decrement": {
        const decrement = this.currentStateIndex - 1;
        if (decrement <= this.firstStateIndex) {
          this.currentStateIndex = decrement;

          const expectedNext = this.currentStateIndex + 1;
          if (expectedNext <= this.lastStateIndex) {
            this.nextStateIndex = expectedNext;
          } else {
            this.nextStateIndex = undefined;
          }
        }
        break;
      }
      default: {
        console.log(`${operation} NO-OP`);
        break;
      }
    }
  }

  // -------------------------------------- GETTERS --------------------------------------

  getForeshadowingInfo() {
    const isRectGesture =
      this.foreshadowingSettings?.type ===
      ForeshadowingAreaSubjectType.RECTANGLE;
    const isRangeGesture =
      this.foreshadowingSettings?.type === ForeshadowingAreaSubjectType.RANGE;
    const isCircleGesture =
      this.foreshadowingSettings?.type === ForeshadowingAreaSubjectType.CIRCLE;

    const bounds = this.foreshadowingSettings?.area;

    const info = {
      bounds,
      isRangeGesture,
      isRectGesture,
      isCircleGesture,
      isInBound: (coordinate: Coordinate2D) => {
        if (!bounds) return false;
        return isInBound(coordinate, bounds);
      },
    };

    return info;
  }

  private getDimensions(): Required<Dimensions> {
    const dimensions = this.chartDimensions;

    if (dimensions.margin) {
      return dimensions as Required<Dimensions>;
    }

    return {
      ...dimensions,
      margin: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      },
    };
  }

  private getBounds() {
    const dimensions = this.getDimensions();
    const position = this.position;

    return {
      x: {
        start: position.x + dimensions.margin?.left,
        end: position.x + (dimensions.width - dimensions.margin.right),
      },
      y: {
        start: position.y + dimensions.height - dimensions.margin.bottom,
        end: position.y + dimensions.margin.top,
      },
    };
  }

  private getAccessors() {
    const xAccessor = (d: any) => d.data.x;
    const yAccessor = (d: any) => d.data.y;

    return {
      xAccessor,
      yAccessor,
    };
  }

  private getDomain(foreshadow?: boolean): {
    xDomain: [any, any];
    yDomain: [any, any];
  } {
    const { xAccessor, yAccessor } = this.getAccessors();
    const states: ScatterPlotItemState[][] = _.values(this.items).map(
      (item: { color: string; states: ScatterPlotItemState[] }) => item.states
    );
    let flattenedStates = states.flat(1);

    if (foreshadow && this.foreshadowingSettings?.area) {
      flattenedStates = flattenedStates.filter(
        (value: { keyframe: string; data: { x: any; y: any } }) => {
          const isInForeshadowingBounds = isInBound(
            value.data,
            this.foreshadowingSettings?.area as ForeshadowingAreaData,
            this.xScale,
            this.yScale
          );
          if (isInForeshadowingBounds) {
            return true;
          }
          return false;
        }
      );
    }

    const xDomain = d3.extent(flattenedStates, xAccessor);
    const yDomain = d3.extent(flattenedStates, yAccessor);

    return {
      xDomain,
      yDomain,
    };
  }

  private getRange(foreshadowing?: boolean): ChartRangeType {
    const chartBounds = this.getBounds();

    if (
      foreshadowing &&
      this.foreshadowingSettings?.type ===
        ForeshadowingAreaSubjectType.RECTANGLE
    ) {
      const chartWidth = chartBounds.x.end - chartBounds.x.start;
      const halfChartWidth = chartWidth / 2;
      const interpolatedWidth = d3.interpolate(
        chartWidth,
        halfChartWidth
      )(this.foreshadowingAnimationExtent);
      // const halfChartHeight = (chartBounds.y.start - chartBounds.y.end) / 2;
      const leftMargin = this.chartDimensions.margin?.left ?? 0;
      const rangeData: ChartRangeType = {
        xRange: [
          chartBounds.x.start,
          chartBounds.x.start + interpolatedWidth - leftMargin,
        ],
        yRange: [chartBounds.y.start, chartBounds.y.end],
        xRangeNext: [
          chartBounds.x.start + leftMargin + interpolatedWidth,
          chartBounds.x.end,
        ],
      };
      return rangeData;
    }

    return {
      xRange: [chartBounds.x.start, chartBounds.x.end],
      xRangeNext: [chartBounds.x.start, chartBounds.x.end],
      yRange: [chartBounds.y.start, chartBounds.y.end],
    };
  }

  getHighlightInfo() {
    const highlightExists =
      this.highlightPosition &&
      this.highlightPosition.x !== 0 &&
      this.highlightPosition.y !== 0;
    return {
      isHighlighted: (bounds: {
        position: Coordinate2D;
        dimensions?: Dimensions;
        radius?: number;
      }) => {
        if (!highlightExists) return false;
        return isInBound(this.highlightPosition!, bounds);
      },
    };
  }

  // TODO: Return scales that plot only stuff that falls in the domain - googlw this!
  private getForeshadowingScales() {
    const { xDomain, yDomain } = this.getDomain(true);
    const { xRange, yRange, xRangeNext } = this.getRange(true);

    const xScaleFn: any = d3.scaleLinear;
    const yScaleFn: any = d3.scaleLinear;

    return {
      xScale: xScaleFn(xDomain, xRange),
      yScale: yScaleFn(yDomain, yRange),
      xScaleNext: xScaleFn(xDomain, xRangeNext),
    };
  }

  private getPointSettings({
    color,
    isSelected,
    isCurrent,
  }: {
    color?: string;
    isSelected: boolean;
    isCurrent: boolean;
  }): ModifyContextStyleArgs &
    Pick<DrawCircleArgs, "radius" | "fill" | "stroke"> {
    const settings: ModifyContextStyleArgs &
      Pick<DrawCircleArgs, "radius" | "fill" | "stroke"> = {
      radius: this.chartDimensions.width * 0.015,
    };

    if (isSelected && isCurrent) {
      settings.fill = true;
      settings.radius = this.chartDimensions.width * 0.02;

      settings.fillStyle = color;
      settings.lineWidth = 0;
      settings.opacity = 0.7;
    } else if (!isSelected && isCurrent) {
      settings.radius = this.chartDimensions.width * 0.005;
      settings.fill = true;
      settings.fillStyle = NON_FOCUSED_COLOR;
      settings.strokeStyle = NON_FOCUSED_COLOR;
      settings.lineWidth = 0;
    } else if (isSelected && !isCurrent) {
      settings.fill = true;
      settings.stroke = true;

      settings.fillStyle = "white";
      settings.strokeStyle = color;
      settings.lineWidth = 2;
      settings.opacity = 0.3;
    }

    return settings;
  }

  getExtentBasedOnAffect() {
    switch (this.affect) {
      case Affect.JOY:
        return d3.easeBounce(this.animationExtent);
      case Affect.EXCITEMENT:
        return d3.easeBounce(this.animationExtent);
      case Affect.TENDERNESS:
        return d3.easeLinear(this.animationExtent);
      default:
        return this.animationExtent;
    }
  }

  drawAxes({
    xScale,
    xScaleNext,
    yScale,
    isRectGesture,
  }: {
    xScale: ScaleFn;
    xScaleNext: ScaleFn;
    yScale: ScaleFn;
    isRectGesture: boolean;
  }) {
    const range = this.getRange(isRectGesture);
    /**
     * -------------------- DRAW AXES --------------------
     * */
    drawXAxis(
      this.drawingUtils,
      xScale,
      range.yRange[0],
      range.xRange,
      16,
      3,
      undefined,
      false
    );
    drawYAxis(
      this.drawingUtils,
      yScale,
      range.xRange[0],
      range.yRange,
      16,
      3,
      undefined,
      false
    );

    // Draw extra axes for small multiple view
    if (isRectGesture) {
      drawXAxis(
        this.drawingUtils,
        xScaleNext,
        range.yRange[0],
        range.xRangeNext,
        16,
        3,
        undefined,
        false
      );
      drawYAxis(
        this.drawingUtils,
        yScale,
        range.xRangeNext[0],
        range.yRange,
        16,
        3,
        undefined,
        false
      );
    }
  }

  drawItem({
    currentState,
    nextState,
    color,
    label,
    isHighlighted,
    isForeshadowed,
    xScale,
    xScaleNext,
    yScale,
  }: {
    currentState: Coordinate2D;
    nextState?: Coordinate2D;
    color: string;
    label: string;
    isHighlighted: boolean;
    isForeshadowed: boolean;
    xScale: ScaleFn;
    xScaleNext: ScaleFn;
    yScale: ScaleFn;
  }) {
    const currentRadius = this.chartDimensions.width * 0.02;
    const futureRadius = this.chartDimensions.width * 0.015;
    const opacity = 0.7;
    /**
     * CIRCLE
     */

    // CURRENT
    this.drawingUtils.modifyContextStyleAndDraw(
      {
        fillStyle: color,
        opacity,
      },
      (context) => {
        this.drawingUtils.drawCircle({
          coordinates: currentState,
          xScale,
          yScale,
          radius: currentRadius,
          fill: true,
          context,
        });
      }
    );

    if (isHighlighted) {
      const tooltipBackgroundPosition = {
        x: xScale(currentState.x) + 20,
        y: yScale(currentState.y) + 20,
      };

      this.drawingUtils.modifyContextStyleAndDraw(
        {
          opacity: 1,
          fillStyle: "white",
        },
        (context) => {
          this.drawingUtils.drawRect({
            coordinates: tooltipBackgroundPosition,
            dimensions: {
              width: 120,
              height: 60,
            },
            context,
            fill: true,
          });
        }
      );

      this.drawingUtils.modifyContextStyleAndDraw(
        {
          opacity: 1,
          fontSize: this.chartDimensions.width * 0.04,
          textAlign: "left",
          fillStyle: color,
        },
        (context) => {
          this.drawingUtils.drawText({
            coordinates: {
              x: tooltipBackgroundPosition.x + 10,
              y: tooltipBackgroundPosition.y + 20,
            },
            text: `(${currentState.x.toLocaleString()}, ${currentState.y.toLocaleString()})`,
            context,
          });
          this.drawingUtils.drawText({
            coordinates: {
              x: currentState.x + 10,
              y: currentState.y + 50,
            },
            text: label,
            context,
          });
        }
      );
    }

    if (nextState) {
      // FORESHADOW
      this.drawingUtils.modifyContextStyleAndDraw(
        {
          fillStyle: "white",
          strokeStyle: color,
          opacity,
        },
        (context) => {
          this.drawingUtils.drawCircle({
            coordinates: nextState,
            xScale: xScaleNext,
            yScale,
            radius: futureRadius,
            fill: true,
            stroke: true,
            context,
          });
        }
      );
    }
  }

  getStateData(keys: string[]) {
    const items = _.pick(this.items, keys);

    return Object.entries(items)
      .map(
        (item: [string, { color: string; states: ScatterPlotItemState[] }]) => {
          const [label, { color, states }] = item;
          const startKeyFrame = this.keyframes.at(this.currentStateIndex);
          const startState = states.find(
            (state: ScatterPlotItemState) => state.keyframe === startKeyFrame
          );

          if (!startState) return;

          let endState: ScatterPlotItemState | undefined;

          if (this.nextStateIndex) {
            const endKeyframe = this.keyframes.at(this.nextStateIndex);
            endState = states.find(
              (state: ScatterPlotItemState) => state.keyframe === endKeyframe
            );
          }

          return {
            startState,
            endState,
            color,
            label,
          };
        }
      )
      .filter((point) => point !== undefined);
  }

  drawSelectedPoints({
    keys,
    xScale,
    xScaleNext,
    yScale,
  }: {
    keys: string[];
    xScale: ScaleFn;
    xScaleNext: ScaleFn;
    yScale: ScaleFn;
  }) {
    const { isInBound: isInForeshadowingBounds } = this.getForeshadowingInfo();
    const { isHighlighted: highlightInsideRadius } = this.getHighlightInfo();

    const extent = this.getExtentBasedOnAffect();
    this.getStateData(keys).forEach(
      ({ startState, endState, color, label }: any) => {
        const interpolatedData = this.interpolateBetweenStates({
          interpolateStep: extent,
          currentState: startState?.data,
          nextState: endState?.data,
        });

        const isHighlighted = highlightInsideRadius({
          position: {
            x: xScale(interpolatedData.x),
            y: yScale(interpolatedData.y),
          },
          radius: this.chartDimensions.width * 0.02,
        });

        const isForeshadowed = isInForeshadowingBounds(startState?.data);

        this.drawItem({
          currentState: startState.data,
          nextState: endState?.data,
          color,
          label,
          isForeshadowed,
          isHighlighted,
          xScale,
          xScaleNext,
          yScale,
        });
      }
    );
  }

  drawUnselectedPoints({
    keys,
    xScale,
    yScale,
  }: {
    keys: string[];
    xScale: ScaleFn;
    yScale: ScaleFn;
  }) {
    const extent = this.getExtentBasedOnAffect();
    this.getStateData(keys).forEach(({ startState, endState }: any) => {
      const interpolatedData = this.interpolateBetweenStates({
        interpolateStep: extent,
        currentState: startState?.data,
        nextState: endState?.data,
      });

      this.drawingUtils.modifyContextStyleAndDraw(
        {
          fillStyle: "grey",
        },
        (context: CanvasRenderingContext2D) => {
          this.drawingUtils.drawCircle({
            coordinates: interpolatedData,
            radius: 3,
            fill: true,
            context,
            xScale,
            yScale
          });
        }
      );
    });
  }

  drawKeyframeValue() {
    const keyframe = this.keyframes.at(this.currentStateIndex);
    if (keyframe) {
      this.drawingUtils.modifyContextStyleAndDraw(
        {
          fontSize: this.chartDimensions.width * 0.25,
          opacity: 0.2,
          fillStyle: "red",
        },
        (ctx: CanvasRenderingContext2D) => {
          const { width } = ctx.measureText(keyframe);
          this.drawingUtils.drawText({
            text: keyframe,
            coordinates: {
              x:
                this.position.x +
                this.chartDimensions.width * 0.5 -
                width * 0.5,
              y: this.position.y + this.chartDimensions.height * 0.6,
            },
            context: ctx,
          });
        }
      );
    }
  }

  clipDrawingArea(context: CanvasRenderingContext2D, isCurrent: boolean) {
    const { isRangeGesture, bounds, isRectGesture } =
      this.getForeshadowingInfo();
    if (isRangeGesture) {
      this.drawingUtils.clipRect({
        dimensions: bounds?.dimensions ?? { width: 0, height: 0 },
        coordinates: bounds?.position ?? { x: 0, y: 0 },
        context,
      });
    } else {
      let range = this.getRange(isRectGesture);
      if (!isCurrent && isRectGesture) {
        range = {
          ...range,
          xRange: range.xRangeNext,
        };
      }
      this.drawingUtils.drawRect({
        dimensions: {
          width: range.xRange[1] - range.xRange[0],
          height: range.yRange[1] - range.yRange[0],
        },
        coordinates: {
          x: range.xRange[0],
          y: range.yRange[0],
        },
        context,
        clip: true,
      });
    }
  }

  draw() {
    const { selectedItemsKeys, unselectedItemsKeys } = this.getItemKeys();
    const { isRectGesture } = this.getForeshadowingInfo();

    let xScale = this.xScale;
    let yScale = this.yScale;
    let xScaleNext = this.xScale;

    if (isRectGesture) {
      ({ xScale, yScale, xScaleNext } = this.getForeshadowingScales());
    }

    this.drawAxes({
      xScale,
      yScale,
      xScaleNext,
      isRectGesture,
    });

    // Draw Points
    this.drawSelectedPoints({
      keys: selectedItemsKeys,
      xScale,
      yScale,
      xScaleNext,
    });

    this.drawUnselectedPoints({
      keys: unselectedItemsKeys,
      xScale,
      yScale,
    });

    this.drawKeyframeValue();
  }
}
