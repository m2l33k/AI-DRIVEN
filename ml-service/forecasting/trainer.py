"""
Central training orchestrator.
Trains LSTM, Prophet and ARIMA on an 80/20 train-test split, computes evaluation
metrics (MAE, RMSE, AIC) and stores the fitted model objects so ForecastView can
use them instead of lazy-training on every request.

State machine: idle → training → trained | error
Training runs in a daemon thread so the POST /api/train/ endpoint returns immediately.
"""

import threading
import math
from datetime import datetime, timezone

import numpy as np

# ── shared state ─────────────────────────────────────────────────────────────

_lock = threading.Lock()

_state: dict = {
    'status': 'idle',          # idle | training | trained | error
    'started_at': None,
    'finished_at': None,
    'data_points': 0,
    'train_points': 0,
    'test_points': 0,
    'metrics': {},
    'error': None,
}

# Fitted model objects — consumed by ForecastView
_models: dict = {
    'lstm': None,       # (keras_model, vmin, scale, lookback)
    'prophet': None,    # fitted Prophet instance
    'arima': None,      # fitted ARIMA result
}


def get_state() -> dict:
    with _lock:
        return dict(_state)


def get_models() -> dict:
    return _models


# ── public API ────────────────────────────────────────────────────────────────

def start_training(timestamps: list[str], values: list[float]) -> None:
    with _lock:
        if _state['status'] == 'training':
            return  # already in progress
        _state.update({
            'status': 'training',
            'started_at': _now(),
            'finished_at': None,
            'data_points': len(values),
            'train_points': int(len(values) * 0.8),
            'test_points': len(values) - int(len(values) * 0.8),
            'metrics': {},
            'error': None,
        })

    t = threading.Thread(target=_run, args=(timestamps, values), daemon=True)
    t.start()


# ── private training logic ────────────────────────────────────────────────────

def _run(timestamps: list[str], values: list[float]) -> None:
    metrics: dict = {}
    split = int(len(values) * 0.8)
    train_v = values[:split]
    test_v = values[split:]
    train_ts = timestamps[:split]
    test_ts = timestamps[split:]

    try:
        metrics['lstm'] = _train_lstm(train_v, test_v)
    except Exception as e:
        metrics['lstm'] = {'error': str(e)}

    try:
        metrics['prophet'] = _train_prophet(train_ts, train_v, test_ts, test_v)
    except Exception as e:
        metrics['prophet'] = {'error': str(e)}

    try:
        metrics['arima'] = _train_arima(train_v, test_v)
    except Exception as e:
        metrics['arima'] = {'error': str(e)}

    with _lock:
        if any('error' in m for m in metrics.values() if isinstance(m, dict)):
            partial = {k: v for k, v in metrics.items() if 'error' not in v}
            if len(partial) == 0:
                _state['status'] = 'error'
                _state['error'] = 'All models failed to train'
            else:
                _state['status'] = 'trained'
        else:
            _state['status'] = 'trained'

        _state['metrics'] = metrics
        _state['finished_at'] = _now()


# ── LSTM ──────────────────────────────────────────────────────────────────────

