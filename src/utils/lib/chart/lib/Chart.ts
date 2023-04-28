import * as d3 from "d3";
import {
  CanvasElementListener,
  DrawingUtils,
  // AnimatedLine,
  LegendItem,
  type Coordinate2D,
  type Dimensions,
  getGestureListenerResetKeys,
} from "@/utils";
// import { AnimatedCircle } from "./AnimatedCircle";
import _ from "lodash";
import { LineChart, type LineItemStates } from "./LineChart";
import { ScatterPlot, type ScatterPlotItemState } from "./ScatterPlot";
import { BarChart, type BarChartItemState } from "./BarChart";
import { HighlightGestureListener } from "../../gestures/lib/HighlightGestureListener";

export enum Affect {
  JOY = "joy",
  TENDERNESS = "tenderness",
  EXCITEMENT = "excitement",
}

export enum Effect {
  DEFAULT = "default",
  FOCUSED = "focused",
  BACKGROUND = "background",
  FORESHADOW = "foreshadow",
}

export interface ChartType {
  title: "Line Chart" | "Bar Chart" | "Scatter Plot";
  value: ChartTypeValue;
}

export const NON_FOCUSED_COLOR = "grey";

export interface LegendItemsMap {
  [key: string]: LegendItem;
}

export enum ChartTypeValue {
  LINE = "line",
  SCATTER = "scatter",
  BAR = "bar",
}

type LineChartItemTypes = Record<
  string,
  { color: string; states: LineItemStates }
>;
type ScatterPlotItemTypes = Record<
  string,
  { color: string; states: ScatterPlotItemState[] }
>;
type BarChartItemTypes = Record<
  string,
  { color: string; states: BarChartItemState[] }
>;

export interface NewChartArgs {
  title: string;
  type: ChartType;
  data: any;
  field: string;
  key: string;
  dataAccessor?: string;
  xField: string;
  yField: string;
  zField?: string;
  useGroups: boolean;

  position: Coordinate2D;
  dimensions: Dimensions;
  canvasDimensions: Dimensions;
  drawingUtils: DrawingUtils;
  highlightListener?: HighlightGestureListener;
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
  canvasListener?: CanvasElementListener;
  data: any;
  field: string;
  key: string;
  dataAccessor: string | undefined;
  xField: string;
  yField: string;
  zField: string | undefined;
  useGroups = false;

  position: Coordinate2D;
  dimensions: Dimensions;
  canvasDimensions: Dimensions;

  xDomain: [any, any] | undefined;
  dataType:
    | {
        xType: "number" | "date" | undefined;
        yType: "number" | "date" | undefined;
      }
    | undefined;
  yDomain: [any, any] | undefined;
  keyframeData: any;
  keyframes: string[] = [];

