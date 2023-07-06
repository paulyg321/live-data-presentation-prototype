import { gsap } from "gsap";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import type {
  AnimatedElementPlaybackArgs,
  AnimatedElementPlaybackState,
  AnimationChartElementData,
  D3ScaleTypes,
  ElementDetails,
} from "../ChartController";
import * as d3 from "d3";
import type { Coordinate2D, Dimensions } from "../../types";
import {
  ForeshadowingStatesMode,
  controllerPlaySubject,
} from "../../../gestures";
import { FORESHADOW_OPACITY, SELECTED_OPACITY, TRANSPARENT, UNSELECTED_OPACITY, type DrawingUtils } from "@/utils";

export interface AnimatedElementForeshadowingSettings {
  isForeshadowed: boolean;
  foreshadowingMode: ForeshadowingStatesMode;
  foreshadowingStateCount: number;
}

export type AnimatedChartElementArgs = {
  unscaledData: AnimationChartElementData[];
  colorKey: string;
  color: string;
  selectionKey: string;
  label: string;
  drawingUtils: DrawingUtils;
  xScale: D3ScaleTypes;
  yScale: D3ScaleTypes;
  zScale?: D3ScaleTypes;
  isSelected: boolean;
  activeSelection: boolean;
  currentKeyframeIndex: number;
  clipBoundaries: (context: CanvasRenderingContext2D) => void;
  selectionLabelKey?: string;
  defaultElementDetails: ElementDetails;
  domainPerKeyframe?: number[][];
  selectedOpacity?: number;
  unselectedOpacity?: number;
  foreshadowOpacity?: number;
} & AnimatedElementForeshadowingSettings;

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

  pastTrajectory?: Coordinate2D[];

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
  itemUnscaledPosition: Coordinate2D & { size?: number };
}

export interface HandleSelectionReturnValue {
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
  controllerState: AnimatedElementState & {
    selectedOpacity: number;
    unselectedOpacity: number;
    foreshadowOpacity: number;
  };
  animationState: AnimatedElementVisualState;

  constructor(args: AnimatedChartElementArgs) {
    const foreshadow: Record<string, VisualState> = {};

    args.unscaledData.forEach((element: AnimationChartElementData) => {
      foreshadow[element.keyframe] = {
        opacity: TRANSPARENT,
        position: { x: 0, y: 0 },
        dimensions: { width: 0, height: 0 },
        path: {
          parsedPath: [],
          rawPath: args.defaultElementDetails.path,
          xScale: args.defaultElementDetails.xSize,
          yScale: args.defaultElementDetails.ySize,
        },
        opacityTimeline: gsap.timeline(),
      };
    });

    this.animationState = {
      color: args.color,
      current: {
        opacity: args.foreshadowOpacity ?? FORESHADOW_OPACITY,
        position: { x: 0, y: 0 },
        dimensions: { width: 0, height: 0 },
        path: {
          parsedPath: [],
          rawPath: args.defaultElementDetails.path,
          xScale: args.defaultElementDetails.xSize,
          yScale: args.defaultElementDetails.ySize,
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
          rawPath: args.defaultElementDetails.path,
          xScale: args.defaultElementDetails.xSize,
          yScale: args.defaultElementDetails.ySize,
        },
        opacityTimeline: gsap.timeline(),
        pathTimeline: gsap.timeline(),
        positionTimeline: gsap.timeline(),
        sizeTimeline: gsap.timeline(),
      },
    };

    this.controllerState = {
      ...args,
      currentKeyframeIndex: args.currentKeyframeIndex,
      domainPerKeyframe: args.domainPerKeyframe,
      foreshadowingMode: ForeshadowingStatesMode.TRAJECTORY,
      foreshadowingStateCount: 1,
      playback: {
        playbackTimeline: gsap.timeline(),
        extent: 0,
      },
      selectedOpacity: args.selectedOpacity ?? SELECTED_OPACITY,
      foreshadowOpacity: args.foreshadowOpacity ?? FORESHADOW_OPACITY,
      unselectedOpacity: args.unselectedOpacity ?? UNSELECTED_OPACITY,
    };

    controllerPlaySubject.subscribe({
      next: (args: any) => {
        this.play(args);
      },
    });

    this.updateCurrentAnimationState(StateUpdateType.SET);
    this.updateForeshadowingAnimationState();
  }

