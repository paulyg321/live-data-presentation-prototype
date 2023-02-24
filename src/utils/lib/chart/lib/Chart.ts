import * as d3 from "d3";
import dayjs from "dayjs";
import { AnimatedLine, type Coordinate2D, type Dimensions } from "@/utils";

export interface ChartType {
  title: "Line Chart" | "Bar Chart" | "Scatter Plot";
  value: ChartTypeValue;
}

export interface ChartLineMap {
  [key: string]: AnimatedLine;
}

export enum ChartTypeValue {
  LINE = "line",
  SCATTER = "scatter",
  BAR = "bar",
}

export interface NewChartArgs {
  title: string;
  type: ChartType;
  data: any;
  field: string;
  key: string;
  step: number;
  dataAccessor: string;
  xField: string;
  yField: string;

  position: Coordinate2D;
  dimensions: Dimensions;
  canvasDimensions: Dimensions;
}

const colorArray = d3["schemeCategory10"];
const defaultMargins = 30;

export class Chart {
  title: string;
  type: ChartType;
  data: any;
  field: string;
  key: string;
  step: number;
  dataAccessor: string;
  xField: string;
  yField: string;

  position: Coordinate2D;
  dimensions: Dimensions;
  canvasDimensions: Dimensions;

  lines: ChartLineMap | undefined;

  xDomain: [any, any] | undefined;
  dataType:
    | {
        xType: "number" | "date" | undefined;
        yType: "number" | "date" | undefined;
      }
    | undefined;
  yDomain: [number, number] | undefined;

  context: { [key: string]: CanvasRenderingContext2D | null | undefined } = {};

