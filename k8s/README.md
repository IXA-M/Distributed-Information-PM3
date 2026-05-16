# Kubernetes

This folder contains raw Kubernetes manifests for the complete PM3 system. The preferred deployment path is the combined Helm chart in `chart/`, but the raw manifests are kept as Kubernetes submission artifacts.

## Namespace

All resources use:

```text
cse474-prod
```

## Layout

```text
k8s/
  namespace.yaml
  ingress.yaml
  configmap.yaml
  mongodb.yaml
  kafka.yaml
  monitoring.yaml
  chunk-catalog/
  chunk-location/
  secrets-broker/
  chaos-simulator/
  storage-gateway.yaml
  replication-planner.yaml
  observability/
```

## Microservice Requirements

Each microservice defines:

- Deployment with `replicas: 2`
- ClusterIP Service
- CPU and memory requests
- CPU and memory limits
- Liveness probe on `GET /health`
- Readiness probe on `GET /ready`
- Environment variables from ConfigMap or Secret

## Apply Raw Manifests

```powershell
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/mongodb.yaml
kubectl apply -f k8s/kafka.yaml
kubectl apply -f k8s/chunk-catalog/
kubectl apply -f k8s/chunk-location/
kubectl apply -f k8s/secrets-broker/
kubectl apply -f k8s/chaos-simulator/
kubectl apply -f k8s/storage-gateway.yaml
kubectl apply -f k8s/replication-planner.yaml
kubectl apply -f k8s/monitoring.yaml
kubectl apply -f k8s/observability/
kubectl apply -f k8s/ingress.yaml
```

## Preferred Helm Deployment

```powershell
helm upgrade --install cse474 ./chart --namespace cse474-prod --create-namespace
```
