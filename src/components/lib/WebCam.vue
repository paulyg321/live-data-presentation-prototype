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
  const sources = await getVideoSources();
  videoSources.value = sources;
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
  <v-select
    label="Select"
    item-title="label"
    item-value="id"
    :items="videoSources"
    v-model="currentSource"
  ></v-select>
</template>

<style>
.canvasbox {
  display: none;
}

.radio-input-container label {
  margin-left: 10px;
}
</style>
