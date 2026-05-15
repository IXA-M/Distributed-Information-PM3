# Observability

This folder contains monitoring and tracing assets for the full PM3 system.

## Contents

```text
observability/prometheus.yml
observability/grafana/chunk-services-dashboard.json
observability/grafana/distributed-information-dashboard.json
observability/loki-config.yml
observability/promtail-config.yml
```

The combined Helm chart also provisions Prometheus, Grafana, Loki, and Jaeger from `chart/templates/monitoring.yaml`.

## Metrics

All services expose Prometheus metrics at:

```text
GET /metrics
```

Prometheus scrape jobs:

```text
chunk-catalog
chunk-location
storage-gateway
replication-planner
```

Open Prometheus locally:

```powershell
kubectl port-forward -n cse474-prod svc/prometheus 9090:9090
```

## Grafana

Open Grafana locally:

```powershell
kubectl port-forward -n cse474-prod svc/grafana 3000:3000
```

Default credentials:

```text
admin / admin
```

## Jaeger Tracing

Storage Gateway and Replication Planner use OpenTelemetry auto-instrumentation and export traces to Jaeger through:

```text
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318
```

Open Jaeger locally:

```powershell
kubectl port-forward -n cse474-prod svc/jaeger 16686:16686
```

Expected Jaeger service names:

```text
storage-gateway
replication-planner
```
