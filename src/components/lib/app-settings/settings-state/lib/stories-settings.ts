import { Story } from "@/utils";
import { reactive } from "vue";
import { ChartSettings } from "./chart-settings";

export const StorySettings = reactive<{
  stories: Story[];
  currentStory?: Story;
  currentStoryIndex?: number;
  addNewStory: (title: string) => number;
  setCurrentStory: (index: number) => void;
}>({
  stories: [],
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
    const newStoryIndex = this.stories.length - 1;
    this.setCurrentStory(newStoryIndex);
    return newStoryIndex;
  },
});
