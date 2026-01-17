from django.db import models

class PDFDocument(models.Model):
    filename = models.CharField(max_length=255)
    file_hash = models.CharField(max_length=64, unique=True)  # ✅ block same PDF content
    total_rows = models.IntegerField(default=0)
    vendor_name = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.filename


class Product(models.Model):
    document = models.ForeignKey(PDFDocument, on_delete=models.CASCADE, related_name="products")

    # ✅ base_name is what comes from PDF (MODEL / MODEL NO)
    base_name = models.CharField(max_length=255, blank=True)

    # ✅ product_name can be updated once (formatted name)
    product_name = models.CharField(max_length=255)

    brand_name = models.CharField(max_length=255, blank=True)
    product_type = models.CharField(max_length=255, blank=True)

    retail_price = models.FloatField(default=0)
    sale_price = models.FloatField(default=0)

    model_number = models.CharField(max_length=255, blank=True)
    color = models.CharField(max_length=100, blank=True)
    variants = models.CharField(max_length=255, blank=True)

    vendor_name = models.CharField(max_length=255, blank=True)

    extra_fields = models.JSONField(default=dict, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    seo_name = models.CharField(max_length=400, blank=True)

    formatted_name_generated = models.BooleanField(default=False)  # ✅ generate product name only once

    created_at = models.DateTimeField(auto_now_add=True)
