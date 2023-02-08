import App from "@/views/App.vue";
import PresenterMain from "@/components/lib/app-settings/nested-views/PresenterMain.vue";
import { createRouter, createWebHistory } from "vue-router";
import NewChartVue from "@/components/lib/app-settings/nested-views/NewChart.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      component: App,
      children: [
        {
          path: "present/:id",
          component: PresenterMain,
        },
        {
          path: "add-chart",
          component: NewChartVue,
        },
        // TODO: Add route for settings
      ],
    },
  ],
});

export default router;
