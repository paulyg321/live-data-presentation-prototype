import { gsap } from "gsap";
import * as d3 from "d3";
import {
  DrawingUtils,
  type Dimensions,
  type Coordinate2D,
  ScaleTypes,
  type ScaleOrdinal,
  MAX_DOMAIN_Y,
  ChartType,
  AnimatedBar,
  AnimatedElement,
  ForeshadowingStatesMode,
  isInBound,
  drawXAxis,
  drawYAxis,
  StateUpdateType,
  AnimatedCircle,
  type PlaybackSettingsConfig,
} from "@/utils";
import { markRaw } from "vue";
import _ from "lodash";

const RADIUS_RANGE = [7, 30];

export type AnimationChartElementData = {
  x: number;
  y: number;
  size: number;
  keyframe: any;
} & Record<string, any>;

export interface AnimatedElementPlaybackState {
  index: number;
  selector?: string;
  easeFn?: any;
}

export interface AnimatedElementPlaybackArgs {
  states: AnimatedElementPlaybackState[];
  duration: number;
  easeFn?: any;
  updateType:
    | StateUpdateType.GROUP_TIMELINE
    | StateUpdateType.INDIVIDUAL_TWEENS;
}

export interface AnimatedElementForeshadowingSettings {
  isForeshadowed: boolean;
  foreshadowingMode: ForeshadowingStatesMode;
  foreshadowingStateCount: number;
}

export type AnimatedChartElementArgs = {
  unscaledData: AnimationChartElementData[];
  colorKey: string;
  color: string;
  selectionKey: string;
  label: string;
  drawingUtils: DrawingUtils;
  xScale: D3ScaleTypes;
  yScale: D3ScaleTypes;
  zScale?: D3ScaleTypes;
  isSelected: boolean;
  activeSelection: boolean;
  currentKeyframeIndex: number;
  clipBoundaries: (context: CanvasRenderingContext2D) => void;
  selectionLabelKey?: string;
} & AnimatedElementForeshadowingSettings;

export interface ChartsControllerState {
  chartType: ChartType;
  items: {
    unscaledData: AnimationChartElementData[];
    colorKey: string;
    selectionKey: string;
    label: string;
  }[];
  colorScale: ScaleOrdinal;
  canvasDimensions: Dimensions;
  dimensions: Dimensions;
  position: Coordinate2D;
  drawingUtils: DrawingUtils;
  keyframes: string[];
  xDomain: number[];
  yDomain: number[];
  zDomain: number[];
  xScaleType: ScaleTypes;
  yScaleType: ScaleTypes;
  xScale?: D3ScaleTypes;
  yScale?: D3ScaleTypes;
  zScale?: D3ScaleTypes;
  xRange?: number[];
  yRange?: number[];
  animatedElements?: AnimatedElement[];
  // TODO: Write method to collect either keys or bounds and then change the selection state or foreshadowing state
  currentForeshadow?: Record<
    string,
    {
      isForeshadowed: boolean;
      foreshadowingMode: ForeshadowingStatesMode;
      foreshadowingStateCount: number;
    }
  >;
  currentSelection?: string[];
  keyframeTimeline?: ReturnType<typeof gsap.timeline>;
  playbackTimeline?: ReturnType<typeof gsap.timeline>;
  playbackExtent: number;
  currentKeyframeIndex: number;
  startKeyframeIndex: number;
  endKeyframeIndex: number;
  playbackArgs?: AnimatedElementPlaybackArgs;
}

export type D3ScaleTypes =
  | d3.ScaleLinear<number, number, unknown>
  | d3.ScaleLogarithmic<number, number, unknown>
  | d3.ScaleTime<number, number, unknown>
  | d3.ScalePower<number, number, unknown>
  | d3.ScalePower<number, number, unknown>
  | d3.ScaleSequential<number, unknown>;

export class ChartController {
  state: ChartsControllerState;

