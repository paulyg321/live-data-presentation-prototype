<script setup lang="ts">
import { ListenerMode, ForeshadowingStatesMode } from "@/utils";
import { GestureSettingsState, currentChart } from "@/state";
import { ref, watchEffect } from "vue";

const selectOptions = ref<string[]>();
const colorScale = ref();

watchEffect(() => {
  selectOptions.value = currentChart.value?.state.selectOptions;
  colorScale.value = currentChart.value?.getColorScale();
});

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
                ForeshadowingStatesMode.TRAJECTORY,
                ForeshadowingStatesMode.POINT,
              ]
            : []
        "
      ></v-select>
    </v-col>
  </v-row>

  <v-row>
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
      <v-autocomplete
        v-model="GestureSettingsState.selectionKeys"
        label="Items to select"
        :items="selectOptions"
        multiple
        chips
        clearable
        hint="Enter the keys for the items you wish to select"
      >
        <template v-slot:item="{ props, item }">
          <v-list-item v-bind="props" :title="item.raw">
            <template #prepend>
              <v-badge :color="colorScale(item.raw)" inline></v-badge>
            </template>
          </v-list-item>
        </template>
      </v-autocomplete>
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
