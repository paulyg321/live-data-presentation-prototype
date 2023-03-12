import { reactive } from "vue";
import {
  clearArea,
  LegendItem,
  legendSubject,
  type Coordinate2D,
  type Dimensions,
  type PartialCoordinate2D,
} from "@/utils";
import { CanvasSettings } from "./canvas-settings";
import { ChartSettings } from "./chart-settings";
import { gestureTracker } from "./gesture-settings";
import _ from "lodash";

const legendWidth = 200;
const legendHeight = 35;

export const LegendSettings = reactive<{
  dimensions: Dimensions;
  position: Coordinate2D;
  legendItems: LegendItem[];
  page: number;
  numItems: number;
  changeDimensions: (newDimensions: Partial<Dimensions>) => void;
  changePosition: (coord: PartialCoordinate2D) => void;
  changePage: (pageNumber: number) => void;
  initializeLegendItems: () => void;
  drawLegendItems: () => void;
}>({
  dimensions: {
    width: legendWidth,
    height: legendHeight,
  },
  position: {
    x: 450,
    y: 10,
  },
  legendItems: [],
  page: 0,
  numItems: 5,
  changeDimensions(newDimensions: Partial<Dimensions>) {
    this.dimensions = {
      ...this.dimensions,
      ...(newDimensions.width ? { width: newDimensions.width } : {}),
      ...(newDimensions.height ? { width: newDimensions.height } : {}),
    };
    this.drawLegendItems();
  },
  changePosition(coords: PartialCoordinate2D) {
    this.position = {
      ...this.position,
      ...(coords.x ? { x: coords.x } : {}),
      ...(coords.y ? { x: coords.y } : {}),
    };
    this.drawLegendItems();
  },
  changePage(pageNumber: number) {
    this.page = pageNumber;
    this.drawLegendItems();
  },
  initializeLegendItems() {
    const legendItems = ChartSettings.currentChart?.getLegendItems();
    this.legendItems = legendItems ?? [];
  },
  drawLegendItems() {
    const context = CanvasSettings.canvasCtx["legend"];
    const start = this.page * this.numItems;
    const end = this.page * this.numItems + this.numItems;
    if (context) {
      clearArea({
        context,
        coordinates: { x: 0, y: 0 },
        dimensions: CanvasSettings.dimensions,
      });
    }
    this.legendItems.forEach((legendItem: LegendItem, index: number) => {
      const isInRange = index >= start && index < end;
      if (context && isInRange) {
        const displayedItemIndex = index - start;
        legendItem.setContext(context);
        legendItem.setGestureTracker(gestureTracker.value);
        legendItem.setLegendSubject(legendSubject);
        legendItem.updateState({
          position: LegendItem.getPositionFromIndex(
            this.position,
            displayedItemIndex,
            this.dimensions
          ),
          dimensions: this.dimensions,
        });
        legendItem.drawLegend();
      } else {
        legendItem.updateState({
          position: LegendItem.getPositionFromIndex({ x: 0, y: 0 }, -1, {
            width: 0,
            height: 0,
          }),
        });
      }
    });
  },
});
