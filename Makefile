# Makefile del dashboard (frontend)
# Objetivos principales orientados a Windows; variantes -linux como fallback.

.PHONY: install setup dev build typecheck install-linux setup-linux dev-linux

# ── Windows ────────────────────────────────────────────────────────────────

install:
	cd security_dashboard && npm install

# Instala dependencias y crea el .env a partir del ejemplo si no existe.
setup: install
	cd security_dashboard && (if not exist .env copy .env.example .env)

dev:
	cd security_dashboard && npm run dev

build:
	cd security_dashboard && npm run build

typecheck:
	cd security_dashboard && npm run typecheck

# ── Linux/macOS ────────────────────────────────────────────────────────────

install-linux:
	cd security_dashboard && npm install

setup-linux: install-linux
	cd security_dashboard && [ -f .env ] || cp .env.example .env

dev-linux:
	cd security_dashboard && npm run dev
