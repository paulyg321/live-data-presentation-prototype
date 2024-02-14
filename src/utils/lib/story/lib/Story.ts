import {
  ListenerType,
  RangePoseListener,
  PointPoseListener,
  OpenHandPoseListener,
  StrokeListener,
  RectPoseListener,
  type DrawingUtils,
  ChartType,
  Chart,
  AnnotationType,
  Line,
  Circle,
  Rect,
  Text,
  SvgAnnotation,
  GestureListener,
} from "@/utils";

export type AnnotationLayers = Line | Circle | Rect | Text | SvgAnnotation;

export type StoryLayer =
  | RangePoseListener
  | RectPoseListener
  | PointPoseListener
  | OpenHandPoseListener
  | StrokeListener
  | AnnotationLayers
  | Chart;

export type LayerType = ChartType | ListenerType | AnnotationType;

export class Story {
  title: string;
  layers: {
    type: LayerType;
    id: string;
    layer: StoryLayer;
  }[] = [];
  currentWidget?: {
    type: LayerType;
    id: string;
    layer: StoryLayer;
  };
  drawingUtils: DrawingUtils;
  thumbNail: any;
  unParsedLayers: {
    type: LayerType;
    id: string;
    layer: StoryLayer;
  }[] = [];

  constructor({
    title,
    drawingUtils,
    layers = [],
  }: {
    title: string;
    drawingUtils: DrawingUtils;
    layers?: {
      type: LayerType;
      id: string;
      layer: StoryLayer;
    }[];
  }) {
    this.title = title;
    this.drawingUtils = drawingUtils;
    this.unParsedLayers = layers;
  }

  getLayers() {
    return this.layers;
  }

  updateState({ title }: { title?: string }) {
    if (title) {
      this.title = title;
    }
  }

  async loadStoredLayers() {
    this.layers = (
      await Promise.all(
        this.unParsedLayers.map(async ({ layer, type, id }: any) => {
          const arg = {
            ...layer.state,
            drawingUtils: this.drawingUtils,
          };

          switch (type) {
            case ChartType.BAR:
            case ChartType.LINE:
            case ChartType.SCATTER: {
              const newChart = new Chart(arg);
              await newChart.init();
              return {
                type,
                id,
                layer: newChart,
              };
            }
            case ListenerType.POINT_POSE: {
              return {
                type,
                id,
                layer: new PointPoseListener(arg),
              };
            }
            case ListenerType.OPEN_HAND_POSE: {
              return {
                type,
                id,
                layer: new OpenHandPoseListener(arg),
              };
            }
            case ListenerType.RECT_POSE: {
              return {
                type,
                id,
                layer: new RectPoseListener(arg),
              };
            }
            case ListenerType.RANGE_POSE: {
              return {
                type,
                id,
                layer: new RangePoseListener(arg),
              };
            }
            case ListenerType.STROKE_LISTENER: {
              return {
                type,
                id,
                layer: new StrokeListener(arg),
              };
            }
            case AnnotationType.LINE: {
              return {
                type,
                id,
                layer: new Line(arg),
              };
            }
            case AnnotationType.CIRCLE: {
              return {
                type,
                id,
                layer: new Circle(arg),
              };
            }
            case AnnotationType.RECT: {
              return {
                type,
                id,
                layer: new Rect(arg),
              };
            }
            case AnnotationType.TEXT: {
              return {
                type,
                id,
                layer: new Text(arg),
              };
            }
            case AnnotationType.SVG: {
              return {
                type,
                id,
                layer: new SvgAnnotation(arg),
              };
            }
            default:
              return undefined;
          }
        })
      )
    ).filter((layer) => layer !== undefined) as {
      type: LayerType;
      id: string;
      layer: StoryLayer;
    }[];
  }

  isChartLayer(type: string) {
    return [ChartType.BAR, ChartType.SCATTER, ChartType.LINE].includes(
      type as ChartType
    );
  }

  isAnnotationLayer(type: string) {
    return [
      AnnotationType.CIRCLE,
      AnnotationType.LINE,
      AnnotationType.SVG,
      AnnotationType.RECT,
      AnnotationType.TEXT,
    ].includes(type as AnnotationType);
  }

