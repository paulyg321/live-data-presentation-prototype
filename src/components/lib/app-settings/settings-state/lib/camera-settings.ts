import {
  getVideoSources,
  getVideoStream,
  type VideoSourcesTypes,
} from "@/utils";
import { reactive, watch } from "vue";
import { CanvasSettings } from "./canvas-settings";

export const CameraSettings = reactive<{
  videoSources: VideoSourcesTypes[];
  setVideoSources: () => Promise<void>;
  currentSource: string;
  setCurrentSource: (source: string) => void;
  video: HTMLVideoElement | null;
  setVideo: (video: HTMLVideoElement | null) => void;
  stream: any;
  setStream: (newSource: string) => Promise<void>;
  grayScale: boolean;
  toggleGrayScale: () => void;
}>({
  videoSources: [],
  async setVideoSources() {
    const sources = await getVideoSources();
    this.videoSources = sources;
  },
  currentSource: "",
  setCurrentSource(source: string) {
    this.currentSource = source;
  },
  video: null,
  setVideo(video: HTMLVideoElement | null) {
    this.video = video;
  },
  stream: undefined,
  async setStream(newSource: string) {
    this.stream = await getVideoStream(newSource);
  },
  grayScale: true,
  toggleGrayScale() {
    this.grayScale = !this.grayScale;
  },
});

watch(
  () => CameraSettings.currentSource,
  async (newSource) => {
    await CameraSettings.setStream(newSource);
  }
);

watch(
  () => CameraSettings.grayScale,
  () => {
    if (!CanvasSettings.canvasCtx["video"]) return;

    if (CameraSettings.grayScale === true) {
      CanvasSettings.canvasCtx["video"].filter = "grayscale(1)";
    } else {
      CanvasSettings.canvasCtx["video"].filter = "grayscale(0)";
    }
  }
);

export async function setVideoDimensions() {
  if (CameraSettings.video) {
    CameraSettings.video.width = CanvasSettings.dimensions.width;
    CameraSettings.video.height = CanvasSettings.dimensions.height; // (3 / 4);
    CameraSettings.video.play();
  }
}
