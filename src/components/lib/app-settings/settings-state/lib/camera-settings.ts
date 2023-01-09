import {
  getVideoSources,
  getVideoStream,
  type VideoSourcesTypes,
} from "@/utils";
import { reactive, watch } from "vue";
import { CanvasSettings } from "./general-canvas";

export const CameraSettings = reactive<{
  videoSources: VideoSourcesTypes[];
  setVideoSources: () => Promise<void>;
  currentSource: string;
  setCurrentSource: (source: string) => void;
  video: HTMLVideoElement | null;
  setVideo: (video: HTMLVideoElement | null) => void;
  stream: any;
  setStream: (newSource: string) => Promise<void>;
  mirror: boolean;
  toggleMirror: () => void;
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
  mirror: true,
  toggleMirror() {
    this.mirror = !this.mirror;
  },
});

watch(
  () => CameraSettings.currentSource,
  async (newSource) => {
    await CameraSettings.setStream(newSource);
  }
);

watch(
  () => CameraSettings.mirror,
  () => {
    if (CameraSettings.mirror === true) {
      CanvasSettings.canvasCtx["video"]?.save();
      CanvasSettings.canvasCtx["video"]?.scale(-1, 1);
      CanvasSettings.canvasCtx["video"]?.translate(
        -CanvasSettings.canvasWidth,
        0
      );
    } else {
      CanvasSettings.canvasCtx["video"]?.restore();
    }
  }
);
