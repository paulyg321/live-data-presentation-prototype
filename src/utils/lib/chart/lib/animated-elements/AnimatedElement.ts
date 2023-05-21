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

export const FORESHADOW_OPACITY = 0.6;
export const SELECTED_OPACITY = 1.0;
export const UNSELECTED_OPACITY = 0.3;
export const TRANSPARENT = 0.0;

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
  opacityTimeline?: ReturnType<typeof gsap.timeline>;
  pathTimeline?: ReturnType<typeof gsap.timeline>;
  positionTimeline?: ReturnType<typeof gsap.timeline>;
  sizeTimeline?: ReturnType<typeof gsap.timeline>;
  scaleTimeline?: ReturnType<typeof gsap.timeline>;

  path: {
    parsedPath: any;
    rawPath: any;
    xScale: number;
    yScale: number;
  };
  opacity: number;
  position: Coordinate2D;
  dimensions: Dimensions;
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
  selector?: string;
  itemUnscaledPosition: Coordinate2D;
}

export interface HandleSelectionReturnValue {
  element: SVGPrimitive | null;
  position: Coordinate2D;
  dimensions: Dimensions;
  xSize: number;
  ySize: number;
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
    const element = d3
      .select("#rect")
      .clone()
      .attr("id", "remove")
      .node() as SVGPrimitive;

    if (!element) throw new Error("unable to make path");

    const placeholderPath = MorphSVGPlugin.convertToPath(element);

    const foreshadow: Record<string, VisualState> = {};

    args.unscaledData.forEach((element: AnimationChartElementData) => {
      foreshadow[element.keyframe] = {
        opacity: TRANSPARENT,
        position: { x: 0, y: 0 },
        dimensions: { width: 0, height: 0 },
        path: {
          parsedPath: [],
          rawPath: placeholderPath,
          xScale: 1,
          yScale: 1,
        },
        opacityTimeline: gsap.timeline(),
      };
    });

