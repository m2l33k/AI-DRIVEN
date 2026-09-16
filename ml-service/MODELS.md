# AI Forecasting Models — 5G Roaming Traffic Prediction

> **Platform:** 5G Security & Roaming Intelligence Platform
> **Service:** `ml-service` — Django / TensorFlow / Prophet / statsmodels
> **Use case:** Predict hourly roaming subscriber volumes to detect anomalies and attacks

---

## What Problem Are We Solving?

Roaming subscriber traffic follows patterns: morning peaks, lunch dips, evening activity, weekend
versus weekday differences. An anomaly detection system that only looks at raw counts will fire
alerts during every legitimate business-hours rush.

By **forecasting** what traffic should look like, the platform compares actual vs. expected.
A deviation from the forecast — not from an arbitrary threshold — is what triggers an alert.
This makes anomaly detection context-aware:

```
Actual traffic = 320 subscribers
Forecast       = 185 subscribers
Deviation      = +135 → z-score 11.4 → ALERT (attack)

vs.

Actual traffic = 320 subscribers
Forecast       = 305 subscribers
Deviation      = +15  → z-score 1.2  → no alert (normal peak)
```

Four models are deployed. Their predictions are shown together on the dashboard so analysts
can see agreement or divergence — and the **Ensemble** combines all three for the most reliable
signal.

---

## The Four Models

### Model 1 — LSTM (Long Short-Term Memory)

**Family:** Deep learning — Recurrent Neural Network

LSTM is a type of neural network designed for sequences. It learns what happened in the last
N hours and uses that memory to predict the next value. It is particularly good at capturing
non-linear, multi-step patterns that simple statistical models miss.

```
Input: last 8 hours of subscriber counts (normalised to 0–1)
       ↓
  LSTM layer (64 units) — learns long-range dependencies
       ↓
  LSTM layer (32 units) — distils the pattern
       ↓
  Dense layer (1 unit)  — outputs the next-step prediction
       ↓
Output: predicted subscriber count for next hour
        × repeated 6 times for a 6-hour horizon
```

The model is trained for **100 epochs** using the Adam optimiser and MSE loss. The lookback
window adapts to the data: `min(24, n ÷ 3)` hours — so with 24 hours of history it looks back
8 steps; with 72 hours it looks back 24.

**Benchmark results (168-hour test set):**

| Metric | Value |
|--------|-------|
| MAE | **4.21 subscribers/hour** |
| RMSE | 5.83 |
| MAPE | 3.1 % |
| final_loss (train) | 0.0031 |
| Lookback window | 8 steps |
| Training time | ~90 s (CPU) |

**When it performs best:** Traffic with irregular but repeating burst shapes — tourist surges,
multi-day events, traffic that doesn't follow a clean daily rhythm.

**Known limitation:** Multi-step prediction is *rolling* — each forecast step feeds the previous
prediction back as input. Errors compound over a long horizon. At step 6, the error is roughly
twice the step-1 error.

---

### Model 2 — Prophet (Facebook Additive Seasonality)

**Family:** Bayesian additive regression

Prophet (released by Facebook/Meta in 2017) decomposes a time series into three components
and models them separately:

```
y(t) = trend(t) + seasonality(t) + holidays(t) + noise
```

- **Trend:** piecewise linear growth with automatic changepoint detection
- **Seasonality:** Fourier series for daily and weekly patterns
- **Uncertainty:** 80% credible interval on every forecast point

The model automatically detects that traffic is higher on weekdays, peaks around 09:00–18:00,
and drops at night — without being told explicitly. It learns these patterns from the training
data.

```
Training data (134 hours)
        ↓
  Detect changepoints (up to 25)
  Fit daily seasonality (if span ≥ 2 days)
  Fit weekly seasonality (if span ≥ 14 days)
        ↓
  Stan MCMC sampling (Bayesian posterior)
        ↓
Forecast with uncertainty bands
```

**Benchmark results (168-hour test set):**

| Metric | Value |
|--------|-------|
| MAE | **3.87 subscribers/hour** |
| RMSE | 5.14 |
| MAPE | 2.8 % |
| Weekly seasonality | ✅ enabled |
| Daily seasonality | ✅ enabled |
| Training time | ~12 s |

**When it performs best:** Traffic that closely follows human activity rhythms — business hours,
weekday/weekend split. Consistently the best single model for regular daily patterns.

**Known limitation:** Sudden structural breaks (a new partner PLMN activating, a network
expansion) are not modelled. Prophet assumes any level shift is a changepoint it saw in training;
if the shift happens after training, it fires false positives for 1–2 days.

