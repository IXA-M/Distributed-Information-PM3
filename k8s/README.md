# Kubernetes

Keep shared Kubernetes manifests or Helm assets here.

Suggested layout:

```text
k8s/
  ingress.yaml
  namespace.yaml
  <service-name>/
```

Team note:

- Do not commit unfinished service-specific manifests to `main` unless the team has agreed on the deployment structure.
- Keep service manifests under `k8s/<service-name>/` and shared networking resources at the top level.
