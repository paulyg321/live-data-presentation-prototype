<script setup lang="ts">
import { computed, onMounted, ref, toRaw, watch } from "vue";
import {
  PortalContainer,
  StoriesPanel,
  VideoSettings,
  PreviewPanel,
  WidgetSettings,
  PortalSettings,
  ChartDataSettings,
} from "@/components";

// VIEWS
import {
  CameraSettings,
  CanvasSettings,
  gestureTracker,
  renderVideoOnCanvas,
  setVideoDimensions,
  StorySettings,
  widgetIconMap,
  PortalState,
} from "@/state";

// MEDIAPIPE
import { Hands, type Results } from "@mediapipe/hands";

// STATE
import {
  ListenerType,
  ChartType,
  getGestureListenerResetKeys,
  StrokeListener,
  RectPoseListener,
  RangePoseListener,
  OpenHandPoseListener,
  PointPoseListener,
  ThumbPoseListener,
  AnnotationType,
  Line,
  Circle,
  Rect,
  Text,
SvgAnnotation,
} from "@/utils";

enum AvailableWidgets {
  // Not really widgets
  VIDEO = "video",
  LAYERS = "layers",
  // chart widgets
  LINE_CHART = "line-chart",
  BAR_CHART = "bar-chart",
  SCATTER_PLOT = "scatter-plot",
  // pose widgets
  PORTALS = "portals",
  RECT_POSE = "rect-pose",
  RANGE_POSE = "range-pose",
  POINT_POSE = "point-pose",
  OPEN_HAND_POSE = "open-hand-pose",
  THUMB_POSE = "thumb-touch",
  STROKE_LISTENER = "stroke-listener",
  // annotation widgets
  LINE_ANNOTATION = "line-annotation",
  TEXT_ANNOTATION = "text-annotation",
  SVG_ANNOTATION = "svg-annotation",
  CIRCLE_ANNOTATION = "circle-annotation",
  RECT_ANNOTATION = "rect-annotation",
}

enum SettingsTab {
  CHART_SETTINGS = "chart-settings",
  // GESTURE_SETTINGS = "gesture-settings",
  PORTALS = "portals",
  VIDEO_SETTINGS = "video-settings",
  WIDGET_SETTINGS = "widget-settings",
}

const currentTab = ref<SettingsTab | null>();
const chartType = ref<ChartType | undefined>();
const disableChartType = computed(() => {
  return StorySettings.currentStory === undefined;
});
const disablePoses = computed(() => {
  const charts = StorySettings.currentStory?.getCharts();

  return !(charts && charts.length > 0);
});

function handleSaveChart() {
  currentTab.value = SettingsTab.WIDGET_SETTINGS;
}

function handleChartWidget(value: SettingsTab, type?: ChartType) {
  chartType.value = type;
  currentTab.value = value;
}

function handleAnnotationWidget(value: SettingsTab, type: AnnotationType) {
  currentTab.value = value;
  addWidget(type);
}

function handleGestureWidget(value: SettingsTab, type: ListenerType) {
  currentTab.value = value;
  addWidget(type);
}