    this.animationState = {
      color: args.color,
      current: {
        opacity: SELECTED_OPACITY,
        position: { x: 0, y: 0 },
        dimensions: { width: 0, height: 0 },
        path: {
          parsedPath: [],
          rawPath: placeholderPath,
          xScale: 1,
          yScale: 1,
        },
        opacityTimeline: gsap.timeline(),
        pathTimeline: gsap.timeline(),
        positionTimeline: gsap.timeline(),
        sizeTimeline: gsap.timeline(),
        scaleTimeline: gsap.timeline(),
      },
      foreshadow: foreshadow,
      selection: {
        opacity: TRANSPARENT,
        position: { x: 0, y: 0 },
        dimensions: { width: 0, height: 0 },
        path: {
          parsedPath: [],
          rawPath: placeholderPath,
          xScale: 1,
          yScale: 1,
        },
        opacityTimeline: gsap.timeline(),
        pathTimeline: gsap.timeline(),
        positionTimeline: gsap.timeline(),
        sizeTimeline: gsap.timeline(),
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
    d3.select("#drawing-board").selectAll("#remove").remove();
  }

  play(args: AnimatedElementPlaybackArgs) {
    const canMorph = this.controllerState.isSelected;
    const currentItemAnimationState = this.animationState.current;
    const selectionAnimationState = this.animationState.selection;

    currentItemAnimationState.pathTimeline?.clear();
    currentItemAnimationState.opacityTimeline?.clear();
    currentItemAnimationState.positionTimeline?.clear();
    currentItemAnimationState.sizeTimeline?.clear();
    currentItemAnimationState.scaleTimeline?.clear();
    selectionAnimationState.opacityTimeline?.clear();
    selectionAnimationState.pathTimeline?.clear();
    selectionAnimationState.positionTimeline?.clear();
    selectionAnimationState.sizeTimeline?.clear();

    args.states.forEach(
      (state: AnimatedElementPlaybackState, index: number) => {
        const selector = canMorph ? state.selector : undefined;
        let isLastTween = false;
        if (index === args.states.length - 1) {
          isLastTween = true;
        }
        this.controllerState.currentKeyframeIndex = state.index;
        this.updateCurrentAnimationState(
          args.updateType,
          selector,
          StateUpdateType.INDIVIDUAL_TWEENS === args.updateType
            ? args.easeFn
            : undefined,
          args.duration,
          isLastTween
        );
        this.updateSelectionState(
          args.updateType,
          selector,
          args.easeFn,
          args.duration
        );
      }
    );

    if (args.updateType === StateUpdateType.GROUP_TIMELINE) {
      // this.controllerState.playback.playbackTimeline.clear();
      const tl1 = gsap.timeline();
      const tl2 = gsap.timeline();

      tl1.fromTo(
        this.controllerState.playback,
        { extent: 0 },
        {
          extent: 1,
          onUpdate: () => {
            currentItemAnimationState.pathTimeline?.totalProgress(
              this.controllerState.playback.extent
            );
            currentItemAnimationState.sizeTimeline?.totalProgress(
              this.controllerState.playback.extent
            );
            currentItemAnimationState.scaleTimeline?.totalProgress(
              this.controllerState.playback.extent
            );
            selectionAnimationState.pathTimeline?.totalProgress(
              this.controllerState.playback.extent
            );
            selectionAnimationState.sizeTimeline?.totalProgress(
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

      tl2.fromTo(
        this.controllerState.playback,
        { extent: 0 },
        {
          extent: 1,
          onUpdate: () => {
            currentItemAnimationState.positionTimeline?.totalProgress(
              this.controllerState.playback.extent
            );
            currentItemAnimationState.opacityTimeline?.totalProgress(
              this.controllerState.playback.extent
            );
            selectionAnimationState.opacityTimeline?.totalProgress(
              this.controllerState.playback.extent
            );
            selectionAnimationState.positionTimeline?.totalProgress(
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

      tl1.play();
      tl2.play();
    } else if (args.updateType === StateUpdateType.INDIVIDUAL_TWEENS) {
      currentItemAnimationState.sizeTimeline?.play();
      currentItemAnimationState.scaleTimeline?.play();
      currentItemAnimationState.pathTimeline?.play();
      currentItemAnimationState.opacityTimeline?.play();
      currentItemAnimationState.positionTimeline?.play();
      selectionAnimationState.opacityTimeline?.play();
      selectionAnimationState.pathTimeline?.play();
      selectionAnimationState.positionTimeline?.play();
      selectionAnimationState.sizeTimeline?.play();
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

        let opacity = TRANSPARENT;

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
              opacity = TRANSPARENT;
          }
        }

        if (updateType === StateUpdateType.SET) {
          currentItemAnimationState.opacity = opacity;
        } else if (updateType === StateUpdateType.ANIMATE) {
          currentItemAnimationState.opacityTimeline?.clear();

          currentItemAnimationState.opacityTimeline?.fromTo(
            currentItemAnimationState,
            {
              opacity: TRANSPARENT,
            },
            {
              opacity,
              ...(opacity && shouldPulse ? pulseConfig : {}),
            }
          );

          currentItemAnimationState.opacityTimeline?.play();
        } else {
          currentItemAnimationState.opacityTimeline?.fromTo(
            currentItemAnimationState,
            {
              opacity: TRANSPARENT,
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
    selector?: string,
    easeFn?: any,
    duration?: number
    // isLastTween?: boolean
  ) {
    const unscaledPosition =
      this.controllerState.unscaledData[
        this.controllerState.currentKeyframeIndex
      ];

    const isSelected = this.controllerState.activeSelection
      ? this.controllerState.isSelected
      : true;
    const newCurrentItemOpacity = isSelected
      ? SELECTED_OPACITY
      : UNSELECTED_OPACITY;
    const newSelectedItemOpacity =
      isSelected && this.controllerState.activeSelection
        ? SELECTED_OPACITY
        : TRANSPARENT;

    const currentItemAnimationState = this.animationState.current;
    const selectionAnimationState = this.animationState.selection;

    // UPDATE POSITION AND DIMENSIONS
    const { element, position, dimensions, xSize, ySize } =
      this.handleSelection({
        itemUnscaledPosition: unscaledPosition,
        selector,
      });

    if (element) {
      const newPath = MorphSVGPlugin.convertToPath(element)[0];
      // if there's an active tween clear it
      if (updateType === StateUpdateType.SET) {
        selectionAnimationState.path = {
          rawPath: newPath,
          parsedPath: MorphSVGPlugin.getRawPath(newPath),
          xScale: xSize,
          yScale: ySize,
        };

        selectionAnimationState.position = position;
        selectionAnimationState.dimensions = dimensions;
        selectionAnimationState.opacity = newSelectedItemOpacity;
        currentItemAnimationState.opacity = newCurrentItemOpacity;
      } else if (updateType === StateUpdateType.ANIMATE) {
        selectionAnimationState.pathTimeline?.clear();
        selectionAnimationState.opacityTimeline?.clear();
        selectionAnimationState.positionTimeline?.clear();
        selectionAnimationState.sizeTimeline?.clear();
        currentItemAnimationState.opacityTimeline?.clear();

        selectionAnimationState.pathTimeline?.to(
          selectionAnimationState.path.rawPath,
          {
            morphSVG: {
              shape: newPath,
              render: (rawPath: any) => {
                selectionAnimationState.path.parsedPath = rawPath;
              },
            },
            duration,
            ease: easeFn,
          }
        );

        selectionAnimationState.opacityTimeline?.to(selectionAnimationState, {
          opacity: newSelectedItemOpacity,
          duration,
          ease: easeFn,
        });

        selectionAnimationState.sizeTimeline?.to(
          selectionAnimationState.dimensions,
          {
            width: dimensions.width,
            height: dimensions.height,
            duration,
            ease: easeFn,
          }
        );

        selectionAnimationState.positionTimeline?.to(
          selectionAnimationState.position,
          {
            x: position.x,
            y: position.y,
            duration,
            ease: easeFn,
          }
        );

        currentItemAnimationState.opacityTimeline?.to(
          currentItemAnimationState,
          {
            opacity: newCurrentItemOpacity,
            duration,
            ease: easeFn,
          }
        );

        selectionAnimationState.opacityTimeline?.play();
        selectionAnimationState.pathTimeline?.play();
        selectionAnimationState.positionTimeline?.play();
        selectionAnimationState.pathTimeline?.play();
        currentItemAnimationState.opacityTimeline?.play();
      } else {
        selectionAnimationState.pathTimeline?.to(
          selectionAnimationState.path.rawPath,
          {
            morphSVG: {
              shape: newPath,
              render: (rawPath: any) => {
                selectionAnimationState.path.parsedPath = rawPath;
              },
            },
            duration,
            ease: easeFn,
          }
        );

        selectionAnimationState.opacityTimeline?.to(selectionAnimationState, {
          opacity: newSelectedItemOpacity,
          duration,
          ease: easeFn,
        });

        selectionAnimationState.sizeTimeline?.to(
          selectionAnimationState.dimensions,
          {
            width: dimensions.width,
            height: dimensions.height,
            duration,
            ease: easeFn,
          }
        );

        selectionAnimationState.positionTimeline?.to(
          selectionAnimationState.position,
          {
            x: position.x,
            y: position.y,
            duration,
            ease: easeFn,
          }
        );

        currentItemAnimationState.opacityTimeline?.to(
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
    elementSelector?: string,
    easeFn?: string,
    duration?: number,
    isLastTween?: boolean
  ) {
    const FONT_SIZE = 16;
    const unscaledPosition =
      this.controllerState.unscaledData[
        this.controllerState.currentKeyframeIndex
      ];

    const currentItemAnimationState = this.animationState.current;

    // UPDATE POSITION AND DIMENSIONS
    const { element, position, dimensions, xSize, ySize } =
      this.handleMainUpdate({
        itemUnscaledPosition: unscaledPosition,
        selector: elementSelector,
      });

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

    if (element) {
      const newPath = MorphSVGPlugin.convertToPath(element)[0];
      // if there's an active tween clear it
      this.clearSvg();

      // if there's an active tween clear it
      if (updateType === StateUpdateType.SET) {
        currentItemAnimationState.path = {
          rawPath: newPath,
          parsedPath: MorphSVGPlugin.getRawPath(newPath),
          xScale: xSize,
          yScale: ySize,
        };

        currentItemAnimationState.position = position;
        currentItemAnimationState.dimensions = dimensions;
      } else if (updateType === StateUpdateType.ANIMATE) {
        currentItemAnimationState.sizeTimeline?.clear();
        currentItemAnimationState.scaleTimeline?.clear();
        currentItemAnimationState.positionTimeline?.clear();
        currentItemAnimationState.pathTimeline?.clear();

        currentItemAnimationState.pathTimeline?.to(
          currentItemAnimationState.path.rawPath,
          {
            morphSVG: {
              shape: newPath,
              render: (rawPath: any) => {
                currentItemAnimationState.path.parsedPath = rawPath;
              },
            },
            duration,
            ease: easeFn,
          }
        );

        currentItemAnimationState.positionTimeline?.to(
          currentItemAnimationState.position,
          {
            x: position.x,
            y: position.y,
            duration,
            ease: easeFn,
          }
        );

        currentItemAnimationState.sizeTimeline?.to(
          currentItemAnimationState.dimensions,
          {
            width: dimensions.width,
            height: dimensions.height,
            duration,
            ease: easeFn,
          }
        );

        currentItemAnimationState.scaleTimeline?.to(
          currentItemAnimationState.path,
          {
            xScale: xSize,
            yScale: ySize,
            duration,
            ease: easeFn,
          }
        );

        currentItemAnimationState.sizeTimeline?.play();
        currentItemAnimationState.scaleTimeline?.play();
        currentItemAnimationState.positionTimeline?.play();
        currentItemAnimationState.pathTimeline?.play();
      } else {
        currentItemAnimationState.pathTimeline?.to(
          currentItemAnimationState.path.rawPath,
          {
            morphSVG: {
              shape: newPath,
              render: (rawPath: any) => {
                currentItemAnimationState.path.parsedPath = rawPath;
              },
            },
            duration: duration ? duration * 0.6 : 1,
            ease: "sine.inOut",
          }
        );

        currentItemAnimationState.sizeTimeline?.to(
          currentItemAnimationState.dimensions,
          {
            width: dimensions.width,
            height: dimensions.height,
            duration,
            ease: easeFn,
          }
        );

        currentItemAnimationState.scaleTimeline?.to(
          currentItemAnimationState.path,
          {
            xScale: xSize,
            yScale: ySize,
            duration: duration ? duration * 0.6 : 1,
            ease: "sine.inOut",
          }
        );

        currentItemAnimationState.positionTimeline?.to(
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
    const { isSelected, activeSelection, selectionLabelKey } = args;

    if (isSelected !== undefined) {
      this.controllerState.isSelected = isSelected;
    }

    if (activeSelection !== undefined) {
      this.controllerState.activeSelection = activeSelection;
    }

    this.controllerState.selectionLabelKey = selectionLabelKey;

    this.updateSelectionState(StateUpdateType.ANIMATE);
  }

  draw() {
    this.drawCurrentState();
    if (this.controllerState.isForeshadowed) {
      this.drawForeshadowingState();
    }
  }
}
