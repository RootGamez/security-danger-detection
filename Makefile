# Makefile para el dashboard (frontend)
# Comandos principales orientados a Windows.

.PHONY: install install-linux dev dev-linux

# Objetivos principales (Windows)
install:
	cd security_dashboard && npm install

dev:
	cd security_dashboard && npm run dev

# Objetivos secundarios (Linux/macOS)
install-linux:
	cd security_dashboard && npm install

dev-linux:
	cd security_dashboard && npm run dev
