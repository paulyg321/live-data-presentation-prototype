import type { Timer } from "d3";
import * as d3 from "d3";
import dayjs from "dayjs";
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
  ForeshadowingAreaData,
  ForeshadowingSettings,
  ScaleFn,
} from "../types";
import { NON_FOCUSED_COLOR } from "./Chart";
import { drawXAxis, drawYAxis } from "./draw-axes";

const parseTime = d3.timeParse("%Y-%m-%d");

export enum LineInterpolateStrategy {
  DROP = "drop", // current state will always start off chart at the top
  BASELINE = "baseline", // draw everything up until the extent between the current and next (all states drawn at once but revealed slowly)
  UNDULATE = "undulate", // draw everything but transition updates each point individually
  BASIC = "basic", // // draw everything up until the extent between the current and next
}

export type LineItemStates = {
  x: any;
  y: any;
}[][];

export interface LineChartConstructorArgs {
  items: Record<string, { color: string; states: LineItemStates }>;
  canvasDimensions: Dimensions;
  chartDimensions: Dimensions;
  position: Coordinate2D;
  drawingUtils: DrawingUtils;
}

export class LineChart {
  // CANVAS
  canvasDimensions: Dimensions;
  chartDimensions: Dimensions;
  position: Coordinate2D;
  drawingUtils: DrawingUtils;

  items: Record<string, { color: string; states: LineItemStates }>;
  currentStateIndex = 0;
  lastStateIndex = 0;
  firstStateIndex = 0;
  nextStateIndex: number | undefined;
  animationExtent = 0;

  foreshadowingSettings: ForeshadowingSettings | undefined;
  selectedItems: string[] = [];
  interpolateStrategy: LineInterpolateStrategy = LineInterpolateStrategy.BASIC;
  dataType:
    | {
        xType: "number" | "date" | undefined;
        yType: "number" | "date" | undefined;
      }
    | undefined;
  xScale: ScaleFn = defaultScale;
  yScale: ScaleFn = defaultScale;

  highlightPosition?: Coordinate2D;
  limitExtent = false;

  timer?: Timer;
  foreshadowingAnimationExtent = 1;

  constructor({
    items,
    canvasDimensions,
    chartDimensions,
    position,
    drawingUtils,
  }: LineChartConstructorArgs) {
    this.items = items;
    this.canvasDimensions = canvasDimensions;
    this.chartDimensions = chartDimensions;
    this.position = position;
    this.drawingUtils = drawingUtils;
    this.setStateCount();
    this.setStates("initialize");
    this.setScales();
  }