  constructor(args: ChartsControllerState) {
    const newState = {
      ...args,
      currentSelection: args.currentSelection ?? [],
    } as ChartsControllerState;
    const { xRange, yRange } = this.getRange(newState);
    const { xScale, yScale, zScale } = this.getScalesByOption({
      ...newState,
      xRange,
      yRange,
    });

    this.state = markRaw({
      ...newState,
      xRange,
      yRange,
      xScale,
      yScale,
      zScale,
      keyframeTimeline: gsap.timeline(),
      playbackTimeline: gsap.timeline(),
    });
    this.upsertAnimatedItems();
  }

  upsertAnimatedItems(
    type?: "scale" | "foreshadow" | "select",
    selectionLabelKey?: string
  ) {
    if (!this.state.xScale || !this.state.yScale) {
      return;
    }

    // UTILITY FUNCTIONS FOR "upsertAnimatedItems"
    const getForeshadowingInfo = (key: string) => {
      let isForeshadowed;
      let foreshadowingMode;
      let foreshadowingStateCount;

      if (this.state.currentForeshadow && this.state.currentForeshadow[key]) {
        ({ isForeshadowed, foreshadowingMode, foreshadowingStateCount } =
          this.state.currentForeshadow[key]);
      } else {
        isForeshadowed = false;
        foreshadowingMode = ForeshadowingStatesMode.TRAJECTORY;
        foreshadowingStateCount = 1;
      }

      if (isForeshadowed) {
        console.log(foreshadowingStateCount);
      }
      return {
        isForeshadowed,
        foreshadowingMode,
        foreshadowingStateCount,
      };
    };

    const activeSelection = Boolean(
      this.state.currentSelection && this.state.currentSelection.length > 0
    );
    const getSelectionInfo = (key: string) => {
      return {
        isSelected: this.state.currentSelection?.includes(key) ?? false,
        activeSelection,
        selectionLabelKey,
      };
    };

    const generateClipRect = this.generateClipRect();

    if (this.state.animatedElements) {
      this.state.animatedElements?.forEach(
        (animatedElement: AnimatedElement) => {
          if (type === "scale") {
            animatedElement.updateState({
              xScale: this.state.xScale,
              yScale: this.state.yScale,
            });
          } else if (type === "foreshadow") {
            animatedElement.updateState({
              ...getForeshadowingInfo(animatedElement.controllerState.label),
            });
          } else if (type === "select") {
            animatedElement.updateState({
              ...getSelectionInfo(animatedElement.controllerState.selectionKey),
            });
          } else {
            animatedElement.updateState({
              color: this.state.colorScale(
                animatedElement.controllerState.colorKey
              ),
              drawingUtils: this.state.drawingUtils,
              currentKeyframeIndex: this.state.currentKeyframeIndex,
            });
          }
        }
      );
    } else {
      this.state.animatedElements = this.state.items
        // .filter((_, index) => index < 10)
        .map(
          (item: {
            unscaledData: AnimationChartElementData[];
            colorKey: string;
            selectionKey: string;
            label: string;
          }) => {
            if (this.state.chartType === ChartType.BAR) {
              return new AnimatedBar({
                ...item,
                color: this.state.colorScale(item.colorKey),
                drawingUtils: this.state.drawingUtils,
                xScale: this.state.xScale ?? d3.scaleLinear(),
                yScale: this.state.yScale ?? d3.scaleLinear(),
                currentKeyframeIndex: this.state.currentKeyframeIndex,
                ...getForeshadowingInfo(item.selectionKey),
                ...getSelectionInfo(item.selectionKey),
                clipBoundaries: generateClipRect,
                activeSelection,
              });
            } else if (this.state.chartType === ChartType.SCATTER) {
              return new AnimatedCircle({
                ...item,
                color: this.state.colorScale(item.colorKey),
                drawingUtils: this.state.drawingUtils,
                xScale: this.state.xScale ?? d3.scaleLinear(),
                yScale: this.state.yScale ?? d3.scaleLinear(),
                zScale: this.state.zScale,
                currentKeyframeIndex: this.state.currentKeyframeIndex,
                ...getForeshadowingInfo(item.selectionKey),
                ...getSelectionInfo(item.selectionKey),
                clipBoundaries: generateClipRect,
                activeSelection,
              });
            } else {
              return new AnimatedCircle({
                ...item,
                color: this.state.colorScale(item.colorKey),
                drawingUtils: this.state.drawingUtils,
                xScale: this.state.xScale ?? d3.scaleLinear(),
                yScale: this.state.yScale ?? d3.scaleLinear(),
                zScale: this.state.zScale ?? d3.scaleLinear(),
                currentKeyframeIndex: this.state.currentKeyframeIndex,
                ...getForeshadowingInfo(item.selectionKey),
                ...getSelectionInfo(item.selectionKey),
                clipBoundaries: generateClipRect,
                activeSelection,
              });
            }
          }
        );
    }
  }

