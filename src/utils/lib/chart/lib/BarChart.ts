import type { Timer } from "d3";
import * as d3 from "d3";
import _ from "lodash";
import { isInBound } from "../../calculations";
import {
  defaultScale,
  DrawingUtils,
  LineShape,
  type DrawRectArgs,
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
} from "../types";
import { NON_FOCUSED_COLOR } from "./Chart";
import { drawXAxis } from "./draw-axes";

// excluded
const MAX_DOMAIN_Y = 6;
// included
const MIN_DOMAIN_Y = 1;

export interface BarChartItemState {
  data: Coordinate2D;
  keyframe: string;
}

export interface BarChartConstructorArgs {
  items: Record<string, { color: string; states: BarChartItemState[] }>;
  canvasDimensions: Dimensions;
  chartDimensions: Dimensions;
  position: Coordinate2D;
  drawingUtils: DrawingUtils;
  keyframes: string[];
}

export class BarChart {
  // CANVAS
  canvasDimensions: Dimensions;
  chartDimensions: Dimensions;
  position: Coordinate2D;
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

  highlightPosition?: Coordinate2D;
  timer?: Timer;
  foreshadowingAnimationExtent = 1;

  constructor({
    items,
    canvasDimensions,
    chartDimensions,
    position,
    keyframes,
    drawingUtils,
  }: BarChartConstructorArgs) {
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
    position,
    highlightPosition,
  }: Partial<BarChartConstructorArgs> & {
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

  setForeshadowing(foreshadowingSettings?: ForeshadowingSettings) {
    if (this.timer) return;
    this.foreshadowingSettings = foreshadowingSettings;
    this.foreshadowingAnimationExtent = 0;
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
    currentState: Coordinate2D;
    nextState?: Coordinate2D;
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
        end: position.y + dimensions.height - dimensions.margin.bottom,
        start: position.y + dimensions.margin.top,
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
    // Adjust based on where you want to start and end;
    const yDomain = [MIN_DOMAIN_Y, MAX_DOMAIN_Y];

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
    drawXAxis(
      this.drawingUtils,
      xScale,
      range.yRange[1],
      range.xRange,
      FONT_SIZE
    );
  }

  createRectDataFromCoordinate({
    coordinate,
    yScale = defaultScale,
    xScale = defaultScale,
  }: {
    coordinate: Coordinate2D;
    xScale?: (value: number) => number;
    yScale?: (value: number) => number;
  }) {
    const margin = 5;
    const nextRectPosition = {
      y: coordinate.y + 1,
    };

    const top = yScale(coordinate.y);
    const bottom = yScale(nextRectPosition.y) - margin;
    const left = xScale(0);
    const right = xScale(coordinate.x);

    const topLeft = {
      x: left,
      y: top,
    };

    const topRight = {
      x: right,
      y: top,
    };
    const bottomLeft = {
      x: left,
      y: bottom,
    };
    const bottomRight = {
      x: right,
      y: bottom,
    };

    const rectDimensions = {
      height: yScale(nextRectPosition.y) - yScale(coordinate.y) - margin,
      width: xScale(coordinate.x) - xScale(0),
    };

    return {
      rectDimensions,
      topLeft,
      topRight,
      bottomLeft,
      bottomRight,
    };
  }

  drawBars({
    rectData,
    xScale,
    yScale,
    isSelected,
  }: {
    rectData: {
      label: string;
      currentState: Coordinate2D;
      color: string;
      nextState?: Coordinate2D;
      isForeshadowed: boolean;
      isHighlighted: boolean;
    }[];
    isSelected: boolean;
    xScale: ScaleFn;
    yScale: any;
  }) {
    rectData.forEach(
      ({
        label,
        color,
        nextState,
        currentState,
        isForeshadowed,
        isHighlighted,
      }: {
        label: string;
        color: string;
        nextState?: Coordinate2D;
        currentState: Coordinate2D;
        isForeshadowed: boolean;
        isHighlighted: boolean;
      }) => {
        const { fill, stroke, ...settings } = this.getRectSettings({
          isSelected,
          isCurrent: true,
          color,
        });

        const currentRank = currentState.y;
        const nextRank = nextState?.y;
        const isSamePosition =
          Math.floor(nextRank ?? -1) === Math.floor(currentRank);
        const {
          rectDimensions: currentRectDimensions,
          topLeft: currentTopLeft,
          topRight: currentTopRight,
          bottomRight: currentBottomRight,
        } = this.createRectDataFromCoordinate({
          coordinate: currentState,
          xScale,
          yScale,
        });

        this.drawingUtils.modifyContextStyleAndDraw(
          {
            ...settings,
            ...(isHighlighted ? { opacity: 1 } : {}),
          },
          (context, key) => {
            this.clipDrawingArea(context);
            this.drawingUtils.drawRect({
              coordinates: currentTopLeft,
              dimensions: currentRectDimensions,
              fill,
              stroke,
              context,
              key,
            });
          }
        );

        const textPosition = {
          x: currentTopLeft.x + currentRectDimensions.height * 1.25,
          y:
            currentTopLeft.y +
            currentRectDimensions.height * (isHighlighted ? 0.725 : 0.625),
        };

        this.drawingUtils.modifyContextStyleAndDraw(
          {
            fillStyle: "white",
            fontSize:
              this.chartDimensions.width * (isHighlighted ? 0.06 : 0.04),
            opacity: 1,
            textAlign: "left",
          },
          (context) => {
            this.clipDrawingArea(context);
            this.drawingUtils.drawText({
              coordinates: textPosition,
              text: label,
              context,
            });
          }
        );

        if (isHighlighted) {
          this.drawingUtils.modifyContextStyleAndDraw(
            {
              fillStyle: "white",
            },
            (context) => {
              this.drawingUtils.drawRect({
                coordinates: {
                  x: currentTopRight.x + 20,
                  y: currentTopLeft.y + currentRectDimensions.height * 0.35,
                },
                dimensions: {
                  width: 60,
                  height: 20,
                },
                context,
                fill: true,
              });
            }
          );

          this.drawingUtils.modifyContextStyleAndDraw(
            {
              fillStyle: color,
              fontSize: this.chartDimensions.width * 0.04,
              opacity: 1,
              textAlign: "left",
            },
            (context) => {
              this.drawingUtils.drawText({
                coordinates: {
                  x: currentTopRight.x + 20 + 5,
                  y: currentTopLeft.y + currentRectDimensions.height * 0.35 + 15,
                },
                text: currentState.x.toLocaleString(),
                context,
              });
            }
          );
        }

        const circleRadius = currentRectDimensions.height * 0.325;
        const rankLabelPosition = {
          x: currentTopLeft.x + circleRadius * 2 + 5,
          y: currentTopLeft.y + currentRectDimensions.height * 0.625,
        };

        this.drawingUtils.modifyContextStyleAndDraw(
          {
            fillStyle: "white",
            opacity: 1,
          },
          (context) => {
            this.clipDrawingArea(context);
            this.drawingUtils.drawCircle({
              coordinates: {
                ...rankLabelPosition,
                y: currentTopLeft.y + 5 + currentRectDimensions.height * 0.4,
              },
              radius: circleRadius,
              fill: true,
              context,
            });
          }
        );

        this.drawingUtils.modifyContextStyleAndDraw(
          {
            fillStyle: color,
            fontSize: this.chartDimensions.width * 0.04,
            opacity: 1,
            textAlign: "center",
          },
          (context) => {
            this.clipDrawingArea(context);
            const drawTextData = {
              coordinates: rankLabelPosition,
              text: Math.floor(currentRank).toString(),
              context,
            };

            this.drawingUtils.drawText(drawTextData);
          }
        );

        if (isForeshadowed && nextState && nextRank) {
          const nextPositionOffChart = nextRank >= MAX_DOMAIN_Y;
          const {
            rectDimensions: nextDimensions,
            topRight: nextTopRight,
            bottomRight: nextBottomRight,
          } = this.createRectDataFromCoordinate({
            coordinate: nextState,
            xScale,
            yScale,
          });

          const margin = 30;
          const arrowLength = 20;
          let arrowTo = {
            x: nextTopRight.x + margin,
            y: nextTopRight.y + nextDimensions.height * 0.5,
          };

          let arrowFrom = {
            x: nextTopRight.x + arrowLength + margin,
            y: nextTopRight.y + nextDimensions.height * 0.5,
          };

          if (nextPositionOffChart) {
            const { x, y } = this.getBounds();
            const chartMidPoint = x.start + (x.end - x.start) / 2;
            const chartEnd = y.start + (y.end - y.start);
            arrowFrom = {
              x: chartMidPoint,
              y: chartEnd - arrowLength - margin,
            };
            arrowTo = {
              x: chartMidPoint,
              y: chartEnd - margin,
            };
          }

          this.drawingUtils.modifyContextStyleAndDraw(
            {
              strokeStyle: color,
              opacity: d3.interpolate(
                0,
                0.7
              )(this.foreshadowingAnimationExtent),
            },
            (context) => {
              this.drawingUtils.drawArrow({
                from: arrowFrom,
                to: arrowTo,
                arrowWidth: nextDimensions.height * 0.1,
                context,
              });
            }
          );

          this.drawingUtils.modifyContextStyleAndDraw(
            {
              strokeStyle: "white",
              opacity: d3.interpolate(0, 1)(this.foreshadowingAnimationExtent),
            },
            (context) => {
              this.drawingUtils.drawArrow({
                from: arrowFrom,
                to: arrowTo,
                arrowWidth: nextDimensions.height * 0.05,
                context,
              });
            }
          );

          let lineData = [nextTopRight, nextBottomRight];

          // If its off chart, show next rect length on the same y position not the next one
          if (nextPositionOffChart) {
            lineData = [
              {
                ...currentTopRight,
                x: nextTopRight.x,
              },
              {
                ...currentBottomRight,
                x: nextBottomRight.x,
              },
            ];
          }

          this.drawingUtils.modifyContextStyleAndDraw(
            {
              strokeStyle: "white",
              lineWidth: 6,
              opacity: d3.interpolate(0, 1)(this.foreshadowingAnimationExtent),
            },
            (context) => {
              this.drawingUtils.drawLine({
                coordinates: lineData,
                shape: LineShape.SHARP,
                context,
              });
            }
          );
          this.drawingUtils.modifyContextStyleAndDraw(
            {
              strokeStyle: color,
              lineWidth: 2,
              opacity: d3.interpolate(0, 1)(this.foreshadowingAnimationExtent),
            },
            (context) => {
              this.drawingUtils.drawLine({
                coordinates: lineData,
                shape: LineShape.SHARP,
                context,
              });
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
  }: {
    keys: string[];
    xScale: ScaleFn;
    yScale: ScaleFn;
    range: ChartRangeType;
  }) {
    const { isInBound: isInForeshadowingBounds } = this.getForeshadowingInfo();
    const { isHighlighted: highlightWithinRect } = this.getHighlightInfo();

    const isSelected = true;
    const selectedItems = _.pick(this.items, keys);

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
        }

        // SET DEFAULT FOR DATA POINTS THAT DON'T HAVE A VALUE AT THE CURRENT KEYFRAME
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

        const { topLeft, topRight, bottomRight, bottomLeft, rectDimensions } =
          this.createRectDataFromCoordinate({
            coordinate: currentStateData.data,
            xScale,
            yScale,
          });

        // All 4 corners fall in bounds to be foreshadowed
        const isForeshadowed = [
          topLeft,
          topRight,
          bottomRight,
          bottomLeft,
        ].reduce((isForeshadowed: boolean, corner: Coordinate2D) => {
          return isForeshadowed && isInForeshadowingBounds(corner);
        }, true);

        const isHighlighted = highlightWithinRect({
          position: topLeft,
          dimensions: rectDimensions,
        });

        const rectData = {
          currentState: interpolatedData,
          nextState: nextStateData?.data,
          isForeshadowed,
          isHighlighted,
          color,
          label,
        };

        return rectData;
      }
    );

    this.drawBars({
      rectData: selectedRects,
      xScale,
      yScale,
      isSelected,
    });
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
        (context) => {
          this.drawingUtils.drawText({
            text: keyframe,
            coordinates: {
              x:
                this.position.x +
                this.chartDimensions.width -
                (this.chartDimensions.margin?.right ?? 0) -
                textPadding,
              y:
                this.position.y +
                this.chartDimensions.height -
                (this.chartDimensions.margin?.bottom ?? 0) -
                textPadding,
            },
            context,
          });
        }
      );
    }
  }

  clipDrawingArea(context: CanvasRenderingContext2D) {
    const range = this.getRange();
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

  draw() {
    const { selectedItemsKeys, unselectedItemsKeys } = this.getItemKeys();
    const range = this.getRange();

    const xScale = this.xScale;
    const yScale = this.yScale;

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
    });

    this.drawKeyframeValue();
  }
}
