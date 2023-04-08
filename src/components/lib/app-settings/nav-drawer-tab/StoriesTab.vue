<script lang="ts" setup>
import { ref } from "vue";
import { StorySettings } from "../settings-state";

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
  <v-container class="pa-6">
    <v-row>
      <v-col
        cols="12"
        v-for="(story, index) in StorySettings.stories"
        :key="story"
      >
        <v-card
          :theme="index === StorySettings.currentStoryIndex ? 'dark' : 'light'"
        >
          <v-img
            src=""
            class="align-end"
            gradient="to bottom, rgba(0,0,0,.1), rgba(0,0,0,.5)"
            height="100px"
            cover
          >
            <v-card-title class="text-white">{{ story.title }}</v-card-title>
          </v-img>

          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn
              size="small"
              color="surface-variant"
              variant="text"
              icon="mdi-play"
              @click="StorySettings.setCurrentStory(index)"
            ></v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
    <v-row>
      <v-col class="d-flex justify-center">
        <v-btn color="success" prepend-icon="mdi-plus" variant="tonal">
          Add Story
          <v-menu
            v-model="dialog"
            activator="parent"
            :close-on-content-click="false"
          >
            <v-card min-width="300">
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
                <v-btn color="primary" variant="tonal" @click="handleAddStory">
                  Create
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-menu>
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>
<style></style>
