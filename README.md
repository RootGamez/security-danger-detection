# 🛡️ Security Danger Detection

Sistema de vigilancia inteligente basado en visión computacional para la detección de peligros (**Fuego**, **Humo** y **Personas**) en tiempo real utilizando **YOLOv8**.

## 🚀 Requisitos Previos

Asegúrate de tener instalado:

- **Python 3.10 o superior**
- **Git**
- **WSL2** (si usas Windows, recomendado)

## 🛠️ Instalación y Configuración

Sigue estos pasos para dejar el entorno listo:

### 1. Clonar el repositorio

```bash
git clone git@github.com:RootGamez/security-danger-detection.git
cd security-danger-detection
```

### 2. Crear y activar entorno virtual

```bash
python3 -m venv venv
source venv/bin/activate  # En Linux/WSL
# .\venv\Scripts\activate  # En Windows
```

### 3. Instalar dependencias

```bash
pip install -r vision_engine/requirements.txt
```

### 4. Descargar el dataset

Descarga el dataset de Roboflow y descomprímelo en la carpeta `vision_engine/datasets/`:

[Descargar dataset de fuego (YOLOv8, Roboflow)](https://universe.roboflow.com/fire-detection/fire-detection-data-pre/dataset/4/download/yolov8)

### 5. Correr el modelo

coloca el siguiente comando el tu terminal
```bash
python3 vision_engine/app.py
```