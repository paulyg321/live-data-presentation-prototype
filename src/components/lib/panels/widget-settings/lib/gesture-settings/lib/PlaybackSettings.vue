<script setup lang="ts">
import {
  AffectOptions,
  type PlaybackSettingsConfig,
  DEFAULT_PLAYBACK_SETTINGS,
  easeOptions,
} from "@/utils";
import { SvgIcon } from "@/components";
import { onMounted, reactive, ref } from "vue";
import { GestureSettingsState } from "@/state";

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

const svgOptions = [
  {
    name: "clock",
    path: "M32,0C14.328,0,0,14.328,0,32s14.328,32,32,32s32-14.328,32-32S49.672,0,32,0z M42.844,42.844c-1.566,1.566-4.168,1.488-5.734-0.078l-7.934-7.934c-0.371-0.367-0.664-0.812-0.867-1.305C28.105,33.039,28,32.523,28,32V16c0-2.211,1.789-4,4-4s4,1.789,4,4v14.344l6.859,6.859C44.426,38.77,44.406,41.281,42.844,42.844z",
  },
  {
    name: "smiley",
    path: "M128,24A104,104,0,1,0,232,128,104.12041,104.12041,0,0,0,128,24Zm36,72a12,12,0,1,1-12,12A12.0006,12.0006,0,0,1,164,96ZM92,96a12,12,0,1,1-12,12A12.0006,12.0006,0,0,1,92,96Zm84.50488,60.00293a56.01609,56.01609,0,0,1-97.00976.00049,8.00016,8.00016,0,1,1,13.85058-8.01074,40.01628,40.01628,0,0,0,69.30957-.00049,7.99974,7.99974,0,1,1,13.84961,8.01074Z",
  },
  {
    name: "lightening",
    path: "M34.137,20.862c-0.475-0.761-1.307-1.232-2.204-1.232h-6.356l6.707-16.032c0.335-0.802,0.248-1.717-0.234-2.44 C31.567,0.435,30.757,0,29.888,0h-8.444c-1.15,0-2.163,0.761-2.49,1.863l-7.283,24.565c-0.233,0.786-0.082,1.627,0.409,2.284 c0.49,0.657,1.261,1.035,2.081,1.035h6.807l-1.189,14.106c-0.083,0.987,0.548,1.898,1.503,2.164 c0.955,0.264,1.962-0.187,2.399-1.076l10.582-21.56C34.659,22.578,34.61,21.623,34.137,20.862z",
  },
  {
    name: "cloud",
    path: "M39.354,21.998c0.07-0.401,0.114-0.812,0.114-1.232c0-3.926-3.183-7.108-7.108-7.108c-0.855,0-1.674,0.159-2.436,0.437 c-2.314-3.588-6.337-5.97-10.924-5.97c-7.18,0-13,5.82-13,13c0,0.337,0.025,0.668,0.051,0.999C2.576,22.996,0,26.131,0,29.875 c0,4.418,3.582,8,8,8h30c4.418,0,8-3.582,8-8C46,25.92,43.126,22.643,39.354,21.998z",
  },
  {
    name: "star",
    path: "M21.57,2.049c0.303-0.612,0.927-1,1.609-1c0.682,0,1.307,0.388,1.609,1l5.771,11.695c0.261,0.529,0.767,0.896,1.352,0.981 L44.817,16.6c0.677,0.098,1.237,0.572,1.448,1.221c0.211,0.649,0.035,1.363-0.454,1.839l-9.338,9.104 c-0.423,0.412-0.616,1.006-0.517,1.588l2.204,12.855c0.114,0.674-0.161,1.354-0.715,1.756c-0.553,0.4-1.284,0.453-1.89,0.137 l-11.544-6.07c-0.522-0.275-1.147-0.275-1.67,0l-11.544,6.069c-0.604,0.317-1.337,0.265-1.89-0.136 c-0.553-0.401-0.829-1.082-0.714-1.756l2.204-12.855c0.1-0.582-0.094-1.176-0.517-1.588L0.542,19.66 c-0.489-0.477-0.665-1.19-0.454-1.839c0.211-0.649,0.772-1.123,1.449-1.221l12.908-1.875c0.584-0.085,1.09-0.452,1.351-0.982 L21.57,2.049z",
  },
  {
    name: "bulb",
    path: "M12,2 C17.5228475,2 22,6.4771525 22,12 C22,17.5228475 17.5228475,22 12,22 C6.4771525,22 2,17.5228475 2,12 C2,6.4771525 6.4771525,2 12,2 Z M14.481,16.9999231 L9.519,16.9999231 L9.62208636,17.4541839 L9.66510834,17.6064423 L9.72181711,17.7486073 C10.0101389,18.3949445 10.6239415,18.7980769 11.3090605,18.7980769 L11.3090605,18.7980769 L12.6909395,18.7980769 L12.8466093,18.7903897 L12.9978852,18.7671003 L13.1441471,18.7324284 C13.7664125,18.5581894 14.2343343,18.0763777 14.3773858,17.4564876 L14.3773858,17.4564876 L14.481,16.9999231 Z M12,5.20192308 C9.23857625,5.20192308 7,7.44049933 7,10.2019231 L7,10.2019231 L7.00752809,10.4733133 L7.02867715,10.7288689 L7.06226775,10.9810403 C7.24767238,12.1493978 7.83148313,13.1957303 8.70145288,13.9593293 L8.70145288,13.9593293 L8.856,14.088 L9.177,15.4999231 L14.821,15.4999231 L15.141,14.09 L15.3038826,13.9534968 C16.314015,13.0588885 16.9251648,11.8103767 16.9935695,10.4568744 L17,10.2019231 C17,7.44049933 14.7614237,5.20192308 12,5.20192308 Z",
  },
  {
    name: "up",
    path: "M1200,600c0,331.359-268.641,600-600,600S0,931.359,0,600S268.641,0,600,0 S1200,268.641,1200,600z M902.859,666.633L600,212.32L297.141,666.633h163.184v321.023h279.352V666.633H902.859z",
  },
  {
    name: "down",
    path: "M1200,600C1200,268.641,931.359,0,600,0S0,268.641,0,600 s268.641,600,600,600S1200,931.359,1200,600z M902.859,533.344L600,987.656L297.141,533.344h163.184V212.32h279.352v321.023H902.859z",
  },
  {
    name: "heart",
    path: "M11,11.42V5A2,2,0,0,0,7,5v6.42a5,5,0,1,0,4,0ZM9,18a2,2,0,1,1,2-2A2,2,0,0,1,9,18Z M20,5,18,3,16,5 M18,12V3M7,16a2,2,0,1,0,2-2A2,2,0,0,0,7,16Zm7,0a5,5,0,1,1-7-4.58V5A2,2,0,0,1,9,3H9a2,2,0,0,1,2,2v6.42A5,5,0,0,1,14,16Z",
  },
];

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
        <v-col>
          <v-select
            v-model="GestureSettingsState.defaultAffect"
            label="Default Affect"
            :items="[
              AffectOptions.POSITIVE,
              AffectOptions.NEUTRAL,
              AffectOptions.NEGATIVE,
            ]"
            hint="Select the affect you want as the default when you trigger playback"
          ></v-select>
        </v-col>
      </v-row>
      <v-row>
        <v-col lg="12">
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
          <v-text-field
            v-model="playbackSettings[affectKey].duration"
            label="Animation Duration"
            type="number"
            hint="How long should the full animation or each animation take"
          ></v-text-field>
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
          <v-checkbox
            label="Show Path"
            v-model="playbackSettings[affectKey].displayTrail"
          ></v-checkbox>
        </v-col>
        <v-col lg="12">
          <v-container>
            <v-row>
              <v-col lg="12">
                <v-textarea
                  v-model="playbackSettings[affectKey].svg"
                  label="SVG"
                  hint="Morphs the selected items into this SVG during animation"
                ></v-textarea>
              </v-col>
            </v-row>
            <v-row>
              <v-col v-for="{ path, name } in svgOptions" :key="name">
                <v-btn
                  @click="
                    () => {
                      playbackSettings[affectKey].svg = path;
                    }
                  "
                >
                  <SvgIcon :path="path" :width="20" :height="20" :id="name" />
                </v-btn>
              </v-col>
            </v-row>
          </v-container>
        </v-col>
      </v-row>
      <v-row>
        <v-col lg="12">
          <v-spacer></v-spacer>
          <v-btn block color="primary" type="submit">SAVE</v-btn>
        </v-col>
      </v-row>
    </v-container>
  </form>
</template>
<style></style>
