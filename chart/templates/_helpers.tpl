{{- define "cse474.namespace" -}}
{{- .Values.namespace.name -}}
{{- end -}}

{{- define "cse474.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "cse474.labels" -}}
helm.sh/chart: {{ include "cse474.chart" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}
