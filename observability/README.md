# Observability

This folder contains the observability submission artifacts:

- `prometheus.yml` scrapes `/metrics` from both services.
- `grafana/distributed-information-dashboard.json` is a Grafana dashboard export.
- `../report/tracing-placeholder.md` documents the expected Jaeger trace evidence to capture from the cluster.

Both services emit structured JSON logs and expose Prometheus text metrics at `GET /metrics`.
