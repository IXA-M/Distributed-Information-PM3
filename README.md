# Distributed Information PM3

PM3 submission for a distributed information system built from Node.js microservices and deployed through one shared repository, one CI/CD workflow, and one combined Helm chart.

## Repository Structure

```text
.github/workflows/        GitHub Actions CI/CD pipelines
chart/                    Single Helm chart for the deployable system
docs/                     API and deployment documentation
k8s/                      Raw Kubernetes manifests
legacy_configs/           Older compose/config assets kept for reference
n8n/workflows/            n8n workflow exports
observability/            Prometheus, Grafana, Loki, Promtail assets
report/                   Report notes and evidence placeholders
scripts/                  Local lint and coverage helpers
services/                 Microservice source code
shared/                   Shared helpers for metrics, docs, tracing, and events
tests/coverage/           Committed coverage summaries
```

## Services

The deployable services currently covered by the chart and CI are:

- `chunk-catalog`: stores chunk metadata for uploaded files.
- `chunk-location`: stores replica locations for chunks.
- `storage-gateway`: accepts chunk/object uploads, stores object bytes, publishes chunk events, and exposes retrieval APIs.
- `replication-planner`: consumes or receives chunk events and creates replication tasks according to the configured policy.
- `auth-service`: handles registration, login, JWT refresh, and user registration events.
- `user-profile-service`: stores and updates user profile records after authentication.
- `secrets-broker`: issues short-lived service secrets and stores only hashes.
- `chaos-simulator`: stores latency/error-rate chaos rules and publishes activation events to Kafka.

Additional service folders may exist for teammate work in progress, but the final evaluated state is the merged `main` branch.

## One Command

For local verification, install once and run the full test/coverage flow:

```powershell
npm install
npm run coverage
```

For Kubernetes, deploy the full chart with:

```powershell
helm upgrade --install cse474 ./chart --namespace cse474-prod --create-namespace
```

## Local Development

Run static analysis:

```powershell
npm run lint
```

Run all tests:

```powershell
npm test
```

Run only Walid's two services:

```powershell
npm test --workspace=secrets-broker
npm test --workspace=chaos-simulator
```

Generate coverage summaries:

```powershell
npm run test:coverage
```

## API Summary

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

### Auth Service

- `GET /health`
- `GET /ready`
- `GET /metrics`
- `GET /docs`
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`

Example register request:

```json
{ "name": "Ali", "email": "ali@example.com", "password": "Strong123" }
```

### User Profile Service

All profile endpoints require `Authorization: Bearer <jwt>`.

- `GET /health`
- `GET /ready`
- `GET /metrics`
- `GET /docs`
- `GET /profiles/:id`
- `PUT /profiles/:id`

### Secrets Broker

- `GET /health`
- `GET /ready`
- `GET /metrics`
- `GET /docs`
- `GET /docs/openapi.json`
- `POST /secrets/issue`

### Chaos Simulator

- `GET /health`
- `GET /ready`
- `GET /metrics`
- `GET /docs`
- `GET /docs/openapi.json`
- `POST /chaos/latency`
- `POST /chaos/error-rate`

## Kafka Topics

| Topic | Producer | Consumers |
|---|---|---|
| `user.registered` | Auth Service | User Profile Service, Roles Service |
| `profile.updated` | User Profile Service | Audit Log, Access Analytics |
| `chaos.rule.activated` | Chaos Simulator | Platform services that react to chaos rules |
| `upload.completed` | Storage Gateway | Replication Planner |
| `replication.task.created` | Replication Planner | Storage worker services |

## Kubernetes And Helm

Check status:

```powershell
kubectl get pods -n cse474-prod
kubectl get services -n cse474-prod
kubectl get ingress -n cse474-prod
```

The chart deploys:

- Core microservices
- PostgreSQL databases for auth and user-profile
- MongoDB for shared services and per-service MongoDB where required
- Kafka
- Prometheus
- Grafana
- Loki
- Jaeger
- Ingress
- HPAs for microservices

Ingress paths under `distributed-information.local`:

```text
/storage
/planner
/auth
/profiles
/secrets
/chaos
/prometheus
/grafana
/jaeger
```

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
auth-service
user-profile-service
secrets-broker
chaos-simulator
```

## CI/CD

Workflow files:

```text
.github/workflows/ci-cd.yml
.github/workflows/auth-profile-ci-cd.yml
```

The pipelines run on pull requests and pushes to `main`. They perform dependency installation, linting, tests with coverage, Docker image builds, image pushes, Helm validation, and deployment where a reachable `KUBE_CONFIG` is provided.

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

Walid service images:

```text
ghcr.io/ixa-m/distributed-information-pm3/secrets-broker
ghcr.io/ixa-m/distributed-information-pm3/chaos-simulator
```
