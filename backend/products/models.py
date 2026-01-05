from django.db import models

class PDFDocument(models.Model):
    filename = models.CharField(max_length=255)
    total_rows = models.IntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.filename


class Product(models.Model):
    document = models.ForeignKey(
        PDFDocument,
        on_delete=models.CASCADE,
        related_name="products"
    )

    product_name = models.CharField(max_length=255)
    brand_name = models.CharField(max_length=255, blank=True)
    product_type = models.CharField(max_length=255, blank=True)
    retail_price = models.FloatField(default=0)
    sale_price = models.FloatField(default=0)
    model_number = models.CharField(max_length=255, blank=True)
    color = models.CharField(max_length=100, blank=True)
    variants = models.CharField(max_length=255, blank=True)
    vendor_name = models.CharField(max_length=255, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
