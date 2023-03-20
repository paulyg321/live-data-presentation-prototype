// import type { Coordinate2D, Dimensions } from "../types";
// import * as d3 from "d3";
// import {
//   axesSubject,
//   calculateDistance,
//   drawCircle,
//   drawRect,
//   drawText,
//   Effect,
//   ForeshadowingAreaSubjectType,
//   modifyContextStyleAndDraw,
//   type ForeshadowingAreaData,
//   type ModifyContextStyleArgs,
// } from "@/utils";
// import _ from "lodash";

// const parseTime = d3.timeParse("%Y-%m-%d");

export enum DrawingMode {
  DRAW_ALL = "Draw All",
  UNDULATE_ANIMATION = "Tenderness - Undulate", // level 1
  BASELINE_ANIMATION = "Joy - Baseline", // level 2
  DROP_ANIMATION = "Excitement - Drop", // level 3
}

// export const AnimatedLineDrawingModeToEaseFunctionMap = {
//   [DrawingMode.DRAW_ALL]: {
//     transitionFunction: d3.easeLinear,
//     duration: 3000,
//   },
//   [DrawingMode.UNDULATE_ANIMATION]: {
//     transitionFunction: d3.easeBounce,
//     duration: 1500,
//   },
//   [DrawingMode.BASELINE_ANIMATION]: {
//     transitionFunction: d3.easeLinear,
//     duration: 3000,
//   },
//   [DrawingMode.DROP_ANIMATION]: {
//     transitionFunction: d3.easeLinear,
//     duration: 200,
//   },
// };

// export interface AnimatedLineConstructorArgs {
//   states: Coordinate2D[][];
//   chartDimensions: Dimensions;
//   chartPosition: Coordinate2D;
//   canvasDimensions: Dimensions;
//   duration: number;
//   color?: string;
//   key: string;
//   group?: string;
//   lineWidth?: number;
//   opacity?: number;
//   dataType?: {
//     xType: "number" | "date" | undefined;
//     yType: "number" | "date" | undefined;
//   };
//   getScales: () => {
//     xScale: (value: any) => number;
//     yScale: (value: any) => number;
//   };
// }

// export class AnimatedLine {
//   states: Coordinate2D[][];
//   dataType:
//     | {
//         xType: "number" | "date" | undefined;
//         yType: "number" | "date" | undefined;
//       }
//     | undefined;
//   yScale: any;
//   xScale: any;
//   currentState: number;
//   canvasDimensions: Dimensions;
//   chartDimensions: Dimensions;
//   chartPosition: Coordinate2D;
//   key: string;
//   group: string;
//   duration = 2000;
//   color = "steelblue";
//   lineWidth = 2;
//   opacity = 0.7;
//   getScales: () => {
//     xScale: (value: any) => number;
//     yScale: (value: any) => number;
//   };

//   context: CanvasRenderingContext2D | undefined;

//   foreshadowingArea: ForeshadowingAreaData | undefined;
//   foreshadowingState: number | undefined;
//   foreshadowingType: ForeshadowingAreaSubjectType | undefined;

//   lineRange = [0, 1]

//   constructor({
//     states,
//     chartDimensions,
//     chartPosition,
//     canvasDimensions,
//     duration,
//     color,
//     lineWidth,
//     opacity,
//     dataType,
//     getScales,
//     key,
//     group,
//   }: AnimatedLineConstructorArgs) {
//     this.dataType = dataType;
//     this.chartDimensions = chartDimensions;
//     this.chartPosition = chartPosition;
//     this.getScales = getScales;
//     this.initializeScales();
//     this.states = states;
//     this.currentState = 0;
//     this.canvasDimensions = canvasDimensions;
//     this.duration = duration;
//     this.key = key;
    
//     if (group) {
//       this.group = group;
//     } else {
//       this.group = key;
//     }

//     if (color) {
//       this.color = color;
//     }
    
//     this.setAppearance({
//       color,
//       lineWidth,
//       opacity,
//     });
//   };

//   private incrementState() {
//     const nextState = this.currentState + 1;
//     if (nextState < this.states.length) {
//       this.currentState = nextState;
//     }
//   }
  
//   private decrementState() {
//     const nextState = this.currentState - 1;
//     if (nextState >= 0) {
//       this.currentState = nextState;
//     }
//   }

