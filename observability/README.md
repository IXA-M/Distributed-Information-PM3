# Observability

This folder contains monitoring and tracing assets for the PM3 submission.

## Contents

```text
observability/prometheus.yml
observability/grafana/distributed-information-dashboard.json
```

The Helm chart also provisions Prometheus, Grafana, Loki, and Jaeger from `helm/templates/monitoring.yaml`.

## Metrics

Both services expose Prometheus metrics at:

```text
GET /metrics
```

Prometheus scrape jobs:

```text
storage-gateway
replication-planner
```

Open Prometheus locally:

```powershell
kubectl port-forward -n cse474-prod svc/prometheus 9090:9090
```

Then open:

```text
http://localhost:9090
```

Useful queries:

```promql
up
service_http_requests_total
service_http_request_duration_seconds_count
```

## Grafana

Open Grafana locally:

```powershell
kubectl port-forward -n cse474-prod svc/grafana 3000:3000
```

Then open:

```text
http://localhost:3000
```

Default credentials:

```text
admin / admin
```

The dashboard export is committed at:

```text
observability/grafana/distributed-information-dashboard.json
```

## Jaeger Tracing

Both services use OpenTelemetry auto-instrumentation and export traces to Jaeger through:

```text
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318
```

Open Jaeger locally:

```powershell
kubectl port-forward -n cse474-prod svc/jaeger 16686:16686
```

Then open:

```text
http://localhost:16686
```

Expected services in the Jaeger dropdown:

```text
storage-gateway
replication-planner
```

Generate sample traces:

```powershell
kubectl run trace-hit-storage -n cse474-prod --rm -i --restart=Never --image=curlimages/curl:8.10.1 -- curl -s http://storage-gateway/health
kubectl run trace-hit-planner -n cse474-prod --rm -i --restart=Never --image=curlimages/curl:8.10.1 -- curl -s http://replication-planner/health
```
