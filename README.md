# Security Danger Detection

Sistema de vigilancia inteligente con vision por computadora para deteccion de riesgos en tiempo real.

El repositorio tiene dos partes:

- `vision_engine`: API de deteccion (FastAPI + YOLO).
- `security_dashboard`: interfaz web (Vite + TypeScript).

## Requisitos

Instala estas herramientas antes de empezar:

- `Git`
- `Python 3.10+`
- `Node.js 18+` (recomendado `20 LTS`)
- `npm` (incluido con Node.js)

Opcional:

- `make` para usar atajos (`Makefile`)
- `WSL2` en Windows si prefieres entorno Linux

### Instalar `make` (opcional)

Windows (PowerShell con Scoop):

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
irm get.scoop.sh | iex
scoop install make
```

Windows (Chocolatey):

```powershell
choco install make
```

Linux (Debian/Ubuntu):

```bash
sudo apt update
sudo apt install make
```

macOS (Xcode Command Line Tools):

```bash
xcode-select --install
```

Verificar instalacion:

```bash
make --version
```

> En Windows, si `make` no se reconoce despues de instalar, cierra y abre una nueva terminal.

## 1) Clonar el repositorio

Con HTTPS:

```bash
git clone https://github.com/RootGamez/security-danger-detection.git
cd security-danger-detection
```

O con SSH:

```bash
git clone git@github.com:RootGamez/security-danger-detection.git
cd security-danger-detection
```

## 2) Configurar backend (`vision_engine`)

### 2.1 Crear entorno virtual

Linux/macOS/WSL:

```bash
cd vision_engine
python3 -m venv .venv
source .venv/bin/activate
```

Windows (PowerShell):

```powershell
cd vision_engine
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Si PowerShell bloquea la activacion del entorno virtual, ejecuta primero:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Windows (CMD):

```bat
cd vision_engine
python -m venv .venv
.venv\Scripts\activate.bat
```

### 2.2 Instalar dependencias

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 2.3 Configurar variables de entorno

Crear archivo `.env` a partir del ejemplo:

Linux/macOS/WSL:

```bash
cp .env.example .env
```

Windows (PowerShell):

```powershell
Copy-Item .env.example .env
```

Variables disponibles en `.env`:

- `CAMERA_SOURCE`: URL de camara IP (por ejemplo DroidCam). Si queda vacio, usa webcam local.
- `CAMERA_DEVICE_INDEX`: indice de camara local (default `0`).
- `CAMERA_MAX_FPS`: limite de FPS deseado.

## 3) Configurar frontend (`security_dashboard`)

En otra terminal:

```bash
cd security_dashboard
npm install
```

### 3.1 Configurar la URL del backend

La URL del backend vive en `.env`, no en el codigo:

Linux/macOS/WSL:

```bash
cp .env.example .env
```

Windows (PowerShell):

```powershell
Copy-Item .env.example .env
```

Variables disponibles:

| Variable | Descripcion | Default |
|---|---|---|
| `VITE_API_BASE_URL` | URL base del backend, sin barra final | `http://localhost:8000` |
| `VITE_APP_NAME` | Nombre mostrado en la cabecera | `SecureVision` |
| `VITE_HEALTH_TIMEOUT_MS` | Timeout del sondeo `GET /health` | `6000` |
| `VITE_DEFAULT_CONFIDENCE` | Umbral de confianza inicial (0.05 - 0.95) | `0.35` |

### 3.2 Cambiar de tunel sin reiniciar (Colab / localtunnel / ngrok)

Como la URL del tunel cambia en cada sesion de Colab, hay tres formas de
apuntar el dashboard al backend, de mayor a menor prioridad:

1. **Desde la interfaz** (recomendado): pulsa la pastilla del backend en la
   barra superior, pega la URL y "Guardar y probar". Se comprueba al momento
   contra `GET /health`, se guarda en el navegador y **no hace falta reiniciar
   Vite**. El boton "Usar valor de .env" descarta el cambio.
2. **Por query string**, util para compartir un enlace ya configurado:
   `http://localhost:5173/?api=https://tu-tunel.loca.lt`
3. **Editando `.env`** y reiniciando `npm run dev`.

El indicador de la barra superior muestra en todo momento a que host apunta,
si responde, la latencia y el dispositivo de inferencia (`cuda` / `cpu`).

## 4) Ejecutar el proyecto completo

Necesitas 2 terminales activas: una para backend y otra para frontend.

### Terminal A: backend

