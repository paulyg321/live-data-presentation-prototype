<script setup lang="ts">
import {
  AffectOptions,
  StateUpdateType,
  type PlaybackSettingsConfig,
  DEFAULT_PLAYBACK_SETTINGS,
} from "@/utils";
import { onMounted, reactive, ref } from "vue";

const easeOptions = [
  "none",
  "power1.out",
  "power1.in",
  "power1.inOut",
  "power2.out",
  "power2.in",
  "power2.inOut",
  "power3.out",
  "power3.in",
  "power3.inOut",
  "power4.out",
  "power4.in",
  "power4.inOut",
  "back.out(1.7)",
  "back.in(1.7)",
  "back.inOut(1.7)",
  "elastic.out(1, 0.3)",
  "elastic.in(1, 0.3)",
  "elastic.inOut(1, 0.3)",
  "bounce.out",
  "bounce.in",
  "bounce.inOut",
  "rough({ strength: 1, points: 20, template: none.out, taper: none, randomize: true, clamp: false })",
  "slow(0.7, 0.7, false)",
  "steps(12)",
  "circ.out",
  "circ.in",
  "circ.inOut",
  "expo.out",
  "expo.in",
  "expo.inOut",
  "sine.out",
  "sine.in",
  "sine.inOut",
];

const playbackSettings = reactive<
  Record<AffectOptions, PlaybackSettingsConfig>
>({
  ...DEFAULT_PLAYBACK_SETTINGS,
});

const affectKey = ref(AffectOptions.NEUTRAL);

interface PlaybackSettingsProps {
  initialPlaybackSettings: Record<AffectOptions, PlaybackSettingsConfig>;
}

const emit = defineEmits<{
  (
    e: "on-save-config",
    args: {
      key: AffectOptions;
      value: PlaybackSettingsConfig;
    }
  ): void;
}>();
const props = defineProps<PlaybackSettingsProps>();

onMounted(() => {
  playbackSettings[AffectOptions.NEUTRAL] =
    props.initialPlaybackSettings[AffectOptions.NEUTRAL];
  playbackSettings[AffectOptions.NEGATIVE] =
    props.initialPlaybackSettings[AffectOptions.NEGATIVE];
  playbackSettings[AffectOptions.POSITIVE] =
    props.initialPlaybackSettings[AffectOptions.POSITIVE];
});
</script>
<template>
  <form
    @submit.prevent="
      () =>
        emit('on-save-config', {
          key: affectKey,
          value: playbackSettings[affectKey],
        })
    "
  >
    <v-container>
      <v-row>
        <v-col>
          <div class="text-h5">Affect Settings</div>
        </v-col>
      </v-row>
      <v-row>
        <v-col lg="12">
          <!-- change this v-model -->
          <v-select
            v-model="affectKey"
            label="Affect"
            :items="[
              AffectOptions.POSITIVE,
              AffectOptions.NEUTRAL,
              AffectOptions.NEGATIVE,
            ]"
            hint="Select which one of the following affect configs you'd like to modify"
          ></v-select>
        </v-col>
        <v-col lg="12">
          <!-- change this v-model -->
          <v-text-field
            v-model="playbackSettings[affectKey].duration"
            label="Animation Duration"
            type="number"
            hint="How long should the full animation or each animation take"
          ></v-text-field>
        </v-col>
        <v-col lg="12">
          <v-select
            v-model="playbackSettings[affectKey].playbackMode"
            label="Playback Mode"
            :items="[
              StateUpdateType.GROUP_TIMELINE,
              StateUpdateType.INDIVIDUAL_TWEENS,
            ]"
            hint="Applies ease functions and playback duration to each Individual tween or to the group"
          ></v-select>
        </v-col>
        <v-col lg="12">
          <v-select
            v-model="playbackSettings[affectKey].easeFn"
            label="Ease Fn"
            :items="easeOptions"
            hint="Applies ease functions and playback duration to each Individual tween or to the group"
          ></v-select>
        </v-col>
        <v-col lg="12">
          <v-textarea
            v-model="playbackSettings[affectKey].svg"
            label="SVG"
            hint="Morphs the selected items into this SVG during animation"
          ></v-textarea>
        </v-col>
      </v-row>
      <v-row>
        <v-col lg="12">
          <v-spacer></v-spacer>
          <v-btn type="submit">SAVE</v-btn>
        </v-col>
      </v-row>
    </v-container>
  </form>
</template>
<style></style>
