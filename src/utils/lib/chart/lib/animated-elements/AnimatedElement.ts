import { gsap } from "gsap";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import type {
  AnimatedChartElementArgs,
  AnimatedElementPlaybackArgs,
  AnimatedElementPlaybackState,
  AnimationChartElementData,
  D3ScaleTypes,
} from "../ChartController";
import * as d3 from "d3";
import type { Coordinate2D, Dimensions } from "../../types";
import { ForeshadowingStatesMode } from "../../../gestures";

export type AnimatedElementState = AnimatedChartElementArgs & {
  playback: {
    playbackTimeline: ReturnType<typeof gsap.timeline>;
    extent: number;
  };
};

export enum StateUpdateType {
  ANIMATE = " to",
  SET = "set",
  GROUP_TIMELINE = "group-timeline",
  INDIVIDUAL_TWEENS = "individual-tweens",
}

export type AnimatedElementVisualState = {
  color: string;
  current: VisualState;
  foreshadow: Record<string, VisualState>;
  selection: VisualState;
};

export type VisualState = {
  opacityTimeline: ReturnType<typeof gsap.timeline>;
  pathTimeline: ReturnType<typeof gsap.timeline>;
  generalTimeline: ReturnType<typeof gsap.timeline>;

  opacity: number;
  path: any;
  position: Coordinate2D;
  dimensions: Dimensions;
  parsedPath: number[];
  circle?: {
    radius: number;
    position: Coordinate2D;
  };
  rect?: {
    dimensions: Dimensions;
    position: Coordinate2D;
  };
  arrow?: {
    arrowWidth: number;
    start: Coordinate2D;
    end: Coordinate2D;
  };
  line?: {
    lineWidth: number;
    start: Coordinate2D;
    end: Coordinate2D;
  };
  label?: {
    text: string;
    fontSize: number;
    position: Coordinate2D;
    align?: CanvasTextAlign;
  };
};

export interface HandleForeshadowReturnValue {
  shouldPulse: boolean;
  opacity: number;
}

export interface HandleForeshadowArgs {
  itemAnimationState: VisualState;
  itemUnscaledPosition: Coordinate2D;
  currentUnscaledPosition: Coordinate2D;
  finalForeshadowingIndex: number;
  keyframe: any;
  index: number;
}

export interface HandleSelectionArgs {
  itemUnscaledPosition: Coordinate2D;
}

export interface HandleSelectionReturnValue {
  element: SVGPrimitive | null;
  position: Coordinate2D;
  dimensions: Dimensions;
}

export type SVGPrimitive =
  | SVGCircleElement
  | SVGRectElement
  | SVGEllipseElement
  | SVGPolygonElement
  | SVGPolylineElement
  | SVGLineElement;

export abstract class AnimatedElement {
  controllerState: AnimatedElementState;
  animationState: AnimatedElementVisualState;

  constructor(args: AnimatedChartElementArgs) {
    const placeholderElement = d3
      .select("#test-svg")
      .append("rect")
      .attr("x", () => 0)
      .attr("y", () => 0)
      .attr("width", () => 0)
      .attr("height", () => 0)
      .node();

    if (!placeholderElement) throw new Error("unable to make path");

    const placeholderPath = MorphSVGPlugin.convertToPath(placeholderElement)[0];

    const foreshadow: Record<string, VisualState> = {};

    args.unscaledData.forEach((element: AnimationChartElementData) => {
      foreshadow[element.keyframe] = {
        opacity: 0,
        position: { x: 0, y: 0 },
        dimensions: { width: 0, height: 0 },
        path: [],
        parsedPath: [],
        opacityTimeline: gsap.timeline(),
        pathTimeline: gsap.timeline(),
        generalTimeline: gsap.timeline(),
      };
    });

    this.animationState = {
      color: args.color,
      current: {
        opacity: 0,
        position: { x: 0, y: 0 },
        dimensions: { width: 0, height: 0 },
        path: placeholderPath,
        parsedPath: [],
        opacityTimeline: gsap.timeline(),
        pathTimeline: gsap.timeline(),
        generalTimeline: gsap.timeline(),
      },
      foreshadow: foreshadow,
      selection: {
        opacity: 0,
        position: { x: 0, y: 0 },
        dimensions: { width: 0, height: 0 },
        path: placeholderPath,
        parsedPath: [],
        opacityTimeline: gsap.timeline(),
        pathTimeline: gsap.timeline(),
        generalTimeline: gsap.timeline(),
      },
    };

    this.controllerState = {
      ...args,
      currentKeyframeIndex: 0,
      foreshadowingMode: ForeshadowingStatesMode.NEXT,
      foreshadowingStateCount: 1,
      playback: {
        playbackTimeline: gsap.timeline(),
        extent: 0,
      },
    };

    this.updateCurrentAnimationState(StateUpdateType.SET);
    this.updateForeshadowingAnimationState();
  }

