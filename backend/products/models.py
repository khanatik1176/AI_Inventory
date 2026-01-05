from django.db import models

class Product(models.Model):
    product_name = models.CharField(max_length=255)
    brand_name = models.CharField(max_length=255)
    product_type = models.CharField(max_length=255)

    retail_price = models.FloatField()
    sale_price = models.FloatField()

    model_number = models.CharField(max_length=255)
    color = models.CharField(max_length=100)
    variants = models.CharField(max_length=255)
    vendor_name = models.CharField(max_length=255)

    post_excerpt = models.TextField(blank=True)
    meta_description = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.product_name
