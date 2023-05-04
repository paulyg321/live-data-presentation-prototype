<script lang="ts" setup>
import { ChartType, ListenerType } from "@/utils";
import { onMounted, watch } from "vue";
import { StorySettings } from "../settings-state";
import { widgetIconMap } from "../settings-state";
import ChartSettingsTab from "./ChartSettingsTab.vue";
import GestureSettings from "./GestureSettings.vue";

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
  <v-container class="mb-5 mt-7">
    <v-row class="mb-5">
      <v-col lg="12">
        <div class="text-h4">Widgets</div>
      </v-col>
    </v-row>
    <v-row>
      <v-col lg="12">
        <v-list>
          <template
            v-for="(widget, index) in StorySettings.currentStory?.layers"
            :key="widget.id"
          >
            <v-list-item
              :title="`${widget.type}-${index}`"
              :active="
                widget.id === StorySettings.currentStory?.currentWidget?.id
              "
            >
              <template v-slot:append>
                <v-btn
                  color="deep-purple-lighten-2"
                  icon="mdi-select"
                  variant="elevated"
                  density="compact"
                  @click="
                    () =>
                      StorySettings.currentStory?.setCurrentWidget(widget.id)
                  "
                  class="mr-2"
                ></v-btn>
                <v-btn
                  color="deep-purple-lighten-2"
                  icon="mdi-delete-empty"
                  variant="elevated"
                  density="compact"
                  @click="
                    () =>
                      StorySettings.currentStory?.handleDeleteLayer(widget.id)
                  "
                ></v-btn>
              </template>
            </v-list-item>
            <v-divider
              v-if="
                StorySettings.currentStory?.layers.length &&
                index < StorySettings.currentStory?.layers.length - 1
              "
            />
          </template>
        </v-list>
      </v-col>
    </v-row>
  </v-container>
  <v-divider />
  <v-container class="mt-5">
    <ChartSettingsTab
      v-if="
              [
              ChartType.LINE,
              ChartType.BAR,
              ChartType.SCATTER,
              ].includes(StorySettings.currentStory?.currentWidget?.type as ChartType)
            "
      :type="StorySettings.currentStory?.currentWidget?.type as ChartType"
    />
    <GestureSettings
      v-if="
              [ListenerType.RADIAL, ListenerType.TEMPORAL, ListenerType.FORESHADOWING, ListenerType.SELECTION].includes(
                StorySettings.currentStory?.currentWidget?.type as ListenerType
              )
            "
    />
  </v-container>
</template>
<style></style>
