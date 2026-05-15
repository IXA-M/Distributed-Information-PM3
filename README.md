# Distributed Information PM3

PM3 submission for a distributed information system built from two Node.js microservices:

- `storage-gateway`: accepts chunk/object uploads, stores object bytes, publishes chunk events, and exposes object retrieval APIs.
- `replication-planner`: consumes or receives chunk events and creates replication tasks according to the configured policy.

The repository includes MVC-style service structure, Dockerfiles, Kubernetes manifests, a Helm chart, monitoring, tracing, automated tests, coverage reports, and a GitHub Actions CI/CD workflow.

## Repository Structure

```text
.github/workflows/        GitHub Actions CI/CD pipeline
docs/                     API documentation notes
helm/                     Single Helm chart for the full system
k8s/                      Raw Kubernetes manifests
n8n/workflows/            n8n workflow export
observability/            Prometheus and Grafana assets
report/                   Report notes and evidence placeholders
scripts/                  Local test/lint/coverage helpers
services/
  replication-planner/    Replication Planner microservice
  storage-gateway/        Storage Gateway microservice
shared/                   Shared config, HTTP, Kafka, Mongo, logging, metrics, tracing
tests/coverage/           Committed coverage summaries
```

## Services

### Storage Gateway

Main endpoints:

- `GET /health`
- `GET /ready`
- `GET /metrics`
- `GET /docs`
- `PUT /objects/{chunk_id}`
- `GET /objects/{chunk_id}`

OpenAPI source:

```text
services/storage-gateway/openapi.yaml
```

### Replication Planner

Main endpoints:

- `GET /health`
- `GET /ready`
- `GET /metrics`
- `GET /docs`
- `POST /replication/plan`

OpenAPI source:

```text
services/replication-planner/openapi.yaml
```

## Local Development

Install dependencies:

```powershell
npm install
```

Run all tests:

```powershell
npm test
```

Run lint:

```powershell
npm run lint
```

Generate coverage:

```powershell
npm run coverage
```

Run a service directly:

```powershell
npm run start:storage-gateway
npm run start:replication-planner
```

## Testing

The project uses:

- Jest for unit and integration tests
- Supertest for HTTP integration tests
- Jest coverage reports

Current test coverage summaries are committed under:

```text
tests/coverage/
services/storage-gateway/tests/coverage/
services/replication-planner/tests/coverage/
```

## Kubernetes And Helm

Deploy the full system:

```powershell
helm upgrade --install cse474 ./helm --namespace cse474-prod --create-namespace
```

Check pods:

```powershell
kubectl get pods -n cse474-prod
```

The Helm chart deploys:

- `storage-gateway` with 2 replicas
- `replication-planner` with 2 replicas
- MongoDB
- Kafka
- Prometheus
- Grafana
- Loki
- Jaeger
- Ingress

The raw Kubernetes manifests are also available under `k8s/`.

## Observability

Both services expose Prometheus metrics at:

```text
/metrics
```

Both services emit OpenTelemetry traces to Jaeger through:

```text
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318
```

Useful local port-forwards:

```powershell
kubectl port-forward -n cse474-prod svc/prometheus 9090:9090
kubectl port-forward -n cse474-prod svc/grafana 3000:3000
kubectl port-forward -n cse474-prod svc/jaeger 16686:16686
```

Grafana default credentials:

```text
admin / admin
```

## CI/CD

Workflow file:

```text
.github/workflows/ci-cd.yml
```

The pipeline runs on pull requests and pushes to `main`. It performs linting, dependency installation, tests, coverage, Docker image build, DockerHub push, and Helm deployment.

Required GitHub Actions secrets:

```text
DOCKERHUB_USERNAME
DOCKERHUB_TOKEN
KUBE_CONFIG
```

DockerHub image namespace:

```text
docker.io/ahmedxdarwish
```
