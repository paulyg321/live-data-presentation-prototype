<script lang="ts" setup>
import { GestureSettingsState, StorySettings } from "@/state";
import { computed } from "vue";

const annotationItems = computed(() => {
  return StorySettings.currentStory?.getAnnotations().map((annotation) => {
    return {
      title: `${annotation.type} - ${annotation.id}`,
      value: annotation.id,
    };
  });
})
</script>
<template>
  <v-row>
    <v-col lg="12">
      <v-autocomplete
        v-model="GestureSettingsState.selectionKeys"
        :items="annotationItems"
        item-value="value"
        item-title="title"
        label="Items to reveal"
        hint="Enter the keys for the items you wish to reveal"
        clearable
        multiple
      ></v-autocomplete>
    </v-col>
  </v-row>
</template>
<style></style>
