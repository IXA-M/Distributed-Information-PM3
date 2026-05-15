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
```

This single chart deploys the full system:

- `chunk-catalog`
- `chunk-location`
- `storage-gateway`
- `replication-planner`
- MongoDB, Kafka, Prometheus, Grafana, Jaeger, and Loki support services

Values currently support overriding:

- image tags
- replica counts
- resource limits and requests
- ingress hosts
- per-service MongoDB settings for the chunk services
- shared MongoDB and Kafka settings for storage and replication services
- HPA min/max replicas and CPU/memory targets