  abstract handleForeshadowTrajectory(
    args: HandleForeshadowArgs
  ): HandleForeshadowReturnValue;
  abstract handleForeshadowPoint(
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
  abstract isInBound(boundaries: {
    position: Coordinate2D;
    dimensions?: Dimensions;
    radius?: number;
  }): boolean;

  clearSvg() {
    d3.select("#drawing-board").selectAll("#remove").remove();
  }

  pause() {
    this.controllerState.playback.playbackTimeline.pause();
  }

  resume() {
    this.controllerState.playback.playbackTimeline.play();
  }

  play(args: AnimatedElementPlaybackArgs) {
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

    currentItemAnimationState.pathTimeline?.pause();
    currentItemAnimationState.opacityTimeline?.pause();
    currentItemAnimationState.positionTimeline?.pause();
    currentItemAnimationState.sizeTimeline?.pause();
    currentItemAnimationState.scaleTimeline?.pause();
    selectionAnimationState.opacityTimeline?.pause();
    selectionAnimationState.pathTimeline?.pause();
    selectionAnimationState.positionTimeline?.pause();
    selectionAnimationState.sizeTimeline?.pause();

    this.controllerState.playback.playbackTimeline.clear();
    this.animationState.current.pastTrajectory = [];
    args.states.forEach((state: AnimatedElementPlaybackState) => {
      this.controllerState.currentKeyframeIndex = state.index;
      this.updateCurrentAnimationState(StateUpdateType.GROUP_TIMELINE, {
        ...args,
      });
      this.updateSelectionState(StateUpdateType.GROUP_TIMELINE, {
        ...args,
      });
    });

    this.controllerState.playback.playbackTimeline.clear();
    this.controllerState.playback.playbackTimeline.pause(
      this.controllerState.playback.extent
    );
    this.controllerState.playback.playbackTimeline.to(
      this.controllerState.playback,
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
          currentItemAnimationState.positionTimeline?.totalProgress(
            this.controllerState.playback.extent
          );
          currentItemAnimationState.opacityTimeline?.totalProgress(
            this.controllerState.playback.extent
          );
          selectionAnimationState.pathTimeline?.totalProgress(
            this.controllerState.playback.extent
          );
          selectionAnimationState.sizeTimeline?.totalProgress(
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
          this.controllerState.playback.extent = 0;
        },
        duration: args.duration,
        ease: args.easeFn,
      }
    );
    this.controllerState.playback.playbackTimeline.play();
  }

