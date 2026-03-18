# Makefile para vision_engine (backend)
# Windows primero; Linux/macOS como fallback.

.PHONY: venv-create venv-create-linux install install-linux run run-linux

# Crear entorno virtual (Windows)
venv-create:
	py -3 -m venv .venv || python -m venv .venv

# Crear entorno virtual (Linux/macOS)
venv-create-linux:
	python3 -m venv .venv

# Objetivo principal de instalacion (Windows)
install:
	python -m pip install --upgrade pip || py -3 -m pip install --upgrade pip
	python -m pip install -r requirements.txt || py -3 -m pip install -r requirements.txt

# Objetivo secundario (Linux/macOS)
install-linux:
	python3 -m pip install --upgrade pip
	python3 -m pip install -r requirements.txt

# Objetivo principal de ejecucion (Windows)
run:
	python -m uvicorn api:app --host 0.0.0.0 --port 8000 --reload || py -3 -m uvicorn api:app --host 0.0.0.0 --port 8000 --reload

# Objetivo secundario (Linux/macOS)
run-linux:
	python3 -m uvicorn api:app --host 0.0.0.0 --port 8000 --reload
