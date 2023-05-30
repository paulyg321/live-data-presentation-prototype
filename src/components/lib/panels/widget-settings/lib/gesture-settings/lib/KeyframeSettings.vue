<script lang="ts" setup>
import { GestureSettingsState } from "@/state";
import { onMounted, ref, watch } from "vue";

interface KeyframeSettingsProps {
  keyframes: string[];
}

const props = defineProps<KeyframeSettingsProps>();

const endKeyframe = ref();

watch(endKeyframe, () => {
  GestureSettingsState.endKeyframe = {
    index: props.keyframes.indexOf(endKeyframe.value),
    value: endKeyframe.value,
  };
});

watch(
  () => GestureSettingsState.endKeyframe,
  () => {
    if (GestureSettingsState.endKeyframe) {
      endKeyframe.value =
        props.keyframes[GestureSettingsState.endKeyframe.index];
    }
  }
);

onMounted(() => {
  if (GestureSettingsState.endKeyframe) {
    endKeyframe.value = props.keyframes[GestureSettingsState.endKeyframe.index];
  }
});
</script>
<template>
  <v-row>
    <v-col lg="12">
      <v-autocomplete
        v-model="endKeyframe"
        label="Animation End Keyframe"
        :items="keyframes"
        hint="Select the final keyframe you to set playback to"
      ></v-autocomplete>
    </v-col>
  </v-row>
</template>
<style></style>