function handleAddWidget(value: {
  id: AvailableWidgets;
  value: boolean;
  path: SettingsTab[];
}) {
  if (value.value) {
    switch (value.id) {
      case AvailableWidgets.VIDEO:
        currentTab.value = SettingsTab.VIDEO_SETTINGS;
        break;
      case AvailableWidgets.PORTALS:
        currentTab.value = SettingsTab.PORTALS;
        break;
      case AvailableWidgets.LAYERS:
        currentTab.value = SettingsTab.WIDGET_SETTINGS;
        break;
      case AvailableWidgets.BAR_CHART:
        handleChartWidget(SettingsTab.CHART_SETTINGS, ChartType.BAR);
        break;
      case AvailableWidgets.SCATTER_PLOT:
        handleChartWidget(SettingsTab.CHART_SETTINGS, ChartType.SCATTER);
        break;
      // case AvailableWidgets.LINE_CHART:
      //   handleChartWidget(SettingsTab.CHART_SETTINGS, ChartType.LINE);
      //   break;
      case AvailableWidgets.LINE_ANNOTATION:
        handleAnnotationWidget(
          SettingsTab.WIDGET_SETTINGS,
          AnnotationType.LINE
        );
        break;
      case AvailableWidgets.TEXT_ANNOTATION:
        handleAnnotationWidget(
          SettingsTab.WIDGET_SETTINGS,
          AnnotationType.TEXT
        );
        break;
      case AvailableWidgets.SVG_ANNOTATION:
        handleAnnotationWidget(SettingsTab.WIDGET_SETTINGS, AnnotationType.SVG);
        break;
      case AvailableWidgets.RECT_ANNOTATION:
        handleAnnotationWidget(
          SettingsTab.WIDGET_SETTINGS,
          AnnotationType.RECT
        );
        break;
      case AvailableWidgets.CIRCLE_ANNOTATION:
        handleAnnotationWidget(
          SettingsTab.WIDGET_SETTINGS,
          AnnotationType.CIRCLE
        );
        break;
      case AvailableWidgets.RECT_POSE:
        handleGestureWidget(
          SettingsTab.WIDGET_SETTINGS,
          ListenerType.RECT_POSE
        );
        break;
      case AvailableWidgets.RANGE_POSE:
        handleGestureWidget(
          SettingsTab.WIDGET_SETTINGS,
          ListenerType.RANGE_POSE
        );
        break;
      case AvailableWidgets.POINT_POSE:
        handleGestureWidget(
          SettingsTab.WIDGET_SETTINGS,
          ListenerType.POINT_POSE
        );
        break;
      case AvailableWidgets.OPEN_HAND_POSE:
        handleGestureWidget(
          SettingsTab.WIDGET_SETTINGS,
          ListenerType.OPEN_HAND_POSE
        );
        break;
      case AvailableWidgets.THUMB_POSE:
        handleGestureWidget(
          SettingsTab.WIDGET_SETTINGS,
          ListenerType.THUMB_POSE
        );
        break;
      case AvailableWidgets.STROKE_LISTENER:
        handleGestureWidget(
          SettingsTab.WIDGET_SETTINGS,
          ListenerType.STROKE_LISTENER
        );
        break;
      default:
        currentTab.value = undefined;
        break;
    }
  } else {
    currentTab.value = undefined;
  }
}

function addWidget(type: string) {
  const drawingUtils = CanvasSettings.generalDrawingUtils;
  if (!drawingUtils) return;

  switch (type) {
    case ListenerType.RECT_POSE: {
      const newListener = new RectPoseListener({
        position: { x: 0, y: 0 },
        dimensions: { width: 50, height: 50 },
        canvasDimensions: CanvasSettings.dimensions,
        resetKeys: getGestureListenerResetKeys(),
        drawingUtils,
      });

      StorySettings.currentStory?.addLayer(type, newListener);

      break;
    }
    case ListenerType.RANGE_POSE: {
      const newListener = new RangePoseListener({
        position: { x: 0, y: 0 },
        dimensions: { width: 50, height: 50 },
        canvasDimensions: CanvasSettings.dimensions,
        resetKeys: getGestureListenerResetKeys(),
        drawingUtils,
      });

      StorySettings.currentStory?.addLayer(type, newListener);

      break;
    }
    case ListenerType.POINT_POSE: {
      const newListener = new PointPoseListener({
        position: { x: 0, y: 0 },
        dimensions: { width: 50, height: 50 },
        canvasDimensions: CanvasSettings.dimensions,
        resetKeys: getGestureListenerResetKeys(),
        drawingUtils,
      });

      StorySettings.currentStory?.addLayer(type, newListener);

      break;
    }
    case ListenerType.OPEN_HAND_POSE: {
      const newListener = new OpenHandPoseListener({
        position: { x: 0, y: 0 },
        dimensions: { width: 50, height: 50 },
        canvasDimensions: CanvasSettings.dimensions,
        resetKeys: getGestureListenerResetKeys(),
        drawingUtils,
      });

      StorySettings.currentStory?.addLayer(type, newListener);
      break;
    }
    case ListenerType.THUMB_POSE: {
      const newListener = new ThumbPoseListener({
        position: { x: 0, y: 0 },
        dimensions: { width: 50, height: 50 },
        canvasDimensions: CanvasSettings.dimensions,
        resetKeys: getGestureListenerResetKeys(),
        drawingUtils,
      });

      StorySettings.currentStory?.addLayer(type, newListener);
      break;
    }
    case ListenerType.STROKE_LISTENER: {
      const newListener = new StrokeListener({
        position: { x: 0, y: 0 },
        dimensions: { width: 50, height: 50 },
        canvasDimensions: CanvasSettings.dimensions,
        resetKeys: getGestureListenerResetKeys(),
        drawingUtils,
      });

      StorySettings.currentStory?.addLayer(type, newListener);
      break;
    }
    case AnnotationType.LINE: {
      const newListener = new Line({
        drawingUtils,
      });

      StorySettings.currentStory?.addLayer(type, newListener);
      break;
    }
    case AnnotationType.CIRCLE: {
      const newListener = new Circle({
        drawingUtils,
      });

      StorySettings.currentStory?.addLayer(type, newListener);
      break;
    }
    case AnnotationType.RECT: {
      const newListener = new Rect({
        drawingUtils,
      });

      StorySettings.currentStory?.addLayer(type, newListener);
      break;
    }
    case AnnotationType.TEXT: {
      const newListener = new Text({
        drawingUtils,
      });

      StorySettings.currentStory?.addLayer(type, newListener);
      break;
    }
    case AnnotationType.SVG: {
      const newListener = new SvgAnnotation({
        drawingUtils,
      });

      StorySettings.currentStory?.addLayer(type, newListener);
      break;
    }
    default:
      break;
  }
}

