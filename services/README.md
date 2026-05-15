# Services Layout

Each team-owned microservice should live under `services/<service-name>/`.

Recommended structure:

```text
services/<service-name>/
  src/
  tests/
  sql/                  # optional, if the service uses seed/init files
  Dockerfile
  package.json
  openapi.yaml
```

Team rules:

- Keep service-specific code inside the service folder.
- Expose `GET /health` and `GET /ready`.
- Keep tests inside `tests/`.
- Do not place shared infrastructure files inside a personal branch without coordinating.
- Root-level `k8s/`, `.github/workflows/`, and `observability/` are shared team ownership areas.
- Your matching Kubernetes manifests belong in `k8s/<service-name>/`.
