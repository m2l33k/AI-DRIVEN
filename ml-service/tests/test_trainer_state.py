"""
Tests for the trainer state machine in forecasting/trainer.py.
Heavy imports (TF, Prophet, statsmodels) are mocked via conftest.py.
We patch _train_lstm / _train_prophet / _train_arima so no real training occurs.
"""
import time
from unittest.mock import patch, MagicMock

import forecasting.trainer as trainer


def _reset():
    """Reset trainer state between tests."""
    with trainer._lock:
        trainer._state.update({
            'status': 'idle',
            'started_at': None,
            'finished_at': None,
            'data_points': 0,
            'train_points': 0,
            'test_points': 0,
            'metrics': {},
            'error': None,
        })
        trainer._models['lstm'] = None
        trainer._models['prophet'] = None
        trainer._models['arima'] = None


TIMESTAMPS = [f'2026-09-16T{h:02d}:00:00Z' for h in range(20)]
VALUES     = [100.0 + i for i in range(20)]


class TestTrainerStateMachine:

    def setup_method(self):
        _reset()

    def test_initial_state_is_idle(self):
        state = trainer.get_state()
        assert state['status'] == 'idle'
        assert state['data_points'] == 0

    def test_start_training_transitions_to_training(self):
        mock_metrics = {'mae': 1.0, 'rmse': 1.5}
        with patch.object(trainer, '_train_lstm',    return_value={**mock_metrics, 'final_loss': 0.001, 'epochs': 100, 'lookback': 6}), \
             patch.object(trainer, '_train_prophet', return_value=mock_metrics), \
             patch.object(trainer, '_train_arima',   return_value={**mock_metrics, 'aic': -100.0, 'order': [2,1,2]}):
            trainer.start_training(TIMESTAMPS, VALUES)
            # immediately after start_training, status should be 'training' or 'trained'
            # (thread may have finished already in CI)
            state = trainer.get_state()
            assert state['status'] in ('training', 'trained')
            assert state['data_points'] == 20
            assert state['train_points'] == 16  # 80% of 20
            assert state['test_points']  == 4

    def test_training_completes_with_all_metrics(self):
        mock_metrics = {'mae': 2.1, 'rmse': 3.0}
        with patch.object(trainer, '_train_lstm',    return_value={**mock_metrics, 'final_loss': 0.002, 'epochs': 100, 'lookback': 6}), \
             patch.object(trainer, '_train_prophet', return_value=mock_metrics), \
             patch.object(trainer, '_train_arima',   return_value={**mock_metrics, 'aic': -120.0, 'order': [2,1,2]}):
            trainer.start_training(TIMESTAMPS, VALUES)
            # wait for background thread (max 3s)
            for _ in range(30):
                if trainer.get_state()['status'] == 'trained':
                    break
                time.sleep(0.1)

        state = trainer.get_state()
        assert state['status'] == 'trained'
        assert 'lstm' in state['metrics']
        assert 'prophet' in state['metrics']
        assert 'arima' in state['metrics']
        assert state['finished_at'] is not None

    def test_concurrent_start_training_is_ignored(self):
        """Second call while training is in progress should be a no-op."""
        with patch.object(trainer, '_train_lstm',    return_value={'mae': 1.0, 'rmse': 1.5, 'final_loss': 0.001, 'epochs': 100, 'lookback': 6}), \
             patch.object(trainer, '_train_prophet', return_value={'mae': 1.0, 'rmse': 1.5}), \
             patch.object(trainer, '_train_arima',   return_value={'mae': 1.0, 'rmse': 1.5, 'aic': -100.0, 'order': [2,1,2]}):
            trainer.start_training(TIMESTAMPS, VALUES)
            first_started = trainer.get_state()['started_at']
            trainer.start_training(TIMESTAMPS, VALUES)
            second_started = trainer.get_state()['started_at']
        # started_at should not have changed — second call was ignored
        assert first_started == second_started

    def test_get_models_returns_dict_with_three_keys(self):
        models = trainer.get_models()
        assert 'lstm' in models
        assert 'prophet' in models
        assert 'arima' in models

    def test_80_20_split_calculation(self):
        n = 50
        ts = [f'2026-01-01T{h:02d}:00:00Z' for h in range(n)]
        vs = [float(i) for i in range(n)]
        with patch.object(trainer, '_train_lstm',    return_value={'mae': 1.0, 'rmse': 1.5, 'final_loss': 0.001, 'epochs': 100, 'lookback': 6}), \
             patch.object(trainer, '_train_prophet', return_value={'mae': 1.0, 'rmse': 1.5}), \
             patch.object(trainer, '_train_arima',   return_value={'mae': 1.0, 'rmse': 1.5, 'aic': -100.0, 'order': [2,1,2]}):
            trainer.start_training(ts, vs)
            state = trainer.get_state()
        assert state['train_points'] == 40  # int(50 * 0.8)
        assert state['test_points']  == 10


class TestTrainerPartialFailure:

    def setup_method(self):
        _reset()

    def test_partial_failure_keeps_status_trained(self):
        """If at least one model succeeds, status should be 'trained', not 'error'."""
        with patch.object(trainer, '_train_lstm',    side_effect=RuntimeError('TF OOM')), \
             patch.object(trainer, '_train_prophet', return_value={'mae': 2.0, 'rmse': 3.0}), \
             patch.object(trainer, '_train_arima',   return_value={'mae': 2.5, 'rmse': 3.5, 'aic': -90.0, 'order': [1,1,1]}):
            trainer.start_training(TIMESTAMPS, VALUES)
            for _ in range(30):
                if trainer.get_state()['status'] in ('trained', 'error'):
                    break
                time.sleep(0.1)

        state = trainer.get_state()
        assert state['status'] == 'trained'
        assert 'error' in state['metrics'].get('lstm', {})

    def test_all_models_fail_sets_error_status(self):
        with patch.object(trainer, '_train_lstm',    side_effect=RuntimeError('fail')), \
             patch.object(trainer, '_train_prophet', side_effect=RuntimeError('fail')), \
             patch.object(trainer, '_train_arima',   side_effect=RuntimeError('fail')):
            trainer.start_training(TIMESTAMPS, VALUES)
            for _ in range(30):
                if trainer.get_state()['status'] in ('trained', 'error'):
                    break
                time.sleep(0.1)

        assert trainer.get_state()['status'] == 'error'
