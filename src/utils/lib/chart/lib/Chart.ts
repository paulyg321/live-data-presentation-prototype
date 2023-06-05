import * as d3 from "d3";
import {
  CanvasElementListener,
  DrawingUtils,
  type Coordinate2D,
  type Dimensions,
  ChartController,
  type ChartsControllerState,
  getStoredData,
  storeData,
} from "@/utils";
import _ from "lodash";

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

const colorArray = d3["schemeTableau10"];

export enum ChartType {
  LINE = "line-chart",
  SCATTER = "scatter-plot",
  BAR = "bar-chart",
}

export type ScaleOrdinal = d3.ScaleOrdinal<string, string, never>;

export interface NewChartArgs {
  // Settings
  title: string;
  type: ChartType;
  data?: any;
  field: string;
  key: string;
  xField: string; // position
  yField: string; // position
  zField?: string; // size

  // NEW
  selectionField?: string; // field to use to match when selecting (default is key)
  groupBy?: string; // grouping to use when coloring

  position?: Coordinate2D;
  dimensions: Dimensions;
  canvasDimensions: Dimensions;
  // Utils
  drawingUtils: DrawingUtils;
  currentKeyframeIndex?: number;
  startKeyframeIndex?: number;
  endKeyframeIndex?: number;
  dataId?: string;
  dataFieldNames: string[];
}

