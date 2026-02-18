export const template = `
  <div class="relative overflow-hidden min-h-screen flex flex-col">
    <div class="absolute -top-24 -left-20 h-64 w-64 rounded-full bg-accent-600/20 blur-3xl"></div>
    <div class="absolute -bottom-20 -right-24 h-72 w-72 rounded-full bg-accent-500/25 blur-3xl"></div>
    <div class="relative flex-1 max-w-7xl mx-auto w-full px-4 py-6">
      <header class="mb-6 flex flex-col gap-2 text-center">
        <span class="badge bg-white/10 text-xs uppercase tracking-[0.2em] self-center">vigilancia</span>
        <h1 class="text-3xl md:text-4xl font-display text-white">Deteccion de fuego, humo y personas</h1>
      </header>

      <div class="glass-card rounded-3xl p-6 shadow-2xl h-full flex flex-col">
        <div class="flex flex-col lg:flex-row gap-4 h-full">
          <!-- Control Panel -->
          <div class="lg:w-80 flex flex-col gap-4">
            <div id="drop-area" class="drop-area text-center">
              <input id="file-input" type="file" accept="image/*,video/mp4,video/avi,video/quicktime,video/webm,video/x-matroska,video/mpeg,.mkv,.avi,.mov" class="hidden" />
              <div class="flex flex-col items-center gap-3">
                <div class="w-14 h-14 rounded-2xl bg-accent-500/15 flex items-center justify-center">
                  <span class="text-2xl">📷</span>
                </div>
                <p class="font-semibold">Arrastra o suelta</p>
                <p class="text-xs text-slate-300">JPG, PNG, BMP, WEBP · MP4, AVI, MOV, MKV, WEBM</p>
                <button id="browse-btn" class="button-primary text-sm">Elegir archivo</button>
              </div>
            </div>
            <div class="flex items-center gap-3 text-sm text-slate-300">
              <span class="loader hidden" id="loader"></span>
              <span id="status">Esperando archivo...</span>
            </div>
            <div class="bg-white/5 border border-white/10 rounded-2xl p-4 flex-1 overflow-y-auto">
              <p class="text-sm text-slate-400 mb-3 font-semibold">Resultados</p>
              <div id="results" class="space-y-2 text-sm"></div>
            </div>
          </div>

          <!-- Preview Panel -->
          <div class="flex-1 min-h-0">
            <div id="preview-container" class="bg-white/5 border border-white/10 rounded-2xl p-4 h-full flex items-center justify-center overflow-hidden relative">
              <div id="box-overlay" class="absolute inset-0 pointer-events-none"></div>
              <span class="text-slate-400 text-sm absolute z-0">Vista previa</span>
              <img id="preview" src="" alt="preview" class="hidden max-w-full max-h-full w-auto h-auto object-contain z-5" />
              <video id="preview-video" class="hidden max-w-full max-h-full w-auto h-auto object-contain z-5" controls></video>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
`;