//   private setSetLineRange({
//     start,
//     end,
//   }: {
//     start?: number;
//     end?: number;
//   }) {
//     const [currentStart, currentEnd] = this.lineRange;
    
//     let newStart = currentStart;
//     let newEnd = currentEnd;

//     if (!_.isNil(start)) {
//       newStart = Math.min(start, end ?? newEnd);
//     }

//     if (!_.isNil(end)) {
//       newEnd = Math.max(end, start ?? newStart);
//     }

//     this.lineRange = [newStart, newEnd];
//   }

//   private initializeScales() {
//     const { xScale, yScale } = this.getScales();

//     if (this.dataType?.xType === "date") {
//       this.xScale = (value: any) => {
//         return xScale(parseTime(value));
//       };
//     } else {
//       this.xScale = xScale;
//     }

//     if (this.dataType?.yType === "date") {
//       this.yScale = (value: any) => {
//         return yScale(parseTime(value));
//       };
//     } else {
//       this.yScale = yScale;
//     }

//     axesSubject.next(true);
//   }

//   setContext(ctx: CanvasRenderingContext2D) {
//     this.context = ctx;
//   }

//   setForeshadowingArea(
//     type: ForeshadowingAreaSubjectType,
//     foreshadowingArea: ForeshadowingAreaData | undefined
//   ) {
//     if (type === ForeshadowingAreaSubjectType.CLEAR) {
//       this.foreshadowingArea = undefined;
//       this.foreshadowingType = undefined;
//       this.foreshadowingState = undefined;
//     } else if (
//       type === ForeshadowingAreaSubjectType.CIRCLE ||
//       type === ForeshadowingAreaSubjectType.RECTANGLE ||
//       type === ForeshadowingAreaSubjectType.RANGE
//     ) {
//       this.foreshadowingArea = foreshadowingArea;
//       this.foreshadowingType = type;
//       const nextState = this.currentState + 1;
//       const lastValidState = this.states.length - 1;
//       if (nextState <= lastValidState) {
//         this.foreshadowingState = nextState;
//       }
//     }
//   }

//   updateState({
//     states,
//     chartDimensions,
//     canvasDimensions,
//     duration,
//     color,
//     lineWidth,
//     opacity,
//   }: Partial<AnimatedLineConstructorArgs>) {
//     if (states) {
//       this.states = states;
//     }
//     if (chartDimensions) {
//       this.chartDimensions = chartDimensions;
//     }
//     if (canvasDimensions) {
//       this.canvasDimensions = canvasDimensions;
//     }
//     if (duration) {
//       this.duration = duration;
//     }
//     this.setAppearance({
//       color,
//       lineWidth,
//       opacity,
//     });
//   }

//   setAppearance({
//     lineWidth,
//     opacity,
//     color,
//   }: {
//     lineWidth?: number;
//     opacity?: number;
//     color?: string;
//   }) {
//     if (lineWidth) {
//       this.lineWidth = lineWidth;
//     }
//     if (opacity) {
//       this.opacity = opacity;
//     }
//     if (color) {
//       this.color = color;
//     }
//   }

//   getLineSettings(lineEffect: Effect) {
//     if (lineEffect === Effect.FOCUSED) {
//       return {
//         lineWidth: 3,
//         opacity: 0.9,
//         strokeStyle: this.color,
//       };
//     }

//     if (lineEffect === Effect.BACKGROUND) {
//       return {
//         lineWidth: 1,
//         opacity: 0.5,
//         strokeStyle: "grey",
//       };
//     }
    
//     if (lineEffect === Effect.FORESHADOW) {
//       return {
//         lineWidth: 3,
//         opacity: 1,
//         strokeStyle: this.color,
//         lineDash: [3, 3]
//       };
//     }

//     return {
//       lineWidth: 2,
//       opacity: 0.7,
//       strokeStyle: this.color,
//     }
//   }
  
//   getMarkerSettings(lineEffect: Effect) {
//     if (lineEffect === Effect.FOCUSED) {
//       return {
//         lineWidth: 3,
//         opacity: 0.9,
//         fillStyle: this.color,
//         strokeStyle: "white",
//       };
//     }

//     if (lineEffect === Effect.BACKGROUND) {
//       return {
//         lineWidth: 0,
//         opacity: 0,
//       };
//     }
    
//     if (lineEffect === Effect.FORESHADOW) {
//       return {
//         lineWidth: 3,
//         opacity: 0.9,
//         fillStyle: "white",
//         strokeStyle: this.color,
//       };
//     }

