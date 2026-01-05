from django.urls import path
from .views import UploadPDFView, DocumentListView, ExportExcelView

urlpatterns = [
    path("upload-pdfs/", UploadPDFView.as_view()),
    path("documents/", DocumentListView.as_view()),
    path("export-excel/", ExportExcelView.as_view()),
]
