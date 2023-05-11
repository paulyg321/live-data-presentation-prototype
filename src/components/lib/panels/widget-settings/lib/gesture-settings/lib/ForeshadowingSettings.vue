<script setup lang="ts">
import { ListenerMode, ForeshadowingStatesMode } from "@/utils";
import { GestureSettingsState } from "@/state";
</script>
<template>
  <v-row>
    <v-col>
      <v-select
        v-model="GestureSettingsState.foreshadowingStatesMode"
        label="Foreshadowing Mode"
        :items="
          GestureSettingsState.listenerMode === ListenerMode.FORESHADOWING
            ? [
                ForeshadowingStatesMode.NEXT,
                ForeshadowingStatesMode.COUNT,
                ForeshadowingStatesMode.ALL,
              ]
            : []
        "
      ></v-select>
    </v-col>
  </v-row>

  <v-row
    v-if="
      GestureSettingsState.foreshadowingStatesMode ===
        ForeshadowingStatesMode.COUNT ||
      GestureSettingsState.foreshadowingStatesMode ===
        ForeshadowingStatesMode.NEXT
    "
  >
    <v-col>
      <v-text-field
        v-model="GestureSettingsState.foreshadowingStatesCount"
        label="Number of States"
        type="number"
        hint="Number of states to draw after the current state"
      ></v-text-field>
    </v-col>
  </v-row>

  <v-row>
    <v-col lg="12">
      <v-text-field
        v-model="GestureSettingsState.selectionKeys"
        label="Items to select"
        hint="Enter the keys for the items you wish to select"
      ></v-text-field>
    </v-col>
    <v-col lg="12">
      <v-checkbox
        label="Emit to items within bounds"
        v-model="GestureSettingsState.useBounds"
      ></v-checkbox>
    </v-col>
    <v-col lg="12" v-if="GestureSettingsState.useBounds === true">
      <v-checkbox
        label="Only emit to items within bounds"
        v-model="GestureSettingsState.restrictToBounds"
      ></v-checkbox>
    </v-col>
  </v-row>
</template>
<style></style>
