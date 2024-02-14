<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import * as monaco from "monaco-editor";
import { Chart, ChartType, ScaleTypes, scaleOptions } from "@/utils";
import _ from "lodash";
import {
  CanvasSettings,
  initialCanvasDimensions,
  initialChartDimensions,
  StorySettings,
} from "@/state";

const valid = ref();

function getFieldValidator(type: string) {
  switch (type) {
    case "keyframe":
      return (value: string) => {
        if (value && value.length > 0) return true;
        return "You must enter a keyframe field";
      };
    case "uniqueKey":
      return (value: string) => {
        if (value && value.length > 0) return true;
        return "You must enter a unique key field";
      };
    case "xField":
      return (value: string) => {
        if (value && value.length > 0) return true;
        return "You must enter an xField";
      };
    case "yField":
      return (value: string) => {
        if (value && value.length > 0) return true;
        return "You must enter an yField";
      };
    default:
      return true;
  }
}

type ChartSettingProps = {
  type?: ChartType;
  handleNext?: () => void;
  tab?: string;
};
const props = defineProps<ChartSettingProps>();

/**
 * Form Inputs
 */
const chartType = ref(props.type);
const chartData = ref<any>([{ hello: "world" }]);
const dataInput = ref<HTMLElement>();
let monacoEditor: monaco.editor.IStandaloneCodeEditor;
const keyframe_field = ref<string>();
const uniqueKey = ref<string>();
const dataAccessor = ref<string>();
const xField = ref<string>();
const yField = ref<string>();
const zField = ref<string>();
const xAxisScale = ref<ScaleTypes | undefined>();
const yAxisScale = ref<ScaleTypes | undefined>();
const groupBy = ref<string>();
const selectionField = ref<string>();
const columnOptions = ref<any>([]);

function resetForm() {
  monacoEditor.setValue("[]");
  chartData.value = undefined;
  keyframe_field.value = undefined;
  uniqueKey.value = undefined;
  dataAccessor.value = undefined;
  xField.value = undefined;
  yField.value = undefined;
  zField.value = undefined;
  xAxisScale.value = undefined;
  yAxisScale.value = undefined;
  groupBy.value = undefined;
  selectionField.value = undefined;
}

function loadExistingChartData() {
  if (props.tab) {
    const chart = StorySettings.currentStory?.currentWidget;
    if (!chart?.layer) return;

    const existingChart = chart?.layer as Chart;
    if (existingChart) {
      monacoEditor.setValue(JSON.stringify(existingChart.state.data, null, 2));
      chartData.value = existingChart.state.data;
      chartType.value = existingChart.state.type;
      keyframe_field.value = existingChart.state.field;
      uniqueKey.value = existingChart.state.key;
      xField.value = existingChart.state.xField;
      yField.value = existingChart.state.yField;
      zField.value = existingChart.state.zField;
      xAxisScale.value = existingChart.state.xScaleType;
      yAxisScale.value = existingChart.state.yScaleType;
      groupBy.value = existingChart.state.groupBy;
      selectionField.value = existingChart.state.selectionField;
    }
  }
}

async function createChart() {
  if (
    StorySettings.currentStory?.title &&
    chartType.value &&
    chartData.value &&
    keyframe_field.value &&
    uniqueKey.value &&
    xField.value &&
    yField.value
  ) {
    ``;
    const drawingUtils = CanvasSettings.generalDrawingUtils;
    if (!drawingUtils) return;

    const newChart = new Chart({
      title: StorySettings.currentStory?.title,
      type: chartType.value,
      data: chartData.value,
      field: keyframe_field.value,
      key: uniqueKey.value,
      xField: xField.value,
      yField: yField.value,
      zField: zField.value,
      groupBy: groupBy.value,
      selectionField: selectionField.value,
      dimensions: initialChartDimensions,
      canvasDimensions: initialCanvasDimensions,
      xScaleType: xAxisScale.value,
      yScaleType: yAxisScale.value,
      drawingUtils,
      position: {
        x:
          CanvasSettings.dimensions.width / 2 -
          initialChartDimensions.width / 2,
        y:
          CanvasSettings.dimensions.height / 2 -
          initialChartDimensions.height / 2,
      },
      dataFieldNames: columnOptions.value,
    });

    await newChart.init();

    StorySettings.currentStory.addLayer(chartType.value, newChart);
    resetForm();
  }
}

