export const template = `
  <div class="relative overflow-hidden">
    <div class="absolute -top-24 -left-20 h-64 w-64 rounded-full bg-accent-600/20 blur-3xl"></div>
    <div class="absolute -bottom-20 -right-24 h-72 w-72 rounded-full bg-accent-500/25 blur-3xl"></div>
    <div class="relative max-w-4xl mx-auto px-4 py-12">
      <header class="mb-10 flex flex-col gap-3 text-center">
        <span class="badge bg-white/10 text-xs uppercase tracking-[0.2em] self-center">vigilancia</span>
        <h1 class="text-4xl md:text-5xl font-display text-white">Deteccion de fuego, humo y personas</h1>
        <p class="text-slate-300 max-w-2xl mx-auto">Sube una imagen y el modelo YOLO evaluara si existe fuego, humo o personas. Los resultados aparecen al instante.</p>
      </header>

      <div class="glass-card rounded-3xl p-6 shadow-2xl">
        <div class="flex flex-col lg:flex-row gap-6">
          <div class="flex-1 space-y-4">
            <div id="drop-area" class="drop-area text-center">
              <input id="file-input" type="file" accept="image/*" class="hidden" />
              <div class="flex flex-col items-center gap-3">
                <div class="w-14 h-14 rounded-2xl bg-accent-500/15 flex items-center justify-center">
                  <span class="text-2xl">📷</span>
                </div>
                <p class="text-lg font-semibold">Arrastra o suelta una imagen</p>
                <p class="text-sm text-slate-300">Formatos aceptados: JPG, PNG, BMP, WEBP</p>
                <button id="browse-btn" class="button-primary">Elegir imagen</button>
              </div>
            </div>
            <div class="flex items-center gap-3 text-sm text-slate-300">
              <span class="loader hidden" id="loader"></span>
              <span id="status">Esperando imagen...</span>
            </div>
          </div>

          <div class="w-full lg:w-80 bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
            <div class="aspect-square rounded-xl bg-ink-800 border border-white/5 overflow-hidden flex items-center justify-center relative" id="preview-container">
              <div id="box-overlay" class="absolute inset-0 pointer-events-none"></div>
              <span class="text-slate-400 text-sm">Vista previa</span>
              <img id="preview" src="" alt="preview" class="hidden w-full h-full object-cover" />
            </div>
            <div>
              <p class="text-sm text-slate-400 mb-2">Resultados</p>
              <div id="results" class="space-y-2 text-sm"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
`;
