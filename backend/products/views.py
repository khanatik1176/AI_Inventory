import pandas as pd
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import Product, PDFDocument
from .parsers.pdf_parser import parse_pdf


class UploadPDFView(APIView):
    def post(self, request):
        files = request.FILES.getlist("files")

        if not files:
            return Response({"error": "No PDFs uploaded"}, status=400)

        documents = []

        for pdf in files:
            df = parse_pdf(pdf)

            document = PDFDocument.objects.create(
                filename=pdf.name,
                total_rows=len(df),
            )

            for _, row in df.iterrows():
                Product.objects.create(
                    document=document,
                    product_name=row["Product Name"],
                    brand_name=row["Brand Name"],
                    product_type=row["Product Type"],
                    retail_price=row["Retail Price"],
                    sale_price=row["Sale Price"],
                    model_number=row["Model Number"],
                    color=row["Color"],
                    variants=row["Variants"],
                    vendor_name=row["Vendor Name"],
                )

            documents.append({
                "id": document.id,
                "filename": document.filename,
                "rows": document.total_rows,
            })

        return Response(
            {"message": "PDFs processed", "documents": documents},
            status=status.HTTP_201_CREATED,
        )

class DocumentListView(APIView):
    def get(self, request):
        docs = PDFDocument.objects.all().order_by("-uploaded_at")

        data = [
            {
                "id": d.id,
                "filename": d.filename,
                "total_rows": d.total_rows,
                "uploaded_at": d.uploaded_at,
            }
            for d in docs
        ]

        return Response(data)

class ExportExcelView(APIView):
    def get(self, request):
        products = Product.objects.select_related("document").all()

        data = []
        for p in products:
            data.append({
                "Document": p.document.filename,
                "Product Name": p.product_name,
                "Brand Name": p.brand_name,
                "Product Type": p.product_type,
                "Retail Price": p.retail_price,
                "Sale Price": p.sale_price,
                "Model Number": p.model_number,
                "Color": p.color,
                "Variants": p.variants,
                "Vendor Name": p.vendor_name,
            })

        df = pd.DataFrame(data)

        response = HttpResponse(
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response["Content-Disposition"] = 'attachment; filename="products.xlsx"'

        df.to_excel(response, index=False)
        return response

class ProductTableView(APIView):
    def get(self, request):
        products = Product.objects.select_related("document").all().order_by("-created_at")

        data = []
        for p in products:
            data.append({
                "document": p.document.filename,
                "product_name": p.product_name,
                "brand_name": p.brand_name,
                "product_type": p.product_type,
                "retail_price": p.retail_price,
                "sale_price": p.sale_price,
                "model_number": p.model_number,
                "color": p.color,
                "variants": p.variants,
                "vendor_name": p.vendor_name,
            })

        return Response(data)



