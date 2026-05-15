# Services

The repository contains two Node.js microservices. Each service follows an MVC-style layout with controllers, routes, models, and services.

## Layout

```text
services/<service-name>/
  Dockerfile
  ecosystem.config.cjs
  openapi.yaml
  package.json
  src/
    app.js
    controllers/
    models/
    routes/
    services/
  test/
  tests/coverage/
```

## Storage Gateway

Path:

```text
services/storage-gateway
```

Purpose:

- Store chunk/object bytes.
- Persist object metadata.
- Publish chunk stored events to Kafka.
- Expose health, readiness, metrics, docs, upload, and retrieval endpoints.

Important endpoints:

```text
GET /health
GET /ready
GET /metrics
GET /docs
PUT /objects/{chunk_id}
GET /objects/{chunk_id}
```

## Replication Planner

Path:

```text
services/replication-planner
```

Purpose:

- Build replication plans from upload, heartbeat, and integrity events.
- Persist replication plan runs.
- Publish replication task events to Kafka.
- Expose health, readiness, metrics, docs, and manual plan endpoints.

Important endpoints:

```text
GET /health
GET /ready
GET /metrics
GET /docs
POST /replication/plan
```

## Service Commands

Run all service tests:

```powershell
npm test
```

Run all service coverage reports:

```powershell
npm run coverage
```

Run services locally:

```powershell
npm run start:storage-gateway
npm run start:replication-planner
```
