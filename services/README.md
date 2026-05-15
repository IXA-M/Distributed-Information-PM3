# Services

The repository contains four Node.js microservices.

## Service Folders

```text
services/chunk-catalog/
services/chunk-location/
services/storage-gateway/
services/replication-planner/
```

Each service includes its own source code, tests, Dockerfile, and OpenAPI documentation where applicable.

## Chunk Catalog

Purpose:

- Stores chunk metadata.
- Provides file-to-chunk lookup.

Endpoints:

```text
GET /health
GET /ready
GET /metrics
POST /chunks
GET /chunks?file_id=...
```

## Chunk Location

Purpose:

- Stores chunk replica locations.
- Provides chunk-to-node lookup.

Endpoints:

```text
GET /health
GET /ready
GET /metrics
POST /chunk-locations
GET /chunks/{id}/replicas
```

## Storage Gateway

Purpose:

- Stores object bytes for chunks.
- Persists object metadata.
- Publishes chunk stored events to Kafka.

Endpoints:

```text
GET /health
GET /ready
GET /metrics
GET /docs
PUT /objects/{chunk_id}
GET /objects/{chunk_id}
```

## Replication Planner

Purpose:

- Builds replication plans from upload, heartbeat, and integrity events.
- Persists replication plan runs.
- Publishes replication task events to Kafka.

Endpoints:

```text
GET /health
GET /ready
GET /metrics
GET /docs
POST /replication/plan
```

## Commands

Run all tests:

```powershell
npm test
```

Generate coverage:

```powershell
npm run coverage
```
