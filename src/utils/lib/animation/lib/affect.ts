export enum AffectOptions {
  POSITIVE = "positive",
  NEGATIVE = "negative",
  NEUTRAL = "neutral",
}

export const easeOptions = [
  "none",
  "power1.out",
  "power1.in",
  "power1.inOut",
  "power2.out",
  "power2.in",
  "power2.inOut",
  "power3.out",
  "power3.in",
  "power3.inOut",
  "power4.out",
  "power4.in",
  "power4.inOut",
  "back.out(1.7)",
  "back.in(1.7)",
  "back.inOut(1.7)",
  "elastic.out(1, 0.3)",
  "elastic.in(1, 0.3)",
  "elastic.inOut(1, 0.3)",
  "bounce.out",
  "bounce.in",
  "bounce.inOut",
  "rough({ strength: 1, points: 20, template: none.out, taper: none, randomize: true, clamp: false })",
  "slow(0.7, 0.7, false)",
  "steps(12)",
  "circ.out",
  "circ.in",
  "circ.inOut",
  "expo.out",
  "expo.in",
  "expo.inOut",
  "sine.out",
  "sine.in",
  "sine.inOut",
];