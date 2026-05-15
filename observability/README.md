# Observability

Keep shared observability assets in this folder.

Expected contents for the assignment:

- `prometheus.yml`
- `grafana/` dashboard exports
- tracing screenshots or links in the report or root README

Current implementation in this branch:

- structured JSON logs from both owned services
- Prometheus `/metrics` endpoints on both owned services
- Prometheus scrape config for both owned services
- Loki and Promtail config for centralized log aggregation
- Grafana dashboard JSON with request rate, error rate, and p50/p95/p99 latency panels
- trace propagation through `traceparent` headers and structured trace identifiers in logs

Note:

- the full tracing rubric asks for at least 5 instrumented services, which depends on the full team integration
- this branch instruments the two owned services with trace identifiers and prepares the shared observability assets the team can extend
