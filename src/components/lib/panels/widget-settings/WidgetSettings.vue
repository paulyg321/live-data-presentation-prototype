<script lang="ts" setup>
import {
  AnnotationType,
  ChartType,
  ListenerType,
} from "@/utils";
import { onMounted, watch } from "vue";
import { StorySettings, widgetIconMap } from "@/state";
import {
  AnnotationSettings,
  ChartSettings,
  GestureSettings,
} from "@/components";
import draggable from "vuedraggable";

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
        <v-list v-if="StorySettings.currentStory">
          <draggable v-model="StorySettings.currentStory.layers" item-key="id">
            <template #item="{ element, index }">
              <v-list-item
                :key="index"
                :title="`${element.type}`"
                :active="
                  element.id === StorySettings.currentStory?.currentWidget?.id
                "
                :prepend-icon="widgetIconMap[element.type]"
                @click="
                  () => StorySettings.currentStory?.setCurrentWidget(element.id)
                "
              >
                <template v-slot:append>
                  <v-btn
                    color="deep-purple-lighten-2"
                    icon="mdi-delete-empty"
                    variant="elevated"
                    density="compact"
                    @click="
                      () =>
                        StorySettings.currentStory?.handleDeleteLayer(
                          element.id
                        )
                    "
                  ></v-btn>
                </template>
              </v-list-item>
            </template>
          </draggable>
        </v-list>
      </v-col>
    </v-row>
  </v-container>
  <v-divider />
  <v-container class="mt-5">
    <ChartSettings
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
              [ListenerType.RECT_POSE, ListenerType.RANGE_POSE, ListenerType.POINT_POSE, ListenerType.OPEN_HAND_POSE, ListenerType.STROKE_LISTENER, ListenerType.THUMB_POSE].includes(
                StorySettings.currentStory?.currentWidget?.type as ListenerType
              )
            "
    />
    <AnnotationSettings
      v-if="
              [AnnotationType.LINE, AnnotationType.SVG, AnnotationType.TEXT, AnnotationType.RECT, AnnotationType.CIRCLE].includes(
                StorySettings.currentStory?.currentWidget?.type as AnnotationType
              )
            "
    />
  </v-container>
</template>
<style></style>
