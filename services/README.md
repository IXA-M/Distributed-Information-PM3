# Services

This folder contains the Node.js microservices for the PM3 shared repository.

## Deployable Service Folders

```text
services/auth-service/
services/chunk-catalog/
services/chunk-location/
services/chaos-simulator/
services/replication-planner/
services/secrets-broker/
services/storage-gateway/
services/user-profile-service/
```

Each deployable service includes source code, tests, a Dockerfile, and health/readiness endpoints. Most services also expose metrics and OpenAPI/Swagger documentation.

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

## Auth Service

Purpose:

- Registers users.
- Authenticates users and issues JWTs.
- Publishes user registration events to Kafka.

Endpoints:

```text
GET /health
GET /ready
GET /metrics
GET /docs
POST /auth/register
POST /auth/login
POST /auth/refresh
```

## User Profile Service

Purpose:

- Creates profile records from auth events.
- Returns and updates authenticated user profiles.

Endpoints:

```text
GET /health
GET /ready
GET /metrics
GET /docs
GET /profiles/:id
PUT /profiles/:id
```

## Secrets Broker

Purpose:

- Issues short-lived secrets for other services.
- Stores only hashed secrets in the `issued_secrets` collection.

Endpoints:

```text
GET /health
GET /ready
GET /metrics
GET /docs
GET /docs/openapi.json
POST /secrets/issue
```

## Chaos Simulator

Purpose:

- Stores latency and error-rate chaos rules.
- Publishes `chaos.rule.activated` events to Kafka when enabled rules are updated.

Endpoints:

```text
GET /health
GET /ready
GET /metrics
GET /docs
GET /docs/openapi.json
POST /chaos/latency
POST /chaos/error-rate
```

## Commands

Run all tests:

```powershell
npm test
```

Run Walid's services only:

```powershell
npm test --workspace=secrets-broker
npm test --workspace=chaos-simulator
```

Generate coverage:

```powershell
npm run coverage
```
