const fs = require("fs");

function createMetrics(serviceName) {
  const state = {
    requests: 0,
    errors: 0,
    durations: []
  };

  function middleware(req, res, next) {
    const start = process.hrtime.bigint();
    res.on("finish", () => {
      if (req.path === "/metrics") {
        return;
      }

      state.requests += 1;
      if (res.statusCode >= 500) {
        state.errors += 1;
      }

      const durationMs = Number(process.hrtime.bigint() - start) / 1000000;
      state.durations.push(durationMs);
      if (state.durations.length > 1000) {
        state.durations.shift();
      }
    });

    next();
  }

  function handler(_req, res) {
    const sorted = [...state.durations].sort((a, b) => a - b);
    const p50 = percentile(sorted, 0.5);
    const p95 = percentile(sorted, 0.95);
    const p99 = percentile(sorted, 0.99);
    const errorRate = state.requests === 0 ? 0 : state.errors / state.requests;

    res.type("text/plain").send(
      [
        "# HELP service_http_requests_total Total HTTP requests.",
        "# TYPE service_http_requests_total counter",
        `service_http_requests_total{service="${serviceName}"} ${state.requests}`,
        "# HELP service_http_errors_total Total HTTP 5xx responses.",
        "# TYPE service_http_errors_total counter",
        `service_http_errors_total{service="${serviceName}"} ${state.errors}`,
        "# HELP service_http_error_rate Ratio of 5xx responses to requests.",
        "# TYPE service_http_error_rate gauge",
        `service_http_error_rate{service="${serviceName}"} ${errorRate}`,
        "# HELP service_http_request_latency_ms HTTP request latency percentiles in milliseconds.",
        "# TYPE service_http_request_latency_ms gauge",
        `service_http_request_latency_ms{service="${serviceName}",quantile="0.50"} ${p50}`,
        `service_http_request_latency_ms{service="${serviceName}",quantile="0.95"} ${p95}`,
        `service_http_request_latency_ms{service="${serviceName}",quantile="0.99"} ${p99}`
      ].join("\n")
    );
  }

  return { handler, middleware };
}

function createDocsHandler({ openApiPath, title }) {
  return (_req, res) => {
    res.type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <noscript><a href="/openapi.yaml">OpenAPI specification</a></noscript>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({ url: "/openapi.yaml", dom_id: "#swagger-ui" });
  </script>
</body>
</html>`);
  };
}

function createOpenApiHandler(openApiPath) {
  return (_req, res) => {
    res.type("application/yaml").send(fs.readFileSync(openApiPath, "utf8"));
  };
}

function percentile(sorted, ratio) {
  if (sorted.length === 0) {
    return 0;
  }

  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1);
  return Number(sorted[index].toFixed(3));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = { createDocsHandler, createMetrics, createOpenApiHandler };