//     return {
//       lineWidth: 0,
//       opacity: 0.9,
//       fillStyle: this.color,
//       strokeStyle: this.color,
//     }
//   }

//   convertEffectForContext(lineEffect: Effect) {
//     if (lineEffect === Effect.FOCUSED) {
//       return {
//         lineWidth: 3,
//         opacity: 0.9,
//         color: this.color,
//       };
//     }

//     if (lineEffect === Effect.BACKGROUND) {
//       return {
//         lineWidth: 1,
//         opacity: 0.5,
//         color: "grey",
//       };
//     }

//     return {
//       lineWidth: 2,
//       opacity: 0.7,
//       color: this.color,
//     };
//   }

//   setAppearanceFromEffect(lineEffect: Effect) {
//     this.setAppearance(this.convertEffectForContext(lineEffect));
//   }

//   clearCanvas() {
//     if (this.context) {
//       this.context.clearRect(
//         0,
//         0,
//         this.canvasDimensions.width,
//         this.canvasDimensions.height
//       );
//     }
//   }

//   isInbound(point: Coordinate2D, boundaries: { position: Coordinate2D, dimensions?: Dimensions, radius?: number }) {
//     let isWithinBounds = true;
//     const scaledPoint = {
//       x: this.xScale(point.x),
//       y: this.yScale(point.y),
//     }
    
//     if (boundaries.radius) {
//       const dist = calculateDistance(
//         scaledPoint,
//         boundaries?.position
//       );

//       if (dist.euclideanDistance > boundaries.radius) {
//         isWithinBounds = false;
//       } else {
//         isWithinBounds = true;
//       }
//     }

//     if (boundaries.dimensions) {
//       const { x: minX, y: minY } = boundaries.position;
//       const { maxX, maxY } = {
//         maxX: boundaries.position.x + boundaries.dimensions.width,
//         maxY: boundaries.position.y + boundaries.dimensions.height,
//       };
  
//       if (
//         scaledPoint.x > minX &&
//         scaledPoint.x < maxX &&
//         scaledPoint.y > minY &&
//         scaledPoint.y < maxY
//       ) {
//         isWithinBounds = true;
//       } else {
//         isWithinBounds = false;
//       }
//     }

//     return isWithinBounds;
//   }

//   drawMarkers(
//     points: Coordinate2D[],
//     drawLabel = false,
//     options?: { circle?: { stroke?: boolean, fill?: boolean, radius?: number }, text?: { fontSize: number } },
//     style?: {
//       circle: 
//     }
//   ) {

//     const circleDefaults = {
//       stroke: false,
//       fill: true,
//       radius: 5
//     }
    
//     const textDefaults = {
//       fontSize: 14,
//     }

//     const circleSettings = _.merge(circleDefaults, options?.circle);
//     const textSettings = _.merge(textDefaults, options?.text);

//     // draw points
//     points.forEach((point) => {
//       /*******************************************************************************
//        *  TODO: Move this to the foreshadowing function or utility function that returns 
//        *  the points that qualify before passing them here to be drawn
//        *******************************************************************************/
    
//       // if (pointBoundaries) {
//       //   const dist = calculateDistance(
//       //     {
//       //       x: this.xScale(point.x),
//       //       y: this.yScale(point.y),
//       //     },
//       //     pointBoundaries?.coordinates
//       //   );
//       //   if (dist.euclideanDistance > pointBoundaries.radius) {
//       //     isWithinBounds = false;
//       //   }
//       // }
//       if (!this.context) return;
      
//       drawCircle({
//         context: this.context,
//         coordinates: point,
//         xScale: this.xScale,
//         yScale: this.yScale,
//         ...circleSettings          
//       });

//       if (!drawLabel) return;
      
//       drawText({
//         context: this.context,
//         coordinates: {
//           x: this.xScale(point.x) + 15,
//           y: this.yScale(point.y) + 10,
//         },
//         text: `${Math.round(point.y)}`,
//         ...textSettings
//       });
//     });
//   }

//   // MOVE TO DRAWING UTIL
//   private clearAndClipRect({
//     dimensions,
//     coordinates,
//   }: {
//     dimensions: Dimensions;
//     coordinates: Coordinate2D;
//   }) {
//     if (!this.context) return;

