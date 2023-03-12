import * as d3 from "d3";
import dayjs from "dayjs";
import {
  AnimatedLine,
  LegendItem,
  type Coordinate2D,
  type Dimensions,
} from "@/utils";
import { AnimatedCircle } from "./AnimatedCircle";
import _ from "lodash";
import type { Subject } from "rxjs";

export enum Effect {
  DEFAULT = "default",
  FOCUSED = "focused",
  BACKGROUND = "background",
}

export interface ChartType {
  title: "Line Chart" | "Bar Chart" | "Scatter Plot";
  value: ChartTypeValue;
}

export interface ChartItemsMap {
  [key: string]: AnimatedLine | AnimatedCircle;
}

export interface LegendItemsMap {
  [key: string]: LegendItem;
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
  dataAccessor?: string;
  xField: string;
  yField: string;
  zField?: string;
  useGroups: boolean;

  position: Coordinate2D;
  dimensions: Dimensions;
  canvasDimensions: Dimensions;
}

const colorArray = d3["schemeCategory10"];
const gapMinderColorFn = d3
  .scaleOrdinal()
  .domain([
    "Africa",
    "Europe",
    "North America",
    "Oceania",
    "Asia",
    "South America",
  ])
  .range(colorArray);
const defaultMargins = 30;

export class Chart {
  title: string;
  type: ChartType;
  data: any;
  field: string;
  key: string;
  step: number;
  dataAccessor: string | undefined;
  xField: string;
  yField: string;
  zField: string | undefined;
  useGroups = false;

  position: Coordinate2D;
  dimensions: Dimensions;
  canvasDimensions: Dimensions;

  animatedItems: AnimatedLine[] | AnimatedCircle[] | undefined;
  legendItems: LegendItem[] | undefined;

  xDomain: [any, any] | undefined;
  dataType:
    | {
        xType: "number" | "date" | undefined;
        yType: "number" | "date" | undefined;
      }
    | undefined;
  yDomain: [any, any] | undefined;

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
    zField,
    position,
    canvasDimensions,
    dimensions,
    useGroups,
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
    this.zField = zField;
    this.useGroups = useGroups;

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
      case ChartTypeValue.SCATTER:
        this.setScatterPlotDomain();
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