  abstract handleForeshadowCount(
    args: HandleForeshadowArgs
  ): HandleForeshadowReturnValue;
  abstract handleForeshadowNext(
    args: HandleForeshadowArgs
  ): HandleForeshadowReturnValue;
  abstract handleSelection(
    args: HandleSelectionArgs
  ): HandleSelectionReturnValue;
  abstract handleMainUpdate(
    args: HandleSelectionArgs
  ): HandleSelectionReturnValue;
  abstract drawCurrentState(): void;
  abstract drawForeshadowingState(): void;

  clearSvg() {
    d3.select("#test-svg").selectAll("*").remove();
  }

  play(args: AnimatedElementPlaybackArgs) {
    const currentItemAnimationState = this.animationState.current;
    const selectionAnimationState = this.animationState.selection;

    currentItemAnimationState.pathTimeline.totalProgress(0);
    currentItemAnimationState.pathTimeline.clear();

    currentItemAnimationState.opacityTimeline.totalProgress(0);
    currentItemAnimationState.opacityTimeline.clear();

    currentItemAnimationState.generalTimeline.totalProgress(0);
    currentItemAnimationState.generalTimeline.clear();

    selectionAnimationState.opacityTimeline.totalProgress(0);
    selectionAnimationState.opacityTimeline.clear();

    selectionAnimationState.pathTimeline.totalProgress(0);
    selectionAnimationState.pathTimeline.clear();

    selectionAnimationState.generalTimeline.totalProgress(0);
    selectionAnimationState.generalTimeline.clear();

    args.states.forEach(
      (state: AnimatedElementPlaybackState, index: number) => {
        let isLastTween = false;
        if (index === args.states.length - 1) {
          isLastTween = true;
        }
        this.controllerState.currentKeyframeIndex = state.index;
        this.updateCurrentAnimationState(
          args.updateType,
          state.shape,
          state.easeFn,
          args.duration,
          isLastTween
        );
        this.updateSelectionState(
          args.updateType,
          state.shape,
          state.easeFn,
          args.duration
        );
      }
    );

    if (args.updateType === StateUpdateType.GROUP_TIMELINE) {
      this.controllerState.playback.playbackTimeline.clear();
      this.controllerState.playback.playbackTimeline.fromTo(
        this.controllerState.playback,
        { extent: 0 },
        {
          extent: 1,
          onUpdate: () => {
            currentItemAnimationState.pathTimeline.totalProgress(
              this.controllerState.playback.extent
            );
            currentItemAnimationState.generalTimeline.totalProgress(
              this.controllerState.playback.extent
            );
            currentItemAnimationState.opacityTimeline.totalProgress(
              this.controllerState.playback.extent
            );
            selectionAnimationState.opacityTimeline.totalProgress(
              this.controllerState.playback.extent
            );
            selectionAnimationState.pathTimeline.totalProgress(
              this.controllerState.playback.extent
            );
            selectionAnimationState.generalTimeline.totalProgress(
              this.controllerState.playback.extent
            );
          },
          onComplete: () => {
            this.updateForeshadowingAnimationState();
          },
          duration: args.duration,
          ease: args.easeFn,
        }
      );

      this.controllerState.playback.playbackTimeline.play();
    } else if (args.updateType === StateUpdateType.INDIVIDUAL_TWEENS) {
      currentItemAnimationState.pathTimeline.play();
      currentItemAnimationState.generalTimeline.play();
      currentItemAnimationState.opacityTimeline.play();
      selectionAnimationState.opacityTimeline.play();
      selectionAnimationState.pathTimeline.play();
      selectionAnimationState.generalTimeline.play();
    }
  }

