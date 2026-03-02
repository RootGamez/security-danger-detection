/**
 * Preview panel layout fragment.
 */
export const previewTemplate = `
  <main class="preview-main">
    <div id="preview-container" class="preview-container">
      <!-- Bounding box overlay (above all media) -->
      <div id="box-overlay" class="box-overlay"></div>

      <!-- Empty state placeholder -->
      <span id="preview-placeholder" class="preview-placeholder">Vista previa</span>

      <!-- Media elements (only one visible at a time) -->
      <img id="preview" src="" alt="preview" class="preview-media hidden" />
      <video id="preview-video" class="preview-media hidden" controls></video>
      <canvas id="webcam-canvas" class="preview-media hidden"></canvas>
    </div>
  </main>
`;
