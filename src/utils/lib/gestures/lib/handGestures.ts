import fp from "fingerpose";

// POINTING
export const pointingGesture = new fp.GestureDescription("pointing");

for (const finger of [
  fp.Finger.Thumb,
  fp.Finger.Middle,
  fp.Finger.Ring,
  fp.Finger.Pinky,
]) {
  pointingGesture.addCurl(finger, fp.FingerCurl.FullCurl, 1.0);
  pointingGesture.addCurl(finger, fp.FingerCurl.HalfCurl, 1.0);
}

pointingGesture.addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl);

pointingGesture.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl);
pointingGesture.addDirection(fp.Finger.Thumb, fp.FingerDirection.VerticalUp);
pointingGesture.addDirection(
  fp.Finger.Thumb,
  fp.FingerDirection.DiagonalUpLeft,
  0.9
);
pointingGesture.addDirection(
  fp.Finger.Thumb,
  fp.FingerDirection.DiagonalUpRight,
  0.9
);

// Open Hand
export const openHandGesture = new fp.GestureDescription("openHandGesture");

for (const finger of [
  fp.Finger.Thumb,
  fp.Finger.Index,
  fp.Finger.Middle,
  fp.Finger.Ring,
  fp.Finger.Pinky,
]) {
  openHandGesture.addCurl(finger, fp.FingerCurl.NoCurl, 1.0);
  openHandGesture.addDirection(fp.Finger.Thumb, fp.FingerDirection.VerticalUp);
  openHandGesture.addDirection(
    fp.Finger.Thumb,
    fp.FingerDirection.DiagonalUpLeft,
    0.9
  );
  openHandGesture.addDirection(
    fp.Finger.Thumb,
    fp.FingerDirection.DiagonalUpRight,
    0.9
  );
}

export default {
  pointingGesture,
  openHandGesture,
};
