import { AnnotationType, ChartType, DrawingUtils, ListenerType, Story } from "@/utils";
import { reactive, watch } from "vue";
import { CanvasSettings } from "./canvas-settings";
import { parse, stringify } from "flatted";

export const widgetIconMap = {
  [ChartType.BAR]: "mdi-chart-bar",
  [ChartType.LINE]: "mdi-chart-line",
  [ChartType.SCATTER]: "mdi-chart-scatter-plot",

  // NEW
  [ListenerType.RECT_POSE]: "mdi-shape-rectangle-plus",
  [ListenerType.RANGE_POSE]: "mdi-hands-pray",
  [ListenerType.POINT_POSE]: "mdi-hand-pointing-up",
  [ListenerType.OPEN_HAND_POSE]: "mdi-hand-back-left",
  [ListenerType.THUMB_POSE]: "mdi-thumbs-up-down",
  [ListenerType.STROKE_LISTENER]: "mdi-draw",

  [AnnotationType.LINE]: "mdi-vector-line",
  [AnnotationType.TEXT]: "mdi-alpha-t-box-outline",
  [AnnotationType.SVG]: "mdi-svg",
  [AnnotationType.CIRCLE]: "mdi-vector-circle",
  [AnnotationType.RECT]: "mdi-vector-rectangle",
};

watch(() => CanvasSettings.generalDrawingUtils, initializeStories);

export function initializeStories() {
  if (localStorage.getItem("stories") && CanvasSettings.generalDrawingUtils) {
    StorySettings.stories = (
      parse(localStorage.getItem("stories") ?? "[]") as any[]
    ).map((story) => {
      return new Story({
        ...story,
        drawingUtils: CanvasSettings.generalDrawingUtils as DrawingUtils,
      });
    });
  }
}

export const StorySettings = reactive<{
  stories: Story[];
  currentStory?: Story;
  currentStoryIndex?: number;
  saveStories: () => void;
  addNewStory: (title: string) => number | undefined;
  setCurrentStory: (index: number) => void;
  deleteStory: (title: string) => void;
}>({
  stories: [],
  currentStory: undefined,
  currentStoryIndex: undefined,
  setCurrentStory(index: number) {
    const storedStories = this.stories;
    if (storedStories.length > 0) {
      this.currentStory = storedStories[index];
      // this.currentStory?.loadStoredLayers();
      this.currentStoryIndex = index;
    }
  },
  saveStories() {
    localStorage.setItem("stories", stringify(this.stories));
  },
  addNewStory(title: string) {
    if (!CanvasSettings.generalDrawingUtils) return;

    const newStories = [
      ...this.stories,
      new Story({
        title,
        drawingUtils: CanvasSettings.generalDrawingUtils,
      }),
    ];
    this.stories = newStories;
    this.saveStories();

    const newStoryIndex = newStories.length - 1;
    this.setCurrentStory(newStoryIndex);

    return newStoryIndex;
  },
  deleteStory(title: string) {
    const newStories = this.stories.filter((story) => {
      return story.title !== title;
    });
    this.stories = newStories;

    const newStoryIndex = newStories.length - 1;
    this.setCurrentStory(newStoryIndex);

    this.saveStories();
  },
});
