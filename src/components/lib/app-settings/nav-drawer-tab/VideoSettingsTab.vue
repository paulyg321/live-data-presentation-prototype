<script lang="ts" setup>
import { CameraSettings } from "../settings-state";
</script>
<template>
  <v-row>
    <v-col lg="12">
      <p class="text-body-1 font-weight-bold">Camera:</p>
    </v-col>

    <v-col lg="12">
      <v-select
        label="Select"
        item-title="label"
        item-value="id"
        :items="CameraSettings.videoSources"
        :model-value="CameraSettings.currentSource"
        @update:modelValue="(source: string) => CameraSettings.setCurrentSource(source)"
      ></v-select>
    </v-col>
    <v-col lg="12">
      <p class="text-body-1 font-weight-bold">My Video:</p>
    </v-col>

    <v-col lg="12">
      <input
        class="default-checkbox"
        id="mirror-video-checkbox"
        type="checkbox"
        @change="CameraSettings.toggleMirror()"
        :checked="CameraSettings.mirror"
      />
      <label for="mirror-video-checkbox">Mirror video</label>
    </v-col>
  </v-row>
</template>
<style></style>