  updateForeshadowingAnimationState(
    updateType: StateUpdateType = StateUpdateType.ANIMATE
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

        if (this.controllerState.isForeshadowed === true) {
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

          if (index >= this.controllerState.currentKeyframeIndex) {
            switch (this.controllerState.foreshadowingMode) {
              case ForeshadowingStatesMode.TRAJECTORY: {
                // Check if its foreshadowed and whether should pulse - opacity = 0 and shouldPulse - false if not
                ({ shouldPulse, opacity } =
                  this.handleForeshadowTrajectory(foreshadowFnArgs));
                break;
              }
              case ForeshadowingStatesMode.POINT: {
                // Check if its foreshadowed and whether should pulse - opacity = 0 and shouldPulse - false if not
                ({ shouldPulse, opacity } =
                  this.handleForeshadowPoint(foreshadowFnArgs));
                break;
              }
              default:
                opacity = TRANSPARENT;
            }
          }
        } else {
          opacity = TRANSPARENT;
          shouldPulse = false;
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
              ...(opacity && shouldPulse ? pulseConfig : {}),
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
    this.updateKeyframe(args);

    if (args.selectedOpacity) {
      this.controllerState.selectedOpacity = args.selectedOpacity;
      this.updateSelectionState(StateUpdateType.SET);
    }
    if (args.unselectedOpacity) {
      this.controllerState.unselectedOpacity = args.unselectedOpacity;
      this.updateSelectionState(StateUpdateType.SET);
    }
    if (args.foreshadowOpacity) {
      this.controllerState.foreshadowOpacity = args.foreshadowOpacity;
      this.updateForeshadowingAnimationState(StateUpdateType.SET);
    }

    if (args.defaultElementDetails) {
      this.controllerState.defaultElementDetails = args.defaultElementDetails;
      this.updateCurrentAnimationState(StateUpdateType.SET, {
        skipPosition: true,
      });
      this.updateSelectionState(StateUpdateType.SET);
    }
  }

  updateKeyframe(args: { currentKeyframeIndex?: number }) {
    if (args.currentKeyframeIndex) {
      this.controllerState.currentKeyframeIndex = args.currentKeyframeIndex;
      this.updateCurrentAnimationState(StateUpdateType.SET);
      this.updateSelectionState(StateUpdateType.SET);
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

  updateSelectionState(
    updateType: StateUpdateType = StateUpdateType.SET,
    config?: {
      easeFn?: any;
      duration?: number;
    }
  ) {
    const { path, xSize, ySize } = this.controllerState.defaultElementDetails;
    const unscaledPosition =
      this.controllerState.unscaledData[
        this.controllerState.currentKeyframeIndex
      ];

    const isSelected = this.controllerState.activeSelection
      ? this.controllerState.isSelected
      : true;
    const newCurrentItemOpacity = isSelected
      ? this.controllerState.selectedOpacity
      : this.controllerState.unselectedOpacity;
    const newSelectedItemOpacity =
      isSelected && this.controllerState.activeSelection
        ? this.controllerState.selectedOpacity
        : TRANSPARENT;

    const currentItemAnimationState = this.animationState.current;
    const selectionAnimationState = this.animationState.selection;

    // UPDATE POSITION AND DIMENSIONS
    const { position, dimensions } = this.handleSelection({
      itemUnscaledPosition: unscaledPosition,
    });

    // if there's an active tween clear it
    if (updateType === StateUpdateType.SET) {
      selectionAnimationState.path = {
        rawPath: path,
        parsedPath: MorphSVGPlugin.getRawPath(path),
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
            shape: path,
            render: (rawPath: any) => {
              selectionAnimationState.path.parsedPath = rawPath;
            },
          },
          duration: config?.duration,
          ease: config?.easeFn,
        }
      );

      selectionAnimationState.opacityTimeline?.to(selectionAnimationState, {
        opacity: newSelectedItemOpacity,
        duration: config?.duration,
        ease: config?.easeFn,
      });

      selectionAnimationState.sizeTimeline?.to(
        selectionAnimationState.dimensions,
        {
          width: dimensions.width,
          height: dimensions.height,
          duration: config?.duration,
          ease: config?.easeFn,
        }
      );

      selectionAnimationState.positionTimeline?.to(
        selectionAnimationState.position,
        {
          x: position.x,
          y: position.y,
          duration: config?.duration,
          ease: config?.easeFn,
        }
      );

      currentItemAnimationState.opacityTimeline?.to(currentItemAnimationState, {
        opacity: newCurrentItemOpacity,
        duration: config?.duration,
        ease: config?.easeFn,
      });

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
            shape: path,
            render: (rawPath: any) => {
              selectionAnimationState.path.parsedPath = rawPath;
            },
          },
          duration: config?.duration,
          ease: config?.easeFn,
        }
      );

      selectionAnimationState.opacityTimeline?.to(selectionAnimationState, {
        opacity: newSelectedItemOpacity,
        duration: config?.duration,
        ease: config?.easeFn,
      });

      selectionAnimationState.sizeTimeline?.to(
        selectionAnimationState.dimensions,
        {
          width: dimensions.width,
          height: dimensions.height,
          duration: config?.duration,
          ease: config?.easeFn,
        }
      );

      selectionAnimationState.positionTimeline?.to(
        selectionAnimationState.position,
        {
          x: position.x,
          y: position.y,
          duration: config?.duration,
          ease: config?.easeFn,
        }
      );

