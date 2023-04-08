<style></style>

<script setup lang="ts">
import { ChartSettings, StorySettings } from "../../settings-state";
</script>

<template>
  <v-container>
    <v-row>
      <v-col lg="12">
        <div class="text-caption">Width</div>
        <v-slider
          :min="0"
          :max="1000"
          :step="1"
          :model-value="StorySettings.currentStory?.getChartWidth()"
          @update:modelValue="(value: number) => StorySettings.currentStory?.changeChartDimensions(value)"
          track-color="grey"
          thumb-label
        ></v-slider>
        <div class="text-caption">X Position</div>
        <v-slider
          :min="0"
          :max="1000"
          :step="1"
          :model-value="StorySettings.currentStory?.getChartPosition()?.x"
          @update:modelValue="(value: number) => StorySettings.currentStory?.changePosition({ x: value })"
          track-color="grey"
          thumb-label
        ></v-slider>
        <div class="text-caption">Y Position</div>
        <v-slider
          :min="0"
          :max="1000"
          :step="1"
          :model-value="StorySettings.currentStory?.getChartPosition()?.y"
          @update:modelValue="(value: number) => StorySettings.currentStory?.changePosition({ y: value })"
          track-color="grey"
          thumb-label
        ></v-slider>
      </v-col>
    </v-row>
      <!-- <v-row>
    <v-col lg="12">
      <v-text-field
        label="Legend Page"
        :value="LegendSettings.page"
        @input="(event: any) => LegendSettings.changePage(event.target.value)"
        type="number"
      ></v-text-field>
    </v-col>
  </v-row> -->
  </v-container>
</template>
