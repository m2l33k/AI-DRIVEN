"""
Mock heavy ML dependencies at import time so CI can run without
installing TensorFlow (~500 MB), Prophet, or statsmodels.
This conftest is loaded before any test module.
"""
import sys
from unittest.mock import MagicMock

# Patch at the sys.modules level before any forecasting import
_HEAVY = [
    'tensorflow', 'tensorflow.keras',
    'prophet', 'prophet.forecaster',
    'statsmodels', 'statsmodels.tsa',
    'statsmodels.tsa.arima', 'statsmodels.tsa.arima.model',
    'pandas',
    'sklearn', 'sklearn.preprocessing',
]
for mod in _HEAVY:
    if mod not in sys.modules:
        sys.modules[mod] = MagicMock()

import django
from django.conf import settings
if not settings.configured:
    settings.configure(
        INSTALLED_APPS=['django.contrib.contenttypes', 'django.contrib.auth', 'rest_framework', 'forecasting'],
        DATABASES={},
        DEFAULT_AUTO_FIELD='django.db.models.BigAutoField',
        REST_FRAMEWORK={'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer']},
    )
    django.setup()
