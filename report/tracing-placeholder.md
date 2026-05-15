# Distributed Tracing Evidence

OpenTelemetry/Jaeger screenshots should be added here after running the services in the target Kubernetes cluster.

Expected trace shape:

1. `storage-gateway PUT /objects/{chunk_id}`
2. `chunk.stored` Kafka publish
3. `replication-planner` Kafka consume
4. `replication.task.created` Kafka publish

The service code currently emits request IDs in responses/logs and is structured so OpenTelemetry middleware can be added at process startup.
