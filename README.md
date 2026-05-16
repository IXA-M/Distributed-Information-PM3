# Distributed Information PM3

PM3 submission for a distributed information system built from four Node.js microservices:

- `chunk-catalog`: stores chunk metadata for uploaded files.
- `chunk-location`: stores replica locations for chunks.
- `storage-gateway`: accepts chunk/object uploads, stores object bytes, publishes chunk events, and exposes object retrieval APIs.
- `replication-planner`: consumes or receives chunk events and creates replication tasks according to the configured policy.

The repository includes service code, Dockerfiles, raw Kubernetes manifests, one combined Helm chart, monitoring, tracing, automated tests, coverage reports, and a GitHub Actions CI/CD workflow.

## Repository Structure

```text
.github/workflows/        GitHub Actions CI/CD pipeline
chart/                    Single Helm chart for the full system
docs/                     API and deployment documentation
k8s/                      Raw Kubernetes manifests
n8n/workflows/            n8n workflow exports
observability/            Prometheus, Grafana, Loki, Promtail assets
report/                   Report notes and evidence placeholders
scripts/                  Local lint and coverage helpers
services/
  chunk-catalog/
  chunk-location/
  replication-planner/
  storage-gateway/
shared/                   Shared helpers used by storage-gateway and replication-planner
tests/coverage/           Committed coverage summaries
```

## Services

### Chunk Catalog

- `GET /health`
- `GET /ready`
- `GET /metrics`
- `POST /chunks`
- `GET /chunks?file_id=...`

### Chunk Location

- `GET /health`
- `GET /ready`
- `GET /metrics`
- `POST /chunk-locations`
- `GET /chunks/{id}/replicas`

### Storage Gateway

- `GET /health`
- `GET /ready`
- `GET /metrics`
- `GET /docs`
- `PUT /objects/{chunk_id}`
- `GET /objects/{chunk_id}`

### Replication Planner

- `GET /health`
- `GET /ready`
- `GET /metrics`
- `GET /docs`
- `POST /replication/plan`

## Local Development

Install dependencies:

```powershell
npm install
```

Run static analysis:

```powershell
npm run lint
```

Run all tests:

```powershell
npm test
```

Generate coverage:

```powershell
npm run coverage
```

## Kubernetes And Helm

Deploy the full system with the combined chart:

```powershell
helm upgrade --install cse474 ./chart --namespace cse474-prod --create-namespace
```

Check status:

```powershell
kubectl get pods -n cse474-prod
kubectl get services -n cse474-prod
kubectl get ingress -n cse474-prod
```

The chart deploys:

- All four microservices
- MongoDB for shared services
- Per-service MongoDB for chunk-catalog and chunk-location
- Kafka
- Prometheus
- Grafana
- Loki
- Jaeger
- Ingress
- HPAs for microservices

## Observability

Metrics:

```text
GET /metrics
```

Useful port-forwards:

```powershell
kubectl port-forward -n cse474-prod svc/prometheus 9090:9090
kubectl port-forward -n cse474-prod svc/grafana 3000:3000
kubectl port-forward -n cse474-prod svc/jaeger 16686:16686
```

Grafana default credentials:

```text
admin / admin
```

Expected Jaeger services:

```text
storage-gateway
replication-planner
```

## CI/CD

Workflow file:

```text
.github/workflows/ci-cd.yml
```

The pipeline runs on pull requests and pushes to `main`. It performs linting, dependency installation, tests with coverage, Docker image builds, image pushes, and Helm deployment.

If `KUBE_CONFIG` points to a local-only cluster such as Minikube or Docker Desktop Kubernetes, GitHub Actions validates the Helm manifests with `helm template` instead of trying to deploy to a cluster it cannot reach.

Required GitHub Actions secrets:

```text
DOCKERHUB_TOKEN
KUBE_CONFIG
```

Optional GitHub Actions secrets:

```text
DOCKERHUB_USERNAME
```

Image registries:

```text
chunk-catalog and chunk-location: GHCR
storage-gateway and replication-planner: DockerHub docker.io/ahmedxdarwish
```


--- Added Auth and User Profile Services ---

# CSE474 – Distributed Systems Project
## Services: Auth Service & User Profile Service
**Developer:** Mohamed Ashraf — 22101005

---

## Architecture Overview

Both services follow the **Hybrid REST + Kafka** communication pattern defined in the project spec:

```
Client ──REST──► Auth Service ──Kafka──► user.registered ──► User Profile Service
                                                          └──► Roles Service (other team)

Client ──REST──► User Profile Service ──Kafka──► profile.updated ──► Audit Log (other team)
                                                                  └──► Access Analytics (other team)
```

