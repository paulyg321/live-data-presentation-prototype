import type { VideoSourcesTypes } from "../types/lib/webcam";

export async function getVideoSources() {
  const sources: VideoSourcesTypes[] = [];
  const mediaDevices = await navigator.mediaDevices.enumerateDevices();
  mediaDevices.forEach((device) => {
    if (device.kind === "videoinput") {
      sources.push({
        label: device.label,
        // NOTE: If this isn't showing up, the browser needs to allow access to video
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
