<script setup lang="ts">
import { onMounted, ref } from "vue";
import {
  getVideoSources,
  getVideoStream,
  type VideoSourcesTypes,
} from "@/utils";
defineEmits(["loaded-data", "loaded-metadata"]);

const stream = ref();
const videoSources = ref<VideoSourcesTypes[]>([]);
const currentSource = ref<string>("");
const video = ref<HTMLVideoElement | null>(null);

async function handleChangeSource(event: any) {
  currentSource.value = event.target.value;
  stream.value = await getVideoStream(currentSource.value);
}

onMounted(async () => {
  videoSources.value = await getVideoSources();
});
</script>

<!-- TEMPLATE -->

<template>
  <video
    class="canvasbox"
    ref="video"
    autoplay="true"
    :srcObject="stream"
    @loadeddata="$emit('loaded-data', video)"
    @loadedmetadata="$emit('loaded-metadata', video)"
  ></video>
  <select
    :value="currentSource"
    @change="handleChangeSource"
    v-model="currentSource"
  >
    <option value="" disabled selected>Select Camera</option>
    <option
      v-for="videoSource in videoSources"
      :value="videoSource.id"
      :key="videoSource.id"
    >
      {{ videoSource.label }}
    </option>
  </select>
</template>

<!-- STYLES -->

<style>
.canvasbox {
  border-radius: 3px;
  margin-right: 10px;
  width: 450px;
  height: 338px;
  border-bottom: 3px solid #0063ff;
  box-shadow: 0 2px 3px 0 rgba(0, 0, 0, 0.2), 0 4px 10px 0 #00000030;
}
</style>
