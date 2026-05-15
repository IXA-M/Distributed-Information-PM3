# Distributed Information PM3

Shared repository for the PM3 microservices submission. The final graded version is the merged state of the `main` branch, so all team services and shared infrastructure must live here before the deadline.

## Current status

This base structure is ready for team integration.

Currently implemented services:

- `chunk-catalog`
- `chunk-location`

Other teammates should add their services under `services/` on their own branches, then merge into the shared repository.

## Repository structure

```text
services/
  chunk-catalog/
  chunk-location/
  <teammate-service>/
.github/
  workflows/
k8s/
docs/
observability/
  grafana/
n8n/
  workflows/
report/
docker-compose.yml
ecosystem.config.js
package.json
README.md
```

## Team rules

- Every microservice lives in `services/<service-name>/`.
- Shared infrastructure stays at the repository root.
- Use one branch per person or per service, then merge early and often.
- The final `main` branch must be runnable and complete.
- Do not keep team services in separate repositories.

## Shared folders

- `services/`: all microservices
- `k8s/`: Kubernetes manifests and shared deployment files
- `.github/workflows/`: CI/CD workflows
- `observability/`: Prometheus config and Grafana exports
- `docs/`: shared documentation and aggregated API docs
- `report/`: screenshots or report assets
- `n8n/workflows/`: exported n8n workflows

Deployment structure decision: [docs/deployment-structure.md](/e:/PM2%20Service/docs/deployment-structure.md:1)

## Existing services

### Chunk Catalog

- `POST /chunks`
- `GET /chunks?file_id=...`
- OpenAPI: [openapi.yaml](</e:/PM2 Service/services/chunk-catalog/openapi.yaml>)

### Chunk Location

- `POST /chunk-locations`
- `GET /chunks/{id}/replicas`
- OpenAPI: [openapi.yaml](</e:/PM2 Service/services/chunk-location/openapi.yaml>)

Note: `chunk-location` uses composite uniqueness on `(chunk_id, node_id)` so replicas can be stored correctly without duplicates.

## Local development

Install dependencies:

```bash
npm install
```

Run all workspace tests:

```bash
npm test
```

Run PM2 services currently configured in `ecosystem.config.js`:

```bash
npm run start:pm2
```

## Next team tasks

- Add the remaining service folders under `services/`
- Extend `docker-compose.yml` for the other services
- Add shared CI/CD in `.github/workflows/`
- Complete root `k8s/` manifests or Helm chart
- Fill in `observability/prometheus.yml` and Grafana exports
