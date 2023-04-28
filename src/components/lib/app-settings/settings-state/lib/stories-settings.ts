import { ChartTypeValue, DrawingUtils, ListenerType, Story } from "@/utils";
import { reactive, watch } from "vue";
import { CanvasSettings } from "./canvas-settings";
import { ChartSettings } from "./chart-settings";
import { parse, stringify } from "flatted";

export const widgetIconMap = {
  [ChartTypeValue.BAR]: "mdi-chart-bar",
  [ChartTypeValue.LINE]: "mdi-chart-line",
  [ChartTypeValue.SCATTER]: "mdi-chart-scatter-plot",
  [ListenerType.TEMPORAL]: "mdi-play-box",
  [ListenerType.RADIAL]: "mdi-play-circle",
  [ListenerType.FORESHADOWING]: "mdi-crystal-ball",
};

watch(() => CanvasSettings.generalDrawingUtils, initializeStories);

export function initializeStories() {
  if (localStorage.getItem("stories") && CanvasSettings.generalDrawingUtils) {
    StorySettings.stories = (
      parse(localStorage.getItem("stories") ?? "[]") as any[]
    ).map(
      (story) =>
        new Story({
          ...story,
          drawingUtils: CanvasSettings.generalDrawingUtils as DrawingUtils,
        })
    );
  }
}

export const StorySettings = reactive<{
  stories: Story[];
  currentStory?: Story;
  currentStoryIndex?: number;
  addNewStory: (title: string) => number | undefined;
  setCurrentStory: (index: number) => void;
  deleteStory: (title: string) => void;
}>({
  stories: [],
  currentStory: undefined,
  currentStoryIndex: undefined,
  setCurrentStory(index: number) {
    const storedStories = this.stories;
    this.currentStory = storedStories[index];
    this.currentStory.loadStoredLayers();
    this.currentStoryIndex = index;
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
    localStorage.setItem("stories", stringify(newStories));

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

    localStorage.removeItem(title);
    localStorage.setItem("stories", stringify(newStories));
  },
});
