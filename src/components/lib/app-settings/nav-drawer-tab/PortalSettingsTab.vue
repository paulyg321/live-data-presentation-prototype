<script lang="ts" setup>
import { PortalState } from "../settings-state";
</script>
<template>
  <v-row>
    <v-col lg="12" align-self="center">
      <input
        class="default-checkbox"
        id="presenter-portal-checkbox"
        type="checkbox"
        :checked="PortalState.presenterPortalOpen"
        @change="PortalState.changePresenterPortalOpen()"
      />
      <label for="presenter-portal-checkbox">Presenter Portal</label>
    </v-col>
  </v-row>
  <v-row>
    <v-col lg="12" align-self="center">
      <input
        class="default-checkbox"
        id="audience-portal-checkbox"
        type="checkbox"
        :checked="PortalState.audiencePortalOpen"
        @change="PortalState.changeAudiencePortalOpen()"
      />
      <label for="audience-portal-checkbox">Audience Portal </label>
    </v-col>
  </v-row>
</template>
<style></style>
