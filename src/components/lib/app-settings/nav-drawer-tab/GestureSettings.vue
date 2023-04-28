<script lang="ts" setup>
import { computed, onMounted, ref, watch } from "vue";
import type { GestureListener, Unistroke } from "@/utils";
import { StorySettings } from "../settings-state";
import _ from "lodash";

interface ListItems {
  title: string;
  value: number;
  props?: {
    prependIcon?: string;
    appendIcon?: string;
    color?: string;
  };
}

const currentGesture = ref<GestureListener>();
const gestureName = ref<string | undefined>();
const step = ref<number>(1);
const nextBtnText = ref<string>("Next");
const gestures = ref<ListItems[]>([]);

const currentTitle = computed(() => {
  switch (step.value) {
    case 1:
      return "Gesture Name";
    case 2:
      return "Instructions";
    default:
      return "Complete";
  }
});

onMounted(() => {
  currentGesture.value = StorySettings.currentStory?.getCurrentWidget()
    ?.layer as GestureListener;
  gestureName.value = currentGesture.value.gestureName;
  gestures.value = getGestures();
});

function handleNext() {
  let addGesture = false;

  if (step.value === 1) {
    addGesture = true;
    nextBtnText.value = "Finish";
    step.value = 2;
    currentGesture.value?.updateState({
      gestureName: gestureName.value,
    });
  } else if (step.value === 2) {
    step.value = 1;
    gestureName.value = undefined;
    nextBtnText.value = "Next";
    gestures.value = getGestures();
  }

  currentGesture.value?.updateState({
    addGesture,
  });
}

function handleGestureDelete(name: string) {
  if (!currentGesture.value) return;

  currentGesture.value.strokeRecognizer.deleteGestureByName(name);
  gestures.value = getGestures();
}

function getGestures() {
  if (!currentGesture.value) return [];

  return currentGesture.value.strokeRecognizer
    .getGestureNames()
    .map((name: string, index: number) => {
      return {
        title: name,
        value: index,
      };
    });
}
</script>
<template>
  <v-container>
    <v-row class="mb-5">
      <v-col lg="12">
        <div class="text-h5">Gesture Setting</div>
      </v-col>
    </v-row>
    <v-row>
      <v-col lg="12" align-self="center">
        <v-card class="mx-auto">
          <v-card-title
            class="text-h6 font-weight-regular justify-space-between"
          >
            <span>{{ currentTitle }}</span>
          </v-card-title>

          <v-window v-model="step">
            <v-window-item :value="1">
              <v-card-text>
                <v-text-field
                  label="Gesture Name"
                  v-model="gestureName"
                ></v-text-field>
                <span class="text-caption text-grey-darken-1">
                  Use "radial" or "temporal" for gestures you want to use as a
                  trigger. Use any other name for gestures you don't want to
                  trigger an effect.
                </span>
              </v-card-text>
            </v-window-item>

            <v-window-item :value="2">
              <v-card-text>
                <span class="text-caption text-grey-darken-1">
                  Touch your thumbs together then perform the gesture before the timer ends
                </span>
              </v-card-text>
            </v-window-item>
          </v-window>

          <v-divider></v-divider>

          <v-card-actions>
            <v-btn v-if="step > 1" variant="text" @click="step--"> Back </v-btn>
            <v-spacer></v-spacer>
            <v-btn color="primary" variant="flat" @click="handleNext">
              {{ nextBtnText }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
    <v-row>
      <v-col lg="12" align-self="center">
        <v-card class="mx-auto" max-width="300">
          <v-card-title
            class="text-h6 font-weight-regular justify-space-between"
          >
            <span>Gesture List</span>
          </v-card-title>
          <v-list>
            <v-list-item
              v-for="gesture in gestures"
              :key="gesture.title"
              :title="gesture.title"
            >
              <template v-slot:append>
                <v-btn
                  color="grey-lighten-1"
                  icon="mdi-close"
                  variant="text"
                  @click="() => handleGestureDelete(gesture.title)"
                ></v-btn>
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
<style></style>
