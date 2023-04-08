<script lang="ts" setup>
import ChartSettingsData from "./chart-settings/ChartSettingsData.vue";
import ChartSettingsPosition from "./chart-settings/ChartSettingsPosition.vue";
import { ref } from "vue";
import type { ChartType } from "@/utils";
import { ChartSettings } from "../settings-state";

type ChartSettingProps = {
  type?: ChartType;
};
const props = defineProps<ChartSettingProps>();

enum ChartSettingsTabs {
  DATA = "data",
  POSITION = "position",
}

const tab = ref<ChartSettingsTabs>(ChartSettingsTabs.DATA);
function handleNext() {
  tab.value = ChartSettingsTabs.POSITION;
  // Allows us to view the chart after saving new chart
  ChartSettings.setCurrentChart();
}
</script>
<template>
  <!-- <v-container>
    <v-row>
      <v-col lg="12">
        <div class="text-h6">Chart Settings</div>
      </v-col>
    </v-row>
  </v-container> -->
  <v-tabs v-model="tab" color="primary" fixed-tabs>
    <v-tab :value="ChartSettingsTabs.DATA">Data</v-tab>
    <v-tab :value="ChartSettingsTabs.POSITION">Position</v-tab>
  </v-tabs>
  <v-window v-model="tab" :show-arrows="false">
    <v-window-item :value="ChartSettingsTabs.DATA">
      <ChartSettingsData
        :handleNext="handleNext"
        :type="props.type"
        :tab="tab"
      />
    </v-window-item>
    <v-window-item :value="ChartSettingsTabs.POSITION">
      <ChartSettingsPosition />
    </v-window-item>
  </v-window>
</template>
<style></style>
