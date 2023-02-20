<script lang="ts" setup>
import { onMounted } from "vue";
import { CameraSettings } from "../settings-state";
onMounted(async () => {
  await CameraSettings.setVideoSources();
});
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
        id="grayscale-video-checkbox"
        type="checkbox"
        @change="CameraSettings.toggleGrayScale()"
        :checked="CameraSettings.grayScale"
      />
      <label for="grayscale-video-checkbox">Grayscale</label>
    </v-col>
  </v-row>
</template>
<style></style>
