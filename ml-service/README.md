# ML Forecasting Service

A lightweight **Django REST Framework** service that provides three time-series forecasting models for roaming traffic prediction. It runs as a Docker container alongside the platform's infra stack.

## Models

| Model | Library | Strengths |
|-------|---------|-----------|
| **LSTM** | TensorFlow / Keras | Captures non-linear sequential patterns; good for longer cycles |
| **Prophet** | Facebook Prophet | Handles seasonality and trend changes robustly |
| **ARIMA** | statsmodels | Classic statistical baseline; interpretable AIC metric |
| **Ensemble** | Average of the three | Reduces individual model variance |

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
    ├── trainer.py                  # background thread; stores fitted model objects
    ├── lstm_model.py               # Keras LSTM — lazy train + in-memory cache by fingerprint
    ├── prophet_model.py            # Facebook Prophet
    └── arima_model.py              # statsmodels ARIMA(2,1,2) with fallback orders
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/api/health/` | UP check + `model_status` field |
| `POST` | `/api/forecast/` | Run all 3 models → LSTM + Prophet + ARIMA + ensemble predictions |
| `POST` | `/api/train/` | Trigger background training (returns immediately, `status: "started"`) |
| `GET`  | `/api/train/` | Training state + per-model metrics (MAE, RMSE, AIC, final_loss, lookback) |

### Training flow

1. `POST /api/train/` → spawns a daemon thread; returns `{ "status": "started" }`
2. Thread splits data **80% train / 20% test**, trains all three models
3. Evaluates on test set → stores metrics
4. `GET /api/train/` returns `{ "status": "trained", "models": { ... } }` when done
5. After training, `POST /api/forecast/` uses the pre-trained objects (no re-training per request)

### Forecast request body

```json
{
  "data": [120, 135, 142, 98, 110],
  "hours_ahead": 6
}
```

### Training metrics explained

| Metric | Model | Meaning |
|--------|-------|---------|
| **MAE** | all | Mean Absolute Error — avg absolute gap between predicted and actual. Lower = better. |
| **RMSE** | all | Root Mean Squared Error — penalises large errors more than MAE. Lower = better. |
| **AIC** | ARIMA only | Akaike Information Criterion — penalises model complexity. Lower = better. |
| **final_loss** | LSTM | MSE on training set after the last epoch. Should decrease over training. |
| **lookback** | LSTM | Number of time steps the LSTM looks back. `min(24, n // 3)`. |

## Running

The service is defined in `docker/docker-compose-infra.yml` as `ml-service`:

```bash
# First time — build the image (takes 3–5 min for TensorFlow download ~500 MB)
docker compose -f docker/docker-compose-infra.yml build ml-service

# Start
docker compose -f docker/docker-compose-infra.yml up ml-service -d

# Check health
curl http://localhost:8000/api/health/
```

> **Do not run this as a local Python process** alongside the JAR-based services — the TensorFlow
> install is large and slow. Always use the Docker container.

## Spring Boot integration

The `roaming-analysis-service` (port 9002) acts as a proxy to this service:

```yaml
# application.yml
roaming:
  ml-service:
    url: ${ML_SERVICE_URL:http://localhost:8000}    # host JAR → Docker
# docker profile:
    url: http://ml-service:8000                     # container → container
```

Spring Boot endpoints exposed through the gateway:
- `POST /api/roaming/forecast/train`
- `GET  /api/roaming/forecast/train/status`
- `GET  /api/roaming/forecast/ml?hoursAhead=6`

Graceful fallback: if the ml-service is down, `/forecast/ml` returns empty lists instead of 500.

## Angular UI

The **Roaming Tools** page (`/security/roaming/tools`) has a full training panel:
- Status badge, train/test row counts, per-model metrics table
- Spinner during training with automatic polling every 2.5 s
- After training, the **Roaming Overview** page auto-shows the forecast chart

The **Roaming Overview** page (`/security/roaming/overview`) includes a multi-line SVG chart:
- History (grey) · LSTM (blue) · Prophet (green) · ARIMA (orange) · Ensemble (purple dashed)
- Vertical divider between historical data and predicted range

## Known issues

| Issue | Fix |
|-------|-----|
| `"Could not write JSON: Error writing request body to server"` | Always set `Content-Type: application/json` on POST requests to Django — use `jsonEntity()` helper in `RoamingInsightsService` |
| Docker healthcheck shows "unhealthy" | `python:3.11-slim` has no `curl`; service works fine — Docker just can't verify it |
| `epochs` field TypeScript error | Add `epochs?: number` to `ModelMetrics` interface in `roaming.service.ts` |
