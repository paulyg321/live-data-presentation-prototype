import * as d3 from "d3";
import { AnimatedLine } from "@/utils";

export interface ChartType {
  title: "Line Chart" | "Bar Chart" | "Scatter Plot";
  value: ChartTypeValue;
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
  x: string;
  y: string;
}

export class Chart {
  title: string;
  type: ChartType;
  data: any;
  field: string;
  key: string;
  step: number;
  x: string;
  y: string;
  xDomain: any[] = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
  yDomain: any[] = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];

  static CreateChart({
    title,
    type,
    data,
    field,
    key,
    step,
    x,
    y,
  }: Partial<NewChartArgs>) {
    const hasRequiredFields =
      title !== undefined ||
      type !== undefined ||
      data !== undefined ||
      field !== undefined ||
      key !== undefined ||
      step !== undefined ||
      x !== undefined ||
      y !== undefined;

    if (!hasRequiredFields)
      throw new Error("Please provide all required fields");

    return new Chart({
      title: title!,
      type: type!,
      data: data!,
      field: field!,
      key: key!,
      step: step!,
      x: x!,
      y: y!,
    });
  }

  /**
   * @param type the chart type
   * @param data the chart data
   * @param field this is the field that is used to group each row into a keyframe
   * @param key this is the field that is used to group each row across keyframes,
   *                        to know the field to look at for elements to display and transitions to next keyframe
   * @param step the amount of time between keyframes
   * @param x the field for the x value (if data is stored in array use [array_field].[x] e.g. 'prices.x') only line types can use dot notation
   * @param y the field for the y value (if data is stored in array use [array_field].[y] e.g. 'prices.y') only line types can use dot notation
   */
  constructor({
    title,
    type,
    data = [],
    field,
    key,
    step,
    x = "x",
    y = "y",
  }: NewChartArgs) {
    this.title = title;
    this.type = type;
    this.data = data;
    this.field = field;
    this.key = key;
    this.step = step;
    this.x = x;
    this.y = y;

    this.setLineChartDomain({ data });
  }

  getAnimatedChartItems({
    xScale,
    yScale,
    chartDimensions,
    canvasDimensions,
    duration,
  }: {
    xScale: any;
    yScale: any;
    chartDimensions: {
      width: number;
      height: number;
    };
    canvasDimensions: {
      width: number;
      height: number;
    };
    duration: number;
  }) {
    switch (this.type.value) {
      case ChartTypeValue.LINE: {
        const resultantLine = this.convertLineDataToAnimation({
          field: this.field,
          key: this.key,
          dataKey: this.x.split(".")[0],
          chartOptions: {
            xScale,
            yScale,
            chartDimensions,
            canvasDimensions,
            duration,
          },
        });
        return resultantLine;
      }
      default:
        return undefined;
    }
  }

  convertLineDataToAnimation({
    field,
    key,
    dataKey,
    chartOptions: {
      xScale,
      yScale,
      chartDimensions,
      canvasDimensions,
      duration,
    },
  }: {
    field: string;
    key: string;
    dataKey: string;
    chartOptions: {
      xScale: any;
      yScale: any;
      chartDimensions: {
        width: number;
        height: number;
      };
      canvasDimensions: {
        width: number;
        height: number;
      };
      duration: number;
    };
  }) {
    const lines = this.data.reduce((currentLines: any, currentData: any) => {
      const fieldVal = currentData[field];
      const keyVal = currentData[key];

      const updatedLines = { ...currentLines };

      const existingLine = updatedLines[keyVal];
      // TODO: sort data by the keyframe
      const newKeyFrame = {
        keyframe: fieldVal,
        data: currentData[dataKey],
      };
      if (existingLine) {
        updatedLines[keyVal] = [...updatedLines[keyVal], newKeyFrame];
      } else {
        updatedLines[keyVal] = [newKeyFrame];
      }
      return updatedLines;
    }, {});

    return Object.entries(lines).reduce(
      (currentLines: any, [key, value]: any) => {
        const updatedLines = { ...currentLines };
        const states = value.map(({ data }: any) => {
          return data;
        });
        updatedLines[key] = new AnimatedLine({
          states,
          xScale,
          yScale,
          chartDimensions,
          canvasDimensions,
          duration,
        });
        return updatedLines;
      },
      {}
    );
  }

  setLineChartDomain({
    data,
    dataKey = this.x.split(".")[0],
  }: {
    data: any;
    dataKey?: any;
  }) {
    if (data.length > 0) {
      data.forEach((currentData: any) => {
        const state = currentData[dataKey] as { x: any; y: any }[];
        const [minX, maxX] = d3.extent(state, (data) => data.x);
        const [minY, maxY] = d3.extent(state, (data) => data.y);

        const currentMinX = this.xDomain[0];
        const currentMaxX = this.xDomain[1];

        const currentMinY = this.xDomain[0];
        const currentMaxY = this.xDomain[1];

        this.xDomain = [
          d3.min([minX, currentMinX]),
          d3.max([maxX, currentMaxX]),
        ];
        this.yDomain = [
          d3.min([minY, currentMinY]),
          d3.max([maxY, currentMaxY]),
        ];
      }, {});
    } else {
      throw new Error("Non existent data");
    }
  }
}