// ========================================================================================

const MEDIA_PIPE_URL = (file: string) =>
  `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
const hands = ref<Hands>(
  new Hands({
    locateFile: MEDIA_PIPE_URL,
  })
);

function initializeHands() {
  hands.value.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
  hands.value.onResults((results: Results) =>
    gestureTracker.value.handleMediaPipeResults(results)
  );
}

async function runDetection() {
  if (hands.value && CameraSettings.video) {
    try {
      await toRaw(hands.value).send({ image: CameraSettings.video });
    } catch (error) {
      console.log("error", error);
    }
  }

  await renderVideoOnCanvas();
  requestAnimationFrame(runDetection);
}

onMounted(() => {
  initializeHands();
});
</script>

<template>
  <v-layout>
    <v-app>
      <v-navigation-drawer
        theme="light"
        rail
        location="top"
        elevation="1"
        permanent
      >
        <v-list
          density="compact"
          @click:select="handleAddWidget"
          class="d-flex flex-row"
        >
          <v-tooltip text="Scatter Plot">
            <template v-slot:activator="{ props }">
              <v-list-item
                :prepend-icon="widgetIconMap.scatter"
                :value="AvailableWidgets.SCATTER_PLOT"
                v-bind="props"
                :disabled="disableChartType"
              >
              </v-list-item>
            </template>
          </v-tooltip>

          <v-tooltip text="Bar Chart">
            <template v-slot:activator="{ props }">
              <v-list-item
                :prepend-icon="widgetIconMap.bar"
                :value="AvailableWidgets.BAR_CHART"
                v-bind="props"
                :disabled="disableChartType"
              >
              </v-list-item>
            </template>
          </v-tooltip>

          <v-tooltip text="Line Annotation">
            <template v-slot:activator="{ props }">
              <v-list-item
                :prepend-icon="widgetIconMap['annotation-line']"
                :value="AvailableWidgets.LINE_ANNOTATION"
                v-bind="props"
                :disabled="disableChartType"
              >
              </v-list-item>
            </template>
          </v-tooltip>

          <v-tooltip text="Text Annotation">
            <template v-slot:activator="{ props }">
              <v-list-item
                :prepend-icon="widgetIconMap['annotation-text']"
                :value="AvailableWidgets.TEXT_ANNOTATION"
                v-bind="props"
                :disabled="disableChartType"
              >
              </v-list-item>
            </template>
          </v-tooltip>

          <v-tooltip text="SVG Annotation">
            <template v-slot:activator="{ props }">
              <v-list-item
                :prepend-icon="widgetIconMap['annotation-svg']"
                :value="AvailableWidgets.SVG_ANNOTATION"
                v-bind="props"
                :disabled="disableChartType"
              >
              </v-list-item>
            </template>
          </v-tooltip>

          <v-tooltip text="Rect Annotation">
            <template v-slot:activator="{ props }">
              <v-list-item
                :prepend-icon="widgetIconMap['annotation-rect']"
                :value="AvailableWidgets.RECT_ANNOTATION"
                v-bind="props"
                :disabled="disableChartType"
              >
              </v-list-item>
            </template>
          </v-tooltip>

          <v-tooltip text="Circle Annotation">
            <template v-slot:activator="{ props }">
              <v-list-item
                :prepend-icon="widgetIconMap['annotation-circle']"
                :value="AvailableWidgets.CIRCLE_ANNOTATION"
                v-bind="props"
                :disabled="disableChartType"
              >
              </v-list-item>
            </template>
          </v-tooltip>

          <v-tooltip text="Rect Pose Widget">
            <template v-slot:activator="{ props }">
              <v-list-item
                :prepend-icon="widgetIconMap['rect-pose']"
                :value="AvailableWidgets.RECT_POSE"
                v-bind="props"
                :disabled="disablePoses"
              >
              </v-list-item>
            </template>
          </v-tooltip>

          <v-tooltip text="Range Pose Widget">
            <template v-slot:activator="{ props }">
              <v-list-item
                :prepend-icon="widgetIconMap['range-pose']"
                :value="AvailableWidgets.RANGE_POSE"
                v-bind="props"
                :disabled="disablePoses"
              >
              </v-list-item>
            </template>
          </v-tooltip>

          <v-tooltip text="Point Pose Widget">
            <template v-slot:activator="{ props }">
              <v-list-item
                :prepend-icon="widgetIconMap['point-pose']"
                :value="AvailableWidgets.POINT_POSE"
                v-bind="props"
                :disabled="disablePoses"
              >
              </v-list-item>
            </template>
          </v-tooltip>

          <v-tooltip text="Open Hand Pose Widget">
            <template v-slot:activator="{ props }">
              <v-list-item
                :prepend-icon="widgetIconMap['open-hand-pose']"
                :value="AvailableWidgets.OPEN_HAND_POSE"
                v-bind="props"
                :disabled="disablePoses"
              >
              </v-list-item>
            </template>
          </v-tooltip>

          <v-tooltip text="Thumb Pose Widget">
            <template v-slot:activator="{ props }">
              <v-list-item
                :prepend-icon="widgetIconMap['thumb-pose']"
                :value="AvailableWidgets.THUMB_POSE"
                v-bind="props"
                :disabled="disablePoses"
              >
              </v-list-item>
            </template>
          </v-tooltip>

          <v-tooltip text="Stroke Listener Widget">
            <template v-slot:activator="{ props }">
              <v-list-item
                :prepend-icon="widgetIconMap['stroke-listener']"
                :value="AvailableWidgets.STROKE_LISTENER"
                v-bind="props"
                :disabled="disablePoses"
              >
              </v-list-item>
            </template>
          </v-tooltip>

          <v-tooltip text="Camera Settings">
            <template v-slot:activator="{ props }">
              <v-list-item
                prepend-icon="mdi-video-account"
                :value="AvailableWidgets.VIDEO"
                v-bind="props"
              >
              </v-list-item>
            </template>
          </v-tooltip>

          <v-tooltip text="Portals">
            <template v-slot:activator="{ props }">
              <v-list-item
                prepend-icon="mdi-presentation-play"
                :value="AvailableWidgets.PORTALS"
                v-bind="props"
              >
              </v-list-item>
            </template>
          </v-tooltip>

          <v-tooltip text="Widgets">
            <template v-slot:activator="{ props }">
              <v-list-item
                prepend-icon="mdi-layers"
                :value="AvailableWidgets.LAYERS"
                v-bind="props"
              >
              </v-list-item>
            </template>
          </v-tooltip>
        </v-list>
      </v-navigation-drawer>
      <v-navigation-drawer permanent location="left" width="600">
        <div v-if="currentTab === SettingsTab.WIDGET_SETTINGS">
          <WidgetSettings />
        </div>
        <div v-if="currentTab === SettingsTab.CHART_SETTINGS">
          <ChartDataSettings :handleNext="handleSaveChart" :type="chartType" />
        </div>
        <div v-if="currentTab === SettingsTab.VIDEO_SETTINGS">
          <VideoSettings />
        </div>
        <div v-if="currentTab === SettingsTab.PORTALS">
          <PortalSettings />
        </div>
      </v-navigation-drawer>
      <v-navigation-drawer permanent location="bottom" width="200">
        <StoriesPanel />
      </v-navigation-drawer>

      <v-main
        class="w-100 h-screen d-flex flex-column justify-center align-center"
      >
        <PreviewPanel />
      </v-main>
    </v-app>
    <PortalContainer
      id="presenter"
      :open="PortalState.presenterPortalOpen"
      :handle-close="() => PortalState.handlePresenterPortalClose()"
    />
    <PortalContainer
      id="audience"
      :open="PortalState.audiencePortalOpen"
      :handle-close="() => PortalState.handleAudiencePortalClose()"
    />
    <video
      :ref="(el) => CameraSettings.setVideo(el as HTMLVideoElement)"
      autoplay="true"
      :srcObject="CameraSettings.stream"
      @loadeddata="runDetection"
      @loadedmetadata="setVideoDimensions"
    ></video>
  </v-layout>
</template>

<style>
.preview-panel {
  position: absolute;
}
.form-row {
  padding: 30px 30px;
  align-items: flex-start;
  width: 100%;
}

.default-checkbox {
  margin-right: 10px;
}

video {
  display: none;
}
</style>
