# Makefile para el dashboard (frontend)

.PHONY: dashboard-install dashboard-dev

dashboard-install:
	cd security_dashboard && npm install

dashboard-dev:
	cd security_dashboard && npm run dev
