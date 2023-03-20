import * as d3 from "d3";
import {
  // AnimatedLine,
  LegendItem,
  type Coordinate2D,
  type Dimensions,
} from "@/utils";
// import { AnimatedCircle } from "./AnimatedCircle";
import _ from "lodash";
import { LineChart, type LineItemStates } from "./LineChart";
import { ScatterPlot } from "./ScatterPlot";

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
  { color: string; states: Coordinate2D[] }
>;

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

  chart: LineChart | ScatterPlot | undefined;
  legendItems: LegendItem[] | undefined;

  xDomain: [any, any] | undefined;
  dataType:
    | {
        xType: "number" | "date" | undefined;
        yType: "number" | "date" | undefined;
      }
    | undefined;
  yDomain: [any, any] | undefined;
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
    this.computeChartItems();
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

  // private setOrUpdateAnimatedCircles() {
  //   if (this.animatedItems === undefined) {
  //     this.animatedItems = _.slice(
  //       Object.entries(this.keyframeData),
  //       0,
  //       20
  //     ).map(([key, value]: [string, any]) => {
  //       let item_group = key;
  //       if (this.useGroups) {
  //         item_group = value[0].group;
  //       }
  //       const states = value.map(({ data }: any) => {
  //         return data;
  //       });

  //       return new AnimatedCircle({
  //         states,
  //         getScales: () => this.getScales(),
  //         chartDimensions: this.getDimensions(),
  //         canvasDimensions: this.canvasDimensions,
  //         duration: 1000,
  //         key,
  //         group: item_group,
  //         color: gapMinderColorFn(item_group) as string,
  //         dataType: this.dataType,
  //       });
  //     });
  //   } else {
  //     this.animatedItems.forEach((circle: AnimatedCircle | AnimatedLine) => {
  //       circle.updateState({
  //         getScales: () => this.getScales(),
  //         chartDimensions: this.getDimensions(),
  //         canvasDimensions: this.canvasDimensions,
  //       });
  //     }, {});
  //   }
  // }

  private setOrUpdateLineChart(context?: CanvasRenderingContext2D) {
    if (this.chart === undefined && context) {
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
        context,
      });

      this.setLegendItems(items);
    } else {
      this.chart?.updateState({
        chartDimensions: this.dimensions,
        canvasDimensions: this.canvasDimensions,
        context,
      });
    }
  }

  private setOrUpdateScatterPlot(context?: CanvasRenderingContext2D) {
    if (this.chart === undefined && context) {
      const items = _.slice(Object.entries(this.keyframeData), 0, 20).reduce(
        (chartMap: ScatterPlotItemTypes, [key, value]: [string, any]) => {
          let item_group = key;
          if (this.useGroups) {
            item_group = value[0].group;
          }
          const states = value.map(({ data }: any) => {
            return data;
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
        context,
      });

      this.setLegendItems(items);
    } else {
      this.chart?.updateState({
        chartDimensions: this.dimensions,
        canvasDimensions: this.canvasDimensions,
        context,
      });
    }
  }

  setLegendItems(items: any) {
    const groupItems = this.useGroups;
    const existingKeys: Record<string, boolean> = {};
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
      this.dimensions = dimensions;
    }
    this.computeChartItems();
  }

  setContext(
    key: "chart" | "legend",
    context: CanvasRenderingContext2D | null | undefined
  ) {
    if (context) {
      this.computeChartItems(context);
    }
  }

  computeChartItems(context?: CanvasRenderingContext2D) {
    switch (this.type.value) {
      case ChartTypeValue.LINE: {
        this.setOrUpdateLineChart(context);
        break;
      }
      case ChartTypeValue.SCATTER: {
        this.setOrUpdateScatterPlot(context);
        break;
      }
      default:
    }
  }
}
