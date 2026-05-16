# Documentation

Each microservice serves its API documentation directly from the running service.

## Runtime API Docs

Chunk Catalog:

```text
GET /docs
GET /api-docs
```

Chunk Location:

```text
GET /docs
GET /api-docs
```

Storage Gateway:

```text
GET /docs
GET /api-docs
GET /openapi.yaml
```

Replication Planner:

```text
GET /docs
GET /api-docs
GET /openapi.yaml
```

## Source OpenAPI Files

```text
services/chunk-catalog/openapi.yaml
services/chunk-location/openapi.yaml
services/storage-gateway/openapi.yaml
services/replication-planner/openapi.yaml
```

## Local Kubernetes Access

After deploying with Helm, port-forward a service to view its docs:

```powershell
kubectl port-forward -n cse474-prod svc/chunk-catalog 3001:3001
kubectl port-forward -n cse474-prod svc/chunk-location 3002:3002
kubectl port-forward -n cse474-prod svc/storage-gateway 3019:80
kubectl port-forward -n cse474-prod svc/replication-planner 3020:80
```

Then open:

```text
http://localhost:3001/docs
http://localhost:3002/docs
http://localhost:3019/docs
http://localhost:3020/docs
```
