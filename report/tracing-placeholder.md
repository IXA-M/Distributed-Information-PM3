# Distributed Tracing Evidence

The services are instrumented with OpenTelemetry and export traces to Jaeger through the in-cluster OTLP HTTP endpoint:

```text
http://jaeger:4318/v1/traces
```

## Open Jaeger

```powershell
kubectl port-forward -n cse474-prod svc/jaeger 16686:16686
```

Open:

```text
http://localhost:16686
```

Expected services:

```text
storage-gateway
replication-planner
```

## Generate Trace Traffic

```powershell
kubectl run trace-hit-storage -n cse474-prod --rm -i --restart=Never --image=curlimages/curl:8.10.1 -- curl -s http://storage-gateway/health
kubectl run trace-hit-planner -n cse474-prod --rm -i --restart=Never --image=curlimages/curl:8.10.1 -- curl -s http://replication-planner/health
```

In Jaeger, select either `storage-gateway` or `replication-planner`, keep operation as `all`, and click **Find Traces**.

## Expected Trace Evidence

You should see spans for:

- HTTP server requests such as `GET /health`, `GET /ready`, and `GET /metrics`
- Express middleware and route handlers
- MongoDB calls such as `mongodb.ping`
- Service names set to `storage-gateway` and `replication-planner`

Screenshots for the final report should show the Jaeger service dropdown and at least one trace detail page for each service.