//     drawRect({
//       context: this.context,
//       coordinates,
//       dimensions,
//       clip: true,
//     });
//     this.clearCanvas();
//   }

//   private clearAndClipCircle({
//     radius,
//     coordinates,
//   }: {
//     radius: number;
//     coordinates: Coordinate2D;
//   }) {
//     if (this.context) {
//       drawCircle({
//         context: this.context,
//         coordinates,
//         radius,
//         clip: true,
//       });
//       this.clearCanvas();
//     }
//   }

//   drawForeshadow(
//     clipAreaStart?: Coordinate2D
//   ) {
//     let pointBoundaries: { coordinates: Coordinate2D; radius: number };
//     if (!this.context || !this.foreshadowingArea) return 
      
//     this.context.save();
//     const settings: ModifyContextStyleArgs = {
//       context: this.context,
//     };
//     if (this.foreshadowingArea.dimensions) {
//       if (this.foreshadowingType === ForeshadowingAreaSubjectType.RECTANGLE) {
//         modifyContextStyleAndDraw({
//           ...settings,
//           ...this.getLineSettings(Effect.DEFAULT)
//         }, () => {
//           const currentCoords = this.states[this.currentState]?.filter((coord: Coordinate2D) => {
//             if (this.foreshadowingArea) {
//               return this.isInbound(coord, this.foreshadowingArea)
//             }
//           });

//           if (currentCoords) {
//             this.drawLine(
//               currentCoords,
//               LineShape.CURVED,
//             )
//           }
//         });
//         modifyContextStyleAndDraw({
//           ...settings,
//           ...this.getLineSettings(Effect.FORESHADOW)
//         }, () => {
//           const nextCoords = this.states[this.currentState + 1].filter((coord: Coordinate2D) => {
//                 if (this.foreshadowingArea) {
//                   return this.isInbound(coord, this.foreshadowingArea)
//                 }
//               });

//           if (nextCoords) {
//             this.drawLine(
//               nextCoords,
//               LineShape.CURVED
//             )
//           }
//         });
//       }
//       if (this.foreshadowingType === ForeshadowingAreaSubjectType.RANGE) {
//         const rangeContextSettings = {
//           ...settings,
//           lineWidth: 1,
//           lineDash: [3, 3],
//         };
//         let xCoord = clipAreaStart?.x ?? this.foreshadowingArea.position.x;
//         let widthDiff = xCoord - this.foreshadowingArea.position.x;

//         if (widthDiff < 0) {
//           widthDiff = 0;
//           xCoord = this.foreshadowingArea.position.x;
//         }

//         const reduceWidthBy = Math.min(
//           widthDiff,
//           this.foreshadowingArea.dimensions.width
//         );

//         this.clearAndClipRect({
//           dimensions: {
//             width: this.foreshadowingArea.dimensions.width - reduceWidthBy,
//             height: this.chartDimensions.height,
//           },
//           coordinates: {
//             ...this.foreshadowingArea.position,
//             x: xCoord,
//           },
//         });
//         // modifyContextStyleAndDraw(rangeContextSettings, () =>
//         //   drawFn({
//         //     drawLabels: true,
//         //     pointBoundaries,
//         //     states: "current",
//         //     isHighlighted: false,
//         //   })
//         // );
//       }
//     } else if (
//       this.foreshadowingArea.radius &&
//       this.foreshadowingType === ForeshadowingAreaSubjectType.CIRCLE
//     ) {
//       pointBoundaries = {
//         coordinates: this.foreshadowingArea.position,
//         radius: this.foreshadowingArea.radius,
//       };
//       // modifyContextStyleAndDraw(settings, () =>
//       //   drawFn({
//       //     drawLabels: true,
//       //     drawLine: false,
//       //     pointBoundaries,
//       //     states: "current",
//       //     isHighlighted: true,
//       //   })
//       // );
//     }
//     this.context.restore();
//   }

//   drawBaselineMask(startPosition: number, endPosition: number) {
//     const clipAreaSettings = {
//       dimensions: {
//         width: (this.chartDimensions.width * endPosition) - (this.chartDimensions.width * startPosition),
//         height: this.chartDimensions.height,
//       },
//       coordinates: {
//         x: this.chartPosition.x + (this.chartDimensions.width * startPosition),
//         y: this.chartPosition.y
//       }
//     }

//     this.clearAndClipRect(clipAreaSettings);
//   }

