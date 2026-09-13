"""
ARIMA forecaster using statsmodels.
Tries ARIMA(2,1,2) first; falls back to ARIMA(1,1,1) on failure.
"""

import warnings
import numpy as np
from statsmodels.tsa.arima.model import ARIMA


def forecast(values: list[float], hours_ahead: int) -> list[float]:
    if len(values) < 5:
        raise ValueError(f"ARIMA needs ≥ 5 data points, got {len(values)}")

    series = np.array(values, dtype=np.float64)

    for order in [(2, 1, 2), (1, 1, 1), (0, 1, 1)]:
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                model = ARIMA(series, order=order)
                result = model.fit()
                preds = result.forecast(steps=hours_ahead)
                return [max(0.0, float(p)) for p in preds]
        except Exception:
            continue

    raise RuntimeError("All ARIMA orders failed")
