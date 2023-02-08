import fp from "fingerpose";

export enum SupportedGestures {
  POINTING = "pointing",
  OPEN_HAND = "open-hand",
  FORESHADOWING_LEFT_L = "foreshadowing-left-l",
  FORESHADOWING_RIGHT_L = "foreshadowing-right-l",
  FORESHADOWING_LEFT_C = "foreshadowing-left-c",
  FORESHADOWING_RIGHT_C = "foreshadowing-right-c",
}

// POINTING
export const pointingGesture = new fp.GestureDescription(
  SupportedGestures.POINTING
);

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
export const openHandGesture = new fp.GestureDescription(
  SupportedGestures.OPEN_HAND
);

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

// left L - foreshadowing
export const foreshadowingLeftL = new fp.GestureDescription(
  SupportedGestures.FORESHADOWING_LEFT_L
);

foreshadowingLeftL.addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl);
foreshadowingLeftL.addDirection(
  fp.Finger.Thumb,
  fp.FingerDirection.VerticalDown
);
foreshadowingLeftL.addDirection(
  fp.Finger.Thumb,
  fp.FingerDirection.DiagonalDownRight
);
foreshadowingLeftL.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl);
foreshadowingLeftL.addDirection(
  fp.Finger.Index,
  fp.FingerDirection.HorizontalRight
);

for (const finger of [fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
  foreshadowingLeftL.addCurl(finger, fp.FingerCurl.FullCurl, 1.0);
  foreshadowingLeftL.addCurl(finger, fp.FingerCurl.HalfCurl, 0.9);
  foreshadowingLeftL.addDirection(
    fp.Finger.Thumb,
    fp.FingerDirection.HorizontalRight
  );
}

// right L - foreshadowing
export const foreshadowingRightL = new fp.GestureDescription(
  SupportedGestures.FORESHADOWING_RIGHT_L
);

foreshadowingRightL.addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl);
foreshadowingRightL.addDirection(
  fp.Finger.Thumb,
  fp.FingerDirection.VerticalUp
);
foreshadowingRightL.addDirection(
  fp.Finger.Thumb,
  fp.FingerDirection.DiagonalUpLeft
);
foreshadowingRightL.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl);
foreshadowingRightL.addDirection(
  fp.Finger.Index,
  fp.FingerDirection.HorizontalLeft
);
foreshadowingRightL.addDirection(
  fp.Finger.Index,
  fp.FingerDirection.DiagonalUpLeft
);

for (const finger of [fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
  foreshadowingRightL.addCurl(finger, fp.FingerCurl.FullCurl, 1.0);
  foreshadowingRightL.addCurl(finger, fp.FingerCurl.HalfCurl, 0.9);
  foreshadowingRightL.addDirection(finger, fp.FingerDirection.HorizontalLeft);
  foreshadowingRightL.addDirection(finger, fp.FingerDirection.DiagonalUpLeft);
}

// left C - foreshadowing
export const foreshadowingLeftC = new fp.GestureDescription(
  SupportedGestures.FORESHADOWING_LEFT_C
);

foreshadowingLeftC.addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl);
foreshadowingLeftC.addCurl(fp.Finger.Thumb, fp.FingerCurl.HalfCurl);
foreshadowingLeftC.addDirection(
  fp.Finger.Thumb,
  fp.FingerDirection.HorizontalRight
);
foreshadowingLeftC.addDirection(
  fp.Finger.Thumb,
  fp.FingerDirection.DiagonalUpRight
);

foreshadowingLeftC.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl);
foreshadowingLeftC.addCurl(fp.Finger.Index, fp.FingerCurl.HalfCurl);
foreshadowingLeftC.addCurl(fp.Finger.Index, fp.FingerCurl.FullCurl);
foreshadowingLeftC.addDirection(
  fp.Finger.Index,
  fp.FingerDirection.HorizontalRight
);
foreshadowingLeftC.addDirection(
  fp.Finger.Index,
  fp.FingerDirection.DiagonalUpRight
);

for (const finger of [fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
  foreshadowingLeftC.addCurl(finger, fp.FingerCurl.HalfCurl);
  foreshadowingLeftC.addCurl(finger, fp.FingerCurl.FullCurl);
  foreshadowingLeftC.addDirection(finger, fp.FingerDirection.DiagonalUpRight);
  foreshadowingLeftC.addDirection(finger, fp.FingerDirection.HorizontalRight);
}

// right C - foreshadowing
export const foreshadowingRightC = new fp.GestureDescription(
  SupportedGestures.FORESHADOWING_RIGHT_C
);

foreshadowingRightC.addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl);
foreshadowingRightC.addCurl(fp.Finger.Thumb, fp.FingerCurl.HalfCurl);
foreshadowingRightC.addDirection(
  fp.Finger.Thumb,
  fp.FingerDirection.HorizontalLeft
);
foreshadowingRightC.addDirection(
  fp.Finger.Thumb,
  fp.FingerDirection.DiagonalUpLeft
);

foreshadowingRightC.addCurl(fp.Finger.Index, fp.FingerCurl.HalfCurl);
foreshadowingRightC.addCurl(fp.Finger.Index, fp.FingerCurl.FullCurl);
foreshadowingRightC.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl);
foreshadowingRightC.addDirection(
  fp.Finger.Index,
  fp.FingerDirection.HorizontalLeft
);
foreshadowingRightC.addDirection(
  fp.Finger.Index,
  fp.FingerDirection.DiagonalUpLeft
);

for (const finger of [fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
  foreshadowingRightC.addCurl(finger, fp.FingerCurl.HalfCurl);
  foreshadowingRightC.addCurl(finger, fp.FingerCurl.FullCurl);
  foreshadowingRightC.addDirection(finger, fp.FingerDirection.HorizontalLeft);
  foreshadowingRightC.addDirection(finger, fp.FingerDirection.DiagonalUpLeft);
}

export default {
  pointingGesture,
  openHandGesture,
  foreshadowingLeftL,
  foreshadowingRightL,
  foreshadowingRightC,
  foreshadowingLeftC,
};
