---
title: ML Forecasting Service
tags: [ml, forecasting, django, python, lstm, prophet, arima]
updated: 2026-09-10
---

# ML Forecasting Service

A **Django REST Framework** microservice providing three time-series forecasting models for roaming
traffic prediction. Runs as a Docker container at port **8000** — it is a Python service, not a JVM
JAR. It is part of the `docker/docker-compose-infra.yml` infra stack.

- **Location:** `ml-service/` at repo root
- **Port:** `8000` (container `ml-service`, `docker_shared-network`)
- **Runtime:** Python 3.11-slim + TensorFlow CPU + Facebook Prophet + statsmodels
- **Status:** ✅ complete; Spring Boot integration done; Angular UI fully wired

## Structure

```
ml-service/
├── Dockerfile                      # python:3.11-slim + tensorflow-cpu + prophet + statsmodels
├── requirements.txt
├── manage.py
├── ml_service/
│   ├── settings.py                 # no DB, ALLOWED_HOSTS=*, DRF JSON only
│   └── urls.py
└── forecasting/
    ├── views.py                    # ForecastView, TrainView, HealthView
    ├── trainer.py                  # background thread; stores fitted model objects in-memory
    ├── lstm_model.py               # Keras LSTM — lazy train + in-memory cache by fingerprint
    ├── prophet_model.py            # Facebook Prophet
    └── arima_model.py              # statsmodels ARIMA(2,1,2) with fallback orders
```

## The three models

| Model | Library | What it learns | Key hyperparameters |
|-------|---------|----------------|---------------------|
| **LSTM** | TensorFlow / Keras | Non-linear sequential patterns, long-range dependencies | 100 epochs, lookback = `min(24, n//3)` |
| **Prophet** | Facebook Prophet | Trend + seasonality (daily/weekly) robustly | Default seasonality; auto-detects changepoints |
| **ARIMA** | statsmodels | Linear autocorrelation baseline | ARIMA(2,1,2); fallback tries (1,1,1)/(1,1,0) |
| **Ensemble** | Average of above | Reduces individual model variance | Simple mean of LSTM+Prophet+ARIMA predictions |

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health/` | none | UP check + `model_status` field |
| `POST` | `/api/forecast/` | none | Run all 3 models; returns predictions |
| `POST` | `/api/train/` | none | Kick off background training (immediate `status: "started"`) |
| `GET` | `/api/train/` | none | Training status + per-model metrics |

### Forecast request/response

```json
// POST /api/forecast/
{ "data": [120, 135, 142, 98, 110, 130], "hours_ahead": 6 }

