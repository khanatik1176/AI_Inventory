from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterView, MeView

urlpatterns = [
    path("register/", RegisterView.as_view()),
    path("login/", TokenObtainPairView.as_view()),      # returns access/refresh :contentReference[oaicite:1]{index=1}
    path("refresh/", TokenRefreshView.as_view()),       # refresh -> new access :contentReference[oaicite:2]{index=2}
    path("me/", MeView.as_view()),
]
