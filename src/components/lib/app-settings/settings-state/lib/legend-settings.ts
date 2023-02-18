import { reactive } from "vue";
import {
  AnimatedLine,
  GestureTracker,
  LegendItem,
  type Coordinate2D,
  type Dimensions,
  type PartialCoordinate2D,
} from "@/utils";
import { Subject } from "rxjs";
import { CanvasSettings } from "./canvas-settings";
import _ from "lodash";
import { ChartSettings } from "./chart-settings";
import { gestureTracker } from "./gesture-settings";

const legendWidth = 200;
const legendHeight = 35;

export const LegendSettings = reactive<{
  dimensions: Dimensions;
  changeDimensions: (newDimensions: Partial<Dimensions>) => void;
  position: Coordinate2D;
  changePosition: (coord: PartialCoordinate2D) => void;
  legendItems: { [key: string]: LegendItem };
  legendSubject: Subject<any>;
  initializeLegendItems: () => void;
  addLegendItem: ({
    key,
    color,
    gestureTracker,
    index,
    context,
  }: {
    key: string;
    color: string;
    gestureTracker: GestureTracker;
    index: number;
    context?: CanvasRenderingContext2D | null;
  }) => void;
  updateAllLegendItems: () => void;
  updateLegendItem: (key: string) => void;
  updateAllLegendItemsContext: () => void;
  updateLegendItemContext: (key: string) => void;
  drawLegendItems: () => void;
  drawLegendItem: (key: string) => void;
}>({
  dimensions: {
    width: legendWidth,
    height: legendHeight,
  },
  changeDimensions(newDimensions: Partial<Dimensions>) {
    this.dimensions = {
      ...this.dimensions,
      ...(newDimensions.width ? { width: newDimensions.width } : {}),
      ...(newDimensions.height ? { width: newDimensions.height } : {}),
    };
    this.updateAllLegendItems();
  },
  position: {
    x: 450,
    y: 10,
  },
  changePosition(coords: PartialCoordinate2D) {
    this.position = {
      ...this.position,
      ...(coords.x ? { x: coords.x } : {}),
      ...(coords.y ? { x: coords.y } : {}),
    };
    this.updateAllLegendItems();
  },
  legendItems: {},
  legendSubject: new Subject(),
  initializeLegendItems() {
    Object.entries(
      ChartSettings.currentChart?.getAnimatedElements() ?? {}
    ).forEach(([key, element]: [string, AnimatedLine], index: number) => {
      const legendKey = `${key}-legend`;
      this.addLegendItem({
        key,
        color: element.color,
        context: CanvasSettings.canvasCtx[legendKey],
        gestureTracker: gestureTracker.value,
        index,
      });
    });
  },
  addLegendItem({
    key,
    color,
    gestureTracker,
    context,
    index,
  }: {
    key: string;
    color: string;
    gestureTracker: GestureTracker;
    index: number;
    context?: CanvasRenderingContext2D | null;
  }) {
    const newLegendItem = new LegendItem({
      label: key,
      color,
      position: this.position,
      dimensions: this.dimensions,
      gestureTracker,
      legendSubject: this.legendSubject,
      index,
    });
    if (context) {
      newLegendItem.setContext(context);
    }
    this.legendItems[key] = newLegendItem;
  },
  updateAllLegendItems() {
    Object.keys(this.legendItems).forEach((key: any) => {
      this.updateLegendItem(key);
    });
  },
  updateLegendItem(key: string) {
    if (this.legendItems[key]) {
      this.legendItems[key].updateState({
        position: this.position,
        dimensions: this.dimensions,
      });
    }
  },
  updateAllLegendItemsContext() {
    Object.keys(this.legendItems).forEach((key: string) => {
      this.updateLegendItemContext(key);
    });
  },
  updateLegendItemContext(key: string) {
    const contextIsAvailable =
      CanvasSettings.canvasCtx[key] !== undefined ||
      CanvasSettings.canvasCtx[key] !== null;
    if (this.legendItems[key] && contextIsAvailable) {
      this.legendItems[key].setContext(CanvasSettings.canvasCtx[key]!);
    }
  },
  drawLegendItems() {
    Object.keys(this.legendItems).forEach((key: string) => {
      this.drawLegendItem(key);
    });
  },
  drawLegendItem(key: string) {
    this.legendItems[key].drawLegend();
  },
});
