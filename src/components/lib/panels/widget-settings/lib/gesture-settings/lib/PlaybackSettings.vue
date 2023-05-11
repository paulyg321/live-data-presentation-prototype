<script setup lang="ts">
import { GestureSettingsState } from "@/state";
</script>
<template>
  <v-container>
    <v-row>
      <v-col lg="12">
        <v-text-field
          v-model="GestureSettingsState.playbackDuration"
          label="Playback Duration/Length"
          type="number"
          hint="How long should the full animation or each animation take"
        ></v-text-field>
      </v-col>
      <v-col lg="12">
        <v-select
          v-model="GestureSettingsState.playbackMode"
          label="Playback Mode"
          type="number"
          hint="Applies ease functions and playback duration to each Individual tween or to the group"
        ></v-select>
      </v-col>
    </v-row>
  </v-container>
</template>
<style></style>