//   drawLine(
//     coordinates: { x: any; y: any }[],
//     shape: LineShape,
//   ) {
//     if (!this.context) return;

//     let line = d3
//       .line<Coordinate2D>()
//       .x((d: Coordinate2D) => this.xScale(d.x))
//       .y((d: Coordinate2D) => this.yScale(d.y));
//     const drawLine = line.context(this.context);

//     if (shape === LineShape.CURVED) {
//       // https://github.com/d3/d3-shape/blob/main/README.md#curves
//       line = line.curve(d3.curveBumpX);
//     }

//     this.context.save();
//     this.context?.beginPath();
//     drawLine(coordinates);
//     this.context?.stroke();
//     this.context.restore();
//   }

//   drawState({
//     state = this.currentState,
//     bounds
//   }:{
//     state?: number,
//     bounds?: { start?: number; end: number }
//   }) {
//     if (!this.context) return;

//     // TODO: Remove this
//     this.initializeScales();

//     // Clear canvas to start new drawing
//     this.clearCanvas();  
//     const coordinates = this.states[state];
    

    

//     modifyContextStyleAndDraw(
//       {
//         context: this.context,
//         ...this.getLineSettings(Effect.DEFAULT)
//       },
//       () => {
//         this.drawLine(
//           coordinates,
//           LineShape.CURVED,
//         )
//       }
//     )
//     modifyContextStyleAndDraw(
//       {
//         context: this.context,
//         ...this.getMarkerSettings(Effect.DEFAULT)
//       },
//       () => {
//         this.drawMarkers(
//           coordinates.slice(0, maxIndex),
//           false,
//           undefined,
//         );
//       }
//     )
//     this.drawForeshadow()
//   }

//   drawInterpolateBetweenStates({
//     interpolateSteps,
//     transitionFunction,
//     currentState,
//     nextState,
//     bounds
//   }: {
//     interpolateSteps: number[];
//     transitionFunction?: (time: number) => number;
//     currentState: Coordinate2D[];
//     nextState: Coordinate2D[];
//     bounds?: { start?: number; end: number }
//   }) {
//     if (!this.context) return;

//     const differentTransitionsPerPoint = interpolateSteps.length > 1;

//     this.initializeScales();
//     if (bounds) {
//       this.setSetLineRange(bounds);
//     }
    
//     const formatTime = d3.timeFormat("%Y-%m-%d");
//     // Not all points are updated at the same rate so we update get the timestep from the passed array
//     // boundedTimeSteps[index]
//     const interPolatedState = currentState.map(
//       (coordinate: Coordinate2D, index: number) => {
//         let interpolateStep: number;
        
//         if (differentTransitionsPerPoint) {
//           interpolateStep = interpolateSteps[index];
//         } else {
//           [interpolateStep] = interpolateSteps;
//         }

//         let transitionStep: number;

//         if (transitionFunction) {
//           transitionStep = transitionFunction(interpolateStep);
//         } else {
//           transitionStep = interpolateStep;
//         }

//         /**
//          * NEED TO USE SCALES HERE!
//          */

//         // We don't use scale here because the draw() & drawSequential() methods use the scales
//         const { x, y } = {
//           x: coordinate.x,
//           y: coordinate.y,
//         };

//         const { xNext, yNext } = {
//           xNext: nextState[index].x,
//           yNext: nextState[index].y,
//         };

//         return {
//           x:
//             this.dataType?.xType === "date"
//               ? formatTime(
//                   d3.interpolateDate(
//                     parseTime(x as unknown as string) ?? new Date(),
//                     parseTime(xNext as unknown as string) ?? new Date()
//                   )(transitionStep)
//                 )
//               : d3.interpolate(x, xNext)(transitionStep),
//           y:
//             this.dataType?.yType === "date"
//               ? formatTime(
//                   d3.interpolateDate(
//                     parseTime(y as unknown as string) ?? new Date(),
//                     parseTime(yNext as unknown as string) ?? new Date()
//                   )(transitionStep)
//                 )
//               : d3.interpolate(y, yNext)(transitionStep),
//         };
//       }
//     );

