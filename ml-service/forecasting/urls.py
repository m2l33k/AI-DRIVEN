from django.urls import path
from .views import ForecastView, TrainView, HealthView

urlpatterns = [
    path('forecast/', ForecastView.as_view()),
    path('train/', TrainView.as_view()),         # POST → start training, GET → status
    path('health/', HealthView.as_view()),
]
