function startTracing(serviceName) {
  if (process.env.OTEL_TRACES_EXPORTER === "none") {
    return noopTracing();
  }

  const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
  const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
  const { Resource } = require("@opentelemetry/resources");
  const { NodeSDK } = require("@opentelemetry/sdk-node");
  const { ATTR_SERVICE_NAME } = require("@opentelemetry/semantic-conventions");

  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://jaeger:4318";
  const traceUrl = endpoint.endsWith("/v1/traces") ? endpoint : `${endpoint}/v1/traces`;
  const sdk = new NodeSDK({
    instrumentations: [getNodeAutoInstrumentations()],
    resource: new Resource({
      [ATTR_SERVICE_NAME]: serviceName
    }),
    traceExporter: new OTLPTraceExporter({ url: traceUrl })
  });

  sdk.start();

  return {
    async shutdown() {
      await sdk.shutdown();
    }
  };
}

function noopTracing() {
  return {
    async shutdown() {}
  };
}

module.exports = { startTracing };
