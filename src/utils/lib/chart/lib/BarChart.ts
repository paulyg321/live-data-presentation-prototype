import * as d3 from "d3";
import _ from "lodash";
import { isInBound } from "../../calculations";
import {
  defaultScale,
  DrawingUtils,
  type DrawCircleArgs,
  type DrawRectArgs,
  type ModifyContextStyleArgs,
} from "../../drawing";
import {
  ForeshadowingAreaSubjectType,
  type ForeshadowingAreaData,
} from "../../gestures";
import type {
  ChartRangeType,
  Coordinate2D,
  Dimensions,
  ForeshadowingSettings,
  ScaleFn,
} from "../types";
import { NON_FOCUSED_COLOR } from "./Chart";
import { drawXAxis, drawYAxis } from "./draw-axes";

export interface BarChartConstructorArgs {
  items: Record<string, { color: string; states: Coordinate2D[] }>;
  canvasDimensions: Dimensions;
  chartDimensions: Dimensions;
  position: Coordinate2D;
  context: CanvasRenderingContext2D;
}

export class BarChart {
  // CANVAS
  canvasDimensions: Dimensions;
  chartDimensions: Dimensions;
  position: Coordinate2D;
  context: CanvasRenderingContext2D;
  drawingUtils: DrawingUtils;

  items: Record<string, { color: string; states: Coordinate2D[] }>;
  currentStateIndex = 0;
  lastStateIndex = 0;
  firstStateIndex = 0;
  nextStateIndex: number | undefined;
  animationExtent = 0;

  foreshadowingSettings: ForeshadowingSettings | undefined;
  selectedItems: string[] = [];
  xScale: ScaleFn = defaultScale;
  yScale: ScaleFn = defaultScale;

  constructor({
    items,
    canvasDimensions,
    chartDimensions,
    position,
    context,
  }: BarChartConstructorArgs) {
    this.items = items;
    this.canvasDimensions = canvasDimensions;
    this.chartDimensions = chartDimensions;
    this.position = position;
    this.context = context;
    this.drawingUtils = new DrawingUtils(this.context);
    this.setStateCount();
    this.setStates("initialize");
    this.setScales();
  }