  updateState(args: Partial<ChartsControllerState>) {
    const {
      position,
      dimensions,
      xDomain,
      yDomain,
      drawingUtils,
      colorScale,
      currentKeyframeIndex,
      endKeyframeIndex,
      startKeyframeIndex,
    } = args;

    if (position || dimensions || xDomain || yDomain) {
      this.updateScales({
        position,
        dimensions,
        xDomain,
        yDomain,
      });
      this.upsertAnimatedItems("scale");
    } else {
      if (drawingUtils) {
        this.state.drawingUtils = drawingUtils;
      }
      if (colorScale) {
        this.state.colorScale = colorScale;
      }
      if (currentKeyframeIndex) {
        this.state.currentKeyframeIndex = currentKeyframeIndex;
      }
      if (endKeyframeIndex) {
        this.state.endKeyframeIndex = endKeyframeIndex;
      }
      if (startKeyframeIndex) {
        this.state.startKeyframeIndex = startKeyframeIndex;
      }
      this.upsertAnimatedItems();
    }
  }

  getSelectionBounds(keys: string[]) {
    const positions: Coordinate2D[] = [];
    this.state.animatedElements?.forEach((animatedElement: AnimatedElement) => {
      const isSelected = keys.includes(
        animatedElement.controllerState.selectionKey
      );

      if (isSelected) {
        positions.push(animatedElement.animationState.current.position);
      }
    });

    const xExtent = d3.extent(positions, (d) => d.x) as number[];
    const yExtent = d3.extent(positions, (d) => d.y) as number[];

    if (!xExtent || !yExtent) {
      return undefined;
    }

    return {
      position: {
        x: (xExtent[0] ?? 25) - 25,
        y: (yExtent[0] ?? 25) - 25,
      },
      dimensions: {
        width: xExtent[1] - xExtent[0] + 50,
        height: yExtent[1] - yExtent[0] + 50,
      },
    };
  }

  processPlaybackSubscriptionData(
    playbackConfig: PlaybackSettingsConfig,
    endKeyframe?: number,
    startKeyframe?: number,
    selector?: string
  ) {
    const _startKeyframe = startKeyframe ?? this.state.startKeyframeIndex;
    const _endKeyframe = endKeyframe ?? this.state.endKeyframeIndex;
    const states = [..._.range(_startKeyframe, _endKeyframe), _endKeyframe];
    return {
      states: states.map((value: number, index: number) => {
        return {
          index: value,
          selector:
            index < states.length - 1 && index !== 0 ? selector : undefined,
        };
      }),
      duration: playbackConfig?.duration ?? 5,
      easeFn: playbackConfig?.easeFn,
      updateType:
        playbackConfig?.playbackMode ?? StateUpdateType.GROUP_TIMELINE,
    };
  }

  pause() {
    this.state.playbackTimeline?.pause();
    this.state.animatedElements?.forEach((element) => {
      element.pause();
    });
  }

