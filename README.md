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

## 6) Probar deteccion por imagen (opcional)

Con backend arriba, puedes probar `POST /predict` desde Postman o curl:

```bash
curl -X POST "http://localhost:8000/predict" -F "file=@ruta/a/tu/imagen.jpg"
```

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
	- Confirma que backend corre en `http://localhost:8000`.
	- El frontend usa esa base URL en `security_dashboard/src/config/env.ts`.
- Descarga de pesos YOLO en primer arranque:
	- Requiere internet la primera vez si el peso no existe en cache local.

## Estructura principal

```text
security-danger-detection/
├── security_dashboard/   # Frontend Vite + TypeScript
└── vision_engine/        # Backend FastAPI + YOLO
```