# Forecasting Mobile Network Traffic with LSTM (RNN)

## Overview

This notebook implements a **multivariate time-series forecasting model** for mobile network traffic using a Long Short-Term Memory (LSTM) neural network. The goal is to predict future levels of Internet activity, SMS traffic, and voice call volume across a real-world cellular network grid covering the city of **Milan, Italy**.

The ability to forecast mobile network traffic allows Internet service providers (ISPs) and telecom operators to proactively allocate bandwidth, detect anomalies, and plan network capacity — a core requirement in intelligent 5G network management platforms.

---

## Dataset

**Source:** [Telecom Italia Big Data Challenge](https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/EGZHFV) — referenced in the paper *"A multi-source dataset of urban life in the city of Milan and the Province of Trentino"* (Scientific Data, Nature, 2015).

**Files used:**
- `df_call_detail_records_dec_cut.csv` — December 2013 CDR data for Milan

**Variables:**

| Column | Description |
|--------|-------------|
| `datetime` | Hourly timestamp (10-minute intervals aggregated) |
| `squareid` | Grid cell ID over Milan's geographic map (9998 unique cells) |
| `internet` | CDR count proportional to Internet data activity |
| `sms` | Activity proportional to SMS sent and received |
| `calls` | Activity proportional to voice calls placed and received |

**Focus area:** Grid cell **5161** — the cell with the highest cumulative Internet traffic across the entire month.

---

## Methodology

### 1. Data Preparation

- Loaded the CDR CSV and filtered observations for `squareid = 5161`
- Verified temporal completeness (no missing hourly timestamps)
- Applied **MinMax scaling** independently to each traffic variable

### 2. Sequence Generation

Used Keras `TimeseriesGenerator` with:
- **Look-back window:** 5 days = 120 hours (each prediction looks at the last 120 hourly readings)
- **Batch size:** 1
- **Train/test split:** last 7 days (168 hours) reserved for testing

### 3. Model Architecture

```
LSTM (units=64, input_shape=(120, 1))
  └── Dense (units=1, activation='relu')

Optimizer : Adam
Loss      : Mean Squared Error
Epochs    : 10
```

The same model was trained sequentially on Internet, SMS, and Calls traffic.

### 4. Future Forecast

A custom rolling-forecast function feeds the model's own predictions back as input to generate **72-hour (3-day) ahead forecasts** beyond the last available data point (Dec 23–26, 2013).

---

## Results

### RMSE on Training Data

| Variable | Train RMSE |
|----------|-----------|
| Internet | 12,905.79 |
| SMS      | 299.83    |
| Calls    | 175.36    |

### RMSE on Test Data (last 7 days)

| Variable | Test RMSE |
|----------|-----------|
| Internet | 13,080.64 |
| SMS      | 331.19    |
| Calls    | 176.44    |

The near-equal train/test RMSE values indicate the model generalises well without significant overfitting. The higher absolute RMSE on Internet traffic reflects the much larger scale of Internet CDR counts compared to SMS and Calls.

---

## Relevance to the Platform

This experiment serves as the **empirical validation** for the traffic forecasting component embedded in the Spring Boot microservices platform:

- The LSTM approach demonstrated here is mirrored by the `ml-service` (Django/TensorFlow), which exposes `/api/forecast/` endpoints consumed by the Angular dashboard.
- The `look_back = 120 hours` and `look_ahead = 72 hours` parameters used here directly informed the default configuration of the forecasting service.
- The RMSE results establish a performance baseline against which the live forecasting service metrics (MAE, RMSE, final_loss) are compared in the evaluation chapter.
- The Milan CDR dataset shares the same structural schema (`datetime`, traffic volume per grid cell) as the synthetic roaming CDR data generated in the platform's simulation layer.

---

## Dependencies

```
tensorflow >= 2.x
keras
numpy
pandas
scikit-learn
matplotlib
seaborn
```

---

## How to Run

1. Upload the notebook to [Kaggle](https://www.kaggle.com) or run locally with GPU support.
2. Place the dataset files under `../input/rnn-11/` (Internet/Calls) and `../input/rnn22/` (November data).
3. Run all cells sequentially (`Shift+Enter` or **Run All**).

> Note: Training on CPU is significantly slower. The Kaggle GPU environment (P100) was used for the results reported above, with ~6–8 seconds per epoch.

---

## References

- Barlacchi, G. et al. (2015). *A multi-source dataset of urban life in the city of Milan and the Province of Trentino*. Scientific Data, 2, 150055. https://doi.org/10.1038/sdata.2015.55
- Hochreiter, S. & Schmidhuber, J. (1997). *Long Short-Term Memory*. Neural Computation, 9(8), 1735–1780.