Each service:
- Owns its own PostgreSQL database (no shared DB)
- Communicates synchronously via REST
- Publishes events asynchronously via Kafka
- Exposes `/health` and `/ready` probes
- Is fully containerized with Docker
- Runs with **replicas: 2** via docker-compose

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- [Node.js 20+](https://nodejs.org/) (for local dev / tests)
- [PM2](https://pm2.keymetrics.io/) — `npm install -g pm2` (for local cluster mode)

---

## Running with Docker (Recommended)

```bash
# 1. Clone / navigate to project root
cd distributed-project

# 2. Copy env file (optional – defaults are set in docker-compose.yml)
cp auth-service/.env.example auth-service/.env
cp user-profile-service/.env.example user-profile-service/.env

# 3. Build and start all services
docker compose up --build -d

# 4. Check all containers are healthy
docker compose ps

# 5. View logs
docker compose logs -f auth-service
docker compose logs -f user-profile-service
```

Services will be available at:
| Service | URL |
|---|---|
| Auth Service | http://localhost:3001 |
| User Profile Service | http://localhost:3002 |

---

## Running Locally with PM2

```bash
# Install dependencies for both services
cd auth-service && npm install && cd ..
cd user-profile-service && npm install && cd ..

# Make sure PostgreSQL and Kafka are running locally, then:
npm install -g pm2
pm2 start ecosystem.config.js

# Monitor
pm2 status
pm2 logs

# Stop
pm2 stop ecosystem.config.js
```

---

## Running Tests

```bash
# Auth Service
cd auth-service
npm install
npm test

# User Profile Service
cd ../user-profile-service
npm install
npm test
```

Tests use **Jest + Supertest** with fully mocked DB and Kafka — no external connections needed.

---

## API Reference

### Auth Service — `http://localhost:3001`

#### `POST /auth/register`
Register a new user.
```json
// Request
{ "name": "Ali", "email": "ali@example.com", "password": "Strong123" }

// Response 201
{
  "success": true,
  "data": { "user_id": 1, "token": "<jwt>", "refresh_token": "<token>" },
  "meta": { "service": "auth-service", "request_id": "<uuid>" }
}
```

#### `POST /auth/login`
Login with email and password.
```json
// Request
{ "email": "ali@example.com", "password": "Strong123" }

// Response 200
{
  "success": true,
  "data": { "user_id": 1, "token": "<jwt>", "refresh_token": "<token>" },
  "meta": { "service": "auth-service", "request_id": "<uuid>" }
}
```

#### `POST /auth/refresh`
Rotate refresh token and get a new access token.
```json
// Request
{ "refresh_token": "<token>" }

// Response 200
{
  "success": true,
  "data": { "token": "<new_jwt>", "refresh_token": "<new_token>" },
  "meta": { "service": "auth-service", "request_id": "<uuid>" }
}
```

#### `GET /health` · `GET /ready`
Standard health probes. Used by Docker and Kubernetes.

---

### User Profile Service — `http://localhost:3002`

All endpoints require `Authorization: Bearer <jwt>` header.

#### `GET /profiles/:id`
Get a user's profile. Users can only fetch their own profile.
```json
// Response 200
{
  "success": true,
  "data": { "user_id": 1, "phone": "+201001234567", "city": "Cairo", "bio": "Hello" },
  "meta": { "service": "user-profile-service", "request_id": "<uuid>" }
}
```

#### `PUT /profiles/:id`
Update a user's profile. Users can only update their own profile.
```json
// Request (all fields optional)
{ "phone": "+201001234567", "city": "Cairo", "bio": "Updated bio" }

// Response 200
{
  "success": true,
  "data": { "user_id": 1, "phone": "+201001234567", "city": "Cairo", "bio": "Updated bio" },
  "meta": { "service": "user-profile-service", "request_id": "<uuid>" }
}
```

#### `GET /health` · `GET /ready`
Standard health probes.

---

## Kafka Topics

| Topic | Producer | Consumers |
|---|---|---|
| `user.registered` | Auth Service | User Profile Service, Roles Service |
| `profile.updated` | User Profile Service | Audit Log, Access Analytics |

---

## Database Schemas

### Auth DB (`auth_db`)
```sql
users(id PK, name, email UNIQUE, password_hash, created_at)
refresh_tokens(id PK, user_id FK, token_hash UNIQUE, expires_at)
```

### Profile DB (`profile_db`)
```sql
profiles(user_id PK, phone, city, bio, updated_at)
```

---

## Project Structure

```
distributed-project/
├── docker-compose.yml
├── ecosystem.config.js          # PM2 config
├── README.md
├── auth-service/
│   ├── Dockerfile
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── index.js
│       ├── config/
│       │   ├── database.js
│       │   ├── logger.js
│       │   └── init.sql
│       ├── routes/auth.js
│       ├── models/
│       │   ├── User.js
│       │   └── RefreshToken.js
│       ├── middleware/validate.js
│       └── kafka/producer.js
│   └── tests/auth.test.js
└── user-profile-service/
    ├── Dockerfile
    ├── package.json
    ├── .env.example
    └── src/
        ├── index.js
        ├── config/
        │   ├── database.js
        │   ├── logger.js
        │   └── init.sql
        ├── routes/profiles.js
        ├── models/Profile.js
        ├── middleware/authenticate.js
        └── kafka/index.js
    └── tests/profiles.test.js
```