  play(
    args: {
      keys?: string[];
    } & AnimatedElementPlaybackArgs
  ) {
    this.state.animatedElements
      ?.filter((element) => {
        if (!args.keys) return true;
        return args.keys.includes(element.controllerState.selectionKey);
      })
      .forEach((element) => {
        element.play(args);
      });

    this.state.keyframeTimeline?.clear();
    this.state.keyframeTimeline?.pause();
    args.states.forEach(
      (state: AnimatedElementPlaybackState, index: number) => {
        this.state.keyframeTimeline?.to(this.state, {
          currentKeyframeIndex: state.index,
        });
      }
    );

    this.state.playbackTimeline?.clear();
    this.state.playbackTimeline?.pause(this.state.playbackExtent);
    this.state.playbackTimeline?.to(this.state, {
      playbackExtent: 1,
      onUpdate: () => {
        this.state.keyframeTimeline?.totalProgress(this.state.playbackExtent);
      },
      onComplete: () => {
        this.state.playbackExtent = 0;
      },
      duration: args.duration,
      ease: args.easeFn,
    });
    this.state.playbackTimeline?.play();
  }

  setForeshadow(args?: {
    bounds?: {
      coordinates: Coordinate2D;
      dimensions?: Dimensions;
      radius?: number;
    };
    keys?: string[];
    mode: ForeshadowingStatesMode;
    count?: number;
    requireKeyInBounds?: boolean;
  }) {
    const foreshadowingMap: Record<
      string,
      AnimatedElementForeshadowingSettings
    > = {};
    this.state.animatedElements?.forEach((element) => {
      if (!args) {
        foreshadowingMap[element.controllerState.label] = {
          isForeshadowed: false,
          foreshadowingMode: element.controllerState.foreshadowingMode,
          foreshadowingStateCount:
            element.controllerState.foreshadowingStateCount,
        };
      } else {
        let bounded = false;
        const keyIncluded = args.keys?.includes(
          element.controllerState.selectionKey
        );
        if (args.bounds && this.state.xScale && this.state.yScale) {
          bounded = isInBound(
            {
              x: this.state.xScale(
                element.controllerState.unscaledData[
                  element.controllerState.currentKeyframeIndex
                ].x
              ) as number,
              y: this.state.yScale(
                element.controllerState.unscaledData[
                  element.controllerState.currentKeyframeIndex
                ].y
              ) as number,
            },
            {
              ...args.bounds,
              position: args.bounds.coordinates,
            }
          );
        }

        const isForeshadowed = args.requireKeyInBounds
          ? Boolean(keyIncluded && bounded)
          : Boolean(keyIncluded || bounded);

        if (isForeshadowed) {
          foreshadowingMap[element.controllerState.label] = {
            isForeshadowed,
            foreshadowingMode: args.mode,
            foreshadowingStateCount: args.count ?? 1,
          };
        } else {
          foreshadowingMap[element.controllerState.label] = {
            isForeshadowed,
            foreshadowingMode: element.controllerState.foreshadowingMode,
            foreshadowingStateCount:
              element.controllerState.foreshadowingStateCount,
          };
        }
      }
    });
    this.state.currentForeshadow = foreshadowingMap;
    this.upsertAnimatedItems("foreshadow");
  }

  setSelection(args?: {
    bounds?: {
      coordinates: Coordinate2D;
      dimensions?: Dimensions;
      radius?: number;
    };
    keys?: string[];
    requireKeyInBounds?: boolean;
    selectionLabelKey?: string;
  }) {
    const selectionList: string[] = [];
    if (args) {
      this.state.animatedElements?.forEach((element) => {
        let bounded = false;
        const keyIncluded = args.keys?.includes(
          element.controllerState.selectionKey
        );
        if (args.bounds && this.state.xScale && this.state.yScale) {
          bounded = isInBound(
            {
              x: this.state.xScale(
                element.controllerState.unscaledData[
                  element.controllerState.currentKeyframeIndex
                ].x
              ) as number,
              y: this.state.yScale(
                element.controllerState.unscaledData[
                  element.controllerState.currentKeyframeIndex
                ].y
              ) as number,
            },
            {
              ...args.bounds,
              position: args.bounds.coordinates,
            }
          );
        }

        const isSelected = args.requireKeyInBounds
          ? Boolean(keyIncluded && bounded)
          : Boolean(keyIncluded || bounded);

        if (isSelected) {
          selectionList.push(element.controllerState.selectionKey);
        }
      });
    }
    this.state.currentSelection = selectionList;
    this.upsertAnimatedItems("select", args?.selectionLabelKey);
  }

