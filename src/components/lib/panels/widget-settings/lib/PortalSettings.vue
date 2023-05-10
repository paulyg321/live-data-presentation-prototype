<script lang="ts" setup>
import { PortalState } from "@/state";
</script>
<template>
  <v-container class="pa-10">
    <v-row class="mb-5">
      <v-col lg="12">
        <div class="text-h6">Portals</div>
      </v-col>
    </v-row>
    <v-row>
      <v-col lg="12" align-self="center">
        <v-checkbox
          label="Presenter Portal"
          v-model="PortalState.presenterPortalOpen"
        ></v-checkbox>
      </v-col>
    </v-row>
    <v-row>
      <v-col lg="12" align-self="center">
        <v-checkbox
          label="Audience Portal"
          v-model="PortalState.audiencePortalOpen"
        ></v-checkbox>
      </v-col>
    </v-row>
  </v-container>
</template>
<style></style>
