from django.db import models

class PDFDocument(models.Model):
    filename = models.CharField(max_length=255)
    total_rows = models.IntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.filename


class Product(models.Model):
    document = models.ForeignKey(PDFDocument, on_delete=models.CASCADE, related_name="products")

    # Standardized fields
    product_name = models.CharField(max_length=255)
    brand_name = models.CharField(max_length=255, blank=True)
    product_type = models.CharField(max_length=255, blank=True)
    retail_price = models.FloatField(default=0)
    sale_price = models.FloatField(default=0)
    model_number = models.CharField(max_length=255, blank=True)
    color = models.CharField(max_length=100, blank=True)
    variants = models.CharField(max_length=255, blank=True)
    vendor_name = models.CharField(max_length=255, blank=True)

    # Dynamic columns from PDF headers you don't have
    extra_fields = models.JSONField(default=dict, blank=True)

    # Gemini output (SEO metadata)
    metadata = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.brand_name} {self.product_name}".strip()