def _train_lstm(train_v: list[float], test_v: list[float]) -> dict:
    import tensorflow as tf
    import os
    os.environ.setdefault('TF_CPP_MIN_LOG_LEVEL', '3')

    all_v = train_v + test_v
    arr = np.array(all_v, dtype=np.float32)
    vmin, vmax = arr.min(), arr.max()
    scale = float(vmax - vmin) if (vmax - vmin) > 0 else 1.0

    train_scaled = (np.array(train_v, dtype=np.float32) - vmin) / scale
    lookback = min(24, max(3, len(train_v) // 3))

    X, y = [], []
    for i in range(len(train_scaled) - lookback):
        X.append(train_scaled[i:i + lookback])
        y.append(train_scaled[i + lookback])
    X, y = np.array(X).reshape(-1, lookback, 1), np.array(y)

    model = tf.keras.Sequential([
        tf.keras.layers.LSTM(64, return_sequences=True, input_shape=(lookback, 1)),
        tf.keras.layers.LSTM(32),
        tf.keras.layers.Dense(1),
    ])
    model.compile(optimizer='adam', loss='mse')
    history = model.fit(X, y, epochs=100, batch_size=max(1, len(X) // 4), verbose=0)

    # evaluate on test set (rolling prediction)
    window = list(train_scaled[-lookback:])
    preds_s = []
    for _ in range(len(test_v)):
        x = np.array(window[-lookback:]).reshape(1, lookback, 1)
        p = float(model.predict(x, verbose=0)[0][0])
        preds_s.append(p)
        window.append(p)

    preds = [max(0.0, p * scale + vmin) for p in preds_s]
    mae = float(np.mean(np.abs(np.array(preds) - np.array(test_v))))
    rmse = float(math.sqrt(np.mean((np.array(preds) - np.array(test_v)) ** 2)))
    final_loss = float(history.history['loss'][-1])

    _models['lstm'] = (model, vmin, scale, lookback)
    return {
        'mae': round(mae, 2),
        'rmse': round(rmse, 2),
        'final_loss': round(final_loss, 6),
        'epochs': 100,
        'lookback': lookback,
    }


# ── Prophet ───────────────────────────────────────────────────────────────────

def _train_prophet(train_ts, train_v, test_ts, test_v) -> dict:
    import pandas as pd
    from prophet import Prophet
    import logging
    logging.getLogger('prophet').setLevel(logging.WARNING)
    logging.getLogger('cmdstanpy').setLevel(logging.WARNING)

    df = pd.DataFrame({
        'ds': pd.to_datetime(train_ts, utc=True).tz_localize(None),
        'y': train_v,
    })
    span_days = (df['ds'].max() - df['ds'].min()).days
    m = Prophet(
        yearly_seasonality=False,
        weekly_seasonality=(span_days >= 14),
        daily_seasonality=(span_days >= 2),
        interval_width=0.80,
    )
    m.fit(df)
    _models['prophet'] = m

    # evaluate
    test_df = pd.DataFrame({'ds': pd.to_datetime(test_ts, utc=True).tz_localize(None)})
    forecast = m.predict(test_df)
    preds = [max(0.0, float(v)) for v in forecast['yhat'].values]
    rmse = float(math.sqrt(np.mean((np.array(preds) - np.array(test_v)) ** 2)))
    mae = float(np.mean(np.abs(np.array(preds) - np.array(test_v))))

    return {
        'mae': round(mae, 2),
        'rmse': round(rmse, 2),
        'weekly_seasonality': span_days >= 14,
        'daily_seasonality': span_days >= 2,
    }


# ── ARIMA ─────────────────────────────────────────────────────────────────────

def _train_arima(train_v: list[float], test_v: list[float]) -> dict:
    import warnings
    from statsmodels.tsa.arima.model import ARIMA

    series = np.array(train_v, dtype=np.float64)
    result = None
    chosen_order = None

    for order in [(2, 1, 2), (1, 1, 1), (0, 1, 1)]:
        try:
            with warnings.catch_warnings():
                warnings.simplefilter('ignore')
                fitted = ARIMA(series, order=order).fit()
                result = fitted
                chosen_order = order
                break
        except Exception:
            continue

    if result is None:
        raise RuntimeError('All ARIMA orders failed during training')

    _models['arima'] = result

    preds = [max(0.0, float(p)) for p in result.forecast(steps=len(test_v))]
    rmse = float(math.sqrt(np.mean((np.array(preds) - np.array(test_v)) ** 2)))
    mae = float(np.mean(np.abs(np.array(preds) - np.array(test_v))))

    return {
        'mae': round(mae, 2),
        'rmse': round(rmse, 2),
        'aic': round(float(result.aic), 2),
        'order': list(chosen_order),
    }


# ── helpers ───────────────────────────────────────────────────────────────────

def _now() -> str:
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
