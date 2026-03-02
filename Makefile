# Makefile para el dashboard (frontend)

.PHONY: install dev

install:
	cd security_dashboard && npm install

dev:
	cd security_dashboard && npm run dev
