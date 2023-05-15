<script lang="ts" setup>
import { GestureSettingsState } from "@/state";
import { onMounted, ref, watch } from "vue";

interface KeyframeSettingsProps {
  keyframes: string[];
}

const props = defineProps<KeyframeSettingsProps>();

const endKeyframe = ref();

watch(endKeyframe, () => {
  GestureSettingsState.endKeyframe = props.keyframes.indexOf(endKeyframe.value);
});

onMounted(() => {
  if (GestureSettingsState.endKeyframe) {
    endKeyframe.value = props.keyframes[GestureSettingsState.endKeyframe];
  }
});
</script>
<template>
  <v-row>
    <v-col lg="12">
      <v-select
        v-model="endKeyframe"
        label="Animation End Keyframe"
        :items="keyframes"
        hint="Select the final keyframe you to set playback to"
      ></v-select>
    </v-col>
  </v-row>
</template>
<style></style>
