<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import * as monaco from "monaco-editor";
import {
  Chart,
  ChartTypeValue,
  DrawingUtils,
  gestureSubject,
  LineChart,
  LineInterpolateStrategy,
  type ChartType,
} from "@/utils";
import _ from "lodash";
import {
  CanvasSettings,
  ChartSettings,
  getGestureListenerResetKeys,
  initialCanvasDimensions,
  initialChartDimensions,
  LegendSettings,
  StorySettings,
} from "../../settings-state";
import { HighlightGestureListener } from "@/utils/lib/gestures/lib/HighlightGestureListener";

type ChartSettingProps = {
  type?: ChartType;
  handleNext?: () => void;
  tab?: string;
};
const props = defineProps<ChartSettingProps>();

const animation = ref<LineInterpolateStrategy>(LineInterpolateStrategy.BASIC);
function handleAnimationUpdate(animation: any) {
  const widget = StorySettings.currentStory?.getCurrentWidget();
  if (!widget?.layer) return;

  const existingChart = widget?.layer as Chart;
  (existingChart.chart as LineChart).updateAnimation(animation);
}

const limitExtent = ref<boolean>(false);
function handleToggleExtent() {
  const widget = StorySettings.currentStory?.getCurrentWidget();
  if (!widget?.layer) return;

  const existingChart = widget?.layer as Chart;
  (existingChart.chart as LineChart).toggleLimitExtent();
}

const showLegend = ref<boolean>(false);
function handleShowLegend() {
  const widget = StorySettings.currentStory?.getCurrentWidget();
  if (!widget?.layer) return;

  const newValue = !showLegend.value;
  showLegend.value = newValue;

  if (newValue === false) {
    LegendSettings.legendItems = [];
    return;
  }

  const existingChart = widget?.layer as Chart;
  if (existingChart.legendItems) {
    LegendSettings.legendItems = existingChart.legendItems;
  }
}

/**
 * Form Inputs
 */
const chartType = ref(props.type);
const chartData = ref<any>([{ hello: "world" }]);
const dataInput = ref<HTMLElement>();
let monacoEditor: monaco.editor.IStandaloneCodeEditor;
const keyframe_field = ref<string>();
const unique_key = ref<string>();
const dataAccessor = ref<string>();
const xField = ref<string>();
const yField = ref<string>();
const zField = ref<string>();
const useGroups = ref<boolean>(false);
const columnOptions = ref<any>([]);

function resetForm() {
  monacoEditor.setValue("");
  chartData.value = undefined;
  keyframe_field.value = undefined;
  unique_key.value = undefined;
  dataAccessor.value = undefined;
  xField.value = undefined;
  yField.value = undefined;
  zField.value = undefined;
  useGroups.value = false;
}

function createChart() {
  if (
    StorySettings.currentStory?.title &&
    chartType.value &&
    chartData.value &&
    keyframe_field.value &&
    unique_key.value &&
    xField.value &&
    yField.value
  ) {
    const drawingUtils = CanvasSettings.generalDrawingUtils;
    if (!drawingUtils) return;

    StorySettings.currentStory.addLayer(
      chartType.value.value,
      new Chart({
        title: StorySettings.currentStory?.title,
        type: chartType.value,
        data: chartData.value,
        field: keyframe_field.value,
        key: unique_key.value,
        dataAccessor: dataAccessor.value,
        xField: xField.value,
        yField: yField.value,
        zField: zField.value,
        position: { x: 0, y: 0 },
        dimensions: initialChartDimensions,
        canvasDimensions: initialCanvasDimensions,
        useGroups: useGroups.value,
        drawingUtils,
      })
    );
    resetForm();
  } else {
    console.log("All required fields were not provided");
  }
}

async function handleSave() {
  // check all fields are valid
  let hasRequiredFields = false;

  if (chartType.value?.value === "line") {
    if (dataAccessor.value && xField.value && yField.value) {
      if (
        chartData.value[0][dataAccessor?.value] &&
        chartData.value[0][dataAccessor.value][0][xField.value] !== undefined &&
        chartData.value[0][dataAccessor.value][0][yField.value] !== undefined
      ) {
        hasRequiredFields = true;
      }
    }
  }

  if (
    chartType.value?.value === "scatter" ||
    chartType.value?.value === "bar"
  ) {
    if (xField.value && yField.value) {
      if (
        chartData.value[0][xField.value] !== undefined &&
        chartData.value[0][yField.value] !== undefined
      ) {
        hasRequiredFields = true;
      }
    }
  }

  if (hasRequiredFields) {
    createChart();
    if (props.handleNext) {
      props.handleNext();
    }
  }
}

watch([keyframe_field, unique_key, chartData], () => {
  updateFieldOptions();
});

function updateFieldOptions() {
  try {
    columnOptions.value = _.keys(chartData.value[0]).filter(
      (objKey) => objKey !== unique_key.value && objKey !== keyframe_field.value
    );
  } catch (error) {
    console.log(error);
  }
}