      currentItemAnimationState.opacityTimeline?.to(currentItemAnimationState, {
        opacity: newCurrentItemOpacity,
        duration: config?.duration,
        ease: config?.easeFn,
      });
    }
  }

  updateCurrentAnimationState(
    updateType: StateUpdateType = StateUpdateType.SET,
    config?: {
      easeFn?: string;
      duration?: number;
      displayTrail?: boolean;
      skipPosition?: boolean;
    }
  ) {
    const FONT_SIZE = 16;
    const { path, xSize, ySize } = this.controllerState.defaultElementDetails;

    const unscaledPosition =
      this.controllerState.unscaledData[
        this.controllerState.currentKeyframeIndex
      ];

    const currentItemAnimationState = this.animationState.current;

    // UPDATE POSITION AND DIMENSIONS
    const { position, dimensions } = this.handleMainUpdate({
      itemUnscaledPosition: unscaledPosition,
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

    if (updateType === StateUpdateType.SET) {
      currentItemAnimationState.path = {
        rawPath: path,
        parsedPath: MorphSVGPlugin.getRawPath(path),
        xScale: xSize,
        yScale: ySize,
      };
      currentItemAnimationState.dimensions = dimensions;

      if (!config?.skipPosition) {
        currentItemAnimationState.position = position;
      }
    } else if (updateType === StateUpdateType.ANIMATE) {
      currentItemAnimationState.sizeTimeline?.clear();
      currentItemAnimationState.scaleTimeline?.clear();
      currentItemAnimationState.positionTimeline?.clear();
      currentItemAnimationState.pathTimeline?.clear();

      currentItemAnimationState.pathTimeline?.to(
        currentItemAnimationState.path.rawPath,
        {
          morphSVG: {
            shape: path,
            render: (rawPath: any) => {
              currentItemAnimationState.path.parsedPath = rawPath;
            },
          },
          duration: config?.duration,
          ease: config?.easeFn,
        }
      );

      currentItemAnimationState.sizeTimeline?.to(
        currentItemAnimationState.dimensions,
        {
          width: dimensions.width,
          height: dimensions.height,
          duration: config?.duration,
          ease: config?.easeFn,
        }
      );

      currentItemAnimationState.scaleTimeline?.to(
        currentItemAnimationState.path,
        {
          xScale: xSize,
          yScale: ySize,
          duration: config?.duration,
          ease: config?.easeFn,
        }
      );

      if (!config?.skipPosition) {
        currentItemAnimationState.positionTimeline?.to(
          currentItemAnimationState.position,
          {
            x: position.x,
            y: position.y,
            duration: config?.duration,
            ease: config?.easeFn,
          }
        );
      }

      currentItemAnimationState.sizeTimeline?.play();
      currentItemAnimationState.scaleTimeline?.play();
      currentItemAnimationState.positionTimeline?.play();
      currentItemAnimationState.pathTimeline?.play();
    } else {
      currentItemAnimationState.pathTimeline?.to(
        currentItemAnimationState.path.rawPath,
        {
          morphSVG: {
            shape: path,
            render: (rawPath: any) => {
              currentItemAnimationState.path.parsedPath = rawPath;
            },
          },
          duration: config?.duration ? config.duration * 0.6 : 1,
          ease: "sine.inOut",
        }
      );

      currentItemAnimationState.sizeTimeline?.to(
        currentItemAnimationState.dimensions,
        {
          width: dimensions.width,
          height: dimensions.height,
          duration: config?.duration,
          ease: config?.easeFn,
        }
      );

      currentItemAnimationState.scaleTimeline?.to(
        currentItemAnimationState.path,
        {
          xScale: xSize,
          yScale: ySize,
          duration: config?.duration ? config.duration * 0.6 : 1,
          ease: "sine.inOut",
        }
      );

      if (!config?.skipPosition) {
        currentItemAnimationState.positionTimeline?.to(
          currentItemAnimationState.position,
          {
            x: position.x,
            y: position.y,
            duration: config?.duration,
            ease: config?.easeFn,
            onUpdate: () => {
              if (this.controllerState.isSelected && config?.displayTrail) {
                const newPosition = {
                  x: currentItemAnimationState.position.x,
                  y: currentItemAnimationState.position.y,
                };
                if (currentItemAnimationState.pastTrajectory) {
                  currentItemAnimationState.pastTrajectory.push(newPosition);
                } else {
                  currentItemAnimationState.pastTrajectory = [newPosition];
                }
              } else {
                currentItemAnimationState.pastTrajectory = [];
              }
            },
          }
        );
      }
    }
  }

  draw() {
    if (this.controllerState.isForeshadowed) {
      this.drawForeshadowingState();
    }
    this.drawCurrentState();
  }
}