// Response
{
  "lstm":    [128, 131, 134, 129, 133, 136],
  "prophet": [126, 130, 132, 128, 131, 135],
  "arima":   [125, 128, 131, 127, 130, 133],
  "ensemble":[126, 130, 132, 128, 131, 135]
}
```

### Training status response

```json
// GET /api/train/ (after training completes)
{
  "status": "trained",
  "train_size": 80,
  "test_size": 20,
  "models": {
    "lstm":    { "mae": 4.2, "rmse": 5.8, "final_loss": 0.003, "lookback": 8 },
    "prophet": { "mae": 3.9, "rmse": 5.1 },
    "arima":   { "mae": 5.1, "rmse": 6.3, "aic": -142.7 }
  }
}
```

`status` values: `"idle"` → `"started"` (POST response) → `"training"` → `"trained"` or `"error"`.
**Important:** TypeScript `TrainStatus` type must include `'started'` or the compiler will error.

## Training flow

1. `POST /api/train/` → spawns a Python daemon thread in `trainer.py`; returns immediately with `{ "status": "started" }`
2. Thread splits data 80/20 (train/test)
3. Trains LSTM (Keras, 100 epochs), Prophet, ARIMA(2,1,2) with fallback orders
4. Evaluates on test set → stores MAE, RMSE, AIC (ARIMA), final_loss + lookback (LSTM)
5. Stores fitted model objects in `trainer._models` (in-memory)
6. After training, `/api/forecast/` uses the stored models — **no re-training per forecast request**
7. Frontend polls `GET /api/train/` every 2.5 s until `status = "trained"` or `"error"`

## Training metrics explained (for PFE defense)

| Metric | Model | Interpretation | Good value |
|--------|-------|----------------|------------|
| **MAE** | all | Mean Absolute Error — average absolute gap between predicted and actual subscribers | As low as possible; compare models to pick best |
| **RMSE** | all | Root Mean Squared Error — penalises large errors more than MAE | Lower = better; if RMSE >> MAE, the model has occasional large misses |
| **AIC** | ARIMA only | Akaike Information Criterion — balances model fit vs complexity | Lower = better; used for ARIMA order selection |
| **final_loss** | LSTM | MSE on the training set after the last epoch | Should decrease across training epochs toward ~0 |
| **lookback** | LSTM | How many past time steps the LSTM uses as input | `min(24, n//3)` — larger = longer memory but needs more data |

## Docker setup

```bash
# First time — build the image (~3–5 min, TensorFlow ~500 MB download)
docker compose -f docker/docker-compose-infra.yml build ml-service

# Start
docker compose -f docker/docker-compose-infra.yml up ml-service -d

# Health check
curl http://localhost:8000/api/health/
```

Config in `docker-compose-infra.yml`: `mem_limit: 2g`, healthcheck on `/api/health/`, port `8000:8000`.

> Healthcheck always shows "unhealthy" — `python:3.11-slim` has no `curl`. The service works
> fine; Docker just can't verify it. This is harmless.

## Spring Boot integration (`roaming-analysis-service`, port 9002)

Config in `application.yml`:
```yaml
roaming:
  ml-service:
    url: ${ML_SERVICE_URL:http://localhost:8000}   # default (host JAR → Docker)
# docker profile override:
    url: http://ml-service:8000                    # container to container
```

`RestTemplate` bean in `RoamingAnalysisServiceApplication.java`:
```java
// Spring Boot 4 — no RestTemplateBuilder; use SimpleClientHttpRequestFactory directly
@Bean
public RestTemplate restTemplate() {
    SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout((int) Duration.ofSeconds(5).toMillis());
    factory.setReadTimeout((int) Duration.ofSeconds(30).toMillis());
    return new RestTemplate(factory);
}
```

Spring Boot endpoints exposed via gateway (`/api/roaming/forecast/*`):
```
POST /api/roaming/forecast/train           → triggers training on ml-service
GET  /api/roaming/forecast/train/status    → polls training state
GET  /api/roaming/forecast/ml?hoursAhead=6 → multi-model forecast
```

**Graceful fallback:** if Django is down or returns an error, `/forecast/ml` returns empty lists
— no 500 propagates to the frontend.

### Critical: Content-Type on POST to Django

Django's dev server closes the TCP connection mid-transfer if `Content-Type: application/json` is absent.
Symptom: `"Could not write JSON: Error writing request body to server"`.

Fix — use the `jsonEntity()` helper in `RoamingInsightsService`:
```java
private static HttpEntity<Object> jsonEntity(Object body) {
    HttpHeaders h = new HttpHeaders();
    h.setContentType(MediaType.APPLICATION_JSON);
    return new HttpEntity<>(body, h);
}
// Always use jsonEntity(body) instead of new HttpEntity<>(body) for Django POSTs
```

## Angular integration

### Roaming Tools page (`/security/roaming/tools`)
- **ML Training panel:** status badge (idle/training/trained/error), train/test row counts
- "Trigger Training" button with spinner; auto-polls every 2.5 s
- Per-model metrics table: LSTM (MAE, RMSE, final_loss, lookback), Prophet (MAE, RMSE), ARIMA (MAE, RMSE, AIC)
- Error message display if training fails

### Roaming Overview page (`/security/roaming/overview`)
- **Multi-line SVG forecast chart** (`hw-multi-line-chart` component):
  - Historical data (grey) + LSTM (blue) + Prophet (green) + ARIMA (orange) + Ensemble (purple dashed)
  - Vertical dashed line at the history/prediction boundary (`dividerIndex`)
  - Component: `Frontend/src/app/shared/charts/multi-line-chart.ts`

### CSV upload forecast modal (`/security/roaming/tools`)
- After uploading a CSV via `POST /api/roaming/upload`, `showForecastModal = signal(true)` auto-opens a modal
- Modal shows: parse stats row (rows parsed/skipped) + forecast line chart + hourly breakdown table + anomaly list

## TypeScript types (in `roaming.service.ts`)

```typescript
interface ModelMetrics {
  mae: number;
  rmse: number;
  aic?: number;          // ARIMA only
  final_loss?: number;   // LSTM only
  lookback?: number;     // LSTM only
  epochs?: number;       // LSTM only
}

type TrainStatus = 'idle' | 'started' | 'training' | 'trained' | 'error';
// MUST include 'started' — Django POST returns it immediately

interface MultiModelForecastDto {
  lstm: number[];
  prophet: number[];
  arima: number[];
  ensemble: number[];
}
```

## Known issues & fixes

| Issue | Root cause | Fix |
|-------|-----------|-----|
| `"Could not write JSON: Error writing request body to server"` | Missing `Content-Type` on POST to Django | Use `jsonEntity()` helper in `RoamingInsightsService` |
| Docker healthcheck always "unhealthy" | `python:3.11-slim` has no `curl` | Harmless — service works fine |
| `epochs` TypeScript error | Missing field in `ModelMetrics` interface | Add `epochs?: number` |
| Angular "ML service unavailable" error | Compilation failure in Spring Boot JAR (missing import) → 404 → Angular error handler | Check Spring Boot logs for compilation errors, then rebuild JAR |
| TrainStatus TypeScript error | `'started'` missing from union type | Always include `'started'` in `TrainStatus` |
| First image build hangs | TensorFlow download ~500 MB | Wait; give it 5–10 min on first build |

## Related notes
- [[Roaming-Analysis-Service]] · [[Backend-and-Infra]] · [[Frontend-Components]] · [[Ports-and-URLs]]
