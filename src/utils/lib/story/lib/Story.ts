import _ from "lodash";
import { ChartTypeValue, Chart, type Coordinate2D } from "../../chart";
import {
  ForeshadowingGestureListener,
  ListenerType,
  RadialPlaybackGestureListener,
  LinearPlaybackGestureListener,
} from "../../gestures";
import { CanvasEvent } from "../../interactions";

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

  constructor({ title }: { title: string }) {
    this.title = title;
    this.loadStoredLayers;
  }

  private loadStoredLayers() {
    const storedLayerString = localStorage.getItem(this.title);
    if (storedLayerString) {
      this.layers = JSON.parse(storedLayerString).map(
        ({ layer, type }: any) => {
          switch (type) {
            case ChartTypeValue.BAR:
            case ChartTypeValue.LINE:
            case ChartTypeValue.SCATTER:
              return new Chart(layer);
            case ListenerType.FORESHADOWING: {
              return new ForeshadowingGestureListener(layer);
            }
            case ListenerType.TEMPORAL: {
              return new LinearPlaybackGestureListener(layer);
            }
            case ListenerType.RADIAL: {
              return new RadialPlaybackGestureListener(layer);
            }
            default:
              return {};
          }
        }
      );
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
    const id = _.uniqueId();
    if (type) {
      this.layers = [{ type, id, layer }, ...this.layers];
    }

    // localStorage.setItem(this.title, JSON.stringify(this.layers));

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

  getChart() {
    return this.layers.find(({ type }) => {
      return this.isChartLayer(type as ChartTypeValue);
    })?.layer as Chart;
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
  }

  draw() {
    this.layers.forEach(({ layer, id }) => {
      if (id === this.currentWidget?.id) {
        this.currentWidget.layer.canvasListener?.draw();
      }
      layer.draw();
    });
  }
}
