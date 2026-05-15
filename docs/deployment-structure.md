# Deployment Structure Decision

This repository will use **one shared root-level Kubernetes layout** plus **one shared Helm chart**.

## Final decision

- All raw Kubernetes manifests live under `k8s/`
- All Helm files live under `chart/`
- Every service gets its own folder under `k8s/<service-name>/`
- Shared resources stay at the top level of `k8s/`
- The shared namespace is `cse474-prod`
- All services use `ClusterIP` internally
- Externally exposed HTTP traffic goes through one shared `Ingress`
- Every service must define:
  - `configmap.yaml`
  - `secret.yaml`
  - `deployment.yaml`
  - `service.yaml`
- If a service needs its own database, that service also gets:
  - `mongodb.yaml` or another clearly named database manifest in its own `k8s/<service-name>/` folder

## Required layout

```text
services/
  chunk-catalog/
  chunk-location/
  <service-3>/
  <service-4>/

k8s/
  namespace.yaml
  ingress.yaml
  README.md
  chunk-catalog/
    configmap.yaml
    secret.yaml
    deployment.yaml
    service.yaml
    mongodb.yaml
  chunk-location/
    configmap.yaml
    secret.yaml
    deployment.yaml
    service.yaml
    mongodb.yaml
  <service-3>/
    configmap.yaml
    secret.yaml
    deployment.yaml
    service.yaml
    mongodb.yaml
  <service-4>/
    configmap.yaml
    secret.yaml
    deployment.yaml
    service.yaml
    mongodb.yaml

chart/
  Chart.yaml
  values.yaml
  templates/
```

## Naming rules

- Deployment name: same as service name
- Service name: same as service name
- ConfigMap name: `<service-name>-config`
- Secret name: `<service-name>-secret`
- Database service name: `<service-name>-db`
- Labels:
  - `app: <service-name>`
  - `app.kubernetes.io/name: <service-name>`

## Runtime rules

- Each service runs with `replicas: 2`
- Each service must expose `GET /health` and `GET /ready`
- Each deployment must define CPU and memory requests/limits
- Environment variables must come from `ConfigMap` or `Secret`
- No hardcoded secrets inside deployment manifests

## Team workflow rule

- A teammate should only edit their own `services/<service-name>/` folder and `k8s/<service-name>/` folder unless the team explicitly coordinates shared changes
- Shared files like `k8s/ingress.yaml`, `k8s/namespace.yaml`, `chart/`, `.github/workflows/`, and `observability/` should be changed carefully because they affect everyone
