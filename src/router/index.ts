import { AppPage } from "@/components";
import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      component: AppPage,
      // children: [
      //   {
      //     path: "present/:id",
      //     component: PresenterMain,
      //   },
      //   {
      //     path: "add-chart",
      //     component: NewChartVue,
      //   },
      //   // TODO: Add route for settings
      // ],
    },
  ],
});

export default router;
