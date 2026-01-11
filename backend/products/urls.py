from django.urls import path
from .views import (
    UploadPDFView,
    DocumentListView,
    ProductTableView,
    ExportCSVView,
    GenerateMetadataView,
)

urlpatterns = [
    path("upload-pdfs/", UploadPDFView.as_view()),
    path("documents/", DocumentListView.as_view()),
    path("list/", ProductTableView.as_view()),
    path("export-csv/", ExportCSVView.as_view()),
    path("generate-metadata/", GenerateMetadataView.as_view()),
]
