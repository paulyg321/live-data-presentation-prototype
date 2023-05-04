import * as d3 from "d3";
import {
  CanvasElementListener,
  DrawingUtils,
  type Coordinate2D,
  type Dimensions,
  ChartController,
} from "@/utils";

export enum ScaleTypes {
  LINEAR = "scaleLinear",
  SQRT = "scaleSqrt",
  POW = "scalePow",
  LOG = "scaleLog",
  TIME = "scaleTime",
  SEQ = "scaleSequential",
}

export enum Affect {
  JOY = "joy",
  TENDERNESS = "tenderness",
  EXCITEMENT = "excitement",
}

export const NON_FOCUSED_COLOR = "grey";

// excluded
export const MAX_DOMAIN_Y = 6;
// included
export const MIN_DOMAIN_Y = 1;

const colorArray = d3["schemeCategory10"];

export enum ChartType {
  LINE = "line",
  SCATTER = "scatter",
  BAR = "bar",
}

export type ScaleOrdinal = d3.ScaleOrdinal<string, string, never>;

export interface NewChartArgs {
  // Settings
  title: string;
  type: ChartType;
  data: any;
  field: string;
  key: string;
  xField: string;
  yField: string;
  zField?: string;
  selectionField?: string;
  colorKey?: string;

  position: Coordinate2D;
  dimensions: Dimensions;
  canvasDimensions: Dimensions;
  // Utils
  drawingUtils: DrawingUtils;
}

export type ChartState = NewChartArgs & {
  canvasListener?: CanvasElementListener;
  data: any;
  /**
   * TODO: Create form fields for these
   */
  selectionField?: string;
  xScaleType: ScaleTypes;
  yScaleType: ScaleTypes;
  xDomain?: any[];
  yDomain?: any[];
  colorDomain?: any[];
  keyframes?: any[];
  chart?: ChartController;
  drawingUtils: DrawingUtils;
};

export class Chart {
  state: ChartState;

  /**
   * @param type the chart type
   * @param data the chart data
   * @param field this is the field that is used to group each row into a keyframe
   * @param key this is the field that is used to group each row across keyframes,
   *                        to know the field to look at for elements to display and transitions to next keyframe
   * @param step the amount of time between keyframes
   * @param dataAccessor this is the value used to access the data for the current state
   * @param xKey this is the key for the x value in our data
   * @param yKey this is the key for the x value in our data
   */
  constructor({
    title,
    type,
    data = [],
    field,
    key,
    xField,
    yField,
    zField,
    position,
    canvasDimensions,
    dimensions,
    drawingUtils,
    selectionField,
    colorKey,
  }: NewChartArgs) {
    this.state = {
      title: title,
      type: type,
      data: data,
      field: field,
      key: key,
      xField: xField,
      yField: yField,
      zField: zField,
      selectionField: selectionField,
      position: position,
      dimensions: dimensions,
      drawingUtils: drawingUtils,
      canvasListener: new CanvasElementListener({
        position,
        dimensions,
        isCircle: false,
        updateFn: (value) => {
          this.updateState(value);
        },
        drawingUtils,
      }),
      canvasDimensions: canvasDimensions,
      colorKey: colorKey,
      xScaleType: ScaleTypes.LINEAR,
      yScaleType: ScaleTypes.LINEAR,
      keyframes: [],
    };

    this.setDataDomains(type);
    this.initializeChartItems();
  }

  updateState(args: { position?: Coordinate2D; dimensions?: Dimensions }) {
    if (args.position) {
      this.state.position = args.position;
    }
    if (args.dimensions) {
      this.state.dimensions = {
        ...this.state.dimensions,
        ...args.dimensions,
      };
    }
    this.state.chart?.updateState(args);
  }

  getColorScale() {
    const colorGroupMap = d3.group(
      this.state.data,
      (data: Record<string, any>) => data[this.state.colorKey ?? this.state.key]
    );

    this.state.colorDomain = Array.from(colorGroupMap, ([key]: any) => key);

    return d3
      .scaleOrdinal<string, string, never>()
      .domain(this.state.colorDomain)
      .range(colorArray);
  }

  setDataDomains(type: ChartType) {
    if (type === ChartType.SCATTER || type === ChartType.LINE) {
      this.state.xDomain = d3.extent(
        this.state.data,
        (data: Record<string, any>) => data[this.state.xField]
      );

      this.state.yDomain = d3.extent(
        this.state.data,
        (data: Record<string, any>) => data[this.state.yField]
      );
    }

    if (type === ChartType.BAR) {
      const dataDomain = d3.extent(
        this.state.data,
        // This will be the bars height
        (data: Record<string, any>) => data[this.state.xField]
      );

      this.state.xDomain = [0, dataDomain[1]];
      this.state.yDomain = [MIN_DOMAIN_Y, MAX_DOMAIN_Y];
    }
  }

