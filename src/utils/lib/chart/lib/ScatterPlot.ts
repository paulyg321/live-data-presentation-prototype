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
  }: Partial<ScatterPlotConstructorArgs> & {
    extent?: number;
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
  }

  setForeshadowing(foreshadowingSettings?: ForeshadowingSettings) {
    this.foreshadowingSettings = foreshadowingSettings;
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
      const halfChartWidth = (chartBounds.x.end - chartBounds.x.start) / 2;
      const halfChartHeight = (chartBounds.y.start - chartBounds.y.end) / 2;
      const leftMargin = this.chartDimensions.margin?.left ?? 0;
      const rangeData: ChartRangeType = {
        xRange: [
          chartBounds.x.start,
          chartBounds.x.start + halfChartWidth - leftMargin,
        ],
        yRange: [halfChartHeight, chartBounds.y.end],
        xRangeNext: [
          chartBounds.x.start + leftMargin + halfChartWidth,
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
    range,
    isRectGesture,
  }: {
    xScale: ScaleFn;
    xScaleNext: ScaleFn;
    yScale: ScaleFn;
    range: ChartRangeType;
    isRectGesture: boolean;
  }) {
    /**
     * -------------------- DRAW AXES --------------------
     * */
    drawXAxis(this.drawingUtils, xScale, range.yRange[0], range.xRange, 10, 4);
    drawYAxis(this.drawingUtils, yScale, range.xRange[0], range.yRange, 12, 5);

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
    pointsData,
    xScale,
    yScale,
    isSelected,
    isCurrent,
    range,
  }: {
    pointsData: {
      coordinates: Coordinate2D;
      color: string;
    }[];
    isSelected: boolean;
    isCurrent: boolean;
    xScale: ScaleFn;
    yScale: ScaleFn;
    range?: {
      xRange: [number, number];
      yRange: [number, number];
    };
  }) {
    pointsData.forEach(
      ({
        color,
        coordinates,
      }: {
        color: string;
        coordinates: Coordinate2D;
      }) => {
        const { fill, radius, stroke, ...settings } = this.getPointSettings({
          isSelected,
          isCurrent,
          color,
        });
        this.drawingUtils.modifyContextStyleAndDraw(settings, (context) => {
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
          this.drawingUtils.drawCircle({
            coordinates: coordinates,
            xScale,
            yScale,
            radius,
            fill,
            stroke,
            context,
          });
        });
      }
    );
  }

  drawSelectedPoints({
    keys,
    xScale,
    xScaleNext,
    yScale,
    range,
    isForeshadowing,
    isRangeGesture,
    isRectGesture,
  }: {
    keys: string[];
    xScale: ScaleFn;
    xScaleNext: ScaleFn;
    yScale: ScaleFn;
    range: ChartRangeType;
    isForeshadowing: boolean;
    isRangeGesture: boolean;
    isRectGesture: boolean;
  }) {
    const isSelected = true;
    const selectedItems = _.pick(this.items, keys);

    let hasNextState = false;

    let currentStateRange: ChartRangeType | undefined;
    let foreshadowingRange: ChartRangeType | undefined;
    let keyframe: string | undefined;

    if (range) {
      currentStateRange = range;
      foreshadowingRange = {
        ...range,
        xRange: range.xRangeNext,
      };
    }

    const extent = this.getExtentBasedOnAffect();

    const pointsToDraw = Object.entries(selectedItems)
      .map(
        (
          selectedItem: [
            string,
            { color: string; states: ScatterPlotItemState[] }
          ]
        ) => {
          const [_, { color, states }] = selectedItem;
          const currentKeyframe = this.keyframes.at(this.currentStateIndex);
          const currentState = states.find(
            (state: ScatterPlotItemState) => state.keyframe === currentKeyframe
          );

          if (!currentState) return;

          let nextState: ScatterPlotItemState | undefined;

          if (this.nextStateIndex) {
            const nextKeyframe = this.keyframes.at(this.nextStateIndex);
            nextState = states.find(
              (state: ScatterPlotItemState) => state.keyframe === nextKeyframe
            );
            hasNextState = true;
          }

          const interpolatedData = this.interpolateBetweenStates({
            interpolateStep: extent,
            currentState: currentState.data,
            nextState: nextState?.data,
          });

          return {
            currentStateData: currentState.data,
            nextStateData: nextState?.data,
            interpolatedData,
            color,
          };
        }
      )
      .filter((point) => point !== undefined);

    // ------------- DRAW NORMAL ----------------------
    this.drawPoints({
      // If we're foreshadowing we want to see the currentState not interpolated state
      pointsData: pointsToDraw.map((points) => ({
        color: points!.color,
        coordinates: points!.interpolatedData,
      })),
      xScale,
      yScale,
      isSelected,
      isCurrent: true,
      range: currentStateRange,
    });

    // ------------- DRAW NEXT STATE ----------------------
    if (isForeshadowing && hasNextState) {
      this.drawPoints({
        pointsData: pointsToDraw.map((points) => ({
          color: points!.color,
          coordinates: points!.nextStateData as Coordinate2D,
        })),
        xScale: xScaleNext,
        yScale,
        isSelected,
        isCurrent: false,
        range: foreshadowingRange,
      });
    }

    return keyframe;
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
            context: ctx
          });
        }
      );
    }
  }

  draw() {
    const { selectedItemsKeys, unselectedItemsKeys } = this.getItemKeys();
    const foreshadowing = this.foreshadowingSettings;
    const range = this.getRange(!!foreshadowing);
    const isRectGesture =
      foreshadowing?.type === ForeshadowingAreaSubjectType.RECTANGLE;
    const isRangeGesture =
      foreshadowing?.type === ForeshadowingAreaSubjectType.RANGE;

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
      range,
    });

    if (isRangeGesture) {
      this.drawingUtils.drawInContext((context) => {
        this.drawingUtils.clipRect({
          dimensions: foreshadowing.area.dimensions ?? { width: 0, height: 0 },
          coordinates: foreshadowing.area.position,
          context,
        });
      })
    }

    // Draw Points
    this.drawSelectedPoints({
      keys: selectedItemsKeys,
      xScale,
      yScale,
      xScaleNext,
      range,
      isForeshadowing: !!foreshadowing,
      isRangeGesture,
      isRectGesture,
    });

    this.drawKeyframeValue();
  }
}