  keyframeData: any;

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
    step,
    dataAccessor,
    xField,
    yField,
    position,
    canvasDimensions,
    dimensions,
  }: NewChartArgs) {
    this.title = title;
    this.type = type;
    this.data = data;
    this.field = field;
    this.key = key;
    this.step = step;
    this.dataAccessor = dataAccessor;
    this.xField = xField;
    this.yField = yField;

    this.position = position;
    this.dimensions = dimensions;
    this.canvasDimensions = canvasDimensions;

    this.groupDataIntoKeyFrames();
    this.setDomain();
    this.computeChartItems();
  }

  private setDomain() {
    switch (this.type.value) {
      case ChartTypeValue.LINE:
        this.setLineChartDomain();
        break;
      default:
        break;
    }
  }

  private getDataTypeForValues(values: { x: any; y: any }) {
    const { x, y } = values;

    let xType: "date" | "number" | undefined;
    let yType: "date" | "number" | undefined;

    if (typeof x === "string") {
      // check if it's a date, otherwise throw an error
      if (dayjs(x).isValid()) {
        xType = "date";
      } else {
        throw new Error("Type of x value unsupported");
      }
    } else if (typeof x === "number") {
      xType = "number";
    }

    if (typeof y === "string") {
      // check if it's a date, otherwise throw an error
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

  private setLineChartDomain() {
    const parseTime = d3.timeParse("%Y-%m-%d");

    let currentState = 0;
    if (this.lines) {
      const [key, line] = Object.entries(this.lines)[0];
      currentState = line.currentState;
    }

    this.xDomain = undefined;
    this.yDomain = undefined;
    Object.entries(this.keyframeData).forEach(([_, value]: [string, any]) => {
      const state: { x: any; y: any }[] = value[currentState].data;

      if (state[0]) {
        this.dataType = this.getDataTypeForValues(state[0]);
      }

      if (this.dataType?.xType && this.dataType?.yType) {
        let xAccessor = (data: any) => data.x;
        if (this.dataType.xType === "number") {
          xAccessor = (data: any) => data.x;
        } else if (this.dataType.xType === "date") {
          xAccessor = (data) => parseTime(data.x);
        } else {
          throw new Error(
            "Unable to instantiate new chart, data types unsupported"
          );
        }

        const [minX, maxX] = d3.extent(state, xAccessor);

        if (this.xDomain) {
          const [currentMinX, currentMaxX] = this.xDomain;
          this.xDomain = [
            d3.min([minX, currentMinX]),
            d3.max([maxX, currentMaxX]),
          ];
        } else {
          this.xDomain = [minX, maxX];
        }

        let yAccessor = (data: any) => data.y;
        if (this.dataType.yType === "number") {
          yAccessor = (data: any) => data.y;
        } else if (this.dataType.yType === "date") {
          yAccessor = (data) => parseTime(data.y);
        } else {
          throw new Error(
            "Unable to instantiate new chart, data types unsupported"
          );
        }

        const [minY, maxY] = d3.extent(state, yAccessor);

        if (this.yDomain) {
          const [currentMinY, currentMaxY] = this.yDomain;
          this.yDomain = [
            d3.min([minY, currentMinY]),
            d3.max([maxY, currentMaxY]),
          ];
        } else {
          this.yDomain = [minY, maxY];
        }
      } else {
        throw new Error(
          "Unable to instantiate new chart, data types unsupported"
        );
      }
    });
  }

  private groupDataIntoKeyFrames() {
    const groupedData = this.data.reduce(
      (currentLines: any, currentData: any) => {
        const fieldVal = currentData[this.field];
        const keyVal = currentData[this.key];

        const lineExists = currentLines[keyVal];
        // TODO: sort data by the keyframe
        const keyFrame = {
          keyframe: fieldVal,
          data: currentData[this.dataAccessor],
        };
        // Each line is an array of its different states/keyframes
        if (lineExists) {
          currentLines[keyVal] = [...currentLines[keyVal], keyFrame];
        } else {
          currentLines[keyVal] = [keyFrame];
        }
        return currentLines;
      },
      {}
    );

    /**
     * The data will look somewhat like this
     *
     * {
     *     [key]: [
     *         {
     *              keyframe: 2000,
     *              data: [ { x: 0, y: 21 }, ..., { x: 22, y: 99 } ] } ] <--- can be non array & just an object
     *         },
     *         {
     *              keyframe: 2001,
     *              data: [ { x: 0, y: 21 }, ..., { x: 22, y: 99 } ] } ]
     *         },
     *     ]
     * }
     */
    this.keyframeData = groupedData;
  }

  private setOrUpdateAnimatedLines() {
    if (this.lines === undefined) {
      this.lines = Object.entries(this.keyframeData).reduce(
        (
          currentLines: any,
          [key, value]: [string, any],
          currentIndex: number
        ) => {
          const states = value.map(({ data }: any) => {
            return data;
          });

          currentLines[key] = new AnimatedLine({
            states,
            getScales: () => this.getScales(),
            chartDimensions: this.getDimensions(),
            canvasDimensions: this.canvasDimensions,
            duration: 1000,
            color: colorArray[currentIndex],
            dataType: this.dataType,
          });
          return currentLines;
        },
        {} as ChartLineMap
      );
    } else {
      Object.entries(this.lines).forEach(
        ([_, line]: [string, AnimatedLine]) => {
          line.updateState({
            getScales: () => this.getScales(),
            chartDimensions: this.getDimensions(),
            canvasDimensions: this.canvasDimensions,
          });
        },
        {}
      );
    }
  }

  getPosition(): Coordinate2D {
    return this.position;
  }

  getDimensions(): Required<Dimensions> {
    if (this.dimensions.margin) {
      return this.dimensions as Required<Dimensions>;
    }

    return {
      ...this.dimensions,
      margin: {
        left: 30,
        right: 30,
        top: 30,
        bottom: 30,
      },
    };
  }

  getBounds() {
    const dimensions = this.getDimensions();
    const position = this.getPosition();
    return {
      x: {
        start: position.x + dimensions.margin?.left,
        end: position.x + (this.dimensions.width - dimensions.margin.right),
      },
      y: {
        start: position.y + dimensions.height - dimensions.margin.bottom,
        end: position.y + dimensions.margin.top,
      },
    };
  }

  getRange() {
    const chartBounds = this.getBounds();
    return {
      xRange: [chartBounds.x.start, chartBounds.x.end],
      yRange: [chartBounds.y.start, chartBounds.y.end],
    };
  }

  getScales() {
    this.setDomain();
    // TODO: Change these based on the domain data
    let xScaleFn: any = d3.scaleLinear;
    let yScaleFn: any = d3.scaleLinear;

    if (this.dataType?.xType === "date") {
      xScaleFn = d3.scaleTime;
    }

    if (this.dataType?.yType === "date") {
      yScaleFn = d3.scaleTime;
    }

    const { xRange, yRange } = this.getRange();

    return {
      xScale: xScaleFn(this.xDomain ?? [], xRange),
      yScale: yScaleFn(this.yDomain ?? [], yRange),
    };
  }

  getAxesPositions() {
    const position = this.getPosition();
    const dimensions = this.getDimensions();
    return {
      xAxis: position.y + (dimensions.height - dimensions.margin.top),
      yAxis: position.x + dimensions.margin.left,
    };
  }

  getAnimatedElements() {
    switch (this.type.value) {
      case ChartTypeValue.LINE:
      default:
        return this.lines;
    }
  }

  updateState({
    position,
    dimensions,
  }: {
    position?: Coordinate2D;
    dimensions?: Dimensions;
  }) {
    if (position) {
      this.position = position;
    }
    if (dimensions) {
      this.dimensions = dimensions;
    }
    this.computeChartItems();
  }

  setContext(ctxObj: {
    [key: string]: CanvasRenderingContext2D | null | undefined;
  }) {
    this.context = ctxObj;
    if (this.lines) {
      Object.entries(this.lines).forEach(([key, value]: any) => {
        value.setContext(ctxObj[key]);
      });
    }
  }

  computeChartItems() {
    switch (this.type.value) {
      case ChartTypeValue.LINE: {
        this.setOrUpdateAnimatedLines();
        break;
      }
      default:
    }
  }

  drawAll() {
    if (this.lines) {
      Object.entries(this.lines).forEach(
        ([_, value]: [string, AnimatedLine]) => {
          value.drawCurrentState({});
        }
      );
    }
  }
}
