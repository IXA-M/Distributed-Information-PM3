# Helm Chart

Install command expected by the rubric:

```bash
helm install cse474 ./chart
```

Examples with overrides:

```bash
helm install cse474 ./chart --set services.chunkCatalog.image.tag=v1
helm upgrade --install cse474 ./chart --set services.chunkLocation.replicaCount=3
```

Values currently support overriding:

- image tags
- replica counts
- resource limits and requests
- ingress hosts
