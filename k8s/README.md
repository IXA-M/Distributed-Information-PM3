# Kubernetes

This folder contains raw Kubernetes manifests for the PM3 system. The preferred deployment path is the Helm chart in `helm/`, but these manifests are kept as explicit Kubernetes submission artifacts.

## Namespace

All resources use:

```text
cse474-prod
```

## Manifests

```text
k8s/namespace.yaml
k8s/configmap.yaml
k8s/storage-gateway.yaml
k8s/replication-planner.yaml
k8s/mongodb.yaml
k8s/kafka.yaml
k8s/monitoring.yaml
k8s/ingress.yaml
```

## Microservice Requirements

Both microservices include:

- Deployment with `replicas: 2`
- ClusterIP Service
- CPU and memory requests
- CPU and memory limits
- Liveness probe on `GET /health`
- Readiness probe on `GET /ready`
- Environment variables from ConfigMap

## Apply Raw Manifests

```powershell
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/mongodb.yaml
kubectl apply -f k8s/kafka.yaml
kubectl apply -f k8s/storage-gateway.yaml
kubectl apply -f k8s/replication-planner.yaml
kubectl apply -f k8s/monitoring.yaml
kubectl apply -f k8s/ingress.yaml
```

Check status:

```powershell
kubectl get pods -n cse474-prod
kubectl get services -n cse474-prod
kubectl get ingress -n cse474-prod
```

## Preferred Helm Deployment

```powershell
helm upgrade --install cse474 ./helm --namespace cse474-prod --create-namespace
```
