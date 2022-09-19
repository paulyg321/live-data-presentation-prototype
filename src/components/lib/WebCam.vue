<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
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

watch(currentSource, async (newSource) => {
  stream.value = await getVideoStream(newSource);
});

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
  <div v-if="currentSource === ''" class="radio-input-container">
    <span v-for="videoSource in videoSources" :key="videoSource.id">
      <input type="radio" v-model="currentSource" :value="videoSource.id" />
      <label>{{ videoSource.label }}</label>
    </span>
  </div>
</template>

<style>
.canvasbox {
  display: none;
}

.radio-input-container {
  display: flex;
  flex-direction: column;
  color: #F27405;
}

.radio-input-container label {
  margin-left: 10px;
}
</style>
