<template>
  <v-container>
    <!-- Chart Types -->
    <v-row>
      <v-col cols="12">
        <p class="text-h6 mb-4">Charts:</p>

        <div class="form-row">
          <v-row no-gutters>
            <v-col lg="2" sm="12">
              <p class="text-body-1 font-weight-bold">Chart Type:</p>
            </v-col>

            <v-col lg="10" sm="12">
              <span
                v-for="option in chartOptions"
                :class="option.class"
                :key="option.name"
                @click="() => handleChartSelection(option.name)"
              >
                <v-btn :variant="option.selected ? 'tonal' : 'outlined'">
                  {{ option.name }}
                </v-btn>
              </span>
            </v-col>
          </v-row>
        </div>

        <div class="form-row">
          <v-row no-gutters>
            <v-col lg="2" sm="12">
              <p class="text-body-1 font-weight-bold">Settings:</p>
            </v-col>

            <v-col lg="10" sm="12">
              <div class="text-caption">Width</div>
              <v-slider
                :min="0"
                :max="1000"
                :step="1"
                v-model="chartWidth"
                track-color="grey"
                thumb-label
              ></v-slider>
              <div class="text-caption">X Position</div>
              <v-slider
                :min="0"
                :max="1000"
                :step="1"
                v-model="xPosition"
                track-color="grey"
                thumb-label
              ></v-slider>
              <div class="text-caption">Y Position</div>
              <v-slider
                :min="0"
                :max="1000"
                :step="1"
                v-model="yPosition"
                track-color="grey"
                thumb-label
              ></v-slider>
            </v-col>
          </v-row>
        </div>
      </v-col>
    </v-row>
    <!-- Views -->
    <v-row>
      <v-col cols="12">
        <p class="text-h6 mb-4">Views:</p>

        <div class="form-row">
          <v-row no-gutters>
            <v-col lg="6" sm="12">
              <v-checkbox 
                label="Presenter"
                color="red"
              ></v-checkbox>
            </v-col>
          </v-row>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

// CHART TYPE
const chartType = ref<string>("Line");
const chartOptions = computed(() => [
  { class: "pa-2", name: "Line", selected: chartType.value === "Line" },
  { class: "pa-2", name: "Bar", selected: chartType.value === "Bar" },
  {
    class: "pa-2",
    name: "Scatter",
    selected: chartType.value === "Scatter",
  },
]);
function handleChartSelection(chart: string) {
  chartType.value = chart;
}

// CHART SETTINGS
const chartWidth = ref<number>(600);
const yPosition = ref<number>(0);
const xPosition = ref<number>(0);
</script>

<style>
.form-row {
  padding: 0 50px;
  align-items: flex-start;
  margin-bottom: 30px;
}
</style>
