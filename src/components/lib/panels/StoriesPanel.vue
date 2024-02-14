<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { StorySettings } from "@/state";
import draggable from "vuedraggable";
import { parse } from "flatted";

const title = ref("");
const dialog = ref(false);

function handleAddStory() {
  StorySettings.addNewStory(title.value);
  closeMenu();
}

function closeMenu() {
  title.value = "";
  dialog.value = false;
}

async function initializeStories() {
  const stories = localStorage.getItem("stories");
  if (stories) {
    StorySettings.stories = parse(stories);
  }
}

onMounted(() => {
  initializeStories();
});
</script>
<template>
  <v-container class="d-flex h-100 flex-column">
    <v-row class="flex-1">
      <v-col cols="11" class="pa-0">
        <v-container class="d-flex h-100 flex-column">
          <draggable
            v-model="StorySettings.stories"
            class="v-row flex-1 pa-5 flex-nowrap overflow-auto"
            item-key="title"
          >
            <template #item="{ element, index }">
              <v-col cols="12" md="4" class="h-100" :key="index">
                <v-card
                  :color="
                    index === StorySettings.currentStoryIndex
                      ? '#D1C4E9'
                      : 'white'
                  "
                  class="h-100 d-flex flex-column"
                >
                  <v-card-title class="text-deep-purple-lighten-2 flex-1">{{
                    element
                  }}</v-card-title>

                  <v-card-actions class="flex-1">
                    <v-spacer></v-spacer>
                    <v-btn
                      v-if="index === StorySettings.currentStoryIndex"
                      color="deep-purple-lighten-2"
                      variant="elevated"
                      icon="mdi-content-save"
                      @click="StorySettings.saveCurrentStory()"
                    ></v-btn>
                    <v-btn
                      color="deep-purple-lighten-2"
                      variant="elevated"
                      icon="mdi-content-copy"
                      @click="StorySettings.duplicateStory(index)"
                    ></v-btn>
                    <v-btn
                      color="deep-purple-lighten-2"
                      variant="elevated"
                      icon="mdi-delete"
                      @click="StorySettings.deleteStory(index)"
                    ></v-btn>
                    <v-btn
                      color="deep-purple-lighten-2"
                      variant="elevated"
                      icon="mdi-play"
                      @click="StorySettings.setCurrentStory(index)"
                    ></v-btn>
                  </v-card-actions>
                </v-card>
              </v-col>
            </template>
          </draggable>
        </v-container>
      </v-col>
      <v-col cols="1" class="d-flex align-center">
        <v-btn color="success" icon="mdi-plus" variant="tonal"> </v-btn>
        <v-menu
          v-model="dialog"
          activator="parent"
          :close-on-content-click="false"
        >
          <v-card min-width="300">
            <form @submit.prevent="handleAddStory">
              <v-list>
                <v-list-item>
                  <v-text-field
                    v-model="title"
                    label="Story Title"
                  ></v-text-field>
                </v-list-item>
              </v-list>
              <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn variant="text" @click="closeMenu"> Cancel </v-btn>
                <v-btn color="primary" type="submit" variant="tonal">
                  Create
                </v-btn>
              </v-card-actions>
            </form>
          </v-card>
        </v-menu>
      </v-col>
    </v-row>
  </v-container>
</template>
<style></style>
