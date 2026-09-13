"""
LSTM forecaster — Keras two-layer LSTM trained on the incoming history.
Trains a fresh model per unique data fingerprint and caches it in-process.
Rolling single-step prediction is used for multi-step ahead forecasting.
"""

import hashlib
import numpy as np

_cache: dict = {}  # fingerprint → (model, scaler_min, scaler_scale)


def _fingerprint(values: list[float]) -> str:
    raw = ",".join(f"{v:.2f}" for v in values)
    return hashlib.md5(raw.encode()).hexdigest()


def _build_sequences(scaled: np.ndarray, lookback: int):
    X, y = [], []
    for i in range(len(scaled) - lookback):
        X.append(scaled[i: i + lookback])
        y.append(scaled[i + lookback])
    return np.array(X), np.array(y)


def forecast(values: list[float], hours_ahead: int) -> list[float]:
    if len(values) < 6:
        raise ValueError(f"LSTM needs ≥ 6 data points, got {len(values)}")

    import tensorflow as tf  # deferred import — heavy, load once
    import os
    os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")

    lookback = min(24, max(3, len(values) // 3))
    fp = _fingerprint(values) + f"_{lookback}"

    if fp not in _cache:
        arr = np.array(values, dtype=np.float32)
        vmin, vmax = arr.min(), arr.max()
        scale = (vmax - vmin) if (vmax - vmin) > 0 else 1.0
        scaled = (arr - vmin) / scale

        X, y = _build_sequences(scaled, lookback)
        if len(X) == 0:
            raise ValueError("Not enough data to build LSTM sequences")

        X = X.reshape((X.shape[0], X.shape[1], 1))

        model = tf.keras.Sequential([
            tf.keras.layers.LSTM(64, return_sequences=True, input_shape=(lookback, 1)),
            tf.keras.layers.LSTM(32),
            tf.keras.layers.Dense(1),
        ])
        model.compile(optimizer='adam', loss='mse')
        model.fit(X, y, epochs=80, batch_size=max(1, len(X) // 4), verbose=0)

        _cache[fp] = (model, vmin, scale)

    model, vmin, scale = _cache[fp]
    arr = np.array(values, dtype=np.float32)
    scaled = (arr - vmin) / scale

    # Rolling prediction: feed last `lookback` values, append prediction, slide window
    window = list(scaled[-lookback:])
    preds_scaled = []
    for _ in range(hours_ahead):
        x = np.array(window[-lookback:]).reshape(1, lookback, 1)
        p = float(model.predict(x, verbose=0)[0][0])
        preds_scaled.append(p)
        window.append(p)

    return [max(0.0, float(p * scale + vmin)) for p in preds_scaled]
