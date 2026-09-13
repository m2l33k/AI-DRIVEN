# Grafana Dashboards

This directory contains Grafana dashboard JSON files that are **auto-provisioned** on startup.

## Provisioning

The Grafana container mounts this directory at `/var/lib/grafana/dashboards`:

```yaml
# docker/docker-compose-observability.yml
volumes:
  - ../grafana-dashboard:/var/lib/grafana/dashboards
```

The provisioning config (`docker/grafana/provisioning/dashboards/dashboards.yaml`) scans this path:
- Folder in Grafana: **"Spring Boot"**
- `disableDeletion: false`, `editable: true`
- Grafana polls for new/changed files every 10 s — **no Grafana restart needed** after adding a dashboard.

## Datasource UIDs

| UID | Type | URL |
|-----|------|-----|
| `prometheus` | Prometheus | `http://prometheus:9090` |
| `loki` | Loki | `http://loki:3100` |

## Dashboards

### `free5gc-5g-core.json`
Live status of all free5GC control-plane Network Functions.

| Panel | Query |
|-------|-------|
| NF health (8 stat panels) | `up{job="free5gc-<nf>"}` — green=UP / red=DOWN |
| SBI request rate per NF | `sum by (job) (rate(free5gc_sbi_inbound_request_total[2m]))` |
| SBI request rate by path | `sum by (nf_type, path, method) (rate(...))` |
| P95 latency per NF | `histogram_quantile(0.95, sum by (job, le) (rate(free5gc_sbi_inbound_request_duration_seconds_bucket[2m])))` |
| P50 latency per NF | same with `0.50` |
| 4xx/5xx error rate | `rate(...{status_code=~"4.*|5.*"})` |
| Status code donut | `increase(...[$__range])` |
| NF log stream | `{job=~"free5gc.*"}` via Loki |

Template variable: `$nf_type` (multi-select, from `label_values(up{free5gc="true"}, job)`).

**Prerequisite:** free5GC containers must be running and Prometheus must be scraping them.
See `docker/docker-compose-5gc.yml` and `docker/prometheus/prometheus.yml`.

## Adding a new dashboard

1. Export from Grafana UI: **Dashboard → Share → Export → Save to file**
2. Drop the `.json` file here
3. Grafana picks it up within ~10 s (no restart needed)

> When exporting, use **"Export for sharing externally"** to embed the datasource UIDs rather than
> internal database IDs. This ensures the dashboard works on any Grafana instance with the same
> datasource UIDs (`prometheus`, `loki`).