  isListenerLayer(type: string) {
    return [
      ListenerType.RECT_POSE,
      ListenerType.RANGE_POSE,
      ListenerType.POINT_POSE,
      ListenerType.OPEN_HAND_POSE,
      ListenerType.THUMB_POSE,
      ListenerType.STROKE_LISTENER,
    ].includes(type as ListenerType);
  }

  getCurrentWidget() {
    return this.currentWidget;
  }

  setCurrentWidget(id?: string) {
    this.currentWidget?.layer.updateState({
      isHover: false,
    });

    if (id) {
      this.currentWidget = this.getLayer(id);
    } else {
      this.currentWidget = this.getDefaultWidget();
    }

    this.currentWidget?.layer.updateState({
      isHover: true,
    });
  }

  getDefaultWidget() {
    if (this.layers.length >= 1) {
      return this.layers[0];
    }
  }

  addLayer(type: LayerType, layer: StoryLayer) {
    const id = crypto.randomUUID();
    if (type) {
      this.layers = [{ type, id, layer }, ...this.layers];
    }

    return {
      type,
      id,
      layer,
    };
  }

  removeLayer(layerId: string) {
    const removedLayer = this.layers.find((layer) => layer.id === layerId);
    if (
      removedLayer?.type &&
      [
        ListenerType.OPEN_HAND_POSE,
        ListenerType.POINT_POSE,
        ListenerType.RANGE_POSE,
        ListenerType.RECT_POSE,
        ListenerType.STROKE_LISTENER,
      ].includes(removedLayer.type as ListenerType)
    ) {
      (removedLayer.layer as GestureListener).unsubscribe();
    }
    const updatedLayers = this.layers.filter((layer) => layer.id !== layerId);
    this.layers = updatedLayers;

    return this.layers;
  }

  getLayer(layerId: string) {
    return this.layers.find(({ id }) => {
      return layerId === id;
    });
  }

  getCharts() {
    return this.layers
      .filter(({ type }) => {
        return this.isChartLayer(type);
      })
      .map(({ layer }) => layer) as Chart[];
  }

  getAnnotations() {
    return this.layers.filter(({ type }) => {
      return this.isAnnotationLayer(type);
    });
  }

  getListeners() {
    return this.layers.filter(({ type }) => {
      return this.isListenerLayer(type);
    });
  }

  revealAnnotations(annotationIds: string[]) {
    const annotationsToReveal = this.layers.filter(({ id, type }) => {
      return this.isAnnotationLayer(type) && annotationIds.includes(id);
    });
    const annotationsToHide = this.layers.filter(({ id, type }) => {
      return this.isAnnotationLayer(type) && !annotationIds.includes(id);
    });

    annotationsToReveal.forEach((annotation) => {
      (annotation.layer as AnnotationLayers).handleUnveil();
    });
    annotationsToHide.forEach((annotation) => {
      (annotation.layer as AnnotationLayers).handleHide();
    });
  }

  handleDeleteLayer(id: string, save?: () => void) {
    this.removeLayer(id);
    this.setCurrentWidget();
    if (save) {
      save();
    }
  }

  // canvasEventListener(
  //   eventType: CanvasEvent,
  //   eventData: Coordinate2D,
  //   save?: () => void
  // ) {
  //   const currentWidget = this.currentWidget;
  //   if (!currentWidget) return;

  //   // const listener = currentWidget?.layer?.state?.canvasListener;
  //   const boundsInformation = listener?.isInBounds(eventData);

  //   if (boundsInformation) {
  //     const { isInDeleteBounds } = boundsInformation;

  //     if (isInDeleteBounds && eventType === CanvasEvent.CLICK) {
  //       this.handleDeleteLayer(currentWidget.id, save);
  //     } else {
  //       listener?.handleEvent(eventType, eventData, save);
  //     }
  //   }
  // }

  saveThumbnail() {
    //TODO: store in local storage
    this.thumbNail = this.drawingUtils
      ?.getContexts(["preview"])[0]
      .context.getImageData(0, 0, 640, 640 * (3 / 4));
  }

  draw() {
    this.layers.forEach(({ layer, id }) => {
      // if (id === this.currentWidget?.id) {
      //   this.currentWidget.layer.state.canvasListener?.draw();
      // }
      layer.draw();
    });
    // this.saveThumbnail();
  }
}
