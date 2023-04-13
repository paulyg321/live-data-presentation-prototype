import { ChartTypeValue, ListenerType, Story } from "@/utils";
import { reactive } from "vue";
import { ChartSettings } from "./chart-settings";

export const widgetIconMap = {
  [ChartTypeValue.BAR]: "mdi-chart-bar",
  [ChartTypeValue.LINE]: "mdi-chart-line",
  [ChartTypeValue.SCATTER]: "mdi-chart-scatter-plot",
  [ListenerType.TEMPORAL]: "mdi-play-box",
  [ListenerType.RADIAL]: "mdi-play-circle",
  [ListenerType.FORESHADOWING]: "mdi-crystal-ball",
};

function getStoredStories() {
  // TODO: Store story details in local storage. Like the LAYERS using the key of the story and retrieve existing layers using key as well.
  // if (localStorage.getItem("stories")) {
  //   return (JSON.parse(localStorage.getItem("stories") ?? "[]") as any[]).map(
  //     (story) => new Story(story)
  //   );
  // }

  return [];
}

export const StorySettings = reactive<{
  stories: Story[];
  currentStory?: Story;
  currentStoryIndex?: number;
  addNewStory: (title: string) => number;
  setCurrentStory: (index: number) => void;
}>({
  stories: getStoredStories(),
  currentStory: undefined,
  currentStoryIndex: undefined,
  setCurrentStory(index: number) {
    this.currentStory = this.stories[index];
    this.currentStoryIndex = index;
    ChartSettings.setCurrentChart();
  },
  addNewStory(title: string) {
    this.stories = [
      ...this.stories,
      new Story({
        title,
      }),
    ];
    // localStorage.setItem("stories", JSON.stringify(this.stories));
    const newStoryIndex = this.stories.length - 1;
    this.setCurrentStory(newStoryIndex);
    return newStoryIndex;
  },
});
