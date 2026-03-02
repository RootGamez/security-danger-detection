/**
 * @deprecated Use sidebar.template.ts and preview.template.ts directly
 * via ui/refs.ts mountApp(). Kept for backward compatibility.
 */
import { sidebarTemplate } from "./sidebar.template";
import { previewTemplate } from "./preview.template";

export const template = `
  <div class="app-shell">
    ${sidebarTemplate}
    ${previewTemplate}
  </div>
`;
