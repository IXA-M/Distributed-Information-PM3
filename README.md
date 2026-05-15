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