  updateForeshadowingAnimationState(
    updateType: StateUpdateType = StateUpdateType.ANIMATE,
    isLastTween?: boolean
  ) {
    const pulseConfig = {
      duration: 2,
      repeat: -1,
      yoyo: true,
    };

    const finalForeshadowingIndex =
      this.controllerState.foreshadowingStateCount +
      this.controllerState.currentKeyframeIndex;

    this.controllerState.unscaledData.forEach(
      (
        { keyframe, ...nextUnscaledPosition }: AnimationChartElementData,
        index: number
      ) => {
        let shouldPulse = false;
        const currentItemAnimationState =
          this.animationState.foreshadow[keyframe];

        let opacity = 0;

        const foreshadowFnArgs = {
          itemAnimationState: currentItemAnimationState,
          itemUnscaledPosition: nextUnscaledPosition,
          index,
          finalForeshadowingIndex,
          keyframe,
          currentUnscaledPosition:
            this.controllerState.unscaledData[
              this.controllerState.currentKeyframeIndex
            ],
        };

        if (index > this.controllerState.currentKeyframeIndex) {
          switch (this.controllerState.foreshadowingMode) {
            case ForeshadowingStatesMode.ALL:
            case ForeshadowingStatesMode.COUNT: {
              // Check if its foreshadowed and whether should pulse - opacity = 0 and shouldPulse - false if not
              ({ shouldPulse, opacity } =
                this.handleForeshadowCount(foreshadowFnArgs));
              break;
            }
            case ForeshadowingStatesMode.NEXT: {
              // Check if its foreshadowed and whether should pulse - opacity = 0 and shouldPulse - false if not
              ({ shouldPulse, opacity } =
                this.handleForeshadowNext(foreshadowFnArgs));
              break;
            }
            default:
              opacity = 0;
          }
        }

        if (updateType === StateUpdateType.SET) {
          currentItemAnimationState.opacity = opacity;
        } else if (updateType === StateUpdateType.ANIMATE) {
          currentItemAnimationState.opacityTimeline.clear();

          currentItemAnimationState.opacityTimeline.fromTo(
            currentItemAnimationState,
            {
              opacity: 0,
            },
            {
              opacity,
              ...(opacity && shouldPulse ? pulseConfig : {}),
            }
          );

          currentItemAnimationState.opacityTimeline.play();
        } else {
          currentItemAnimationState.opacityTimeline.fromTo(
            currentItemAnimationState,
            {
              opacity: 0,
            },
            {
              opacity,
              ...(opacity && shouldPulse && isLastTween ? pulseConfig : {}),
            }
          );
        }
      }
    );
  }

  // -------------------------------------- SETTERS --------------------------------------
  updateState(args: Partial<AnimatedElementState>) {
    this.updateScale(args);
    this.updateForeshadow(args);
    this.updateSelection(args);
  }

