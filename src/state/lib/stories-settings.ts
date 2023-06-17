import {
  AnnotationType,
  ChartType,
  DrawingUtils,
  ListenerType,
  Story,
  getStories,
  storeStories,
  type StoryLayer,
  GestureListener,
} from "@/utils";
import { markRaw, reactive, watch } from "vue";
import { CanvasSettings } from "./canvas-settings";
import { parse, stringify } from "flatted";

export const widgetIconMap: Record<string, string> = {
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

const LEFT = "ArrowLeft";
const RIGHT = "ArrowRight";

export const StorySettings = reactive<{
  stories: string[];
  currentStory?: Story;
  currentStoryIndex?: number;
  saveCurrentStory: () => void;
  loadNextStory: () => Promise<void>;
  loadPrevStory: () => Promise<void>;
  addNewStory: (title: string) => Promise<void>;
  setCurrentStory: (index: number) => Promise<void>;
  deleteStory: (index: number) => Promise<void>;
  duplicateStory: (index: number) => Promise<void>;
}>({
  stories: [],
  currentStory: undefined,
  currentStoryIndex: undefined,
  async setCurrentStory(index: number) {
    // Check local storage for using the name stored in this.stories[]
    const key = this.stories[index];
    const storedStory = localStorage.getItem(key);
    if (!storedStory) return;

    if (this.currentStory) {
      this.currentStory.getListeners().forEach((listener) => {
        (listener.layer as GestureListener).unsubscribe();
      });
    }

    this.currentStory = new Story({
      ...parse(storedStory),
      drawingUtils: CanvasSettings.generalDrawingUtils as DrawingUtils,
    });

    await this.currentStory?.loadStoredLayers();
    this.currentStoryIndex = index;
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
  saveCurrentStory() {
    if (this.currentStoryIndex === undefined || this.currentStory === undefined)
      return;
    const story = this.currentStory;
    const key = this.stories[this.currentStoryIndex];

    localStorage.setItem(
      key,
      stringify(markRaw(story), (key: string, value: any) => {
        if (["data", "controller", "keyframes"].includes(key)) return undefined;
        return value;
      })
    );
  },
  async duplicateStory(index: number) {
    if (!CanvasSettings.generalDrawingUtils) return;
    const existingStoryKey = this.stories[index];
    const existingStory = localStorage.getItem(existingStoryKey);

    if (!existingStory || !existingStoryKey) return;

    const newStoryKey = `${existingStoryKey}-${this.stories.length}`;
    this.stories = [...this.stories, newStoryKey];
    localStorage.setItem(newStoryKey, existingStory);

    localStorage.setItem("stories", stringify(markRaw(this.stories)));
    await this.setCurrentStory(this.stories.length - 1);
  },
  async addNewStory(title: string) {
    if (!CanvasSettings.generalDrawingUtils) return;

    const newStory = new Story({
      title,
      drawingUtils: CanvasSettings.generalDrawingUtils,
    });

    this.stories.push(title);
    localStorage.setItem(
      title,
      stringify(markRaw(newStory), (key: string, value: any) => {
        if (["data", "controller", "keyframes"].includes(key)) return undefined;
        return value;
      })
    );

    localStorage.setItem("stories", stringify(markRaw(this.stories)));
    await this.setCurrentStory(this.stories.length - 1);
  },
  async deleteStory(index: number) {
    const key = this.stories[index]; // get key
    this.stories.splice(index, 1); // delete title from list
    localStorage.removeItem(key); // remove from localStorage

    localStorage.setItem("stories", stringify(markRaw(this.stories)));
    await this.setCurrentStory(this.stories.length - 1);
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
