import {
  ListenerType,
  RangePoseListener,
  PointPoseListener,
  OpenHandPoseListener,
  StrokeListener,
  RectPoseListener,
  CanvasEvent,
  type DrawingUtils,
  ChartType,
  Chart,
  type Coordinate2D,
  ThumbPoseListener,
} from "@/utils";
import { stringify } from "flatted";

export type StoryLayer =
  | RangePoseListener
  | RectPoseListener
  | PointPoseListener
  | OpenHandPoseListener
  | StrokeListener
  | ThumbPoseListener
  | Chart;

export type LayerType = ChartType | ListenerType;

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
    // this.layers = layers;
    this.loadStoredLayers(layers);
  }

  loadStoredLayers(
    layers: {
      type: LayerType;
      id: string;
      layer: StoryLayer;
    }[]
  ) {
    this.layers = layers
      .map(({ layer, type, id }: any) => {
        const arg = {
          ...layer.state,
          drawingUtils: this.drawingUtils,
        };

        switch (type) {
          case ChartType.BAR:
          case ChartType.LINE:
          case ChartType.SCATTER:
            return {
              type,
              id,
              layer: new Chart(arg),
            };
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
          case ListenerType.THUMB_POSE: {
            return {
              type,
              id,
              layer: new ThumbPoseListener(arg),
            };
          }
          case ListenerType.STROKE_LISTENER: {
            return {
              type,
              id,
              layer: new StrokeListener(arg),
            };
          }
          default:
            return undefined;
        }
      })
      .filter((layer) => layer !== undefined) as {
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

  getCurrentWidget() {
    return this.currentWidget;
  }

  setCurrentWidget(id?: string) {
    if (id) {
      this.currentWidget = this.getLayer(id);
    } else {
      this.currentWidget = this.getDefaultWidget();
    }
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
        return this.isChartLayer(type as ChartType);
      })
      .map(({ layer }) => layer) as Chart[];
  }

  handleDeleteLayer(id: string, save?: () => void) {
    this.removeLayer(id);
    this.setCurrentWidget();
    if (save) {
      save();
    }
  }

  canvasEventListener(
    eventType: CanvasEvent,
    eventData: Coordinate2D,
    save?: () => void
  ) {
    const currentWidget = this.currentWidget;
    if (!currentWidget) return;

    const listener = currentWidget?.layer?.state?.canvasListener;
    const boundsInformation = listener?.isInBounds(eventData);

    if (boundsInformation) {
      const { isInDeleteBounds } = boundsInformation;

      if (isInDeleteBounds && eventType === CanvasEvent.CLICK) {
        this.handleDeleteLayer(currentWidget.id, save);
      } else {
        listener?.handleEvent(eventType, eventData, save);
      }
    }
  }

  saveThumbnail() {
    //TODO: store in local storage
    this.thumbNail = this.drawingUtils
      ?.getContexts(["preview"])[0]
      .context.getImageData(0, 0, 640, 640 * (3 / 4));
  }

  draw() {
    this.layers.forEach(({ layer, id }) => {
      if (id === this.currentWidget?.id) {
        this.currentWidget.layer.state.canvasListener?.draw();
      }
      layer.draw();
    });
    // this.saveThumbnail();
  }
}