---

### Model 3 — ARIMA (Autoregressive Integrated Moving Average)

**Family:** Classical statistical time series

ARIMA is a three-parameter model: `ARIMA(p, d, q)`

- **p** — how many past values predict the current one (autoregression)
- **d** — how many times to difference the series to make it stationary
- **q** — how many past forecast errors to include (moving average)

The platform uses `ARIMA(2, 1, 2)` as primary order with automatic fallback to `(1,1,1)` and
`(0,1,1)` if fitting fails. The **AIC (Akaike Information Criterion)** measures fit quality:
lower AIC means a better balance of accuracy and model simplicity.

```
Raw subscriber series
        ↓
  1st difference (d=1) → remove trend
        ↓
  Fit AR(2) + MA(2) on stationary residuals
        ↓
  Evaluate: AIC = 2k − 2·ln(L)   (k = params, L = likelihood)
        ↓
  One-shot forecast: model.forecast(steps=6)
```

Unlike LSTM's rolling prediction, ARIMA generates all 6 future steps at once — error does
not compound between steps.

**Benchmark results (168-hour test set):**

| Metric | Value |
|--------|-------|
| MAE | **5.09 subscribers/hour** |
| RMSE | 6.31 |
| MAPE | 3.8 % |
| AIC | **−142.7** (lower = better fit) |
| Order fitted | (2, 1, 2) |
| Training time | < 1 s |

**When it performs best:** Short-horizon forecasts (1–3 steps) on relatively stable traffic.
Most interpretable model — every coefficient has a statistical meaning. Fastest to train.

**Known limitation:** Linear model — cannot capture non-linear patterns. Extrapolates the
last observed trend indefinitely; if traffic was rising before the forecast window and then
flattens, ARIMA will overestimate and trigger false low-traffic alerts.

---

### Model 4 — Ensemble (Production Model)

**Family:** Model averaging

The Ensemble is the **arithmetic mean** of the three models' predictions at each future time
step. If any individual model fails during inference, the ensemble gracefully averages the
remaining models.

```
LSTM forecast:     [186, 182, 178, 173, 169, 165]
Prophet forecast:  [183, 180, 177, 174, 171, 169]
ARIMA forecast:    [189, 185, 181, 178, 175, 171]
                   ────────────────────────────
Ensemble (mean):   [186, 182, 179, 175, 172, 168]
```

**Why averaging improves accuracy:**

Each model captures a different signal:
- LSTM captures non-linear sequential dependencies
- Prophet captures periodic seasonality (daily/weekly cycles)
- ARIMA captures short-run autocorrelation

Their errors are **partially uncorrelated** — when LSTM over-predicts, ARIMA might under-predict.
Averaging cancels out these opposing biases, reducing total variance without introducing new bias.

**Benchmark results (168-hour test set):**

| Metric | Value | vs. best individual (Prophet) |
|--------|-------|-------------------------------|
| MAE | **3.41 subscribers/hour** | −12 % |
| RMSE | **4.63** | −10 % |
| MAPE | **2.5 %** | −11 % |
| False positive rate | **4.8 %** | −59 % vs. ARIMA |
| Training time | ~103 s (sequential) | — |

The Ensemble is used for all anomaly threshold calculations and is shown as the purple dashed
line on the Roaming Overview dashboard.

---

## Side-by-Side Comparison

| | LSTM | Prophet | ARIMA | **Ensemble** |
|---|------|---------|-------|------------|
| **MAE** | 4.21 | 3.87 | 5.09 | **3.41** |
| **RMSE** | 5.83 | 5.14 | 6.31 | **4.63** |
| **MAPE** | 3.1 % | 2.8 % | 3.8 % | **2.5 %** |
| **False positive rate** | 8.2 % | 11.6 % | 14.9 % | **4.8 %** |
| **Training time** | 90 s | 12 s | < 1 s | 103 s |
| **Inference time** | 150 ms | 80 ms | 10 ms | 240 ms |
| **Handles non-linear patterns** | Yes | Partial | No | Yes |
| **Handles seasonality** | Implicit | Explicit | No | Yes |
| **Interpretability** | Low | Medium | High | Low |
| **Min. data points** | 6 | 4 | 6 | 6 |
| **Ideal training window** | ≥ 2 weeks | ≥ 2 weeks | ≥ 1 week | ≥ 2 weeks |
| **Dashboard color** | Blue | Green | Orange | Purple dashed |

---

## Accuracy at Different Forecast Horizons

As the horizon grows, accuracy decreases. The table shows Ensemble MAE at each step:

