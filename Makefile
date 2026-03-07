include .env
export

VERSION = 1.1 # 1.0

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

# ── Default ─────────────────────────────────────────────
build:
	docker build -f .docker/Dockerfile -t ${DOCKER_REGISTRY}/$(IMAGE):$(VERSION) .
push:
	docker push ${DOCKER_REGISTRY}/$(IMAGE):$(VERSION)
pull:
	docker pull ${DOCKER_REGISTRY}/$(IMAGE):$(VERSION)

# ── AMD ─────────────────────────────────────────────
build-amd:
	DOCKER_BUILDKIT=1 docker buildx build --platform linux/amd64 -t ${DOCKER_REGISTRY}/$(IMAGE):$(VERSION).AMD \
    		-f .docker/Dockerfile .
push-amd:
	docker push ${DOCKER_REGISTRY}/$(IMAGE):$(VERSION).AMD
pull-amd:
	docker pull ${DOCKER_REGISTRY}/$(IMAGE):$(VERSION).AMD
