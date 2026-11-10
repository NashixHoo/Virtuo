// =============================================================
// VIRTUO V2 — MÓDULO LIVE SYNC
// src/features/live-sync/index.js
// =============================================================

export { liveSyncEngine } from "./live-sync-engine.js";
export { liveSyncController } from "./live-sync-controller.js";
export { 
  renderLiveSyncToolbar,
  renderLiveStageScreen,
  initLiveAutoScroll,
  getLiveSyncStatusInfo,
  startAutoScroll,
  pauseAutoScroll,
  resumeAutoScrollNow
} from "./live-sync-view.js";