export type ChartState = NewChartArgs & {
  data: any;
  canvasListener?: CanvasElementListener;
  selectionField?: string;
  selectOptions: string[];
  xScaleType: ScaleTypes;
  yScaleType: ScaleTypes;
  xDomain?: any[];
  yDomain?: any[];
  zDomain?: any[];
  colorDomain?: any[];
  keyframes?: any[];
  domainPerKeyframe?: any[];
  controller?: ChartController;
  drawingUtils: DrawingUtils;
  currentKeyframeIndex: number;
  startKeyframeIndex: number;
  endKeyframeIndex: number;
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
    data,
    dataId,
    field,
    key,
    xField,
    yField,
    zField,
    position = { x: 0, y: 0 },
    canvasDimensions,
    dimensions,
    drawingUtils,
    selectionField,
    groupBy,
    currentKeyframeIndex = 0,
    startKeyframeIndex = 0,
    endKeyframeIndex = 0,
    dataFieldNames,
  }: NewChartArgs) {
    this.state = {
      title,
      type,
      data,
      dataId,
      field,
      key,
      xField,
      yField,
      zField,
      selectionField,
      groupBy,
      position,
      dimensions,
      drawingUtils,
      canvasListener: new CanvasElementListener({
        position,
        dimensions,
        isCircle: false,
        updateFn: (value) => {
          this.updateState(value);
        },
        drawingUtils,
      }),
      canvasDimensions,
      xScaleType: ScaleTypes.LINEAR,
      yScaleType: ScaleTypes.LINEAR,
      keyframes: [],
      currentKeyframeIndex,
      startKeyframeIndex,
      endKeyframeIndex,
      selectOptions: [],
      dataFieldNames,
    };
  }

  async init() {
    if (!this.state.data && !this.state.dataId)
      throw new Error("Unable to get the chart dataset");

    if (!this.state.data && this.state.dataId) {
      // get from db
      this.state.data = await getStoredData(this.state.dataId);
    }

    if (this.state.data && !this.state.dataId) {
      // Store in DB
      this.state.dataId = await storeData(JSON.stringify(this.state.data));
    }

    this.setDataDomains(this.state.type);
    this.initializeChartItems();
  }

  updateState(args: {
    position?: Coordinate2D;
    dimensions?: Dimensions;
    currentKeyframeIndex?: number;
    startKeyframeIndex?: number;
    endKeyframeIndex?: number;
  }) {
    if (args.position) {
      this.state.position = args.position;
    }
    if (args.dimensions) {
      this.state.dimensions = {
        ...this.state.dimensions,
        ...args.dimensions,
      };
    }

    if (args.startKeyframeIndex) {
      this.state.startKeyframeIndex = args.startKeyframeIndex;
    }

    if (args.currentKeyframeIndex) {
      this.state.currentKeyframeIndex = args.currentKeyframeIndex;
    }

    if (args.endKeyframeIndex) {
      this.state.endKeyframeIndex = args.endKeyframeIndex;
    }

    this.state.controller?.updateState(args);
  }

  getColorScale() {
    const colorGroupMap = d3.group(
      this.state.data,
      (data: Record<string, any>) => data[this.state.groupBy ?? this.state.key]
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
      if (this.state.zField) {
        this.state.zDomain = d3.extent(
          this.state.data,
          (data: Record<string, any>) => {
            if (!this.state.zField) return;
            return data[this.state.zField];
          }
        );
      }
    }

    if (type === ChartType.BAR) {
      const dataDomain = d3.extent(
        this.state.data,
        // This will be the bars height
        (data: Record<string, any>) => data[this.state.xField]
      );

      this.state.xDomain = [0, dataDomain[1]];
      this.state.yDomain = [MIN_DOMAIN_Y, MAX_DOMAIN_Y];

      // Group each keyframe so we can get the extent for each keyframe
      const groupedByKeyFrame = d3.group(
        this.state.data,
        (d: any) => d[this.state.field]
      );

      this.state.domainPerKeyframe = [];

      groupedByKeyFrame.forEach((frame: any) => {
        const currentFrame = [...frame];
        this.state.domainPerKeyframe?.push(
          d3.extent(currentFrame, (d) => d[this.state.xField])
        );
      });
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

    this.state.endKeyframeIndex =
      this.state.endKeyframeIndex ?? this.state.keyframes.length;

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
            colorKey = dataAtKeyframe[this.state.groupBy ?? this.state.key];
            unscaledData.push({
              x: dataAtKeyframe[this.state.xField],
              y: dataAtKeyframe[this.state.yField],
              size: this.state.zField ? dataAtKeyframe[this.state.zField] : 10,
              ...dataAtKeyframe,
              keyframe,
            });
          } else {
            unscaledData.push({
              x: undefined,
              y: undefined,
              ...dataAtKeyframe,
              keyframe,
            });
          }
        });

        this.state.selectOptions = _.union(this.state.selectOptions, [
          selectionKey,
        ]);

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
    this.state.keyframes = [];

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

    this.state.keyframes = this.state.keyframes.sort((a, b) =>
      d3.ascending(a, b)
    );

    this.state.endKeyframeIndex =
      this.state.endKeyframeIndex ?? this.state.keyframes.length;

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
            colorKey = dataAtKeyframe[this.state.groupBy ?? this.state.key];

            unscaledData.push({
              x: dataAtKeyframe[this.state.xField],
              y: dataAtKeyframe.rank,
              ...dataAtKeyframe,
              keyframe,
            });
          } else {
            unscaledData.push({
              x: undefined,
              y: undefined,
              keyframe,
              ...dataAtKeyframe,
            });
          }
        });

        this.state.selectOptions = _.union(this.state.selectOptions, [
          selectionKey,
        ]);

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
      zDomain: this.state.zDomain,
      dimensions: this.state.dimensions,
      position: this.state.position,
      canvasDimensions: this.state.canvasDimensions,
      keyframes: this.state.keyframes,
      domainPerKeyframe: this.state.domainPerKeyframe,
      drawingUtils: this.state.drawingUtils,
      xScaleType: this.state.xScaleType,
      yScaleType: this.state.yScaleType,
      currentKeyframeIndex: this.state.currentKeyframeIndex,
      startKeyframeIndex: this.state.startKeyframeIndex,
      endKeyframeIndex: this.state.endKeyframeIndex,
      playbackExtent: 0,
      chartType: this.state.type,
    } as ChartsControllerState;

    switch (this.state.type) {
      case ChartType.LINE:
      case ChartType.SCATTER:
      case ChartType.BAR:
        this.state.controller = new ChartController(initializeChartArgs);
        break;
    }
  }

  draw() {
    this.state.controller?.draw();
  }
}
