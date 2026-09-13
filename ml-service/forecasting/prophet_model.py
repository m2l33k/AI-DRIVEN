"""
Facebook Prophet forecaster.
Requires actual timestamps (not just "HH:00" labels) for seasonal decomposition.
Disables weekly/daily seasonality when the series is shorter than 2 weeks.
"""

import pandas as pd
from prophet import Prophet
import logging

logging.getLogger("prophet").setLevel(logging.WARNING)
logging.getLogger("cmdstanpy").setLevel(logging.WARNING)


def forecast(timestamps: list[str], values: list[float], hours_ahead: int) -> list[float]:
    if len(values) < 4:
        raise ValueError(f"Prophet needs ≥ 4 data points, got {len(values)}")

    df = pd.DataFrame({
        'ds': pd.to_datetime(timestamps, utc=True).tz_localize(None),
        'y': values,
    })

    span_days = (df['ds'].max() - df['ds'].min()).days
    m = Prophet(
        yearly_seasonality=False,
        weekly_seasonality=(span_days >= 14),
        daily_seasonality=(span_days >= 2),
        interval_width=0.80,
    )
    m.fit(df)

    last_ts = df['ds'].max()
    future_dates = [last_ts + pd.Timedelta(hours=i + 1) for i in range(hours_ahead)]
    future = pd.DataFrame({'ds': future_dates})

    forecast_df = m.predict(future)
    return [max(0.0, float(v)) for v in forecast_df['yhat'].values]
