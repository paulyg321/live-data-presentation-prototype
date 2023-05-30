import {
  AnnotationType,
  ChartType,
  DrawingUtils,
  ListenerType,
  Story,
  getStories,
  storeStories,
} from "@/utils";
import { markRaw, reactive, watch } from "vue";
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

const LEFT = "ArrowLeft";
const RIGHT = "ArrowRight";

export async function initializeStories() {
  const stories = (await getStories()) ?? "[[]]";
  if (stories && CanvasSettings.generalDrawingUtils) {
    StorySettings.stories = (parse(stories) as any[]).map((story) => {
      const newStory = new Story({
        ...story,
        drawingUtils: CanvasSettings.generalDrawingUtils as DrawingUtils,
      });

      return newStory;
    });
  }
}

export const StorySettings = reactive<{
  stories: Story[];
  currentStory?: Story;
  currentStoryIndex?: number;
  saveStories: () => void;
  loadNextStory: () => Promise<void>;
  loadPrevStory: () => Promise<void>;
  addNewStory: (title: string) => Promise<number | undefined>;
  setCurrentStory: (index: number) => Promise<void>;
  deleteStory: (index: number) => Promise<void>;
  duplicateStory: (index: number) => Promise<void>;
}>({
  stories: [],
  currentStory: undefined,
  currentStoryIndex: undefined,
  async setCurrentStory(index: number) {
    const storedStories = this.stories;
    if (storedStories.length > 0) {
      this.currentStory = storedStories[index];
      await this.currentStory?.loadStoredLayers();
      this.currentStoryIndex = index;
    }
  },
  async loadNextStory() {
    if (
      this.currentStoryIndex !== undefined &&
      this.currentStoryIndex < this.stories.length - 1
    ) {
      await this.setCurrentStory(this.currentStoryIndex + 1);
    }
  },
  async loadPrevStory() {
    if (this.currentStoryIndex !== undefined && this.currentStoryIndex > 0) {
      await this.setCurrentStory(this.currentStoryIndex - 1);
    }
  },
  saveStories() {
    storeStories(
      stringify(markRaw(this.stories), (key: string, value: any) => {
        if (["data", "controller", "keyframes"].includes(key)) return undefined;
        return value;
      })
    );
  },
  async duplicateStory(index: number) {
    if (!CanvasSettings.generalDrawingUtils) return;
    const existingStory = this.stories[index];
    const storyLength = this.stories.length;

    if (!existingStory) return;

    const duplicateStory = new Story({
      layers: [...existingStory.layers],
      drawingUtils: CanvasSettings.generalDrawingUtils,
      title: `${existingStory.title}-${storyLength}`,
    });

    this.stories = [...this.stories, duplicateStory];
    await this.setCurrentStory(this.stories.length - 1);
    this.saveStories();
  },
  async addNewStory(title: string) {
    if (!CanvasSettings.generalDrawingUtils) return;

    const newStory = new Story({
      title,
      drawingUtils: CanvasSettings.generalDrawingUtils,
    });

    const newStories = [...this.stories, newStory];
    this.stories = newStories;

    const newStoryIndex = newStories.length - 1;
    await this.setCurrentStory(newStoryIndex);
    this.saveStories();
    return newStoryIndex;
  },
  async deleteStory(index: number) {
    this.stories.splice(index, 1);

    const newStoryIndex = this.stories.length - 1;
    await this.setCurrentStory(newStoryIndex);
    this.saveStories();
  },
});

document.addEventListener("keydown", async (event) => {
  if (event.key == LEFT) {
    await StorySettings.loadPrevStory();
  }
});

document.addEventListener("keydown", async (event) => {
  if (event.code == RIGHT) {
    await StorySettings.loadNextStory();
  }
});
