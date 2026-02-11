import "./style.css";

type DetectionPayload = {
  class: string;
  confidence: number;
  bbox: [number, number, number, number];
};

const API_URL = "http://localhost:8000/predict";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("App container not found");
}

app.innerHTML = `
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

const fileInput = document.querySelector<HTMLInputElement>("#file-input");
const dropArea = document.querySelector<HTMLDivElement>("#drop-area");
const browseBtn = document.querySelector<HTMLButtonElement>("#browse-btn");
const previewImg = document.querySelector<HTMLImageElement>("#preview");
const previewContainer = document.querySelector<HTMLDivElement>("#preview-container");
const overlayLayer = document.querySelector<HTMLDivElement>("#box-overlay");
const resultsBox = document.querySelector<HTMLDivElement>("#results");
const statusText = document.querySelector<HTMLSpanElement>("#status");
const loader = document.querySelector<HTMLDivElement>("#loader");

let lastDetections: DetectionPayload[] = [];

if (!fileInput || !dropArea || !browseBtn || !previewImg || !previewContainer || !overlayLayer || !resultsBox || !statusText || !loader) {
  throw new Error("UI elements missing");
}

const setStatus = (text: string, loading = false) => {
  statusText.textContent = text;
  loader.classList.toggle("hidden", !loading);
};

const colorForClass = (cls: string) => {
  if (cls === "fire") return "#fb7185";
  if (cls === "smoke") return "#94a3b8";
  return "#34d399";
};

const drawOverlayBoxes = (detections: DetectionPayload[]) => {
  overlayLayer.innerHTML = "";
  if (!previewImg.naturalWidth || !previewImg.naturalHeight || detections.length === 0) {
    return;
  }

  const scaleX = previewImg.clientWidth / previewImg.naturalWidth;
  const scaleY = previewImg.clientHeight / previewImg.naturalHeight;

  detections.forEach((d) => {
    const [x1, y1, x2, y2] = d.bbox;
    const width = Math.max(x2 - x1, 1);
    const height = Math.max(y2 - y1, 1);
    const color = colorForClass(d.class);

    const box = document.createElement("div");
    box.className = "overlay-marker";
    box.style.left = `${x1 * scaleX}px`;
    box.style.top = `${y1 * scaleY}px`;
    box.style.width = `${width * scaleX}px`;
    box.style.height = `${height * scaleY}px`;
    box.style.borderColor = color;
    box.style.boxShadow = `0 0 20px ${color}55`;

    const label = document.createElement("span");
    label.textContent = `${d.class} ${(d.confidence * 100).toFixed(0)}%`;
    label.style.backgroundColor = "rgba(15, 23, 42, 0.85)";
    label.style.color = "#fff";
    label.style.borderColor = color;
    label.style.borderStyle = "solid";
    label.style.borderWidth = "1px";

    box.appendChild(label);
    overlayLayer.appendChild(box);
  });
};

const renderDetections = (detections: DetectionPayload[]) => {
  if (detections.length === 0) {
    resultsBox.innerHTML = '<p class="text-slate-300">Sin detecciones.</p>';
    lastDetections = [];
    overlayLayer.innerHTML = "";
    return;
  }

  resultsBox.innerHTML = detections
    .map(
      (d) => `
        <div class="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-accent-500"></span>
            <span class="capitalize">${d.class}</span>
          </div>
          <span class="text-slate-200 text-xs">Conf: ${(d.confidence * 100).toFixed(1)}%</span>
        </div>
      `
    )
    .join("");

  lastDetections = detections;
  drawOverlayBoxes(detections);
};

const showPreview = (file: File) => {
  const url = URL.createObjectURL(file);
  previewImg.src = url;
  previewImg.classList.remove("hidden");
  previewContainer.querySelector("span")?.classList.add("hidden");
  overlayLayer.innerHTML = "";
};

const uploadAndPredict = async (file: File) => {
  setStatus("Analizando imagen...", true);
  resultsBox.innerHTML = "";

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Error del servidor (${response.status})`);
    }

    const data: { detections: DetectionPayload[] } = await response.json();
    renderDetections(data.detections ?? []);
    setStatus("Analisis completado", false);
  } catch (error) {
    console.error(error);
    resultsBox.innerHTML = '<p class="text-red-300">No se pudo procesar la imagen.</p>';
    setStatus("Fallo al analizar", false);
  }
};

const handleFile = (file: File | undefined) => {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    setStatus("El archivo debe ser una imagen", false);
    return;
  }
  showPreview(file);
  uploadAndPredict(file);
};

browseBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  handleFile(file);
});

dropArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropArea.classList.add("border-accent-500");
});

["dragleave", "dragend", "drop"].forEach((evt) => {
  dropArea.addEventListener(evt, () => dropArea.classList.remove("border-accent-500"));
});

dropArea.addEventListener("drop", (e) => {
  e.preventDefault();
  const file = e.dataTransfer?.files?.[0];
  handleFile(file);
});

previewImg.addEventListener("load", () => {
  if (lastDetections.length) {
    drawOverlayBoxes(lastDetections);
  }
});

setStatus("Esperando imagen...");
