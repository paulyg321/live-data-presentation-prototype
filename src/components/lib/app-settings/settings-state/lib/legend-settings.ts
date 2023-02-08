import { reactive } from "vue";
import type { Legend } from "@/utils";

const legendWidth = 200;
const legendHeight = 35;

export const LegendSettings = reactive<{
  width: number;
  height: number;
  changeWidth: (value: number) => void;
  changeHeight: (value: number) => void;
  yPosition: number;
  changeYPosition: (value: number) => void;
  xPosition: number;
  changeXPosition: (value: number) => void;
  legends: Legend[];
  addLegend: (newLegend: Legend) => void;
}>({
  width: legendWidth,
  height: legendHeight,
  changeWidth(width: number) {
    this.width = width;
  },
  changeHeight(height: number) {
    this.height = height;
  },
  yPosition: 10,
  changeYPosition(value: number) {
    this.yPosition = value;
  },
  xPosition: 450,
  changeXPosition(value: number) {
    this.xPosition = value;
  },
  legends: [],
  addLegend(newLegend: any) {
    this.legends = [...this.legends, newLegend];
  },
});
