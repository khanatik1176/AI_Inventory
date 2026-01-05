import pandas as pd
import csv
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import Product
from .serializers import ProductSerializer
from .parsers.pdf_parser import parse_pdf


class UploadProductFileView(APIView):
    """
    Accepts Excel (.xlsx) or PDF (.pdf)
    Parses rows and stores products in DB
    """

    def post(self, request):
        file = request.FILES.get("file")

        if not file:
            return Response(
                {"error": "No file uploaded"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            if file.name.endswith(".xlsx"):
                df = pd.read_excel(file)

            elif file.name.endswith(".pdf"):
                df = parse_pdf(file)

            else:
                return Response(
                    {"error": "Only .xlsx and .pdf files are supported"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            products = []

            for _, row in df.iterrows():
                product = Product.objects.create(
                    product_name=row.get("Product Name", ""),
                    brand_name=row.get("Brand Name", ""),
                    product_type=row.get("Product Type", ""),
                    retail_price=row.get("Retail Price", 0),
                    sale_price=row.get("Sale Price", 0),
                    model_number=row.get("Model Number", ""),
                    color=row.get("Color", ""),
                    variants=row.get("Variants", ""),
                    vendor_name=row.get("Vendor Name", ""),
                )
                products.append(product)

            serializer = ProductSerializer(products, many=True)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

class ProductListView(APIView):
    def get(self, request):
        products = Product.objects.all().order_by("-created_at")
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)

class ExportCSVView(APIView):
    def get(self, request):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="products.csv"'

        writer = csv.writer(response)

        writer.writerow([
            "Product Name",
            "Brand Name",
            "Product Type",
            "Retail Price",
            "Sale Price",
            "Model Number",
            "Color",
            "Variants",
            "Vendor Name",
        ])

        for p in Product.objects.all():
            writer.writerow([
                p.product_name,
                p.brand_name,
                p.product_type,
                p.retail_price,
                p.sale_price,
                p.model_number,
                p.color,
                p.variants,
                p.vendor_name,
            ])

        return response