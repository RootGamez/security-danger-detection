/**
 * Sidebar layout fragment.
 */
export const sidebarTemplate = `
  <aside class="sidebar">
    <!-- Brand -->
    <div class="sidebar-brand">
      <div class="brand-icon">🛡️</div>
      <div>
        <p class="brand-title">SecureVision</p>
        <p class="brand-sub">Detección en tiempo real</p>
      </div>
    </div>

    <!-- Drop area -->
    <div id="drop-area" class="drop-area">
      <input
        id="file-input"
        type="file"
        accept="image/*,video/mp4,video/avi,video/quicktime,video/webm,video/x-matroska,video/mpeg,.mkv,.avi,.mov"
        class="hidden"
      />
      <div class="drop-icon">📂</div>
      <p class="drop-label">Arrastra imagen o video</p>
      <p class="drop-hint">JPG · PNG · MP4 · AVI · MOV · WEBM</p>
    </div>

    <!-- Primary action buttons -->
    <div class="action-group">
      <button id="browse-btn" class="btn btn-primary">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        Elegir archivo
      </button>
      <button id="webcam-btn" class="btn btn-accent">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3"/>
          <path d="M20.188 10.934c.2.55.312 1.143.312 1.734 0 3.314-2.686 6-6 6H9.5a6 6 0 1 1 0-12h5a6 6 0 0 1 6 6z"/>
        </svg>
        Usar camara
      </button>
    </div>

    <!-- Multicamera control -->
    <div class="multi-section">
      <div class="multi-header">
        <p class="multi-title">Panel multicamara</p>
        <button id="multi-cam-stop" class="btn btn-multi-stop" title="Detener todas">Detener todo</button>
      </div>
      <button id="multi-cam-open" class="btn btn-multi">Agregar nueva camara</button>
      <div id="multi-cam-list" class="multi-cam-list"></div>
    </div>

    <!-- Status bar -->
    <div class="status-bar">
      <span class="loader hidden" id="loader"></span>
      <span id="status" class="status-text">Esperando...</span>
    </div>

    <!-- Detection results -->
    <div class="results-panel">
      <div class="results-panel-header">
        <p class="results-title">Detecciones</p>
        <button id="history-btn" class="btn-history-open" title="Ver historial de sesiones">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M12 8v4l3 3"/>
            <path d="M3.05 11a9 9 0 1 1 .5 4"/>
            <path d="M3 16H1v-4"/>
          </svg>
          Historial
        </button>
      </div>
      <div id="results" class="results-list"></div>
    </div>

    <!-- Multicamera modal -->
    <div id="multi-cam-modal" class="multi-modal hidden" aria-hidden="true">
      <div class="multi-modal-backdrop" data-close="true"></div>
      <div class="multi-modal-card" role="dialog" aria-label="Agregar nueva camara">
        <div class="multi-modal-header">
          <div>
            <p class="multi-modal-title">Agregar nueva camara</p>
            <p class="multi-modal-sub">YouTube, URL de camara o archivo local</p>
          </div>
          <button id="multi-cam-close" class="multi-modal-close" aria-label="Cerrar">✕</button>
        </div>
        <div class="multi-modal-body">
          <div class="multi-option">
            <p class="multi-option-title">YouTube</p>
            <div class="multi-option-row">
              <input id="multi-yt-input" type="text" placeholder="https://youtube.com/watch?v=..." class="multi-input" />
              <button id="multi-yt-add" class="btn btn-yt">Agregar</button>
            </div>
          </div>

          <div class="multi-option">
            <p class="multi-option-title">Camara por URL</p>
            <div class="multi-option-row">
              <input id="multi-url-input" type="text" placeholder="http://192.168.1.50:4747/video" class="multi-input" />
              <button id="multi-url-add" class="btn btn-cam">Agregar</button>
            </div>
          </div>

          <div class="multi-option">
            <p class="multi-option-title">Archivo local</p>
            <input
              id="multi-file-input"
              type="file"
              accept="image/*,video/mp4,video/avi,video/quicktime,video/webm,video/x-matroska,video/mpeg,.mkv,.avi,.mov"
              class="hidden"
            />
            <div class="multi-file-row">
              <button id="multi-file-browse" class="btn btn-primary">Elegir archivo</button>
              <span id="multi-file-name" class="multi-file-name">Sin archivo</span>
              <button id="multi-file-add" class="btn btn-multi">Agregar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </aside>
`;
