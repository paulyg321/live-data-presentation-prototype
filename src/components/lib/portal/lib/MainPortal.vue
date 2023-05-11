<script setup lang="ts">
import type { Dimensions } from "@/utils";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

const emit = defineEmits(["on-close"]);
const props = withDefaults(
  defineProps<{ open: boolean; dimensions: Dimensions }>(),
  { open: false }
);

const el = ref(null);

const windowRef = ref<any>(null);

watch(
  () => props.open,
  () => {
    if (props.open) {
      openPortal();
    } else {
      closePortal();
    }
  }
);

function copyStyles(sourceDoc: any, targetDoc: any) {
  Array.from(sourceDoc.styleSheets).forEach((styleSheet: any) => {
    if (styleSheet.cssRules) {
      // for <style> elements
      const newStyleEl = sourceDoc.createElement("style");

      Array.from(styleSheet.cssRules).forEach((cssRule: any) => {
        // write the text of each rule into the body of the style element
        newStyleEl.appendChild(sourceDoc.createTextNode(cssRule.cssText));
      });

      targetDoc.head.appendChild(newStyleEl);
    } else if (styleSheet.href) {
      // for <link> elements loading CSS from a URL
      const newLinkEl = sourceDoc.createElement("link");

      newLinkEl.rel = "stylesheet";
      newLinkEl.href = styleSheet.href;
      targetDoc.head.appendChild(newLinkEl);
    }
  });
}

function openPortal() {
  windowRef.value = window.open(
    "",
    "",
    `width=${props.dimensions.width},height=${props.dimensions.height},left=200,top=200`
  );
  windowRef.value.document.body.appendChild(el.value);
  copyStyles(window.document, windowRef.value.document);
  // windowRef.value.addEventListener("resize", () => {
  //   windowRef.value.resizeTo(
  //     windowRef.value.innerWidth,
  //     windowRef.value.innerWidth * (1080 / 1920)
  //   );
  // });
  windowRef.value.addEventListener("beforeunload", closePortal);
}

function closePortal() {
  if (windowRef.value) {
    windowRef.value.close();
    windowRef.value = null;
    emit("on-close");
  }
}

onMounted(() => {
  if (props.open) {
    openPortal();
  }
});

onBeforeUnmount(() => {
  if (windowRef.value) {
    closePortal();
  }
});
</script>
<template>
  <div ref="el">
    <div v-if="open">
      <slot></slot>
    </div>
  </div>
</template>