  chart: LineChart | ScatterPlot | BarChart | undefined;
  drawingUtils: DrawingUtils;
  legendItems: LegendItem[] | undefined;
  highlightListener: HighlightGestureListener;

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
    dataAccessor,
    xField,
    yField,
    zField,
    position,
    canvasDimensions,
    dimensions,
    useGroups,
    drawingUtils,
  }: NewChartArgs) {
    this.title = title;
    this.type = type;
    this.data = data;
    this.field = field;
    this.key = key;
    this.dataAccessor = dataAccessor;
    this.xField = xField;
    this.yField = yField;
    this.zField = zField;
    this.useGroups = useGroups;
    this.position = position;
    this.dimensions = dimensions;
    this.drawingUtils = drawingUtils;
    this.canvasListener = new CanvasElementListener({
      position: this.position,
      dimensions: this.dimensions,
      isCircle: false,
      updateFn: (value) => {
        this.updateState(value);
      },
      drawingUtils,
    });
    this.canvasDimensions = canvasDimensions;
    this.highlightListener = new HighlightGestureListener({
      position,
      dimensions: dimensions,
      canvasDimensions: canvasDimensions,
      drawingUtils,
      resetKeys: getGestureListenerResetKeys("KeyL"),
    });
    this.groupDataIntoKeyFrames();
    this.computeChartItems();
  }

  private groupDataIntoKeyFrames() {
    let data = this.data;
    if (this.type.value === ChartTypeValue.BAR) {
      const groupedByKeyFrame = d3.group(this.data, (d: any) => d[this.field]);
      const rankedData: any[] = [];

      groupedByKeyFrame.forEach((frame: any, keyframe: string) => {
        this.keyframes.push(keyframe);
        const currentFrame = [...frame];
        currentFrame.sort((a, b) =>
          d3.descending(a[this.xField], b[this.xField])
        );
        currentFrame.forEach((item: any, index: number) => {
          rankedData.push({
            ...item,
            rank: index + 1,
          });
        });
      });

      data = rankedData;
    }
    const groupedData = data.reduce((chartItems: any, currentData: any) => {
      const fieldVal = currentData[this.field];
      this.keyframes.push(fieldVal);

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
      } else if (this.type.value === ChartTypeValue.SCATTER) {
        keyFrame = {
          keyframe: fieldVal,
          ...(this.zField ? { group: currentData[this.zField] } : {}),
          data: {
            x: currentData[this.xField],
            y: currentData[this.yField],
          },
        };
      } else {
        keyFrame = {
          keyframe: fieldVal,
          ...(this.zField ? { group: currentData[this.zField] } : {}),
          data: {
            x: currentData[this.xField],
            y: currentData.rank,
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
    }, {});

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
     *     [key]: [
     *         {
     *              keyframe: 2000,
     *              group: Africa
     *              data: { x: 0, y: 21 }
     *         },
     *      ]
     * }
     *
     * BAR CHART:
     *
     * {
     *     [key]: [
     *         {
     *              keyframe: 2000,
     *              group: Africa,
     *              rank: 1,
     *              data: { x: 0, y: 21 }
     *         },
     *      ]
     * }
     *
     */
    this.keyframeData = groupedData;
  }

  private setOrUpdateLineChart() {
    if (this.chart === undefined) {
      const items = Object.entries(this.keyframeData).reduce(
        (
          chartMap: LineChartItemTypes,
          [key, value]: [string, any],
          currentIndex: number
        ) => {
          const states = value.map(({ data }: any) => {
            return data;
          });

          return {
            ...chartMap,
            [key]: {
              states,
              color: colorArray[currentIndex],
            },
          };
        },
        {} as LineChartItemTypes
      );

      this.chart = new LineChart({
        items,
        canvasDimensions: this.canvasDimensions,
        chartDimensions: this.dimensions,
        position: this.position,
        drawingUtils: this.drawingUtils,
      });

      this.setLegendItems(items);
    } else {
      this.chart?.updateState({
        chartDimensions: this.dimensions,
        canvasDimensions: this.canvasDimensions,
        position: this.position,
        drawingUtils: this.drawingUtils,
      });
    }
  }

  private setOrUpdateScatterPlot() {
    if (this.chart === undefined) {
      const items = _.slice(Object.entries(this.keyframeData)).reduce(
        (chartMap: ScatterPlotItemTypes, [key, value]: [string, any]) => {
          let item_group = key;
          if (this.useGroups) {
            item_group = value[0].group;
          }
          const states = value.map(({ data, keyframe }: any) => {
            return { data, keyframe };
          });

          return {
            ...chartMap,
            [key]: {
              states,
              color: gapMinderColorFn(item_group) as string,
              group: item_group,
            },
          };
        },
        {} as ScatterPlotItemTypes
      );

      this.chart = new ScatterPlot({
        items,
        canvasDimensions: this.canvasDimensions,
        chartDimensions: this.dimensions,
        position: this.position,
        drawingUtils: this.drawingUtils,
        keyframes: this.keyframes,
      });

      this.setLegendItems(items);
    } else {
      this.chart?.updateState({
        chartDimensions: this.dimensions,
        canvasDimensions: this.canvasDimensions,
        position: this.position,
        drawingUtils: this.drawingUtils,
      });
    }
  }

  private setOrUpdateBarChart() {
    if (this.chart === undefined) {
      const items = Object.entries(this.keyframeData)
        .slice(0, 10)
        .reduce((chartMap: BarChartItemTypes, [key, value]: [string, any]) => {
          const item_group = key;
          // if (this.useGroups) {
          //   item_group = value[0].group;
          // }
          const states = value.map(({ data, keyframe }: any) => {
            return { data, keyframe };
          });

          return {
            ...chartMap,
            [key]: {
              states,
              color: gapMinderColorFn(item_group) as string,
              group: item_group,
            },
          };
        }, {} as BarChartItemTypes);

      this.chart = new BarChart({
        items,
        canvasDimensions: this.canvasDimensions,
        chartDimensions: this.dimensions,
        position: this.position,
        drawingUtils: this.drawingUtils,
        keyframes: this.keyframes,
      });
    } else {
      this.chart?.updateState({
        chartDimensions: this.dimensions,
        canvasDimensions: this.canvasDimensions,
        position: this.position,
        drawingUtils: this.drawingUtils,
      });
    }
  }

  setLegendItems(items: any) {
    const groupItems = this.useGroups;
    const existingKeys: Record<string, boolean> = {};

    if (this.type.value === ChartTypeValue.BAR) return;

    this.legendItems = Object.entries(items).reduce<LegendItem[]>(
      (legendItems: LegendItem[], [key, value]: any) => {
        let item_group = key;

        if (groupItems && this.zField) {
          item_group = value.group;
        }

        if (!existingKeys[item_group]) {
          existingKeys[item_group] = true;
          return [
            ...legendItems,
            new LegendItem({
              label: item_group,
              color: value.color,
              canvasDimensions: this.canvasDimensions,
              drawingUtils: this.drawingUtils,
            }),
          ];
        }

        return legendItems;
      },
      [] as LegendItem[]
    );
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
      this.dimensions = {
        ...this.dimensions,
        ...dimensions,
      };
    }
    this.highlightListener.updateState({
      position: this.position,
      dimensions: this.dimensions,
    });
    this.computeChartItems();
  }

  computeChartItems() {
    switch (this.type.value) {
      case ChartTypeValue.LINE: {
        this.setOrUpdateLineChart();
        break;
      }
      case ChartTypeValue.SCATTER: {
        this.setOrUpdateScatterPlot();
        break;
      }
      case ChartTypeValue.BAR: {
        this.setOrUpdateBarChart();
        break;
      }
      default:
    }
  }

  draw() {
    this.chart?.draw();
    this.highlightListener.draw();
  }
}