//     modifyContextStyleAndDraw(
//       {
//         context: this.context,
//         ...this.getLineSettings(Effect.DEFAULT)
//       },
//       () => {
//         this.drawLine(interPolatedState, LineShape.CURVED);
//       }
//     )
//     modifyContextStyleAndDraw(
//       {
//         context: this.context,
//         ...this.getMarkerSettings(Effect.DEFAULT)   
//       },
//       () => {
//         // ONLY DRAW MARKERS ON FINISHED ANIMATIONS
//         if (differentTransitionsPerPoint) {
//           this.drawMarkers(
//             interpolateSteps
//               .filter((step) => step === 1)
//               .map((_, index) => nextState[index])
//           )
//         } else {
//           const [interpolateStep] = interpolateSteps;
//           if (interpolateStep === 1) {
//             this.drawMarkers(
//               nextState
//             )
//           }
//         }
//       }
//     )
//     this.drawForeshadow()
//   }

//   animateToNextState({
//     playRemainingStates = false,
//     transitionFunction,
//     mode,
//     callbackFn,
//   }: {
//     playRemainingStates: boolean;
//     transitionFunction?: (time: number) => number;
//     mode: DrawingMode;
//     callbackFn?: any;
//   }) {
//     this.animateBetweenStates({
//       states: [
//         this.currentState, 
//         this.currentState + 1
//       ],
//       transitionFunction,
//       mode,
//       onFinal: () => {
//         this.incrementState();
//       }
//     })
//   }

//   animateToPreviousState({
//     playRemainingStates = false,
//     transitionFunction,
//     mode,
//     callbackFn,
//   }: {
//     playRemainingStates: boolean;
//     transitionFunction?: (time: number) => number;
//     mode: DrawingMode;
//     callbackFn?: any;
//   }) {
//     this.animateBetweenStates({
//       states: [
//         this.currentState, 
//         this.currentState - 1
//       ],
//       transitionFunction,
//       mode,
//       onFinal: () => {
//         this.decrementState()
//       }
//     })
//   }

//   drawDropAnimation({
//     endState,
//     transitionFunction = (input: number) => input,
//     onEvery = () => void 0,
//     onFinal = () => void 0
//   }: {
//     endState: number,
//     transitionFunction?: (input: number) => number;
//     onEvery?: (timeStep: number) => void;
//     onFinal?: (timeStep: number) => void;
//   }) {
//     const nextStateData = this.states[endState];
    
//     if (!nextStateData) return;

//     const currentStateData = nextStateData.map((coord: Coordinate2D) => {
//       return {
//         ...coord,
//         y: this.chartDimensions.height,
//       }
//     });
    
//     const timer = d3.timer((elapsed: number) => {
//       let boundedTimeStep = transitionFunction(
//         Math.min(elapsed / this.duration, 1)
//       );

//       this.drawInterpolateBetweenStates({
//         interpolateSteps: [boundedTimeStep],
//         currentState: currentStateData,
//         nextState: nextStateData,
//       });

//       onEvery(boundedTimeStep);
//       if (boundedTimeStep === 1) {
//         onFinal(boundedTimeStep)
//         timer.stop()
//       }
//     });
//   }

//   drawBasicAnimation({
//     startState,
//     endState,
//     transitionFunction = (input: number) => input,
//     onEvery = () => void 0,
//     onFinal = () => void 0
//   }: {
//     startState: number,
//     endState: number,
//     transitionFunction?: (input: number) => number;
//     onEvery?: (timeStep: number) => void;
//     onFinal?: (timeStep: number) => void;
//   }) {
//     const currentStateData = this.states[startState];
//     const nextStateData = this.states[endState];

//     if (!nextStateData || !currentStateData) return;

//     const timer = d3.timer((elapsed: number) => {
//       let boundedTimeStep = transitionFunction(
//         Math.min(elapsed / this.duration, 1)
//       );

//       this.drawInterpolateBetweenStates({
//         interpolateSteps: [boundedTimeStep],
//         transitionFunction,
//         currentState: currentStateData,
//         nextState: nextStateData,
//       });
//       onEvery(boundedTimeStep);
//       if (boundedTimeStep === 1) {
//         onFinal(boundedTimeStep)
//         timer.stop()
//       }
//     });
//   }

//   drawUndulateAnimation({
//     startState,
//     endState,
//     transitionFunction = (input: number) => input,
//     onEvery = () => void 0,
//     onFinal = () => void 0
//   }: {
//     startState: number,
//     endState: number,
//     transitionFunction?: (input: number) => number;
//     onEvery?: (timeStep: number) => void;
//     onFinal?: (timeStep: number) => void;
//   }) {
//     const currentStateData = this.states[startState];
//     const nextStateData = this.states[endState];