  getRange(args: {
    position: Coordinate2D;
    dimensions: Dimensions;
    chartType: ChartType;
  }) {
    const xRange = [args.position.x, args.position.x + args.dimensions.width];
    let yRange = [args.position.y + args.dimensions.height, args.position.y];

    if (args.chartType === ChartType.BAR) {
      yRange = [args.position.y, args.position.y + args.dimensions.height];
    }

    return {
      xRange,
      yRange,
    };
  }

  getScales(args: {
    scaleType: ScaleTypes;
    domain: number[];
    range: number[];
  }) {
    switch (args.scaleType) {
      case ScaleTypes.LINEAR:
        return d3
          .scaleLinear<number, number, unknown>()
          .domain(args.domain)
          .range(args.range);
      case ScaleTypes.LOG:
        return d3
          .scaleLog<number, number, unknown>()
          .domain(args.domain)
          .range(args.range);
      case ScaleTypes.TIME:
        return d3
          .scaleTime<number, number, unknown>()
          .domain(args.domain)
          .range(args.range);
      case ScaleTypes.POW:
        return d3
          .scalePow<number, number, unknown>()
          .domain(args.domain)
          .range(args.range);
      case ScaleTypes.SQRT:
        return d3
          .scaleSqrt<number, number, unknown>()
          .domain(args.domain)
          .range(args.range);
      case ScaleTypes.SEQ:
        return d3
          .scaleSequential<number, unknown>()
          .domain(args.domain)
          .range(args.range);
      default:
        return d3
          .scaleLinear<number, number, unknown>()
          .domain(args.domain)
          .range(args.range);
    }
  }

  getScalesByOption(args: {
    xRange: any[];
    yRange: any[];
    xDomain: any[];
    yDomain: any[];
    zDomain?: any[];
    xScaleType: ScaleTypes;
    yScaleType: ScaleTypes;
  }): { xScale: D3ScaleTypes; yScale: D3ScaleTypes; zScale?: D3ScaleTypes } {
    const xScaleType = args.xScaleType;
    const xDomain = args.xDomain;
    const xRange = args.xRange;

    const yScaleType = args.yScaleType;
    const yDomain = args.yDomain;
    const yRange = args.yRange;

    const xScale = this.getScales({
      scaleType: xScaleType,
      domain: xDomain,
      range: xRange,
    });

    const yScale = this.getScales({
      scaleType: yScaleType,
      domain: yDomain,
      range: yRange,
    });

    let zScale;
    if (args.zDomain) {
      zScale = this.getScales({
        scaleType: ScaleTypes.LINEAR,
        domain: args.zDomain,
        range: RADIUS_RANGE,
      });
    }

    return {
      xScale,
      yScale,
      zScale,
    };
  }

  updateScales(args: Partial<ChartsControllerState>) {
    const { position, dimensions, xDomain, yDomain, xScaleType, yScaleType } =
      args;
    if (position) {
      this.state.position = position;
    }
    if (dimensions) {
      this.state.dimensions = dimensions;
    }
    if (xDomain) {
      this.state.xDomain = xDomain;
    }
    if (yDomain) {
      this.state.yDomain = yDomain;
    }
    if (xScaleType) {
      this.state.xScaleType = xScaleType;
    }
    if (yScaleType) {
      this.state.yScaleType = yScaleType;
    }

    const { xRange, yRange } = this.getRange(this.state);
    this.state.xRange = xRange;
    this.state.yRange = yRange;

    // update state if all is in order
    if (
      this.state.xDomain &&
      this.state.yDomain &&
      this.state.xScaleType &&
      this.state.yScaleType &&
      this.state.xRange &&
      this.state.yRange
    ) {
      const { xScale, yScale, zScale } = this.getScalesByOption({
        xRange,
        yRange,
        ...this.state,
      });

      this.state.xScale = xScale;
      this.state.yScale = yScale;
      this.state.zScale = zScale;
    }
  }

