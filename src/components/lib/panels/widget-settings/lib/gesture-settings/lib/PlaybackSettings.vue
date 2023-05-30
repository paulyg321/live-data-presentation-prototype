<script setup lang="ts">
import {
  AffectOptions,
  StateUpdateType,
  type PlaybackSettingsConfig,
  DEFAULT_PLAYBACK_SETTINGS,
  easeOptions,
} from "@/utils";
import { onMounted, reactive, ref } from "vue";

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
  (e: "on-play-forward", config: PlaybackSettingsConfig): void;
  (e: "on-play-backward", config: PlaybackSettingsConfig): void;
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
          <div class="text-h5">Preview Animation</div>
        </v-col>
      </v-row>
      <v-row class="mb-5">
        <v-col lg="6">
          <v-btn
            @click="emit('on-play-backward', playbackSettings[affectKey])"
            icon="mdi-step-backward"
          ></v-btn>
        </v-col>
        <v-col lg="6" class="d-flex flex-row justify-end">
          <v-btn
            @click="emit('on-play-forward', playbackSettings[affectKey])"
            icon="mdi-step-forward"
          ></v-btn>
        </v-col>
      </v-row>
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
          <v-autocomplete
            v-model="playbackSettings[affectKey].easeFn"
            label="Ease Fn"
            :items="easeOptions"
            hint="Applies ease functions and playback duration to each Individual tween or to the group"
          ></v-autocomplete>
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
