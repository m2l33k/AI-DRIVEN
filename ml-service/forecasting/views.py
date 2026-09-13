"""
POST /api/forecast/          — run all 3 ML models (uses pre-trained if available)
GET  /api/forecast/status/   — health + whether models are trained
POST /api/train/             — trigger background training with metrics
GET  /api/train/status/      — training state + metrics
GET  /api/health/            — simple UP check
"""

import logging
from datetime import timedelta, timezone, datetime

import numpy as np
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from . import lstm_model, prophet_model, arima_model, trainer

log = logging.getLogger(__name__)


# ── helpers ───────────────────────────────────────────────────────────────────

def _next_timestamps(last_ts: str, n: int) -> list[str]:
    dt = datetime.fromisoformat(last_ts.replace('Z', '+00:00'))
    return [(dt + timedelta(hours=i + 1)).strftime('%Y-%m-%dT%H:00:00Z') for i in range(n)]


def _points(timestamps: list[str], values: list[float]) -> list[dict]:
    return [{'timestamp': ts, 'subscribers': round(v), 'predicted': True}
            for ts, v in zip(timestamps, values)]


def _ensemble(series: list[list[float]]) -> list[float]:
    available = [s for s in series if s]
    if not available:
        return []
    return [round(sum(col) / len(col)) for col in zip(*available)]


# ── Forecast ──────────────────────────────────────────────────────────────────

class ForecastView(APIView):
    def post(self, request):
        history = request.data.get('history', [])
        hours_ahead = int(request.data.get('hours_ahead', 6))

        if len(history) < 4:
            return Response({'error': 'Need ≥ 4 history points'}, status=status.HTTP_400_BAD_REQUEST)

        timestamps = [h['timestamp'] for h in history]
        values = [float(h['subscribers']) for h in history]
        last_ts = timestamps[-1]
        future_ts = _next_timestamps(last_ts, hours_ahead)

        models = trainer.get_models()
        result = {'history': history, 'errors': {}}

        # LSTM — use pre-trained model if available, else lazy-train
        try:
            pre = models.get('lstm')
            if pre is not None:
                keras_model, vmin, scale, lookback = pre
                arr = np.array(values, dtype=np.float32)
                scaled = (arr - vmin) / scale
                window = list(scaled[-lookback:])
                preds_s = []
                for _ in range(hours_ahead):
                    x = np.array(window[-lookback:]).reshape(1, lookback, 1)
                    p = float(keras_model.predict(x, verbose=0)[0][0])
                    preds_s.append(p)
                    window.append(p)
                lstm_vals = [max(0.0, p * scale + vmin) for p in preds_s]
            else:
                lstm_vals = lstm_model.forecast(values, hours_ahead)
            result['lstm'] = _points(future_ts, lstm_vals)
        except Exception as e:
            log.warning('LSTM forecast failed: %s', e)
            result['lstm'] = []
            result['errors']['lstm'] = str(e)

        # Prophet — use pre-trained model if available
        try:
            import pandas as pd
            pre = models.get('prophet')
            if pre is not None:
                test_df = pd.DataFrame({'ds': pd.to_datetime(future_ts, utc=True).tz_localize(None)})
                fc = pre.predict(test_df)
                prophet_vals = [max(0.0, float(v)) for v in fc['yhat'].values]
            else:
                prophet_vals = prophet_model.forecast(timestamps, values, hours_ahead)
            result['prophet'] = _points(future_ts, prophet_vals)
        except Exception as e:
            log.warning('Prophet forecast failed: %s', e)
            result['prophet'] = []
            result['errors']['prophet'] = str(e)

        # ARIMA — use pre-trained model if available
        try:
            pre = models.get('arima')
            if pre is not None:
                arima_vals = [max(0.0, float(p)) for p in pre.forecast(steps=hours_ahead)]
            else:
                arima_vals = arima_model.forecast(values, hours_ahead)
            result['arima'] = _points(future_ts, arima_vals)
        except Exception as e:
            log.warning('ARIMA forecast failed: %s', e)
            result['arima'] = []
            result['errors']['arima'] = str(e)

        # Ensemble
        ens = _ensemble([
            [p['subscribers'] for p in result[m]] for m in ('lstm', 'prophet', 'arima') if result[m]
        ])
        result['ensemble'] = _points(future_ts, ens) if ens else []

        if not result['errors']:
            del result['errors']

        state = trainer.get_state()
        result['model_status'] = state['status']
        result['trained_at'] = state.get('finished_at')

        return Response(result)


# ── Training ──────────────────────────────────────────────────────────────────

class TrainView(APIView):
    def post(self, request):
        history = request.data.get('history', [])
        if len(history) < 10:
            return Response(
                {'error': f'Training needs ≥ 10 data points, got {len(history)}'},
                status=status.HTTP_400_BAD_REQUEST)

        timestamps = [h['timestamp'] for h in history]
        values = [float(h['subscribers']) for h in history]

        trainer.start_training(timestamps, values)
        return Response({
            'status': 'started',
            'data_points': len(values),
            'train_points': int(len(values) * 0.8),
            'test_points': len(values) - int(len(values) * 0.8),
            'message': 'Training started in background. Poll GET /api/train/status/ for progress.',
        })

    def get(self, request):
        return Response(trainer.get_state())


# ── Health ────────────────────────────────────────────────────────────────────

class HealthView(APIView):
    def get(self, request):
        state = trainer.get_state()
        return Response({
            'status': 'UP',
            'service': 'ml-forecasting-service',
            'model_status': state['status'],
            'trained_at': state.get('finished_at'),
        })
