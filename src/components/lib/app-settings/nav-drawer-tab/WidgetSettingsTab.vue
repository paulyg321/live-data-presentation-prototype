<script lang="ts" setup>
import { ChartTypeValue, type ChartType } from "@/utils";
import { onMounted, watch } from "vue";
import { StorySettings } from "../settings-state";
import { widgetIconMap } from "../settings-state";
import ChartSettingsTab from "./ChartSettingsTab.vue";

function getChartType(value: ChartTypeValue): ChartType | undefined {
  switch (value) {
    case ChartTypeValue.SCATTER:
      return {
        title: "Scatter Plot",
        value: ChartTypeValue.SCATTER,
      };
    case ChartTypeValue.LINE:
      return {
        title: "Line Chart",
        value: ChartTypeValue.LINE,
      };
    case ChartTypeValue.BAR:
      return {
        title: "Bar Chart",
        value: ChartTypeValue.BAR,
      };
    default:
      break;
  }
}

watch(
  () => StorySettings.currentStory?.layers.length,
  () => {
    StorySettings.currentStory?.setCurrentWidget();
  }
);

onMounted(() => {
  StorySettings.currentStory?.setCurrentWidget();
});
</script>
<template>
  <v-container class="pa-10">
    <v-row class="mb-5">
      <v-col lg="12">
        <div class="text-h6">Widgets</div>
      </v-col>
    </v-row>
    <v-row>
      <v-col lg="12">
        <div
          v-for="widget in StorySettings.currentStory?.layers"
          :key="widget.id"
          class="w-100 mb-4 mx-auto"
        >
          <!-- Pass the widget type to the button and get the icon-->
          <v-btn
            block
            :prepend-icon="widgetIconMap[widget.type]"
            @click="
              () => StorySettings.currentStory?.setCurrentWidget(widget.id)
            "
            :active="
              widget.id === StorySettings.currentStory?.currentWidget?.id
            "
            >{{ `${widget.type}-${widget.id}` }}</v-btn
          >
        </div>
      </v-col>
    </v-row>
    <v-row>
      <v-col lg="12">
        <div class="flex">
          <div
            v-if="
              [
                ChartTypeValue.LINE,
                ChartTypeValue.BAR,
                ChartTypeValue.SCATTER,
              ].includes(StorySettings.currentStory?.currentWidget?.type as ChartTypeValue)
            "
          >
            <ChartSettingsTab
              :type="getChartType(StorySettings.currentStory?.currentWidget?.type as ChartTypeValue)"
            />
          </div>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>
<style></style>