  // -------------------------------------- SETTERS --------------------------------------
  updateState({
    chartDimensions,
    canvasDimensions,
    context,
    extent,
  }: Partial<BarChartConstructorArgs> & {
    extent?: number;
  }) {
    if (chartDimensions) {
      this.chartDimensions = chartDimensions;
      this.setScales();
    }
    if (canvasDimensions) {
      this.canvasDimensions = canvasDimensions;
    }
    if (context) {
      this.context = context;
      this.drawingUtils = new DrawingUtils(this.context);
    }
    if (extent) {
      this.animationExtent = extent;
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
    const yScaleFn: any = d3.scaleBand;

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
    const states: Coordinate2D[][] = _.values(this.items).map(
      (item: { color: string; states: Coordinate2D[] }) => item.states
    );

    let maxStates = 0;
    const sampleItem = states.forEach(state => {
        maxStates = Math.max(state.length, maxStates)
    });

    
      const DEFAULT_FIRST_STATE = 0;
      const numberOfStates = maxStates;

      this.firstStateIndex = DEFAULT_FIRST_STATE;
      this.lastStateIndex = numberOfStates - 1;
    // } else {
      // TODO: HANDLE ERROR
    // }
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
        this.animationExtent = 1;
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
    const xAccessor = (data: any) => data.x;
    const yAccessor = (data: any) => data.y;

    return {
      xAccessor,
      yAccessor,
    };
  }

  private getDomain(): {
    xDomain: [any, any];
    yDomain: number[];
  } {
    const { xAccessor } = this.getAccessors();
    const states: Coordinate2D[][] = _.values(this.items).map(
      (item: { color: string; states: Coordinate2D[] }) => item.states
    );
    const flattenedStates = states.flat(1);

    const xDomain = d3.extent(flattenedStates, xAccessor);
    const yDomain = d3.range(1, 6).reverse();

    return {
      xDomain,
      yDomain,
    };
  }

  private getRange(): ChartRangeType {
    const chartBounds = this.getBounds();

    return {
      xRange: [chartBounds.x.start, chartBounds.x.end],
      xRangeNext: [chartBounds.x.start, chartBounds.x.end],
      yRange: [chartBounds.y.start, chartBounds.y.end],
    };
  }

  private getRectSettings({
    color,
    isSelected,
    isCurrent,
  }: {
    color?: string;
    isSelected: boolean;
    isCurrent: boolean;
  }): ModifyContextStyleArgs & Pick<DrawRectArgs, "fill" | "stroke"> {
    const settings: ModifyContextStyleArgs &
      Pick<DrawRectArgs, "fill" | "stroke"> = {};

    if (isSelected && isCurrent) {
      settings.fill = true;

      settings.fillStyle = color;
      settings.lineWidth = 0;
      settings.opacity = 0.7;
    } else if (!isSelected && isCurrent) {
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

  getExtentBasedOnInterpolateStrategy() {
    return this.animationExtent;
  }

  drawAxes({
    xScale,
    yScale,
    range,
  }: {
    xScale: ScaleFn;
    yScale: ScaleFn;
    range: ChartRangeType;
  }) {
    /**
     * -------------------- DRAW AXES --------------------
     * */
    const FONT_SIZE = 12;
    const TICK_COUNT = 10;
    drawXAxis(this.context, xScale, range.yRange[0], range.xRange, FONT_SIZE);
    drawYAxis(
      this.context,
      yScale,
      range.xRange[0],
      range.yRange,
      FONT_SIZE,
      TICK_COUNT,
      true
    );
  }

  drawRects({
    rectData,
    xScale,
    yScale,
    isSelected,
    isCurrent,
    range,
  }: {
    rectData: {
      label: string;
      coordinates: Coordinate2D;
      color: string;
    }[];
    isSelected: boolean;
    isCurrent: boolean;
    xScale: ScaleFn;
    yScale: any;
    range?: {
      xRange: [number, number];
      yRange: [number, number];
    };
  }) {
    rectData.forEach(
      ({
        label,
        color,
        coordinates,
      }: {
        label: string;
        color: string;
        coordinates: Coordinate2D;
      }) => {
        const { fill, stroke, ...settings } = this.getRectSettings({
          isSelected,
          isCurrent,
          color,
        });
        this.drawingUtils.modifyContextStyleAndDraw(settings, () => {
          this.drawingUtils.drawRect({
            coordinates: {
              x: 0,
              y: coordinates.y,
            },
            xScale,
            yScale,
            dimensions: {
              width:
                (this.chartDimensions.margin?.left ?? 0) +
                xScale(coordinates.x),
              height: yScale.bandwidth(),
            },
            fill,
            stroke,
          });
        });
        this.drawingUtils.modifyContextStyleAndDraw(
          {
            fillStyle: "black",
            fontSize: 12,
            opacity: 1,
            textAlign: "left",
          },
          () => {
            this.drawingUtils.drawText({
              coordinates: {
                x: xScale(coordinates.x),
                y: yScale(coordinates.y) + yScale.bandwidth() / 2 + 5,
              },
              text: label,
            });
          }
        );
      }
    );
  }

  drawSelectedRects({
    keys,
    xScale,
    yScale,
    range,
    isForeshadowing,
    isRectGesture,
  }: {
    keys: string[];
    xScale: ScaleFn;
    yScale: ScaleFn;
    range: ChartRangeType;
    isForeshadowing: boolean;
    isRectGesture: boolean;
  }) {
    const isSelected = true;
    const selectedItems = _.pick(this.items, keys);

    let hasNextState = false;

    let currentStateRange: ChartRangeType | undefined;

    const extent = this.getExtentBasedOnInterpolateStrategy();

    const pointsToDraw = Object.entries(selectedItems).map(
      (selectedItem: [string, { color: string; states: Coordinate2D[] }]) => {
        const [label, { color, states: coordinates }] = selectedItem;
        const currentStateData = coordinates[this.currentStateIndex];
        let nextStateData: Coordinate2D | undefined;

        if (this.nextStateIndex) {
          nextStateData = coordinates[this.nextStateIndex];
          hasNextState = true;
        }

        const interpolatedData = this.interpolateBetweenStates({
          interpolateStep: extent,
          currentState: currentStateData,
          nextState: nextStateData,
        });

        // console.log({
        //     coordinates,
        //     next: this.nextStateIndex
        // })

        return {
          currentStateData,
          nextStateData,
          interpolatedData,
          color,
          label,
        };
      }
    );

    // ------------- DRAW NORMAL ----------------------
    this.drawRects({
      // If we're foreshadowing we want to see the currentState not interpolated state
      rectData: pointsToDraw.map((points) => ({
        label: points.label,
        color: points.color,
        coordinates: points.interpolatedData,
      })),
      xScale,
      yScale,
      isSelected,
      isCurrent: true,
      range: currentStateRange,
    });

    // ------------- DRAW NEXT STATE ----------------------
    // if (isForeshadowing && hasNextState) {
    //   this.drawRects({
    //     rectData: pointsToDraw.map((points) => ({
    //       color: points.color,
    //       coordinates: points.nextStateData as Coordinate2D,
    //     })),
    //     xScale: xScaleNext,
    //     yScale,
    //     isSelected,
    //     isCurrent: false,
    //     range: foreshadowingRange,
    //   });
    // }
  }

  draw() {
    this.context.save();
    const { selectedItemsKeys, unselectedItemsKeys } = this.getItemKeys();
    const foreshadowing = this.foreshadowingSettings;
    const range = this.getRange();
    const isRectGesture =
      foreshadowing?.type === ForeshadowingAreaSubjectType.RECTANGLE;

    const xScale = this.xScale;
    const yScale = this.yScale;

    this.drawingUtils.clearArea({
      coordinates: {
        x: 0,
        y: 0,
      },
      dimensions: this.canvasDimensions,
    });

    this.drawAxes({
      xScale,
      yScale,
      range,
    });

    // Draw Rects
    this.drawSelectedRects({
      keys: selectedItemsKeys,
      xScale,
      yScale,
      range,
      isForeshadowing: !!foreshadowing,
      isRectGesture,
    });

    this.context.restore();
    requestAnimationFrame(() => this.draw());
  }
}