```bash
cd vision_engine
# activa tu entorno virtual antes de correr
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

### Terminal B: frontend

```bash
cd security_dashboard
npm run dev
```

Abrir en navegador:

- Dashboard: `http://localhost:5173`
- API: `http://localhost:8000`
- Healthcheck API: `http://localhost:8000/health`

## 5) Flujo rapido con Makefile (opcional)

Desde la raiz del repo:

```bash
make install   # instala dependencias del frontend
make dev       # levanta frontend (Vite)
```

Desde `vision_engine/`:

```bash
make venv-create
make install
make run
```

## 5.1) Fuentes y formatos admitidos

El dashboard acepta cuatro tipos de fuente, cada una en su pestaña del panel
izquierdo, y cualquier numero de ellas en paralelo desde "Multicamara":

| Fuente | Entrada |
|---|---|
| Archivo | Imagen o video local (arrastrar o examinar) |
| Camara | Camara del servidor por indice (`0`, `1`) o URL de camara IP |
| YouTube | `watch`, `youtu.be`, `shorts`, `live` y `embed` |
| URL | Stream HTTP(S), MJPEG o RTSP accesible desde el backend |

Formatos de archivo admitidos:

- **Video**: mp4, m4v, mov, avi, mkv, webm, mpeg, mpg, m2v, wmv, flv, f4v,
  3gp, 3g2, ogv, ogm, ts, mts, m2ts, mxf, asf, divx, vob, dav.
- **Imagen**: jpg, jpeg, png, webp, bmp, gif, tif, tiff, avif, heic, heif,
  dng, mpo, jfif, pgm, ppm, pbm, dib.

La deteccion del tipo usa el MIME y, si viene vacio o generico (habitual en
`.mkv` y `.avi`), cae a la extension. La decodificacion final la hace OpenCV
o FFMPEG en el backend; si un contenedor concreto no se puede abrir, la UI
muestra el motivo en lugar de fallar en silencio.

### Umbral de confianza

El deslizador "Confianza" de la barra superior viaja como `?conf=` en cada
peticion, asi que puedes comparar el mismo clip con distintos umbrales sin
reiniciar nada. El valor se guarda en el navegador.

## 6) Probar deteccion por imagen (opcional)

Con backend arriba, puedes probar `POST /predict` desde Postman o curl:

```bash
curl -X POST "http://localhost:8000/predict?conf=0.35" -F "file=@ruta/a/tu/imagen.jpg"
```

El parametro `conf` (0.05 - 0.95) es opcional y lo aceptan tambien
`/predict/video`, `/predict/youtube` y `/predict/webcam`.

## 7) Entrenamiento / dataset (opcional)

Si quieres entrenar o evaluar localmente, coloca tu dataset en `vision_engine/datasets/`.

Luego puedes ejecutar:

```bash
cd vision_engine
python app.py
```

> Nota: el flujo principal de la aplicacion web usa `api.py` (FastAPI + dashboard), no `app.py`.

## Problemas comunes

- `Error al abrir camara`:
	- Verifica permisos de camara en el sistema.
	- Si usas camara IP, revisa que la URL en `CAMERA_SOURCE` sea accesible.
- `CORS` o frontend sin respuesta:
	- Mira la pastilla del backend en la barra superior: si esta en rojo, la URL
	  configurada no responde.
	- Confirma la URL en `security_dashboard/.env` (`VITE_API_BASE_URL`) o
	  cambiala en caliente desde esa misma pastilla.
- Tunel de localtunnel que devuelve una pagina intersticial:
	- El dashboard ya envia la cabecera `bypass-tunnel-reminder` en todas sus
	  peticiones, asi que no deberia aparecer.
- Descarga de pesos YOLO en primer arranque:
	- Requiere internet la primera vez si el peso no existe en cache local.

## Estructura principal

```text
security-danger-detection/
├── security_dashboard/          # Frontend Vite + TypeScript (sin framework)
│   ├── .env.example             # Plantilla de configuracion
│   └── src/
│       ├── config/              # env, endpoints y formatos admitidos
│       ├── core/                # Stores (URL del backend, ajustes)
│       ├── services/            # Cliente HTTP, salud e historial
│       ├── features/            # Una fuente por archivo + ejecutor comun
│       ├── state/               # Estado de la aplicacion
│       ├── styles/              # Tokens de diseno y hojas por capa
│       ├── types/               # Tipos del dominio
│       └── ui/                  # Plantillas, componentes y utilidades
└── vision_engine/               # Backend FastAPI + YOLO
```

### Scripts del frontend

```bash
npm run dev        # servidor de desarrollo
npm run build      # typecheck + build de produccion
npm run typecheck  # solo comprobacion de tipos
```