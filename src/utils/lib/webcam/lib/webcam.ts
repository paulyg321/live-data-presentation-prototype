import type { VideoSourcesTypes } from "./webcam-types";

export async function getVideoSources() {
  const sources: VideoSourcesTypes[] = [];
  const mediaDevices = await navigator.mediaDevices.enumerateDevices();
  mediaDevices.forEach((device) => {
    if (device.kind === "videoinput") {
      sources.push({
        label: device.label,
        id: device.deviceId,
      });
    }
  });
  return sources;
}

export async function getVideoStream(sourceOption: string) {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: sourceOption,
      },
    });
  } catch (error) {
    console.log("error", error);
  }
}
