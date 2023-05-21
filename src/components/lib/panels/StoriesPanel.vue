<script lang="ts" setup>
import { ref } from "vue";
import { StorySettings } from "@/state";

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
</script>
<template>
  <v-container class="d-flex h-100 flex-column">
    <v-row class="flex-1">
      <v-col cols="11" class="pa-0">
        <v-container class="d-flex h-100 flex-column">
          <v-row class="flex-1 pa-5 flex-nowrap overflow-auto">
            <v-col
              v-for="(story, index) in StorySettings.stories"
              :key="story"
              cols="12"
              md="4"
              class="h-100"
            >
              <v-card
                :theme="
                  index === StorySettings.currentStoryIndex ? 'dark' : 'light'
                "
                class="h-100 d-flex flex-column"
                variant="outlined"
                color="#9e9e9e"
              >
                <v-card-title class="text-deep-purple-lighten-2 flex-1">{{
                  story.title
                }}</v-card-title>

                <v-card-actions class="flex-1">
                  <v-spacer></v-spacer>
                  <v-btn
                    density="compact"
                    color="deep-purple-lighten-2"
                    variant="elevated"
                    icon="mdi-delete"
                    @click="StorySettings.deleteStory(story.title)"
                  ></v-btn>
                  <v-btn
                    density="compact"
                    color="deep-purple-lighten-2"
                    variant="elevated"
                    icon="mdi-play"
                    @click="StorySettings.setCurrentStory(index)"
                  ></v-btn>
                </v-card-actions>
              </v-card>
            </v-col>
          </v-row>
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