  parseLineOrScatterPlotData() {
    this.setDataDomains(this.state.type);
    // Need all keyframes so we can fill in blanks
    const groupedByKeyFrame = d3.group(
      this.state.data,
      (data: any) => data[this.state.field]
    );

    this.state.keyframes = Array.from(
      groupedByKeyFrame,
      ([key]: any) => key
    ).sort((a, b) => d3.ascending(a, b));

    const resultMap = d3.rollup(
      this.state.data,
      (groupedData) => {
        const unscaledData: Record<string, any>[] = [];
        let selectionKey = "";
        let colorKey = "";

        this.state.keyframes?.forEach((keyframe: any) => {
          const dataAtKeyframe = groupedData.find(
            (value: Record<string, any>) => value[this.state.field] === keyframe
          );

          if (dataAtKeyframe) {
            selectionKey =
              dataAtKeyframe[this.state.selectionField ?? this.state.key];
            colorKey = dataAtKeyframe[this.state.colorKey ?? this.state.key];
            unscaledData.push({
              x: dataAtKeyframe[this.state.xField],
              y: dataAtKeyframe[this.state.yField],
              keyframe,
            });
          } else {
            unscaledData.push({
              x: undefined,
              y: undefined,
              keyframe,
            });
          }
        });
        return {
          unscaledData,
          colorKey,
          selectionKey,
          drawingUtils: this.state.drawingUtils,
        };
      },
      (data: any) => data[this.state.key]
    );

    return Array.from(resultMap, ([key, value]: any) => ({
      label: key,
      ...value,
    }));
  }

  parseBarChartData() {
    const groupedByKeyFrame = d3.group(
      this.state.data,
      (d: any) => d[this.state.field]
    );
    const rankedData: any[] = [];
    groupedByKeyFrame.forEach((frame: any, keyframe: string) => {
      this.state.keyframes?.push(keyframe);
      const currentFrame = [...frame];
      currentFrame.sort((a, b) =>
        d3.descending(a[this.state.xField], b[this.state.xField])
      );
      currentFrame.forEach((item: any, index: number) => {
        rankedData.push({
          ...item,
          rank: index + 1,
        });
      });
    });

    this.state.keyframes = this.state.keyframes?.sort((a, b) =>
      d3.ascending(a, b)
    );

    const resultMap = d3.rollup(
      rankedData,
      (groupedData) => {
        const unscaledData: Record<string, any>[] = [];
        let selectionKey = "";
        let colorKey = "";

        this.state.keyframes?.forEach((keyframe: any) => {
          const dataAtKeyframe = groupedData.find(
            (value: Record<string, any>) => value[this.state.field] === keyframe
          );

          if (dataAtKeyframe) {
            selectionKey =
              dataAtKeyframe[this.state.selectionField ?? this.state.key];
            colorKey = dataAtKeyframe[this.state.colorKey ?? this.state.key];

            unscaledData.push({
              x: dataAtKeyframe[this.state.xField],
              y: dataAtKeyframe.rank,
              keyframe,
            });
          } else {
            unscaledData.push({
              x: undefined,
              y: undefined,
              keyframe,
            });
          }
        });
        return {
          unscaledData,
          colorKey,
          selectionKey,
          drawingUtils: this.state.drawingUtils,
        };
      },
      (data: any) => data[this.state.key]
    );

    return Array.from(resultMap, ([key, value]: any) => ({
      label: key,
      ...value,
    }));
  }

  private initializeChartItems() {
    const colorScale = this.getColorScale();
    let initializeChartArgs;
    if (
      this.state.type === ChartType.LINE ||
      this.state.type === ChartType.SCATTER
    ) {
      const parsedData = this.parseLineOrScatterPlotData();
      initializeChartArgs = {
        items: parsedData,
      };
    } else {
      const parsedData = this.parseBarChartData();
      initializeChartArgs = {
        items: parsedData,
      };
    }

    if (!this.state.xDomain || !this.state.yDomain || !this.state.keyframes) {
      return;
    }

    initializeChartArgs = {
      ...initializeChartArgs,
      colorScale,
      xDomain: this.state.xDomain,
      yDomain: this.state.yDomain,
      dimensions: this.state.dimensions,
      position: this.state.position,
      canvasDimensions: this.state.canvasDimensions,
      keyframes: this.state.keyframes,
      drawingUtils: this.state.drawingUtils,
      xScaleType: this.state.xScaleType,
      yScaleType: this.state.yScaleType,
    };

    switch (this.state.type) {
      case ChartType.LINE:
      case ChartType.SCATTER:
      case ChartType.BAR:
        this.state.chart = new ChartController(initializeChartArgs);
        break;
    }
  }

  draw() {
    this.state.chart?.draw();
  }
}
