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
import { ForeshadowingAreaSubjectType } from "../../gestures";
import type {
  ChartRangeType,
  Coordinate2D,
  Dimensions,
  ForeshadowingSettings,
  ScaleFn,
} from "../types";
import { NON_FOCUSED_COLOR } from "./Chart";
import { drawXAxis, drawYAxis } from "./draw-axes";

export interface BarChartItemState {
  data: Coordinate2D;
  keyframe: string;
}

export interface BarChartConstructorArgs {
  items: Record<string, { color: string; states: BarChartItemState[] }>;
  canvasDimensions: Dimensions;
  chartDimensions: Dimensions;
  position: Coordinate2D;
  context: CanvasRenderingContext2D;
  keyframes: string[];
}

export class BarChart {
  // CANVAS
  canvasDimensions: Dimensions;
  chartDimensions: Dimensions;
  position: Coordinate2D;
  context: CanvasRenderingContext2D;
  drawingUtils: DrawingUtils;

  items: Record<string, { color: string; states: BarChartItemState[] }>;
  currentStateIndex = 0;
  lastStateIndex = 0;
  firstStateIndex = 0;
  nextStateIndex: number | undefined;
  animationExtent = 0;
  keyframes: string[];

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
    keyframes,
  }: BarChartConstructorArgs) {
    this.items = items;
    this.canvasDimensions = canvasDimensions;
    this.chartDimensions = chartDimensions;
    this.position = position;
    this.context = context;
    this.drawingUtils = new DrawingUtils(this.context);
    this.keyframes = keyframes;
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
    position,
  }: Partial<BarChartConstructorArgs> & {
    extent?: number;
  }) {
    if (chartDimensions) {
      this.chartDimensions = chartDimensions;
      this.setScales();
    }
    if (position) {
      this.position = position;
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
    const yScaleFn: any = d3.scaleLinear;

    this.xScale = xScaleFn(xDomain, xRange);
    this.yScale = yScaleFn(yDomain, yRange);
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
    const DEFAULT_FIRST_STATE = 0;
    const numberOfStates = this.keyframes.length;

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
    const xAccessor = (data: any) => data.data.x;
    const yAccessor = (data: any) => data.data.y;

    return {
      xAccessor,
      yAccessor,
    };
  }

  private getDomain(): {
    xDomain: [any, any];
    yDomain: number[];
    yDomainLinear?: any[];
  } {
    const { xAccessor } = this.getAccessors();
    const states: BarChartItemState[][] = _.values(this.items).map(
      (item: { color: string; states: BarChartItemState[] }) => item.states
    );
    const flattenedStates = states.flat(1);

    const xDomain = d3.extent(flattenedStates, xAccessor);
    const yDomain = [5, 0];

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
    drawXAxis(this.context, xScale, range.yRange[0], range.xRange, FONT_SIZE);
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
      currentState?: Coordinate2D;
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
        currentState
      }: {
        label: string;
        color: string;
        coordinates: Coordinate2D;
        currentState?: Coordinate2D;
      }) => {
        if (coordinates) {
          const rectDimensions = {
            height: yScale(coordinates.y) - yScale(coordinates.y + 1) + 5,
            width: xScale(coordinates.x),
          };

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
              dimensions: rectDimensions,
              fill,
              stroke,
            });
          });

          const textPosition = {
            x: xScale(18000),
            y: yScale(coordinates.y) + rectDimensions.height * 0.625,
          };

          this.drawingUtils.modifyContextStyleAndDraw(
            {
              fillStyle: "white",
              fontSize: 12,
              opacity: 1,
              textAlign: "left",
            },
            () => {
              this.drawingUtils.drawText({
                coordinates: textPosition,
                text: label,
              });
            }
          );

          const rankLabelPosition = {
            x: xScale(10000),
            y: yScale(coordinates.y) + rectDimensions.height * 0.625,
          };

          this.drawingUtils.modifyContextStyleAndDraw(
            {
              fillStyle: "white",
              opacity: 1,
            },
            () => {
              this.drawingUtils.drawCircle({
                coordinates: {
                  ...rankLabelPosition,
                  y: yScale(coordinates.y) + 5 + rectDimensions.height * 0.625,
                },
                radius: 12,
                fill: true,
              });
            }
          );

          const useImplicit = !isCurrent && coordinates.y > 5;

          this.drawingUtils.modifyContextStyleAndDraw(
            {
              fillStyle: useImplicit ? "white" : color,
              fontSize: useImplicit ? 16 : 12,
              opacity: 1,
              textAlign: useImplicit ? "left" : "center",
            },
            () => {
              const foreshadowLabelPosition = {
                x: xScale(currentState?.x ?? 0) + 10,
                y: yScale(currentState?.y ?? 0) + rectDimensions.height / 2,
              };

              let drawTextData = {
                coordinates: rankLabelPosition,
                text: Math.floor(coordinates.y).toString(),
              };

              if (useImplicit) {
                drawTextData = {
                  coordinates: foreshadowLabelPosition,
                  text: `${label} moves to position ${Math.floor(
                    coordinates.y
                  ).toString()}`,
                };
              }

              this.drawingUtils.drawText(drawTextData);
            }
          );
        }
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
    let foreshadowedRects: {
      currentStateData: BarChartItemState;
      nextStateData: BarChartItemState | undefined;
      interpolatedData: {
        x: any;
        y: any;
      };
      color: string;
      label: string;
    }[] = [];

    let hasNextState = false;

    let currentStateRange: ChartRangeType | undefined;

    const extent = this.getExtentBasedOnInterpolateStrategy();

    const selectedRects = Object.entries(selectedItems).map(
      (
        selectedItem: [string, { color: string; states: BarChartItemState[] }]
      ) => {
        const [label, { color, states }] = selectedItem;
        const currentKeyframe = this.keyframes.at(this.currentStateIndex);
        let currentStateData = states.find(
          (state: BarChartItemState) => state.keyframe === currentKeyframe
        );
        let nextStateData: BarChartItemState | undefined;

        if (this.nextStateIndex) {
          const nextKeyframe = this.keyframes.at(this.nextStateIndex);
          nextStateData = states.find(
            (state: BarChartItemState) => state.keyframe === nextKeyframe
          );
          hasNextState = true;
        }

        if (!currentStateData?.data) {
          currentStateData = {
            data: { x: 0, y: 300 },
            keyframe: currentKeyframe ?? "",
          };
        }

        const interpolatedData = this.interpolateBetweenStates({
          interpolateStep: extent,
          currentState: currentStateData?.data,
          nextState: nextStateData?.data,
        });

        const rectData = {
          currentStateData,
          nextStateData,
          interpolatedData,
          color,
          label,
        };

        const rectDimensions = {
          height:
            yScale(currentStateData.data.y) -
            yScale(currentStateData.data.y + 1) +
            5,
          width: xScale(currentStateData.data.x),
        };

        const rectCorners = [
          { x: xScale(0), y: yScale(currentStateData.data.y) },
          {
            x: xScale(0),
            y: yScale(currentStateData.data.y) + rectDimensions.height,
          },
          {
            x: xScale(0) + rectDimensions.width,
            y: yScale(currentStateData.data.y),
          },
          {
            x: xScale(0) + rectDimensions.width,
            y: yScale(currentStateData.data.y) + rectDimensions.height,
          },
        ];

        const isInForeshadowingBounds = rectCorners.reduce(
          (isBounded: boolean, currentCorner: Coordinate2D) => {
            if (isRectGesture) {
              const bounds = {
                position: this.foreshadowingSettings!.area.position,
                dimensions: this.foreshadowingSettings!.area.dimensions,
              };
              const isWithinBounds = isInBound(currentCorner, bounds);
              if (isWithinBounds) {
                return isBounded;
              }
            }
            return false;
          },
          true
        );

        if (isInForeshadowingBounds) {
          foreshadowedRects = [...foreshadowedRects, rectData];
        }

        return rectData;
      }
    );

    // ------------- DRAW NORMAL ----------------------
    this.drawRects({
      rectData: selectedRects.map((rect) => ({
        label: rect.label,
        color: rect.color,
        coordinates: rect.interpolatedData,
      })),
      xScale,
      yScale,
      isSelected,
      isCurrent: true,
      range: currentStateRange,
    });

    // ------------- DRAW NEXT STATE ----------------------
    if (isForeshadowing && hasNextState) {
      this.drawRects({
        rectData: foreshadowedRects.map((rect) => ({
          color: rect.color,
          coordinates: rect.nextStateData!.data,
          label: rect.label,
          currentState: rect.currentStateData.data,
        })),
        xScale,
        yScale,
        isSelected,
        isCurrent: false,
      });
    }
  }

  drawKeyframeValue() {
    const keyframe = this.keyframes.at(this.currentStateIndex);
    const textPadding = 15;
    if (keyframe) {
      this.drawingUtils.modifyContextStyleAndDraw(
        {
          fontSize: this.chartDimensions.width * 0.15,
          opacity: 0.2,
          fillStyle: "red",
          textAlign: "right",
        },
        () => {
          this.drawingUtils.drawText({
            text: keyframe,
            coordinates: {
              x:
                this.chartDimensions.width -
                (this.chartDimensions.margin?.right ?? 0) -
                textPadding,
              y:
                this.chartDimensions.height -
                (this.chartDimensions.margin?.bottom ?? 0) -
                textPadding,
            },
          });
        }
      );
    }
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

    this.drawingUtils.clearAndClipRect({
      dimensions: {
        width: range.xRange[1] - range.xRange[0],
        height: range.yRange[1] - range.yRange[0],
      },
      coordinates: {
        x: range.xRange[0],
        y: range.yRange[0],
      },
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
    this.drawKeyframeValue();
  }
}