  private setScatterPlotDomain() {
    const parseTime = d3.timeParse("%Y-%m-%d");
    let currentState = 0;
    if (this.animatedItems) {
      const circle = this.animatedItems[0];
      currentState = circle.currentState;
    }

    this.xDomain = undefined;
    this.yDomain = undefined;
    const currentChartState = Object.entries(this.keyframeData).map(
      ([_, value]: [string, any]) => {
        const state: { x: any; y: any } = value[currentState].data;

        if (state) {
          this.dataType = this.getDataTypeForValues(state);
        }

        return state;
      }
    );

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

      this.xDomain = d3.extent(currentChartState, xAccessor);

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

      this.yDomain = d3.extent(currentChartState, yAccessor);
    } else {
      throw new Error(
        "Unable to instantiate new chart, data types unsupported"
      );
    }
  }

  private setLineChartDomain() {
    const parseTime = d3.timeParse("%Y-%m-%d");

    let currentState = 0;
    if (this.animatedItems) {
      const line = this.animatedItems[0];
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
      (chartItems: any, currentData: any) => {
        const fieldVal = currentData[this.field];
        const keyVal = currentData[this.key];

        const exists = chartItems[keyVal];
        // TODO: sort data by the keyframe

        let keyFrame;
        if (this.type.value === ChartTypeValue.LINE && this.dataAccessor) {
          keyFrame = {
            keyframe: fieldVal,
            data: currentData[this.dataAccessor].map((datum: any) => {
              return {
                x: datum[this.xField],
                y: datum[this.yField],
              };
            }),
          };
        } else {
          keyFrame = {
            keyframe: fieldVal,
            ...(this.zField ? { group: currentData[this.zField] } : {}),
            data: {
              x: currentData[this.xField],
              y: currentData[this.yField],
            },
          };
        }

        // Each line is an array of its different states/keyframes
        if (exists) {
          chartItems[keyVal] = [...chartItems[keyVal], keyFrame];
        } else {
          chartItems[keyVal] = [keyFrame];
        }
        return chartItems;
      },
      {}
    );

    /**
     * The data will look somewhat like this
     *
     * LINE CHART:
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
     *
     * SCATTER PLOT:
     *
     * {
     *        [key]: [
     *         {
     *              keyframe: 2000,
     *              data: { x: 0, y: 21 }
     *         },
     *         {
     *              keyframe: 2001,
     *              data: { x: 22, y: 99 }
     *         },
     *     ]
     * }
     *
     */
    this.keyframeData = groupedData;
  }

  private setOrUpdateAnimatedCircles() {
    if (this.animatedItems === undefined) {
      this.animatedItems = _.slice(
        Object.entries(this.keyframeData),
        0,
        20
      ).map(([key, value]: [string, any]) => {
        let item_group = key;
        if (this.useGroups) {
          item_group = value[0].group;
        }
        const states = value.map(({ data }: any) => {
          return data;
        });

        return new AnimatedCircle({
          states,
          getScales: () => this.getScales(),
          chartDimensions: this.getDimensions(),
          canvasDimensions: this.canvasDimensions,
          duration: 1000,
          key,
          group: item_group,
          color: gapMinderColorFn(item_group) as string,
          dataType: this.dataType,
        });
      });
    } else {
      this.animatedItems.forEach((circle: AnimatedCircle | AnimatedLine) => {
        circle.updateState({
          getScales: () => this.getScales(),
          chartDimensions: this.getDimensions(),
          canvasDimensions: this.canvasDimensions,
        });
      }, {});
    }
  }

  private setOrUpdateAnimatedLines() {
    if (this.animatedItems === undefined) {
      this.animatedItems = Object.entries(this.keyframeData).map(
        ([key, value]: [string, any], currentIndex: number) => {
          const states = value.map(({ data }: any) => {
            return data;
          });

          return new AnimatedLine({
            states,
            getScales: () => this.getScales(),
            chartDimensions: this.getDimensions(),
            chartPosition: this.getPosition(),
            canvasDimensions: this.canvasDimensions,
            duration: 1000,
            key,
            color: colorArray[currentIndex],
            dataType: this.dataType,
          });
        }
      );
    } else {
      this.animatedItems.forEach((line: AnimatedCircle | AnimatedLine) => {
        line.updateState({
          getScales: () => this.getScales(),
          chartDimensions: this.getDimensions(),
          canvasDimensions: this.canvasDimensions,
        });
      }, {});
    }
  }

  setLegendItems() {
    const groupItems = this.useGroups;
    const existingKeys: Record<string, boolean> = {};
    this.legendItems = this.animatedItems?.reduce<LegendItem[]>(
      (legendItems: LegendItem[], animatedItem: any) => {
        let item_group = animatedItem.key;

        if (groupItems && this.zField) {
          item_group = animatedItem.group;
        }

        if (!existingKeys[item_group]) {
          existingKeys[item_group] = true;
          return [
            ...legendItems,
            new LegendItem({
              label: item_group,
              color: animatedItem.color,
              canvasDimensions: this.canvasDimensions,
            }),
          ];
        }

        return legendItems;
      },
      [] as LegendItem[]
    );
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
        return this.animatedItems;
    }
  }

  getLegendItems() {
    this.setLegendItems();
    return this.legendItems;
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
    if (this.animatedItems) {
      this.animatedItems.forEach((item: AnimatedCircle | AnimatedLine) => {
        const itemContext = ctxObj[item.key];
        if (itemContext) {
          item.setContext(itemContext);
        }
      });
    }
  }

  computeChartItems() {
    switch (this.type.value) {
      case ChartTypeValue.LINE: {
        this.setOrUpdateAnimatedLines();
        break;
      }
      case ChartTypeValue.SCATTER: {
        this.setOrUpdateAnimatedCircles();
        break;
      }
      default:
    }
  }

  drawAll() {
    if (this.animatedItems) {
      this.animatedItems.forEach((item: AnimatedCircle | AnimatedLine) => {
        item.drawCurrentState();
      });
    }
  }
}
