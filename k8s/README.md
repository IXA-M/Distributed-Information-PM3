# Kubernetes

Keep shared Kubernetes manifests here. The team has already chosen the deployment structure.

Required layout:

```text
k8s/
  namespace.yaml
  ingress.yaml
  <service-name>/
    configmap.yaml
    secret.yaml
    deployment.yaml
    service.yaml
    hpa.yaml
    mongodb.yaml   # only if the service owns a database
```

Rules:

- Keep service manifests under `k8s/<service-name>/`
- Keep shared networking resources at the top level
- Use namespace `cse474-prod`
- Use consistent names such as `<service-name>-config`, `<service-name>-secret`, and `<service-name>-db`
- Do not merge unfinished shared `k8s/` changes into `main`
