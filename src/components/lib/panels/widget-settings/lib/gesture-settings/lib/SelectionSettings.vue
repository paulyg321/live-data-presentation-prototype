<script lang="ts" setup>
import { GestureSettingsState } from "@/state";
</script>
<template>
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
