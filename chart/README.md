# CSE474 Helm Chart

Install command expected by the rubric:

```bash
helm install cse474 ./chart
```

Examples with overrides:

```bash
helm install cse474 ./chart --set services.chunkCatalog.image.tag=v1
helm upgrade --install cse474 ./chart --set services.chunkLocation.replicaCount=3
helm upgrade --install cse474 ./chart --set services.storageGateway.tag=v1
helm upgrade --install cse474 ./chart --set services.replicationPlanner.replicaCount=3
helm upgrade --install cse474 ./chart --set services.authService.image.tag=v1
helm upgrade --install cse474 ./chart --set services.userProfileService.replicaCount=3
helm upgrade --install cse474 ./chart --set services.secretsBroker.image.tag=v1
helm upgrade --install cse474 ./chart --set services.chaosSimulator.replicaCount=3
```

This single chart deploys the full system:

- `chunk-catalog`
- `chunk-location`
- `storage-gateway`
- `replication-planner`
- `auth-service`
- `user-profile-service`
- `secrets-broker`
- `chaos-simulator`
- MongoDB, Kafka, Prometheus, Grafana, Jaeger, and Loki support services
- PostgreSQL databases for auth-service and user-profile-service

Values currently support overriding:

- image tags
- replica counts
- resource limits and requests
- ingress hosts
- per-service MongoDB settings for chunk-catalog, chunk-location, secrets-broker, and chaos-simulator
- per-service PostgreSQL settings for auth-service and user-profile-service
- shared MongoDB and Kafka settings for storage and replication services
- HPA min/max replicas and CPU/memory targets
