include .env
export

IMAGE   ?= youtube-studio
COMPOSE  = docker compose -f .docker/docker-compose.yml

# ── Local dev ──────────────────────────────────────────────
run:
	$(COMPOSE) up -d --build
stop:
	$(COMPOSE) down
del:
	docker rmi $(IMAGE) || true
remove:
	@make stop
	@make del
refresh:
	@make remove
	@make run
restart:
	$(COMPOSE) restart


# ── Docker Hub ─────────────────────────────────────────────
build:
	docker build -f .docker/Dockerfile -t $(IMAGE) .
push:
	docker push $(IMAGE)
pull:
	docker pull $(IMAGE)
