from django.urls import path
from .views import (
    UploadProductFileView,
    ProductListView,
    ExportCSVView,
)

urlpatterns = [
    path("upload/", UploadProductFileView.as_view()),
    path("list/", ProductListView.as_view()),
    path("export/", ExportCSVView.as_view()),
]
