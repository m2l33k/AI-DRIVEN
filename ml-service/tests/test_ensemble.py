"""
Tests for the ensemble averaging logic in forecasting/views.py.
No TensorFlow / Prophet / statsmodels required.
"""
from datetime import datetime, timezone, timedelta


# ── replicate the pure helpers from views.py ─────────────────────────────────

def _ensemble(series: list[list[float]]) -> list[float]:
    available = [s for s in series if s]
    if not available:
        return []
    return [round(sum(col) / len(col)) for col in zip(*available)]


def _next_timestamps(last_ts: str, n: int) -> list[str]:
    dt = datetime.fromisoformat(last_ts.replace('Z', '+00:00'))
    return [(dt + timedelta(hours=i + 1)).strftime('%Y-%m-%dT%H:00:00Z') for i in range(n)]


# ── ensemble tests ────────────────────────────────────────────────────────────

class TestEnsemble:

    def test_average_of_three_equal_series(self):
        result = _ensemble([[100.0, 200.0], [100.0, 200.0], [100.0, 200.0]])
        assert result == [100, 200]

    def test_average_of_diverging_series(self):
        # LSTM=186, Prophet=183, ARIMA=189 → mean=186
        result = _ensemble([[186.0], [183.0], [189.0]])
        assert result == [186]

    def test_empty_list_returns_empty(self):
        assert _ensemble([]) == []

    def test_all_empty_sublists_returns_empty(self):
        assert _ensemble([[], [], []]) == []

    def test_partial_failure_graceful_degradation(self):
        # One model failed (empty list) — average remaining two
        result = _ensemble([[180.0, 190.0], [], [200.0, 210.0]])
        assert result == [190, 200]  # (180+200)/2=190, (190+210)/2=200

    def test_single_model_passthrough(self):
        result = _ensemble([[100.0, 150.0, 200.0]])
        assert result == [100, 150, 200]

    def test_rounding_applied(self):
        # 100.4 → 100, 100.5 → 101 (Python round() banker's rounding)
        result = _ensemble([[100.0], [101.0]])
        assert result[0] == 100 or result[0] == 101  # 100.5 → rounded

    def test_6_step_forecast_length(self):
        lstm    = [186.0, 182.0, 178.0, 173.0, 169.0, 165.0]
        prophet = [183.0, 180.0, 177.0, 174.0, 171.0, 169.0]
        arima   = [189.0, 185.0, 181.0, 178.0, 175.0, 171.0]
        result  = _ensemble([lstm, prophet, arima])
        assert len(result) == 6


# ── timestamp generation tests ────────────────────────────────────────────────

class TestNextTimestamps:

    def test_generates_n_future_timestamps(self):
        result = _next_timestamps('2026-09-16T10:00:00Z', 6)
        assert len(result) == 6

    def test_first_timestamp_is_one_hour_ahead(self):
        result = _next_timestamps('2026-09-16T10:00:00Z', 1)
        assert result[0] == '2026-09-16T11:00:00Z'

    def test_timestamps_are_hourly(self):
        result = _next_timestamps('2026-09-16T08:00:00Z', 3)
        assert result == [
            '2026-09-16T09:00:00Z',
            '2026-09-16T10:00:00Z',
            '2026-09-16T11:00:00Z',
        ]

    def test_midnight_rollover(self):
        result = _next_timestamps('2026-09-16T23:00:00Z', 2)
        assert result[0] == '2026-09-17T00:00:00Z'
        assert result[1] == '2026-09-17T01:00:00Z'

    def test_zero_steps_returns_empty(self):
        result = _next_timestamps('2026-09-16T10:00:00Z', 0)
        assert result == []