//     if (!currentStateData || !nextStateData) return;
    
//     const numberOfPoints = nextStateData.length;

//     const timer = d3.timer((elapsed: number) => {
//       const timeStep = elapsed / this.duration;
//       const boundedTimeSteps = Array.from(Array(numberOfPoints)).map(
//         (_: any, index: number) => {
//           return transitionFunction(Math.min(timeStep * (timeStep / index), 1));
//         }
//       );
//       const [lastPointTimeStep] = boundedTimeSteps.slice(-1);
//       this.drawInterpolateBetweenStates({
//         interpolateSteps: boundedTimeSteps,
//         currentState: currentStateData,
//         nextState: nextStateData,
//       });
//       onEvery(lastPointTimeStep);
//       if (lastPointTimeStep === 1) {
//         onFinal(lastPointTimeStep)
//         timer.stop()
//       }
//     });
//   }

//   drawBaselineAnimation({
//     endState,
//     transitionFunction = (input: number) => input,
//     onEvery = () => void 0,
//     onFinal = () => void 0
//   }: {
//     endState: number,
//     transitionFunction?: (input: number) => number;
//     onEvery?: (timeStep: number) => void;
//     onFinal?: (timeStep: number) => void;
//   }) {
//     const nextStateData = this.states[endState];

//     if (!nextStateData) return;

//     const seqTimer = d3.timer((elapsed: number) => {
//       if (!this.context) return

//       const boundedTimeStep = transitionFunction(
//         Math.min(elapsed / this.duration, 1)
//       );

//       modifyContextStyleAndDraw(
//         {
//           context: this.context,
//           ...this.getLineSettings(Effect.DEFAULT)
//         },
//         () => {
//           this.setSetLineRange({ end: boundedTimeStep })
//           this.drawLine(nextStateData, LineShape.CURVED)
//         }
//       )

//       modifyContextStyleAndDraw(
//         {
//           context: this.context,
//           ...this.getMarkerSettings(Effect.DEFAULT)   
//         },
//         () => {
//           const pointsToDraw = nextStateData.slice(
//             0,
//             nextStateData.length * boundedTimeStep
//           )
//           this.drawMarkers(pointsToDraw)
//         }
//       )
      

//       onEvery(boundedTimeStep);
//       if (boundedTimeStep === 1) {
//         onFinal(boundedTimeStep)
//         seqTimer.stop();
//       }
//     });
//   }

//   animateBetweenStates({
//     states = [
//       this.currentState, 
//       this.currentState + 1
//     ],
//     transitionFunction = (input: number) => input,
//     mode,
//     onEvery = () => void 0,
//     onFinal = () => void 0,
//   }: {
//     states?: number[];
//     transitionFunction?: (time: number) => number;
//     mode: DrawingMode;
//     onEvery?: (args?: any) => void;
//     onFinal?: (args?: any) => void;
//   }) {
//     this.initializeScales();
//     this.clearCanvas()
//     const [currentState, endState, ...rest] = states;
//     const remainingStates = [endState, ...rest];

//     const useCurrentStateAsEnd = mode === DrawingMode.DROP_ANIMATION || mode === DrawingMode.BASELINE_ANIMATION;

//     const drawFnArgs = {
//       startState: currentState,
//       // If we're doing the drop animation draw the current state and not the next
//       endState: useCurrentStateAsEnd ? currentState : endState,
//       transitionFunction,
//       onFinal: () => {
//         const startNewAnimation = rest.length > 1;
//         if (startNewAnimation) {
//           this.animateBetweenStates({
//             states: remainingStates,
//             transitionFunction,
//             mode,
//             onEvery,
//             onFinal,
//           })
//         }
//         onFinal()
//       },
//       onEvery: () => onEvery(),
//     }

//     if (mode === DrawingMode.DROP_ANIMATION) {
//       this.drawDropAnimation(drawFnArgs);
//     }

//     if (mode === DrawingMode.DRAW_ALL) {
//       this.drawBasicAnimation(drawFnArgs);
//     }

//     if (mode === DrawingMode.UNDULATE_ANIMATION) {
//       this.drawUndulateAnimation(drawFnArgs);
//     }

//     if (mode === DrawingMode.BASELINE_ANIMATION) {
//       this.drawBaselineAnimation(drawFnArgs);
//     }
//   }
// }

export default "";
