import { reactive } from "vue";

export const PortalState = reactive<{
  presenterPortalOpen: boolean;
  audiencePortalOpen: boolean;
  changePresenterPortalOpen: () => void;
  changeAudiencePortalOpen: () => void;
  handlePresenterPortalClose: () => void;
  handleAudiencePortalClose: () => void;
}>({
  presenterPortalOpen: false,
  audiencePortalOpen: false,
  changePresenterPortalOpen() {
    this.presenterPortalOpen = !this.presenterPortalOpen;
  },
  changeAudiencePortalOpen() {
    this.audiencePortalOpen = !this.audiencePortalOpen;
  },
  handlePresenterPortalClose() {
    this.presenterPortalOpen = false;
  },
  handleAudiencePortalClose() {
    this.audiencePortalOpen = false;
  },
});