  updateSelectionState(
    updateType: StateUpdateType = StateUpdateType.SET,
    elementArg?: SVGPrimitive,
    easeFn?: any,
    duration?: number,
    isLastTween?: boolean
  ) {
    if (!this.controllerState.activeSelection) return;

    const unscaledPosition =
      this.controllerState.unscaledData[
        this.controllerState.currentKeyframeIndex
      ];

    const isSelected = this.controllerState.isSelected;
    const newCurrentItemOpacity = isSelected ? 1 : 0.3;
    const newSelectedItemOpacity = isSelected ? 1 : 0;

    let element: SVGPrimitive | null;

    const currentItemAnimationState = this.animationState.current;
    const selectionAnimationState = this.animationState.selection;

    // UPDATE POSITION AND DIMENSIONS
    const results = this.handleSelection({
      itemUnscaledPosition: unscaledPosition,
    });
    ({ element } = results);
    const { position, dimensions } = results;

    if (elementArg) {
      element = elementArg;
    }

    if (element) {
      const newPath = MorphSVGPlugin.convertToPath(element)[0];
      // if there's an active tween clear it
      if (updateType === StateUpdateType.SET) {
        selectionAnimationState.path = newPath;
        // @ts-expect-error the real path is a number[] but it seems to think its returning a string
        selectionAnimationState.parsedPath =
          MorphSVGPlugin.getRawPath(newPath)[0];

        selectionAnimationState.position = position;
        selectionAnimationState.dimensions = dimensions;
        selectionAnimationState.opacity = newSelectedItemOpacity;
        currentItemAnimationState.opacity = newCurrentItemOpacity;
      } else if (updateType === StateUpdateType.ANIMATE) {
        selectionAnimationState.pathTimeline.clear();
        selectionAnimationState.opacityTimeline.clear();
        selectionAnimationState.generalTimeline.clear();
        currentItemAnimationState.opacityTimeline.clear();

        selectionAnimationState.pathTimeline.to(selectionAnimationState.path, {
          morphSVG: {
            shape: newPath,
            render: (rawPath: any) => {
              const path = rawPath[0];
              selectionAnimationState.parsedPath = path;
            },
          },
          duration,
          ease: easeFn,
        });

        selectionAnimationState.opacityTimeline.to(selectionAnimationState, {
          opacity: newSelectedItemOpacity,
          duration,
          ease: easeFn,
        });

        selectionAnimationState.generalTimeline.to(
          selectionAnimationState.dimensions,
          {
            width: dimensions.width,
            height: dimensions.height,
            duration,
            ease: easeFn,
          }
        );

        selectionAnimationState.generalTimeline.to(
          selectionAnimationState.position,
          {
            x: position.x,
            y: position.y,
            duration,
            ease: easeFn,
          }
        );

        currentItemAnimationState.opacityTimeline.to(
          currentItemAnimationState,
          {
            opacity: newCurrentItemOpacity,
            duration,
            ease: easeFn,
          }
        );

        selectionAnimationState.opacityTimeline.play();
        selectionAnimationState.pathTimeline.play();
        selectionAnimationState.generalTimeline.play();
        currentItemAnimationState.opacityTimeline.play();
      } else {
        selectionAnimationState.pathTimeline.to(selectionAnimationState.path, {
          morphSVG: {
            shape: newPath,
            render: (rawPath: any) => {
              const path = rawPath[0];
              selectionAnimationState.parsedPath = path;
            },
          },
          duration,
          ease: easeFn,
        });

        selectionAnimationState.opacityTimeline.to(selectionAnimationState, {
          opacity: newSelectedItemOpacity,
          duration,
          ease: easeFn,
        });

        selectionAnimationState.generalTimeline.to(
          selectionAnimationState.dimensions,
          {
            width: dimensions.width,
            height: dimensions.height,
            duration,
            ease: easeFn,
          }
        );

        selectionAnimationState.generalTimeline.to(
          selectionAnimationState.position,
          {
            x: position.x,
            y: position.y,
            duration,
            ease: easeFn,
          }
        );

        currentItemAnimationState.opacityTimeline.to(
          currentItemAnimationState,
          {
            opacity: newCurrentItemOpacity,
            duration,
            ease: easeFn,
          }
        );
      }
    }

    this.clearSvg();
  }

