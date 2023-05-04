import * as d3 from "d3";
import type { DrawingUtils } from "../../drawing";
import type { Dimensions, Coordinate2D } from "../types";
import { ScaleTypes, type ScaleOrdinal } from "./Chart";
import { AnimatedBar } from "./AnimatedBar";

export interface AnimationChartElementData {
  x: number;
  y: number;
  keyframe: any;
}

export interface AnimatedChartElementArgs {
  unscaledData: AnimationChartElementData[];
  colorKey: string;
  colorScale: ScaleOrdinal;
  selectionKey: string;
  label: string;
  drawingUtils: DrawingUtils;
  xScale: D3ScaleTypes;
  yScale: D3ScaleTypes;
  isForeshadowed: boolean;
  isSelected: boolean;
}

export interface ChartControllerArgs {
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
  xScaleType: ScaleTypes;
  yScaleType: ScaleTypes;
}

export type D3ScaleTypes =
  | d3.ScaleLinear<number, number, unknown>
  | d3.ScaleLogarithmic<number, number, unknown>
  | d3.ScaleTime<number, number, unknown>
  | d3.ScalePower<number, number, unknown>
  | d3.ScalePower<number, number, unknown>
  | d3.ScaleSequential<number, unknown>;

export type ChartSControllerState = ChartControllerArgs & {
  xScale: D3ScaleTypes;
  yScale: D3ScaleTypes;
  xRange: number[];
  yRange: number[];
  animatedElements?: AnimatedBar[];
  currentSelection?: string[];
};

export class ChartController {
  state: ChartSControllerState;

  constructor(args: ChartControllerArgs) {
    const { xRange, yRange } = this.getRange(args);
    const { xScale, yScale } = this.getScalesByOption({
      ...args,
      xRange,
      yRange,
    });

    this.state = {
      ...args,
      xRange,
      yRange,
      xScale,
      yScale,
    };
    this.initializeAnimatedItems();
  }

  initializeAnimatedItems() {
    this.state.animatedElements = this.state.items
        .filter((item, index) => index === 0)
    .map(
      (item: {
        unscaledData: AnimationChartElementData[];
        colorKey: string;
        selectionKey: string;
        label: string;
      }) => {
        return new AnimatedBar({
          ...item,
          colorScale: this.state.colorScale,
          drawingUtils: this.state.drawingUtils,
          xScale: this.state.xScale,
          yScale: this.state.yScale,
          isForeshadowed: false,
          isSelected: false,
        });
      }
    );
  }

  updateState(args: Partial<ChartControllerArgs>) {
    this.updateChartAppearance(args);

    if (args.drawingUtils) {
      this.state.drawingUtils = args.drawingUtils;
    }
    if (args.colorScale) {
      this.state.colorScale = args.colorScale;
    }
  }

  updateChartAppearance(args: Partial<ChartControllerArgs>) {
    const { position, dimensions, xDomain, yDomain } = args;

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

    this.setScales();
  }

  getRange(args: { position: Coordinate2D; dimensions: Dimensions }) {
    const xRange = [args.position.x, args.position.x + args.dimensions.width];
    const yRange = [args.position.y, args.position.y + args.dimensions.height];

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
    xScaleType: ScaleTypes;
    yScaleType: ScaleTypes;
  }): { xScale: D3ScaleTypes; yScale: D3ScaleTypes } {
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

    return {
      xScale,
      yScale,
    };
  }

  setScales() {
    this.setRange();
    const { xScale, yScale } = this.getScalesByOption(this.state);
    this.state.xScale = xScale;
    this.state.yScale = yScale;
  }

  setRange() {
    const { xRange, yRange } = this.getRange(this.state);
    this.state.xRange = xRange;
    this.state.yRange = yRange;
  }

  setSelection() {
    console.log("SET SELECTION");
  }

  setForeshadow() {
    console.log("SET FORESHADOW");
  }

  draw() {
    this.state.animatedElements?.forEach((elem: AnimatedBar) => elem.draw());
  }
}
