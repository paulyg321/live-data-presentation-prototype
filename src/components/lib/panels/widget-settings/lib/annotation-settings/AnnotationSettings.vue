<script lang="ts" setup>
import {
  LineAnnotationSettings,
  ShapeAnnotationSettings,
  SvgAnnotationSettings,
  TextAnnotationSettings,
} from "@/components";
import { AnnotationType } from "@/utils";
import { StorySettings } from "@/state";
</script>
<template>
  <LineAnnotationSettings
    v-if="
      AnnotationType.LINE === StorySettings.currentStory?.currentWidget?.type
    "
  />
  <ShapeAnnotationSettings
    v-if="[AnnotationType.CIRCLE, AnnotationType.RECT].includes(StorySettings.currentStory?.currentWidget?.type as AnnotationType)"
  />
  <TextAnnotationSettings
    v-if="
      AnnotationType.TEXT === StorySettings.currentStory?.currentWidget?.type
    "
  />
  <SvgAnnotationSettings
    v-if="
      AnnotationType.SVG === StorySettings.currentStory?.currentWidget?.type
    "
  />
</template>
<style></style>
