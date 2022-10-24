import "vuetify/styles";
import { createApp } from "vue";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";

// import MediaPipe from "./views/MediaPipe.vue";

import "./assets/main.css";
import AppVue from "./views/App.vue";

const app = createApp(AppVue);
const vuetify = createVuetify({
  components,
  directives,
});

app.use(vuetify).mount("#app");
