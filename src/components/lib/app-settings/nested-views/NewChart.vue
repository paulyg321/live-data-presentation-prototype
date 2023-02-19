<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import * as monaco from "monaco-editor";
import { Chart, ChartTypeValue, type ChartType } from "@/utils";
import _ from "lodash";
import { CanvasSettings, ChartSettings } from "../settings-state";

const numPages = 2;
const chartOptions = [
  { title: "Line Chart", value: "line" },
  { title: "Scatter Plot", value: "scatter" },
  { title: "Bar Chart", value: "bar" },
];
/**
 * Stepper
 */
const currentPage = ref(1);
const buttonContainerClass = computed(() => {
  const isFirstPage = currentPage.value === 1;

  const isLastPage = currentPage.value === numPages;
  const singleBtnFormat = isLastPage ? "justify-start" : "justify-end";

  const isFirstOrLastPage = isFirstPage || isFirstPage;

  return `d-flex ${
    isFirstOrLastPage ? singleBtnFormat : "justify-space-between"
  }`;
});

function createChart() {
  if (
    chartTitle.value &&
    newChartType.value &&
    chartData.value &&
    field.value &&
    key.value &&
    step.value &&
    dataAccessor.value &&
    xField.value &&
    yField.value
  ) {
    ChartSettings.addChart(
      new Chart({
        title: chartTitle.value,
        type: newChartType.value,
        data: chartData.value,
        field: field.value,
        key: key.value,
        step: step.value,
        dataAccessor: dataAccessor.value,
        xField: xField.value,
        yField: yField.value,
        position: ChartSettings.position,
        dimensions: ChartSettings.dimensions,
        canvasDimensions: CanvasSettings.dimensions,
      })
    );
  } else {
    alert("All required fields were not provided");
  }
}

function handleBack() {
  if (currentPage.value > 1) {
    currentPage.value -= 1;
  }
}

async function handleNext() {
  if (currentPage.value === 1) {
    if (
      // check all fields are valid
      newChartType.value === undefined ||
      chartTitle.value === undefined ||
      chartData.value === undefined
    ) {
      alert("ALL FIELDS ARE REQUIRED");
      return;
    }
    chartData.value = JSON.parse(monacoEditor.getValue());
    updateFieldOptions();
  }

  if (currentPage.value === numPages) {
    // check all fields are valid
    const hasRequiredFields =
      field.value !== undefined ||
      key.value !== undefined ||
      dataAccessor.value !== undefined ||
      xField.value !== undefined ||
      yField.value !== undefined;

    if (hasRequiredFields) {
      if (newChartType.value?.value === "line") {
        if (dataAccessor.value && xField.value && yField.value) {
          if (
            chartData.value[0][dataAccessor.value] &&
            chartData.value[0][dataAccessor.value][0][xField.value] !==
              undefined &&
            chartData.value[0][dataAccessor.value][0][yField.value] !==
              undefined
          ) {
            createChart();
          } else {
            alert(
              "ERROR - Unable to access data using specified fields for dataAccessor and x/y fields"
            );
          }
        } else {
          //set for error
          alert("ERROR - LINE data accessor and x/y fields not set ");
        }
      }
    } else {
      alert("ERROR - Required fields missing");
    }
  }

  if (currentPage.value < numPages) {
    currentPage.value = currentPage.value + 1;
  }
}

/**
 * Form Inputs
 */
const chartTitle = ref<string>();
const newChartType = ref<ChartType | undefined>();
const chartData = ref<any>([{ hello: "world" }]);
const dataInput = ref<HTMLElement>();
let monacoEditor: monaco.editor.IStandaloneCodeEditor;
const field = ref<string>();
const key = ref<string>();
const dataAccessor = ref<string>();
const xField = ref<string>();
const yField = ref<string>();
const step = ref<number>(500);
const columnOptions = ref<any>([]);
watch([field, key], () => {
  updateFieldOptions();
});

function updateFieldOptions() {
  columnOptions.value = _.keys(chartData.value[0]).filter(
    (objKey) => objKey !== key.value && objKey !== field.value
  );
}

function setJsonEditor() {
  if (dataInput.value) {
    monacoEditor = monaco.editor.create(dataInput.value, {
      value: JSON.stringify(chartData.value),
      language: "json",
    });
  }
}

onMounted(() => {
  setJsonEditor();
});
</script>
<!---------------------------------------------------------------------------------------------------------->
<template>
  <h1 class="text-h4 mb-5">New Chart</h1>
  <v-card color="lighten-1">
    <v-container>
      <div v-show="currentPage === 1">
        <v-container class="mb-10">
          <v-row align="start">
            <v-col lg="12">
              <v-text-field
                label="Chart Title"
                v-model="chartTitle"
              ></v-text-field>
            </v-col>
            <v-col lg="12">
              <v-select
                label="Chart Type"
                :hint="`${newChartType?.title}`"
                :items="chartOptions"
                item-title="title"
                item-value="value"
                v-model="newChartType"
                return-object
              ></v-select>
            </v-col>
            <v-col lg="12">
              <p class="text-body-1 mb-3">Chart Data</p>
              <v-card class="json-container">
                <div ref="dataInput" class="h-100"></div>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </div>
      <div v-if="currentPage === 2">
        <v-container class="mb-10">
          <v-row align="start">
            <v-col lg="12">
              <v-select
                label="Field"
                :hint="`${field}`"
                :items="columnOptions"
                v-model="field"
              ></v-select>
            </v-col>
            <v-col lg="12">
              <v-select
                label="Key"
                :hint="`${key}`"
                :items="columnOptions"
                v-model="key"
              ></v-select>
            </v-col>
            <v-col lg="12">
              <v-select
                v-if="newChartType?.value === ChartTypeValue.LINE"
                label="Data Accessor"
                :hint="`${dataAccessor}`"
                :items="columnOptions"
                v-model="dataAccessor"
              ></v-select>
            </v-col>
            <v-col lg="12">
              <v-text-field
                v-if="newChartType?.value === ChartTypeValue.LINE"
                label="X Field"
                v-model="xField"
              ></v-text-field>
            </v-col>
            <v-col lg="12">
              <v-text-field
                v-if="newChartType?.value === ChartTypeValue.LINE"
                label="Y Field"
                v-model="yField"
              ></v-text-field>
            </v-col>
            <v-col lg="12">
              <v-text-field label="Step" v-model="step"></v-text-field>
            </v-col>
          </v-row>
        </v-container>
      </div>
      <v-row>
        <v-col lg="12" :class="buttonContainerClass">
          <v-btn @click="handleBack()" v-if="currentPage > 1"> Back </v-btn>
          <v-btn @click="handleNext()" color="primary">
            {{ currentPage < numPages ? "Next" : "Create" }}
          </v-btn>
        </v-col>
      </v-row>
    </v-container>
  </v-card>
</template>
<!---------------------------------------------------------------------------------------------------------->
<style>
.json-container {
  height: 300px;
}
</style>
