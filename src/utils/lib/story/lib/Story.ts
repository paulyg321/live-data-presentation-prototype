import _ from "lodash";
import { ChartTypeValue, Chart, type Coordinate2D } from "../../chart";
import type { DrawingUtils } from "../../drawing";
import {
  ForeshadowingGestureListener,
  ListenerType,
  RadialPlaybackGestureListener,
  LinearPlaybackGestureListener,
  getGestureListenerResetKeys,
} from "../../gestures";
import { CanvasEvent } from "../../interactions";
import { parse, stringify, toJSON, fromJSON } from "flatted";

export type StoryLayer =
  | ForeshadowingGestureListener
  | RadialPlaybackGestureListener
  | LinearPlaybackGestureListener
  | Chart;

export type LayerType = ChartTypeValue | ListenerType;

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
  }: {
    title: string;
    drawingUtils: DrawingUtils;
  }) {
    this.title = title;
    this.drawingUtils = drawingUtils;
  }

  loadStoredLayers() {
    const storedLayerString = localStorage.getItem(this.title);
    if (storedLayerString) {
      this.layers = parse(storedLayerString).map(({ layer, type, id }: any) => {
        const arg = {
          ...layer,
          drawingUtils: this.drawingUtils,
          resetKeys: getGestureListenerResetKeys("Space"),
        };
        switch (type) {
          case ChartTypeValue.BAR:
          case ChartTypeValue.LINE:
          case ChartTypeValue.SCATTER:
            return {
              type,
              id,
              layer: new Chart(arg),
            };
          case ListenerType.FORESHADOWING: {
            return {
              type,
              id,
              layer: new ForeshadowingGestureListener(arg),
            };
          }
          case ListenerType.TEMPORAL: {
            return {
              type,
              id,
              layer: new LinearPlaybackGestureListener(arg),
            };
          }
          case ListenerType.RADIAL: {
            return {
              type,
              id,
              layer: new RadialPlaybackGestureListener(arg),
            };
          }
          default:
            return {};
        }
      });
    } else {
      this.layers = [];
    }
  }

  isChartLayer(type: string) {
    return [
      ChartTypeValue.BAR,
      ChartTypeValue.SCATTER,
      ChartTypeValue.LINE,
    ].includes(type as ChartTypeValue);
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

    localStorage.setItem(this.title, stringify(this.layers));

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
        return this.isChartLayer(type as ChartTypeValue);
      })
      .map(({ layer }) => layer) as Chart[];
  }

  handleDeleteCurrentLayer(id: string) {
    this.removeLayer(id);
    this.setCurrentWidget();
  }

  canvasEventListener(eventType: CanvasEvent, eventData: Coordinate2D) {
    const currentWidget = this.currentWidget;
    if (!currentWidget) return;

    const listener = currentWidget?.layer.canvasListener;
    const boundsInformation = listener?.isInBounds(eventData);

    if (boundsInformation) {
      const { isInDeleteBounds } = boundsInformation;

      if (isInDeleteBounds && eventType === CanvasEvent.CLICK) {
        this.handleDeleteCurrentLayer(currentWidget.id);
      } else {
        listener?.handleEvent(eventType, eventData);
      }
    }

    localStorage.setItem(this.title, stringify(this.layers));
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
        this.currentWidget.layer.canvasListener?.draw();
      }
      layer.draw();
    });
    // this.saveThumbnail();
  }
}
