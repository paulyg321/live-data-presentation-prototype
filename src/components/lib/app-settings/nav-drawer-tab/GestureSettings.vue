<script lang="ts" setup>
import { addGesture, StorySettings } from "../settings-state";
</script>
<template>
  <v-container>
    <v-row class="mb-5">
      <v-col lg="12">
        <div class="text-h6">Gesture Setting</div>
      </v-col>
    </v-row>
    <v-row>
      <v-col lg="12" align-self="center">
        <div class="body">
          Turn on your camera and add the radial playback component to add new
          gesture
        </div>
      </v-col>
    </v-row>
    <v-row>
      <v-col lg="12" align-self="center">
        <input
          class="default-checkbox"
          id="add-gesture"
          type="checkbox"
          :checked="addGesture"
          @change="
            () => {
              addGesture = !addGesture;
              StorySettings.currentStory
                ?.getCurrentWidget()
                ?.layer.updateState({
                  addGesture,
                });
            }
          "
        />
        <label for="add-gesture">Add Gesture </label>
      </v-col>
    </v-row>
  </v-container>
</template>
<style></style>
