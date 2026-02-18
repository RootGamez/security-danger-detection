# Makefile para vision_engine (backend)

.PHONY: venv-create venv-activate venv-activate-win api-run api-install api-install-win

# Crear entorno virtual
venv-create:
	python3 -m venv venv || python -m venv venv

# Instalar dependencias (Linux/Mac)
api-install:
	pip install -r requirements.txt

# Instalar dependencias (Windows)
api-install-win:
	pip install -r requirements.txt

# Levantar la API
api-run:
	uvicorn api:app --host 0.0.0.0 --port 8000 --reload