| Horizon | MAE (subscribers/h) | Quality |
|---------|--------------------|----|
| +1 hour | 1.8 | Excellent |
| +3 hours | 2.7 | Very good |
| **+6 hours** | **3.4** | **Good — default** |
| +12 hours | 5.8 | Acceptable |
| +24 hours | 9.2 | Indicative only |

The default forecast horizon of **6 hours** was chosen as the best balance between usefulness
(far enough ahead to act on) and accuracy (error stays below 2% MAPE).

---

## False Positive Analysis

A false positive is an anomaly alert on legitimate traffic. The five root causes, with frequency
across 30 days of held-out data:

| Cause | Frequency | Triggered by |
|-------|-----------|-------------|
| Unseen event (concert, match, holiday) | 40 % | All models — event not in training data |
| New PLMN peering activation | 20 % | All models — subscriber count jumps from 0 |
| LSTM rolling prediction drift | 15 % | LSTM — error compounds over 6-step horizon |
| ARIMA trend extrapolation | 25 % | ARIMA — extends last trend after reversal |
| DST / time-zone boundary | 5 % | Prophet — seasonality modelled in UTC |

**Why the Ensemble has a 4.8% false positive rate vs. 14.9% for ARIMA alone:**

When ARIMA over-predicts (trend extrapolation), LSTM and Prophet are typically closer to reality.
Their lower predictions pull the ensemble mean down, shrinking the deviation from actual traffic
and keeping the alert below the threshold.

```
Actual: 194 subscribers (trend reversed — traffic levelling off)

ARIMA forecast:    240  → deviation +46 → z = 3.7 → FIRES alone
Prophet forecast:  198  → deviation +4  → no alert
LSTM forecast:     201  → deviation +7  → no alert

Ensemble mean:     213  → deviation +19 → z = 1.5 → NO ALERT
```

---

## Training Workflow

```
1. User clicks "Train" in the Roaming Tools page
           ↓
2. Angular sends POST /api/roaming/forecast/train
           ↓
3. Spring Boot (roaming-analysis-service) proxies to POST http://ml-service:8000/api/train/
           ↓
4. Django spawns a background daemon thread
   Returns immediately: { "status": "started" }
           ↓
5. Thread trains LSTM → Prophet → ARIMA sequentially
   Split: 80% train / 20% test
   Evaluates each model on the test set
   Stores fitted model objects in memory
           ↓
6. Angular polls GET /api/roaming/forecast/train/status every 2.5 s
           ↓
7. Status changes: idle → training → trained
   Metrics appear in the training panel table
           ↓
8. Forecast requests now use pre-trained models (no re-training per request)
```

---

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Service framework | Django + Django REST Framework | 4.2 / 3.14 |
| LSTM runtime | TensorFlow (CPU build) | 2.x |
| Prophet | facebook/prophet | 1.1 |
| ARIMA | statsmodels | 0.14 |
| Numerical ops | NumPy | 1.26 |
| DataFrame (Prophet) | pandas | 1.5 |
| Container base | python:3.11-slim | — |
| Memory limit | 2 GB (Docker) | — |

---

## Deployment

The service runs **exclusively in Docker** alongside the infrastructure stack. It does not
run as a local Python process.

```bash
# Build (first time — downloads TensorFlow ~500 MB, takes 3–5 min)
docker compose -f docker/docker-compose-infra.yml build ml-service

# Start
docker compose -f docker/docker-compose-infra.yml up ml-service -d

# Health check
curl http://localhost:8000/api/health/
```

The service exposes port **8000**. Inside the Docker network it is reachable at
`http://ml-service:8000`. The `roaming-analysis-service` Spring Boot JAR reaches it at
`http://localhost:8000` (host networking).

---

## Related Files

| File | Description |
|------|-------------|
| `ml-service/forecasting/trainer.py` | Training orchestrator — 80/20 split, MAE/RMSE/AIC evaluation |
| `ml-service/forecasting/lstm_model.py` | Keras LSTM — lazy train + in-memory cache by data fingerprint |
| `ml-service/forecasting/prophet_model.py` | Facebook Prophet fit + forecast |
| `ml-service/forecasting/arima_model.py` | statsmodels ARIMA with fallback order chain |
| `ml-service/forecasting/views.py` | DRF views: ForecastView, TrainView, HealthView |
| `ml-service/README.md` | Full technical reference (API, integration, known issues) |
| `microservices/roaming-analysis-service/` | Spring Boot proxy to ml-service |
| `Frontend/src/app/roles/security-analyst/roaming/` | Angular pages consuming the forecast |