async function handleSave() {
  if (!valid.value) return;

  createChart();
  if (props.handleNext) {
    props.handleNext();
  }
}

watch([chartData], () => {
  updateFieldOptions();
});

function updateFieldOptions() {
  if (!chartData.value?.length) return;
  try {
    columnOptions.value = _.keys(chartData.value[0]);
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
    setJsonEditor();
    loadExistingChartData();
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
  loadExistingChartData();
});
</script>
<!---------------------------------------------------------------------------------------------------------->
<template>
  <div class="text-body pl-5 pt-5">Please provide chart data</div>
  <v-card color="lighten-1">
    <v-form
      fast-fail
      validate-on="submit lazy"
      @submit.prevent="handleSave"
      v-model="valid"
    >
      <v-container class="mb-5">
        <v-row align="start">
          <v-col lg="12">
            <v-card class="json-container">
              <div ref="dataInput" class="h-100"></div>
            </v-card>
          </v-col>
          <v-col lg="12">
            <v-autocomplete
              label="Keyframe Field *"
              v-model="keyframe_field"
              :items="columnOptions"
              :rules="[getFieldValidator('keyframe')]"
              required
            >
            </v-autocomplete>
          </v-col>
          <v-col lg="12">
            <v-autocomplete
              label="Unique Key Field *"
              v-model="uniqueKey"
              :items="columnOptions"
              :rules="[getFieldValidator('uniqueKey')]"
            ></v-autocomplete>
          </v-col>
          <v-col lg="12">
            <v-autocomplete
              label="X Field *"
              v-model="xField"
              :items="columnOptions"
              :rules="[getFieldValidator('xField')]"
            ></v-autocomplete>
          </v-col>
          <v-col lg="12">
            <v-autocomplete
              label="X Axis Scale"
              v-model="xAxisScale"
              :items="scaleOptions"
              clearable
            ></v-autocomplete>
          </v-col>
          <v-col lg="12">
            <v-autocomplete
              label="Y Field *"
              v-model="yField"
              :items="columnOptions"
              :rules="[getFieldValidator('yField')]"
            ></v-autocomplete>
          </v-col>
          <v-col lg="12">
            <v-autocomplete
              label="Y Axis Scale"
              v-model="yAxisScale"
              :items="scaleOptions"
              clearable
            ></v-autocomplete>
          </v-col>
          <v-col lg="12">
            <v-autocomplete
              v-if="chartType === ChartType.SCATTER"
              label="Size Field"
              hint="If you want the sizes to vary use this field"
              v-model="zField"
              :items="columnOptions"
            ></v-autocomplete>
          </v-col>
          <v-col lg="12">
            <v-autocomplete
              label="Color Field"
              hint="If you want to groups to be colored differently"
              v-model="groupBy"
              :items="columnOptions"
            ></v-autocomplete>
          </v-col>
          <v-col lg="12">
            <v-autocomplete
              label="Selection Field"
              hint="Field you want to select items by - the value you put into selection poses will compare with this field"
              v-model="selectionField"
              :items="columnOptions"
            ></v-autocomplete>
          </v-col>
        </v-row>
        <v-row v-if="!props.tab">
          <v-col lg="12">
            <v-btn type="submit" size="large" block color="primary">
              Save
            </v-btn>
          </v-col>
        </v-row>
      </v-container>
    </v-form>
  </v-card>
</template>
<!---------------------------------------------------------------------------------------------------------->
<style>
.json-container {
  height: 300px;
}
</style>
