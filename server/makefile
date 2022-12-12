DOCKER_REGISTRY := hoangtrung070801
DOCKER_NAME := journey
SERVER_PORT := 3080

docker-prod: docker-build docker-run
docker-build:
	docker rm -f $(DOCKER_NAME)
	docker build -t $(DOCKER_REGISTRY)/$(DOCKER_NAME):latest -f ./deploy/dockerfile .
docker-run:
	docker run -d --name $(DOCKER_NAME) -p $(SERVER_PORT):$(SERVER_PORT) $(DOCKER_REGISTRY)/$(DOCKER_NAME):latest
docker-push:
	docker push $(DOCKER_REGISTRY)/$(DOCKER_NAME)