<script lang="ts" setup>
import { ChartSettings, LegendSettings } from "../settings-state";
import lineChartPng from "@/assets/line-chart.png";
import barChartPng from "@/assets/bar-chart.png";
import scatterPlotPng from "@/assets/scatter-plot.png";

const imageSize = 100;

function getChartImage(type: string) {
  switch (type) {
    case "line":
      return lineChartPng;
    case "bar":
      return barChartPng;
    case "scatter":
    default:
      return scatterPlotPng;
  }
}

function getChartColor(type: string) {
  switch (type) {
    case "line":
      return "purple";
    case "bar":
      return "green";
    case "scatter":
    default:
      return "red";
  }
}
</script>
<template>
  <v-row>
    <v-col lg="12">
      <div class="text-caption">Width</div>
      <v-slider
        :min="0"
        :max="1000"
        :step="1"
        :model-value="ChartSettings.dimensions.width"
        @update:modelValue="(value: number) => ChartSettings.changeDimensions(value)"
        track-color="grey"
        thumb-label
      ></v-slider>
      <div class="text-caption">X Position</div>
      <v-slider
        :min="0"
        :max="1000"
        :step="1"
        :model-value="ChartSettings.position.x"
        @update:modelValue="(value: number) => ChartSettings.changePosition({ x: value })"
        track-color="grey"
        thumb-label
      ></v-slider>
      <div class="text-caption">Y Position</div>
      <v-slider
        :min="0"
        :max="1000"
        :step="1"
        :model-value="ChartSettings.position.y"
        @update:modelValue="(value: number) => ChartSettings.changePosition({ y: value })"
        track-color="grey"
        thumb-label
      ></v-slider>
    </v-col>
  </v-row>
  <v-row>
    <v-col lg="12">
      <v-text-field
        label="Legend Page"
        :value="LegendSettings.page"
        @input="(event: any) => LegendSettings.changePage(event.target.value)"
        type="number"
      ></v-text-field>
    </v-col>
  </v-row>
  <v-row>
    <v-col
      cols="12"
      v-for="(chart, index) in ChartSettings.charts"
      :key="chart.title"
    >
      <v-card :color="getChartColor(chart.type.value)" dark>
        <div class="d-flex flex-no-wrap justify-space-between align-center">
          <div>
            <v-card-title class="text-h6">{{
              `${chart.title.substring(0, 10)}...`
            }}</v-card-title>

            <v-card-subtitle>{{ chart.type.title }}</v-card-subtitle>

            <v-card-actions>
              <v-btn
                class="ml-2 mt-3"
                fab
                icon
                height="40px"
                right
                width="40px"
                :href="`/present/${index}`"
              >
                <v-icon>mdi-play</v-icon>
              </v-btn>
            </v-card-actions>
          </div>

          <v-avatar class="ma-3 pa-5" size="100" tile>
            <v-img :src="getChartImage(chart.type.value)"></v-img>
          </v-avatar>
        </div>
      </v-card>
    </v-col>
  </v-row>
  <v-row>
    <v-col>
      <v-btn
        color="success"
        icon="mdi-plus"
        size="x-large"
        href="/add-chart"
      ></v-btn>
    </v-col>
  </v-row>
</template>
<style></style>
