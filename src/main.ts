import { createApp } from "vue";
import App from "./App.vue";
import MediaPipe from "./views/MediaPipe.vue";
// import router from "./router";

import "./assets/main.css";

const app = createApp(MediaPipe);

// app.use(router);

app.mount("#app");
