# Documentation

Each microservice serves its API documentation directly from the running service.

## Runtime API Docs

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
services/storage-gateway/openapi.yaml
services/replication-planner/openapi.yaml
```

## Local Kubernetes Access

After deploying with Helm, port-forward a service to view its docs:

```powershell
kubectl port-forward -n cse474-prod svc/storage-gateway 3019:80
kubectl port-forward -n cse474-prod svc/replication-planner 3020:80
```

Then open:

```text
http://localhost:3019/docs
http://localhost:3020/docs
```
