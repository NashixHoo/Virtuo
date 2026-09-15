// =============================================================
// VIRTUO REHEARSAL MODE: PUBLIC API
// src/features/rehearsal/index.js
// =============================================================

export { RehearsalController, virtuoRehearsal } from "./rehearsal-controller.js";
export { renderRehearsalScreen } from "./rehearsal-view.js";
export { 
  RehearsalsService, 
  CANONICAL_INSTRUMENTS, 
  REHEARSAL_STATUSES, 
  DEFAULT_DEMO_REHEARSAL 
} from "../../services/rehearsals.js";