function setJsonEditor() {
  if (dataInput.value) {
    monacoEditor = monaco.editor.create(dataInput.value, {
      value: JSON.stringify(chartData.value, null, 2),
      language: "json",
    });

    monacoEditor.onKeyDown(() => {
      chartData.value = JSON.parse(monacoEditor.getValue());
    });
    monacoEditor.onMouseMove(() => {
      chartData.value = JSON.parse(monacoEditor.getValue());
    });
  }
}

watch(
  () => props.tab,
  () => {
    if (props.tab) {
      const widget = StorySettings.currentStory?.getCurrentWidget();
      if (!widget?.layer) return;

      const existingChart = widget?.layer as Chart;
      if (existingChart) {
        monacoEditor.setValue(JSON.stringify(existingChart.data, null, 2));
        chartData.value = existingChart.data;
        chartType.value = existingChart.type;
        keyframe_field.value = existingChart.field;
        unique_key.value = existingChart.key;
        dataAccessor.value = existingChart.dataAccessor;
        xField.value = existingChart.xField;
        yField.value = existingChart.yField;
        zField.value = existingChart.zField;
        useGroups.value = existingChart.useGroups;
      }
    }
  }
);

watch(
  () => props.type,
  () => {
    chartType.value = props.type;
  }
);

onMounted(() => {
  setJsonEditor();
  if (props.tab) {
    const chart = StorySettings.currentStory?.getCurrentWidget();
    if (!chart?.layer) return;

    const existingChart = chart?.layer as Chart;
    if (existingChart) {
      monacoEditor.setValue(JSON.stringify(existingChart.data, null, 2));
      chartData.value = existingChart.data;
      chartType.value = existingChart.type;
      keyframe_field.value = existingChart.field;
      unique_key.value = existingChart.key;
      dataAccessor.value = existingChart.dataAccessor;
      xField.value = existingChart.xField;
      yField.value = existingChart.yField;
      zField.value = existingChart.zField;
      useGroups.value = existingChart.useGroups;
    }
  }
});
</script>
<!---------------------------------------------------------------------------------------------------------->
<template>
  <div class="text-body pl-5 pt-5">Please provide chart data</div>
  <v-card color="lighten-1">
    <form @submit.prevent="handleSave">
      <v-container class="mb-5">
        <v-row align="start">
          <v-col lg="12">
            <!-- <p class="text-body-1 mb-3">Chart Data</p> -->
            <v-card class="json-container">
              <div ref="dataInput" class="h-100"></div>
            </v-card>
          </v-col>
          <v-col lg="12">
            <v-select
              label="Keyframe Field"
              :items="columnOptions"
              v-model="keyframe_field"
            ></v-select>
          </v-col>
          <v-col lg="12">
            <v-select
              label="Unique Key Field"
              :items="columnOptions"
              v-model="unique_key"
            ></v-select>
          </v-col>
          <v-col lg="12">
            <v-select
              v-if="chartType?.value === ChartTypeValue.LINE"
              label="Data Accessor"
              :hint="`${dataAccessor}`"
              :items="columnOptions"
              v-model="dataAccessor"
            ></v-select>
          </v-col>
          <v-col lg="12">
            <v-text-field label="X Field" v-model="xField"></v-text-field>
          </v-col>
          <v-col lg="12">
            <v-text-field label="Y Field" v-model="yField"></v-text-field>
          </v-col>
          <v-col lg="12">
            <v-text-field
              v-if="chartType?.value === ChartTypeValue.SCATTER"
              label="Z Field"
              v-model="zField"
            ></v-text-field>
          </v-col>
          <v-col lg="12" v-if="zField !== undefined">
            <v-checkbox
              label="Group Items by Z Field"
              v-model="useGroups"
            ></v-checkbox>
          </v-col>
        </v-row>
        <v-row v-if="!props.tab">
          <v-spacer></v-spacer>
          <v-col lg="3">
            <v-btn type="submit" color="primary"> Save </v-btn>
          </v-col>
        </v-row>
      </v-container>
    </form>
  </v-card>
  <v-container>
    <v-row>
      <v-col>
        <v-checkbox
          label="Show Legend"
          :checked="showLegend"
          @click="handleShowLegend"
        ></v-checkbox>
      </v-col>
    </v-row>
  </v-container>
  <v-container v-if="chartType?.value === ChartTypeValue.LINE">
    <v-row>
      <v-col>
        <v-select
          v-model="animation"
          label="Animation"
          :items="[
            LineInterpolateStrategy.BASELINE,
            LineInterpolateStrategy.BASIC,
            LineInterpolateStrategy.UNDULATE,
            LineInterpolateStrategy.DROP,
          ]"
          @update:modelValue="handleAnimationUpdate"
        ></v-select>
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <v-checkbox
          label="Limit Extent to States"
          v-model="limitExtent"
          @click="handleToggleExtent"
        ></v-checkbox>
      </v-col>
    </v-row>
  </v-container>
</template>
<!---------------------------------------------------------------------------------------------------------->
<style>
.json-container {
  height: 300px;
}
</style>
