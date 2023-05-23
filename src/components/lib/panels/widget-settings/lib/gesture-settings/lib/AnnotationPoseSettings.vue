<script lang="ts" setup>
import { GestureSettingsState } from "@/state";
</script>
<template>
  <v-row>
    <v-col lg="12">
      <v-text-field
        v-model="GestureSettingsState.selectionKeys"
        label="Items to reveal"
        hint="Enter the keys for the items you wish to reveal"
      ></v-text-field>
    </v-col>
  </v-row>
</template>
<style></style>