  generateClipRect() {
    return (context: CanvasRenderingContext2D) => {
      this.state.drawingUtils.clipRect({
        dimensions: this.state.dimensions,
        coordinates: this.state.position,
        context,
      });
    };
  }

  drawKeyframeValue() {
    const keyframe = this.state.keyframes.at(
      Math.floor(this.state.currentKeyframeIndex)
    );
    const textPadding = 15;
    if (keyframe) {
      this.state.drawingUtils.modifyContextStyleAndDraw(
        {
          fontSize: this.state.dimensions.width * 0.15,
          opacity: 0.7,
          fillStyle: "#fc036b",
          textAlign: "right",
          shadow: true,
        },
        (context) => {
          this.state.drawingUtils.drawText({
            text: keyframe,
            coordinates: {
              x:
                this.state.position.x +
                this.state.dimensions.width -
                textPadding,
              y:
                this.state.position.y +
                this.state.dimensions.height -
                textPadding,
            },
            context,
          });
        }
      );
    }
  }

  drawBarAxes() {
    /**
     * -------------------- DRAW AXES --------------------
     * */
    const FONT_SIZE = 20;
    if (this.state.xRange && this.state.yRange) {
      drawXAxis(
        this.state.drawingUtils,
        this.state.xScale,
        this.state.yRange[1],
        this.state.xRange,
        FONT_SIZE,
        3,
        undefined,
        false,
        true,
        {
          shadow: true,
        }
      );
    }

    Array(MAX_DOMAIN_Y - 1)
      .fill(0)
      .map((_, index: number) => {
        this.state.drawingUtils.modifyContextStyleAndDraw(
          {
            fontSize: FONT_SIZE,
            bold: true,
            fillStyle: "white",
            shadow: true,
          },
          (context: CanvasRenderingContext2D) => {
            if (this.state.xScale && this.state.yScale) {
              const label = (index + 1).toString();
              const position = {
                x: 0,
                y: index + 1,
              };

              const {
                rectDimensions: { height },
                topLeft,
              } = AnimatedBar.createRectDataFromCoordinate({
                coordinate: position,
                xScale: this.state.xScale,
                yScale: this.state.yScale,
              });

              const textPosition = {
                x: topLeft.x - (this.state.dimensions.margin?.left ?? 40),
                y: topLeft.y + height * 0.5 + FONT_SIZE / 2,
              };

              this.state.drawingUtils.drawText({
                coordinates: textPosition,
                text: label,
                context,
              });
            }
          }
        );
      });
  }

  drawScatterAxes() {
    /**
     * -------------------- DRAW AXES --------------------
     * */
    const FONT_SIZE = 20;
    if (this.state.xRange && this.state.yRange) {
      drawXAxis(
        this.state.drawingUtils,
        this.state.xScale,
        this.state.yRange[0],
        this.state.xRange,
        FONT_SIZE,
        3,
        undefined,
        false,
        true,
        { shadow: true }
      );
      drawYAxis(
        this.state.drawingUtils,
        this.state.yScale,
        this.state.xRange[0],
        this.state.yRange,
        FONT_SIZE,
        5,
        undefined,
        false,
        true,
        { shadow: true }
      );
    }
  }

  draw() {
    this.state.animatedElements?.forEach((elem: AnimatedBar) => elem.draw());
    if (this.state.chartType === ChartType.BAR) {
      this.drawBarAxes();
    }
    if (this.state.chartType === ChartType.SCATTER) {
      this.drawScatterAxes();
    }
    this.drawKeyframeValue();
  }
}