  updateCurrentAnimationState(
    updateType: StateUpdateType = StateUpdateType.SET,
    elementArg?: SVGPrimitive,
    easeFn?: any,
    duration?: number,
    isLastTween?: boolean
  ) {
    const FONT_SIZE = 16;
    let element: SVGPrimitive | null;
    const unscaledPosition =
      this.controllerState.unscaledData[
        this.controllerState.currentKeyframeIndex
      ];

    const currentItemAnimationState = this.animationState.current;

    // UPDATE POSITION AND DIMENSIONS
    const results = this.handleMainUpdate({
      itemUnscaledPosition: unscaledPosition,
    });

    ({ element } = results);
    const { position, dimensions } = results;

    let label = currentItemAnimationState.label;

    if (!label) {
      label = {
        position: { x: 0, y: 0 },
        text: this.controllerState.selectionKey,
        fontSize: FONT_SIZE,
        align: "start",
      };

      currentItemAnimationState.label = label;
    }

    if (elementArg) {
      element = elementArg;
    }

    if (element) {
      const newPath = MorphSVGPlugin.convertToPath(element)[0];
      // if there's an active tween clear it
      this.clearSvg();

      // if there's an active tween clear it
      if (updateType === StateUpdateType.SET) {
        currentItemAnimationState.path = newPath;
        // @ts-expect-error the real path is a number[] but it seems to think its returning a string
        currentItemAnimationState.parsedPath =
          MorphSVGPlugin.getRawPath(newPath)[0];

        currentItemAnimationState.position = position;
        currentItemAnimationState.dimensions = dimensions;
      } else if (updateType === StateUpdateType.ANIMATE) {
        currentItemAnimationState.pathTimeline.clear();
        currentItemAnimationState.generalTimeline.clear();

        currentItemAnimationState.pathTimeline.to(
          currentItemAnimationState.path,
          {
            morphSVG: {
              shape: newPath,
              render: (rawPath: any) => {
                const path = rawPath[0];
                currentItemAnimationState.parsedPath = path;
              },
            },
            duration,
            ease: easeFn,
          }
        );

        currentItemAnimationState.generalTimeline.to(
          currentItemAnimationState.position,
          {
            x: position.x,
            y: position.y,
            duration,
            ease: easeFn,
          }
        );

        currentItemAnimationState.pathTimeline.play();
        currentItemAnimationState.generalTimeline.play();
      } else {
        currentItemAnimationState.pathTimeline.to(
          currentItemAnimationState.path,
          {
            morphSVG: {
              shape: newPath,
              render: (rawPath: any) => {
                const path = rawPath[0];
                currentItemAnimationState.parsedPath = path;
              },
            },
            duration,
            ease: easeFn,
          }
        );
        currentItemAnimationState.generalTimeline.to(
          currentItemAnimationState.position,
          {
            x: position.x,
            y: position.y,
            duration,
            ease: easeFn,
            onComplete: () => {
              if (
                updateType === StateUpdateType.INDIVIDUAL_TWEENS &&
                isLastTween
              ) {
                this.updateForeshadowingAnimationState();
              }
            },
          }
        );
      }
    }
  }

  updateScale(args: { xScale?: D3ScaleTypes; yScale?: D3ScaleTypes }) {
    const { xScale, yScale } = args;

    if (xScale) {
      this.controllerState.xScale = xScale;
    }
    if (yScale) {
      this.controllerState.yScale = yScale;
    }

    if (xScale || yScale) {
      this.updateCurrentAnimationState(StateUpdateType.SET);
    }
  }

  updateForeshadow(args: Partial<AnimatedElementState>) {
    const { isForeshadowed, foreshadowingMode, foreshadowingStateCount } = args;

    if (isForeshadowed !== undefined) {
      this.controllerState.isForeshadowed = isForeshadowed;
    }

    if (foreshadowingMode) {
      this.controllerState.foreshadowingMode = foreshadowingMode;
    }

    if (foreshadowingStateCount) {
      this.controllerState.foreshadowingStateCount = foreshadowingStateCount;
    }

    this.updateForeshadowingAnimationState();
  }

  updateSelection(args: Partial<AnimatedElementState>) {
    const { isSelected, activeSelection } = args;

    if (isSelected !== undefined) {
      this.controllerState.isSelected = isSelected;
    }

    if (activeSelection !== undefined) {
      this.controllerState.activeSelection = activeSelection;
    }

    this.updateSelectionState(StateUpdateType.ANIMATE);
  }

  generateElementPath(element: any) {
    const svgPath = MorphSVGPlugin.convertToPath(element);
    const data = MorphSVGPlugin.getRawPath(svgPath[0]) as any;
    const path = data[0];

    return path;
  }

  draw() {
    this.drawCurrentState();
    if (this.controllerState.isForeshadowed) {
      this.drawForeshadowingState();
    }
  }
}
