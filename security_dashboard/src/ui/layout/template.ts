export const template = `
  <div class="app-shell">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="brand-icon">🛡️</div>
        <div>
          <p class="brand-title">SecureVision</p>
          <p class="brand-sub">Detección en tiempo real</p>
        </div>
      </div>

      <!-- Upload drop area -->
      <div id="drop-area" class="drop-area">
        <input id="file-input" type="file" accept="image/*,video/mp4,video/avi,video/quicktime,video/webm,video/x-matroska,video/mpeg,.mkv,.avi,.mov" class="hidden" />
        <div class="drop-icon">📂</div>
        <p class="drop-label">Arrastra imagen o video</p>
        <p class="drop-hint">JPG · PNG · MP4 · AVI · MOV · WEBM</p>
      </div>

      <!-- Action buttons -->
      <div class="action-group">
        <button id="browse-btn" class="btn btn-primary">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Elegir archivo
        </button>
        <button id="webcam-btn" class="btn btn-accent">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M20.188 10.934c.2.55.312 1.143.312 1.734 0 3.314-2.686 6-6 6H9.5a6 6 0 1 1 0-12h5a6 6 0 0 1 6 6z"/></svg>
          Usar camara
        </button>
      </div>

      <!-- YouTube accordion -->
      <div class="yt-section">
        <button id="yt-toggle" class="yt-toggle" aria-expanded="false">
          <svg width="16" height="16" fill="#ff0000" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-2.13 4.83 4.83 0 0 1-3.82 2.13 4.83 4.83 0 0 1-3.82-2.13 4.83 4.83 0 0 1-3.77 2.13C3.5 6.69 2 8.44 2 12s1.5 5.31 2.41 5.31a4.83 4.83 0 0 1 3.77-2.13 4.83 4.83 0 0 1 3.82 2.13 4.83 4.83 0 0 1 3.82-2.13 4.83 4.83 0 0 1 3.77 2.13C21.5 17.31 22 15.56 22 12s-.5-5.31-1.41-5.31z"/></svg>
          Analizar YouTube
          <svg id="yt-chevron" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-left:auto;transition:transform .2s"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div id="yt-panel" class="yt-panel" style="max-height:0;overflow:hidden;transition:max-height .25s ease">
          <div class="yt-input-row">
            <input id="yt-input" type="text" placeholder="https://youtube.com/watch?v=..." class="yt-input" />
            <button id="yt-btn" class="btn btn-yt">Analizar</button>
          </div>
        </div>
      </div>

      <!-- Status -->
      <div class="status-bar">
        <span class="loader hidden" id="loader"></span>
        <span id="status" class="status-text">Esperando...</span>
      </div>

      <!-- Results -->
      <div class="results-panel">
        <p class="results-title">Detecciones</p>
        <div id="results" class="results-list"></div>
      </div>
    </aside>

    <!-- Main preview -->
    <main class="preview-main">
      <div id="preview-container" class="preview-container">
        <div id="box-overlay" class="box-overlay"></div>
        <span id="preview-placeholder" class="preview-placeholder">Vista previa</span>
        <img id="preview" src="" alt="preview" class="preview-media hidden" />
        <video id="preview-video" class="preview-media hidden" controls></video>
        <canvas id="webcam-canvas" class="preview-media hidden"></canvas>
      </div>
    </main>
  </div>
`;