  // -------------------------------------- SETTERS --------------------------------------
  updateState({
    chartDimensions,
    canvasDimensions,
    extent,
    position,
    drawingUtils,
    highlightPosition,
  }: Partial<LineChartConstructorArgs> & {
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
    if (highlightPosition) {
      this.highlightPosition = highlightPosition;
    }
  }

  updateAnimation(animation: LineInterpolateStrategy) {
    this.interpolateStrategy = animation;
  }

  toggleLimitExtent() {
    this.limitExtent = !this.limitExtent;
  }

  setForeshadowing(foreshadowingSettings?: ForeshadowingSettings) {
    if (this.timer) return;
    if (foreshadowingSettings?.type === ForeshadowingAreaSubjectType.RANGE) {
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

  toggleSelection(key: string) {
    if (this.selectedItems.includes(key)) {
      this.selectedItems = this.selectedItems.filter((item: string) => {
        return item !== key;
      });
    } else {
      this.selectedItems = [...this.selectedItems, key];
    }
  }

  private interpolateBetweenStates({
    interpolateSteps,
    currentState,
    nextState,
  }: {
    interpolateSteps: number[];
    currentState: {
      x: any;
      y: any;
    }[];
    nextState?: {
      x: any;
      y: any;
    }[];
  }) {
    if (!nextState) return currentState;
    const differentUpdatesPerCoord = interpolateSteps.length > 1;
    const formatTime = d3.timeFormat("%Y-%m-%d");
    // Not all points are updated at the same rate so we update get the timestep from the passed array
    // boundedTimeSteps[index]
    const interPolatedState = currentState.map(
      (
        coordinate: {
          x: any;
          y: any;
        },
        index: number
      ) => {
        let interpolateStep: number;

        if (differentUpdatesPerCoord) {
          interpolateStep = interpolateSteps[index];
        } else {
          [interpolateStep] = interpolateSteps;
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

        const interpolatedCoord = {
          x:
            this.dataType?.xType === "date"
              ? formatTime(
                  d3.interpolateDate(
                    parseTime(x as unknown as string) ?? new Date(),
                    parseTime(xNext as unknown as string) ?? new Date()
                  )(interpolateStep)
                )
              : d3.interpolate(x, xNext)(interpolateStep),
          y:
            this.dataType?.yType === "date"
              ? formatTime(
                  d3.interpolateDate(
                    parseTime(y as unknown as string) ?? new Date(),
                    parseTime(yNext as unknown as string) ?? new Date()
                  )(interpolateStep)
                )
              : d3.interpolate(y, yNext)(interpolateStep),
        };

        return interpolatedCoord;
      }
    );

    return interPolatedState;
  }

  private setScales() {
    const { xDomain, yDomain } = this.getDomain();
    const { xRange, yRange } = this.getRange();

    let xScaleFn: any = d3.scaleLinear;
    let yScaleFn: any = d3.scaleLinear;

    if (this.dataType?.xType === "date") {
      xScaleFn = d3.scaleTime;
    }

    if (this.dataType?.yType === "date") {
      yScaleFn = d3.scaleTime;
    }

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
    const states: LineItemStates[] = _.values(this.items).map(
      (item: { color: string; states: LineItemStates }) => item.states
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

  private mergeAllStatesForItems(
    items: Record<
      string,
      {
        color: string;
        states: LineItemStates;
      }
    >
  ) {
    let lengthOfStates = 0;
    const itemsWithMergedStates = Object.entries(items).reduce(
      (
        currentMap: Record<
          string,
          {
            color: string;
            points: Coordinate2D[];
          }
        >,
        [key, value]: [
          string,
          {
            color: string;
            states: LineItemStates;
          }
        ]
      ) => {
        lengthOfStates = value.states[0].length;
        return {
          ...currentMap,
          [key]: {
            color: value.color,
            points: value.states.flat(1),
          },
        };
      },
      {} as Record<
        string,
        {
          color: string;
          points: Coordinate2D[];
        }
      >
    );
    return {
      items: itemsWithMergedStates,
      lengthOfStates,
    };
  }

  private convertPointsBasedOnTypes(
    xType: "date" | "number" | undefined,
    yType: "date" | "number" | undefined
  ) {
    return (value: { x: any; y: any }) => {
      let x = value.x;
      let y = value.y;

      if (xType === "date") {
        x = parseTime(value.x);
      }

      if (yType === "date") {
        y = parseTime(value.y);
      }
      return { x, y };
    };
  }

  // -------------------------------------- GETTERS --------------------------------------
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

  private getDataTypeForValues(values: { x: any; y: any }) {
    const { x, y } = values;

    let xType: "date" | "number" | undefined;
    let yType: "date" | "number" | undefined;

    if (typeof x === "string") {
      if (dayjs(x).isValid()) {
        xType = "date";
      } else {
        throw new Error("Type of x value unsupported");
      }
    } else if (typeof x === "number") {
      xType = "number";
    }

    if (typeof y === "string") {
      if (dayjs(y).isValid()) {
        yType = "date";
      } else {
        throw new Error("Type of y value unsupported");
      }
    } else if (typeof y === "number") {
      yType = "number";
    }

    return {
      xType,
      yType,
    };
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
    const xAccessor = (data: any) => data.x;
    const yAccessor = (data: any) => data.y;

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
    const states: LineItemStates[] = _.values(this.items).map(
      (item: { color: string; states: LineItemStates }) => item.states
    );
    let flattenedStates = states.flat(2);
    const dataTypes = this.getDataTypeForValues(flattenedStates[0]);

    flattenedStates = flattenedStates.map(
      this.convertPointsBasedOnTypes(dataTypes.xType, dataTypes.yType)
    );

    if (foreshadow && this.foreshadowingSettings?.area) {
      flattenedStates = flattenedStates.filter((value: { x: any; y: any }) => {
        const isInForeshadowingBounds = isInBound(
          value,
          this.foreshadowingSettings?.area as ForeshadowingAreaData,
          this.xScale,
          this.yScale
        );
        if (isInForeshadowingBounds) {
          return true;
        }
        return false;
      });
    }

    const xDomain = d3.extent(flattenedStates, xAccessor);
    const yDomain = d3.extent(flattenedStates, yAccessor);

    this.dataType = dataTypes;

    return {
      xDomain,
      yDomain,
    };
  }

  private getRange(
    type: "default" | "small-multiple" | "foreshadow-range" = "default"
  ): ChartRangeType {
    const chartBounds = this.getBounds();

    if (type === "small-multiple") {
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

    if (type === "foreshadow-range" && this.foreshadowingSettings) {
      return {
        xRange: [
          this.foreshadowingSettings.area.position.x,
          this.foreshadowingSettings.area.position.x +
            (this.foreshadowingSettings.area.dimensions?.width ?? 0),
        ],
        yRange: [chartBounds.y.start, chartBounds.y.end],
        xRangeNext: [
          this.foreshadowingSettings.area.position.x,
          this.foreshadowingSettings.area.position.x +
            (this.foreshadowingSettings.area.dimensions?.width ?? 0),
        ],
      };
    }

    return {
      xRange: [chartBounds.x.start, chartBounds.x.end],
      xRangeNext: [chartBounds.x.start, chartBounds.x.end],
      yRange: [chartBounds.y.start, chartBounds.y.end],
    };
  }

  // TODO: Return scales that plot only stuff that falls in the domain - googlw this!
  private getForeshadowingScales() {
    const { xDomain, yDomain } = this.getDomain(true);
    const isRectGesture =
      this.foreshadowingSettings?.type ===
      ForeshadowingAreaSubjectType.RECTANGLE;
    const rangeArg = isRectGesture ? "small-multiple" : "default";
    const { xRange, yRange, xRangeNext } = this.getRange(rangeArg);

    let xScaleFn: any = d3.scaleLinear;
    let yScaleFn: any = d3.scaleLinear;

    if (this.dataType?.xType === "date") {
      xScaleFn = d3.scaleTime;
    }

    if (this.dataType?.yType === "date") {
      yScaleFn = d3.scaleTime;
    }

    return {
      xScale: xScaleFn(xDomain, xRange),
      yScale: yScaleFn(yDomain, yRange),
      xScaleNext: xScaleFn(xDomain, xRangeNext),
    };
  }

  private getLineSettings({
    color,
    isSelected,
    isCurrent,
  }: {
    color?: string;
    isSelected: boolean;
    isCurrent: boolean;
  }): ModifyContextStyleArgs {
    const settings: ModifyContextStyleArgs = {};

    if (isSelected) {
      settings.fillStyle = color;
      settings.strokeStyle = color;
      settings.lineWidth = 2;
      settings.opacity = 0.7;
    } else {
      settings.fillStyle = NON_FOCUSED_COLOR;
      settings.strokeStyle = NON_FOCUSED_COLOR;
      settings.lineWidth = 1;
      settings.opacity = 0.3;
    }

    if (!isCurrent) {
      settings.lineDash = [4, 4];
    }

    return settings;
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
      radius: 5,
    };

    if (isSelected && isCurrent) {
      settings.fill = true;
      settings.radius = 7;

      settings.fillStyle = color;
      settings.lineWidth = 0;
      settings.opacity = 0.7;
    } else if (!isSelected && isCurrent) {
      settings.radius = 0;

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

  getExtentBasedOnInterpolateStrategy(coordCount?: number) {
    const currentExtent = this.animationExtent;

    switch (this.interpolateStrategy) {
      case LineInterpolateStrategy.BASIC:
        return [d3.easeLinear(currentExtent)];
      case LineInterpolateStrategy.DROP:
        return [d3.easeLinear(currentExtent)];
      case LineInterpolateStrategy.BASELINE:
        return [d3.easeLinear(currentExtent)];
      case LineInterpolateStrategy.UNDULATE: {
        let extentArray = Array.from(Array(coordCount)).map(() => 1);
        if (coordCount) {
          const modifiedExtent = currentExtent * coordCount;
          extentArray = Array.from(Array(coordCount)).map(
            (_: any, index: number) => {
              return d3.easeLinear(Math.min(modifiedExtent / (index + 1), 1));
            }
          );
        }
        return extentArray;
      }
      default:
        return [currentExtent];
    }
  }

  drawAxes({
    xScale,
    xScaleNext,
    yScale,
  }: {
    xScale: ScaleFn;
    xScaleNext: ScaleFn;
    yScale: ScaleFn;
  }) {
    const { isRectGesture } = this.getForeshadowingInfo();
    const axesRangeArg = isRectGesture ? "small-multiple" : "default";
    const range = this.getRange(axesRangeArg);
    /**
     * -------------------- DRAW AXES --------------------
     * */
    drawXAxis(this.drawingUtils, xScale, range.yRange[0], range.xRange, 12);
    drawYAxis(this.drawingUtils, yScale, range.xRange[0], range.yRange, 12);

    // Draw extra axes for small multiple view
    if (isRectGesture) {
      drawXAxis(
        this.drawingUtils,
        xScaleNext,
        range.yRange[0],
        range.xRangeNext,
        12
      );
      drawYAxis(
        this.drawingUtils,
        yScale,
        range.xRangeNext[0],
        range.yRange,
        12
      );
    }
  }

  drawPoints({
    coordinates,
    xScale,
    yScale,
    isSelected,
    isCurrent,
    color,
    range,
  }: {
    coordinates: Coordinate2D[];
    isSelected: boolean;
    isCurrent: boolean;
    color: string;
    xScale: ScaleFn;
    yScale: ScaleFn;
    range?: {
      xRange: [number, number];
      yRange: [number, number];
    };
  }) {
    const { fill, radius, stroke, ...settings } = this.getPointSettings({
      isSelected,
      isCurrent,
      color,
    });
    this.drawingUtils.modifyContextStyleAndDraw(
      {
        ...settings,
      },
      (context) => {
        if (range !== undefined) {
          const dimensions = {
            width: range.xRange[1] - range.xRange[0],
            height: range.yRange[0] - range.yRange[1],
          };
          const coordinates = {
            x: range.xRange[0],
            y: range.yRange[1],
          };
          this.drawingUtils.clipRect({
            dimensions,
            coordinates,
            context,
          });
        }
        coordinates.map((coordinate: Coordinate2D) => {
          const { isHighlighted: compareHighlight } = this.getHighlightInfo();
          const scaledPointPosition = {
            x: xScale(coordinate.x),
            y: yScale(coordinate.y),
          };

          const isHighlighted = compareHighlight({
            position: scaledPointPosition,
            radius: 20,
          });

          // draw our current state line
          this.drawingUtils.drawCircle({
            coordinates: coordinate,
            xScale,
            yScale,
            radius: isHighlighted ? radius * 2 : radius,
            fill,
            stroke,
            context,
          });

          if (isHighlighted) {
            const rectPosition = {
              x: scaledPointPosition.x + 20,
              y: scaledPointPosition.y + 20,
            };
            this.drawingUtils.modifyContextStyleAndDraw(
              {
                opacity: 1,
                fillStyle: "white",
              },
              (context) => {
                this.drawingUtils.drawRect({
                  coordinates: rectPosition,
                  dimensions: {
                    width: 90,
                    height: 30,
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
                    x: rectPosition.x + 5,
                    y: rectPosition.y + 20,
                  },
                  text: `(${coordinate.x.toLocaleString()}, ${coordinate.y.toLocaleString()})`,
                  context,
                });
              }
            );
          }
        });
      }
    );
  }

  getInterpolateStrategyInfo() {
    const isBaseline =
      this.interpolateStrategy === LineInterpolateStrategy.BASELINE;
    const isDrop = this.interpolateStrategy === LineInterpolateStrategy.DROP;
    const isBasic = this.interpolateStrategy === LineInterpolateStrategy.BASIC;
    return {
      isBaseline,
      isDrop,
      isBasic,
    };
  }

  drawSelectedLineItems({
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
    const selectedItems = _.pick(this.items, keys);
    const { isBaseline, isDrop } = this.getInterpolateStrategyInfo();

    let currentStateRange: ChartRangeType;
    let foreshadowingRange: ChartRangeType;

    const { isRectGesture, isRangeGesture } = this.getForeshadowingInfo();
    const isForeshadowing = isRectGesture || isRangeGesture;

    let lineRangeArg: "default" | "small-multiple" | "foreshadow-range" =
      "default";
    if (isRectGesture) lineRangeArg = "small-multiple";
    if (isRangeGesture) lineRangeArg = "foreshadow-range";
    const range = this.getRange(lineRangeArg);

    if (range) {
      currentStateRange = range;
      foreshadowingRange = {
        ...range,
        xRange: range.xRangeNext,
      };
    }

    if (this.dataType?.xType === "date") {
      const { items: itemsWithMergedStates } =
        this.mergeAllStatesForItems(selectedItems);

      Object.entries(itemsWithMergedStates).forEach(
        (
          selectedItem: [
            string,
            {
              color: string;
              points: {
                x: any;
                y: any;
              }[];
            }
          ]
        ) => {
          const [label, { color, points: coordinates }] = selectedItem;
          const parsedCoordinates = coordinates.map(
            this.convertPointsBasedOnTypes(
              this.dataType?.xType,
              this.dataType?.yType
            )
          );

          const extent = this.getExtentBasedOnInterpolateStrategy().at(-1) ?? 1;

          let currentBaselineXRange: [number, number] = [
            range.xRange[0],
            range.xRange[1] * extent,
          ];

          let foreshadowingBaselineXRange: [number, number] = [
            range.xRangeNext[0],
            range.xRangeNext[1],
          ];

          /**
           * Because on small multiple view (when we have isRectGesture as true,
           * we have separate charts we only adjust our foreshadowing clip range
           * by the extent for other scenarios
           */
          if (!isRectGesture) {
            foreshadowingBaselineXRange = [
              range.xRangeNext[1] * extent,
              range.xRangeNext[1],
            ];
          }

          const chartWidth = range.xRange[1] - range.xRange[0];
          const statesSectionWidth = chartWidth / (this.lastStateIndex + 1);

          if (this.limitExtent) {
            currentBaselineXRange = [
              range.xRange[0],
              range.xRange[0] +
                (statesSectionWidth * this.currentStateIndex +
                  statesSectionWidth * extent),
            ];
            if (!isRectGesture) {
              foreshadowingBaselineXRange = [
                range.xRangeNext[0] +
                  (statesSectionWidth * this.currentStateIndex +
                    statesSectionWidth * extent),
                range.xRangeNext[0] +
                  statesSectionWidth * this.currentStateIndex +
                  statesSectionWidth,
              ];
            } else {
              foreshadowingBaselineXRange = [
                range.xRangeNext[0],
                range.xRangeNext[0] +
                  (statesSectionWidth * this.currentStateIndex +
                    statesSectionWidth),
              ];
            }
          }

          currentStateRange = {
            ...range,
            xRange: currentBaselineXRange,
          };

          foreshadowingRange = {
            ...range,
            xRange: foreshadowingBaselineXRange,
          };

          // ------------- DRAW NORMAL - DATE ----------------------
          this.drawingUtils.modifyContextStyleAndDraw(
            {
              ...this.getLineSettings({
                color,
                isCurrent: true,
                isSelected: true,
              }),
            },
            (context) => {
              this.drawingUtils.drawLine({
                coordinates: parsedCoordinates,
                xScale,
                yScale,
                range: currentStateRange,
                filterMode: "clip",
                context,
              });
            }
          );
          this.drawPoints({
            // If we're foreshadowing we want to see the currentState not interpolated state
            coordinates: parsedCoordinates,
            xScale,
            yScale,
            isSelected: true,
            isCurrent: true,
            color,
            range: currentStateRange,
          });

          // ------------- DRAW FORESHADOW - DATE ----------------------
          if (isForeshadowing) {
            this.drawingUtils.modifyContextStyleAndDraw(
              {
                ...this.getLineSettings({
                  color,
                  isCurrent: false,
                  isSelected: true,
                }),
              },
              (context) => {
                this.drawingUtils.drawLine({
                  coordinates: parsedCoordinates,
                  xScale: xScaleNext,
                  yScale,
                  range: foreshadowingRange,
                  filterMode: "clip",
                  context,
                });
              }
            );

            this.drawPoints({
              // If we're foreshadowing we want to see the currentState not interpolated state
              coordinates: parsedCoordinates,
              xScale: xScaleNext,
              yScale,
              isSelected: true,
              isCurrent: false,
              color,
              range: foreshadowingRange,
            });
          }
        }
      );
      return;
    }

    Object.entries(selectedItems).forEach(
      (selectedItem: [string, { color: string; states: LineItemStates }]) => {
        const [_, { color, states: coordinates }] = selectedItem;
        let currentStateData = coordinates[this.currentStateIndex];
        const extent = this.getExtentBasedOnInterpolateStrategy(
          currentStateData.length
        );
        let nextStateData:
          | {
              x: any;
              y: any;
            }[]
          | undefined;

        if (isDrop) {
          nextStateData = currentStateData;
          currentStateData = currentStateData.map(
            (coords: { x: any; y: any }) => {
              return {
                ...coords,
                y: coords.y + this.chartDimensions.height,
              };
            }
          );
        } else if (isBaseline) {
          nextStateData = currentStateData;
          const currentItemsBaselineXRange: [number, number] = [
            range.xRange[0],
            range.xRange[1] * (extent.at(-1) ?? 1),
          ];
          currentStateRange = {
            ...range,
            xRange: currentItemsBaselineXRange,
          };
        } else {
          if (this.nextStateIndex) {
            nextStateData = coordinates[this.nextStateIndex];
          }
        }

        const primaryLineCoords = this.interpolateBetweenStates({
          interpolateSteps: extent,
          currentState: currentStateData,
          nextState: nextStateData,
        });

        // ------------- DRAW NORMAL ----------------------
        this.drawingUtils.modifyContextStyleAndDraw(
          {
            ...this.getLineSettings({
              color,
              isCurrent: true,
              isSelected: true,
            }),
          },
          (context) => {
            // draw our current state line
            this.drawingUtils.drawLine({
              coordinates: primaryLineCoords,
              xScale,
              yScale,
              range: currentStateRange,
              filterMode: "clip",
              context,
            });
          }
        );

        const defaultCoords = isForeshadowing
          ? currentStateData
          : primaryLineCoords;

        this.drawPoints({
          // If we're foreshadowing we want to see the currentState not interpolated state
          coordinates: primaryLineCoords,
          xScale,
          yScale,
          isSelected: true,
          isCurrent: true,
          color,
          range: currentStateRange,
        });

        // ------------- DRAW NEXT STATE ----------------------
        if (isForeshadowing && nextStateData) {
          // Only do this for range gesture - otherwise extent doesn't affect foreshadowing
          // if (isRangeGesture) {
          //   const foreshadowItemsBaselineXRange: [number, number] = [
          //     range.xRangeNext[1] * (extent.at(-1) ?? 1),
          //     range.xRangeNext[1],
          //   ];
          //   foreshadowingRange = {
          //     ...range,
          //     // xRange: foreshadowItemsBaselineXRange,
          //   };
          // }

          this.drawingUtils.modifyContextStyleAndDraw(
            {
              ...this.getLineSettings({
                color,
                isCurrent: false,
                isSelected: true,
              }),
            },
            (context) => {
              // Draw our next state line
              this.drawingUtils.drawLine({
                coordinates: nextStateData as {
                  x: any;
                  y: any;
                }[],
                xScale: xScaleNext,
                yScale,
                range: foreshadowingRange,
                filterMode: "clip",
                context,
              });
            }
          );

          this.drawPoints({
            coordinates: nextStateData,
            xScale: xScaleNext,
            yScale,
            isSelected: true,
            isCurrent: false,
            color,
            range: foreshadowingRange,
          });
        }
      }
    );
  }

  drawUnselectedLineItems({
    keys,
    xScale,
    yScale,
  }: {
    keys: string[];
    xScale: ScaleFn;
    yScale: ScaleFn;
  }) {
    const unselectedItems = _.pick(this.items, keys);

    Object.entries(unselectedItems).forEach(
      (unselectedItem: [string, { color: string; states: LineItemStates }]) => {
        const [_, { states: coordinates }] = unselectedItem;
        const isSelected = false;

        const currentStateData = coordinates[this.currentStateIndex];
        let nextStateData:
          | {
              x: any;
              y: any;
            }[]
          | undefined;

        if (this.nextStateIndex) {
          nextStateData = coordinates[this.nextStateIndex];
        }

        const primaryLineCoords = this.interpolateBetweenStates({
          interpolateSteps: [this.animationExtent],
          currentState: currentStateData,
          nextState: nextStateData,
        });

        // Draw primaryline & points
        this.drawingUtils.modifyContextStyleAndDraw(
          {
            ...this.getLineSettings({
              isCurrent: true,
              isSelected: isSelected,
            }),
          },
          (context) =>
            this.drawingUtils.drawLine({
              coordinates: primaryLineCoords,
              xScale,
              yScale,
              context,
            })
        );

        // NO NEED TO DRAW FORESHADOW FOR UNSELECTED ITEMS
      }
    );
  }

  draw() {
    const { selectedItemsKeys, unselectedItemsKeys } = this.getItemKeys();
    const { isRectGesture, isRangeGesture } = this.getForeshadowingInfo();

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
    });

    this.drawSelectedLineItems({
      keys: selectedItemsKeys,
      xScale,
      yScale,
      xScaleNext,
    });
    if (!isRectGesture && !isRangeGesture) {
      this.drawUnselectedLineItems({
        keys: unselectedItemsKeys,
        xScale,
        yScale,
      });
    }
  }
}
