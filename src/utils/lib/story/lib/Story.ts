import _ from "lodash";
import type {
  Chart,
  Coordinate2D,
  Dimensions,
  PartialCoordinate2D,
} from "../../chart";
import {
  ForeshadowingGestureListener,
  ListenerType,
  RadialPlaybackGestureListener,
  type LinearPlaybackGestureListener,
} from "../../gestures";
import type { CanvasEvent } from "../../interactions";

export class Story {
  title: string;
  chart?: Chart;
  temporalPlaybackTracker?: LinearPlaybackGestureListener;
  radialPlaybackTracker?: RadialPlaybackGestureListener;
  foreshadowingTracker?: ForeshadowingGestureListener;
  layers: [
    string,
    (
      | ForeshadowingGestureListener
      | RadialPlaybackGestureListener
      | LinearPlaybackGestureListener
      | Chart
    )
  ][] = [];

  constructor({ title }: { title: string }) {
    this.title = title;
  }

  addLayer(type: string, listener: any) {
    if (type) {
      this.layers = [[type, listener], ...this.layers];
    }
  }

  canvasEventListener(eventType: CanvasEvent, eventData: Coordinate2D) {
    let handled = false;
    let currentIndex = 0;

    while (!handled && currentIndex < this.layers.length) {
      const [key, element] = this.layers[currentIndex];
      if (element.canvasListener) {
        const { isInBounds } = element.canvasListener.isInBounds(eventData);
        if (isInBounds) {
          handled = true;
        }
        element.canvasListener.handleEvent(eventType, eventData);
      }
      currentIndex += 1;
    }
  }

  // CHART
  getChartWidth() {
    return this.chart?.dimensions.width;
  }

  getChartPosition() {
    return this.chart?.position;
  }

  getChart() {
    return this.chart;
  }

  addChart(chart: Chart) {
    this.chart = chart;
    this.addLayer("chart", chart);
  }

  changeChartDimensions(width: number) {
    if (!this.chart) return;
    const newDimensions = {
      ...this.chart?.dimensions,
      width,
      height: width * (3 / 4),
    };

    this.chart.updateState({
      dimensions: newDimensions,
    });
    this.changeListenerDimensions(newDimensions, ListenerType.FORESHADOWING);
  }

  changePosition(coords: PartialCoordinate2D) {
    if (!this.chart) return;

    const newPosition = {
      ...this.chart?.position,
      ...(coords.x ? { x: coords.x } : {}),
      ...(coords.y ? { y: coords.y } : {}),
    };

    this.chart.updateState({
      position: newPosition,
    });
    this.changeListenerPosition(newPosition, ListenerType.FORESHADOWING);
  }

  private getListenerField(type?: ListenerType, field?: string) {
    switch (type) {
      case ListenerType.TEMPORAL:
        return _.get(
          this.temporalPlaybackTracker,
          field ?? "",
          this.temporalPlaybackTracker
        );
      case ListenerType.RADIAL:
        return _.get(
          this.radialPlaybackTracker,
          field ?? "",
          this.radialPlaybackTracker
        );
      case ListenerType.FORESHADOWING:
        return _.get(
          this.foreshadowingTracker,
          field ?? "",
          this.foreshadowingTracker
        );
      default:
        break;
    }
  }

  // temporal gesture listener
  getListenerDimensions(type?: ListenerType) {
    return this.getListenerField(type, "dimensions");
  }

  getListenerPosition(type?: ListenerType) {
    return this.getListenerField(type, "position");
  }

  getListener(
    type?: ListenerType
  ):
    | undefined
    | LinearPlaybackGestureListener
    | RadialPlaybackGestureListener
    | ForeshadowingGestureListener {
    return this.getListenerField(type);
  }

  addListener(
    listener:
      | LinearPlaybackGestureListener
      | RadialPlaybackGestureListener
      | ForeshadowingGestureListener,
    type?: ListenerType
  ) {
    switch (type) {
      case ListenerType.TEMPORAL:
        this.temporalPlaybackTracker =
          listener as LinearPlaybackGestureListener;
        break;
      case ListenerType.RADIAL:
        this.radialPlaybackTracker = listener as RadialPlaybackGestureListener;
        break;
      case ListenerType.FORESHADOWING:
        this.foreshadowingTracker = listener as ForeshadowingGestureListener;
        break;
      default:
        break;
    }

    if (type) {
      this.addLayer(type, listener);
    }
  }

  removeListener(type?: ListenerType) {
    switch (type) {
      case ListenerType.TEMPORAL:
        this.temporalPlaybackTracker?.unsubscribe();
        this.temporalPlaybackTracker = undefined;
        break;
      case ListenerType.RADIAL:
        this.radialPlaybackTracker?.unsubscribe();
        this.radialPlaybackTracker = undefined;
        break;
      case ListenerType.FORESHADOWING:
        this.foreshadowingTracker?.unsubscribe();
        this.foreshadowingTracker = undefined;
        break;
      default:
        break;
    }
  }

  changeListenerDimensions(
    dimensions: Partial<Dimensions>,
    type?: ListenerType
  ) {
    const newDimensions = {
      ...(dimensions.width ? { width: dimensions.width } : {}),
      ...(dimensions.height ? { height: dimensions.height } : {}),
    };

    const listener = this.getListenerField(type);
    if (listener) {
      listener.updateState({
        dimensions: {
          ...listener.dimensions,
          ...newDimensions,
        },
      });
    }
  }

  changeListenerPosition(coords: PartialCoordinate2D, type?: ListenerType) {
    const newPosition = {
      ...(coords.x ? { x: coords.x } : {}),
      ...(coords.y ? { y: coords.y } : {}),
    };

    const listener = this.getListenerField(type);
    if (listener) {
      listener.updateState({
        position: {
          ...listener.position,
          ...newPosition,
        },
      });
    }
  }

  draw() {
    console.log("drawing");
    this.chart?.chart?.draw();
    this.getListener(ListenerType.FORESHADOWING)?.draw();
    this.getListener(ListenerType.RADIAL)?.draw();
    this.getListener(ListenerType.TEMPORAL)?.draw();
  }
}
