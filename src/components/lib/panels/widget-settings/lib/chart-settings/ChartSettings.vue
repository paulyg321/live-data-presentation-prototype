<script lang="ts" setup>
import { ChartDataSettings, ChartKeyframeSettings } from "@/components";

import { ref } from "vue";
import type { ChartType } from "@/utils";

type ChartSettingProps = {
  type?: ChartType;
};
const props = defineProps<ChartSettingProps>();

enum ChartSettingsTabs {
  DATA = "data",
  SETTINGS = "settings",
}

const tab = ref<ChartSettingsTabs>(ChartSettingsTabs.DATA);
</script>
<template>
  <v-container>
    <v-row>
      <v-col lg="12">
        <div class="text-h6">Chart Setup</div>
      </v-col>
    </v-row>
  </v-container>
  <v-tabs v-model="tab" color="primary" fixed-tabs>
    <v-tab :value="ChartSettingsTabs.DATA">Data</v-tab>
    <v-tab :value="ChartSettingsTabs.SETTINGS">Keyframe</v-tab>
  </v-tabs>
  <v-window v-model="tab" :show-arrows="false">
    <v-window-item :value="ChartSettingsTabs.DATA">
      <ChartDataSettings :type="props.type" :tab="tab" />
    </v-window-item>
    <v-window-item :value="ChartSettingsTabs.SETTINGS">
      <ChartKeyframeSettings />
    </v-window-item>
  </v-window>
</template>
<style></style>
