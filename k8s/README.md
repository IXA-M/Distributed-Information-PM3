# Kubernetes

Keep shared Kubernetes manifests or Helm assets here.

Suggested layout:

```text
k8s/
  namespace.yaml
  <service-name>/
```

Team note:

- Do not commit unfinished service-specific manifests to `main` unless the team has agreed on the deployment structure.
