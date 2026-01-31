from rest_framework import serializers
from .models import Product, PDFDocument, Vendor

class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = "__all__"

class PDFDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PDFDocument
        fields = "__all__"

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = "__all__"
        read_only_fields = ["metadata", "seo_name", "formatted_name_generated", "created_at"]
