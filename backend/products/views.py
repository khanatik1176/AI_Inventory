import pandas as pd
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import hashlib
import time

from .models import Product, PDFDocument
from .parsers.pdf_parser import parse_pdf


# In-memory set to track recent uploads (simple alternative to cache)
recent_uploads = {}

def clean_old_uploads():
    """Remove uploads older than 60 seconds"""
    current_time = time.time()
    to_remove = [key for key, timestamp in recent_uploads.items() if current_time - timestamp > 60]
    for key in to_remove:
        del recent_uploads[key]


class UploadPDFView(APIView):
    def post(self, request):
        files = request.FILES.getlist("files")

        if not files:
            return Response({"error": "No PDFs uploaded"}, status=400)

        # Clean old upload records
        clean_old_uploads()

        documents = []
        skipped = []
        errors = []
        MANDATORY_FIELDS = [
            "Product Name",
            "Brand Name",
            "Product Type",
            "Retail Price",
            "Sale Price",
            "Model Number",
            "Color",
            "Variants",
            "Vendor Name",
        ]

        for pdf in files:
            # Create a unique hash for this file to prevent duplicates
            pdf.seek(0)
            file_content = pdf.read()
            file_hash = hashlib.md5(file_content).hexdigest()
            pdf.seek(0)
            
            # Check if this exact file was uploaded in the last 60 seconds
            if file_hash in recent_uploads:
                skipped.append({
                    "filename": pdf.name,
                    "reason": "File upload already in progress or recently completed"
                })
                continue
            
            # Mark this file as being processed
            recent_uploads[file_hash] = time.time()
            
            try:
                df, all_columns = parse_pdf(pdf)

                # Identify extra columns
                extra_columns = [col for col in all_columns if col not in MANDATORY_FIELDS]

                document = PDFDocument.objects.create(
                    filename=pdf.name,
                    total_rows=len(df),
                )

                for idx, row in df.iterrows():
                    # Extract extra fields
                    extra_fields = {}
                    for col in extra_columns:
                        if col in row.index:
                            val = row[col]
                            # Handle pandas NA/None values properly
                            if pd.notna(val) and val != "" and str(val).strip() != "":
                                extra_fields[col] = str(val).strip()

                    # Convert prices to float, handle None/NaN
                    retail_price = 0
                    sale_price = 0
                    
                    try:
                        retail_val = row.get("Retail Price", 0)
                        if pd.notna(retail_val) and retail_val != "":
                            retail_price = float(str(retail_val).replace(",", "").strip())
                    except (ValueError, TypeError, AttributeError):
                        retail_price = 0
                        
                    try:
                        sale_val = row.get("Sale Price", 0)
                        if pd.notna(sale_val) and sale_val != "":
                            sale_price = float(str(sale_val).replace(",", "").strip())
                    except (ValueError, TypeError, AttributeError):
                        sale_price = 0

                    # Helper function to safely get string value
                    def safe_str(value):
                        if pd.isna(value) or value is None or value == "":
                            return ""
                        return str(value).strip()

                    Product.objects.create(
                        document=document,
                        product_name=safe_str(row.get("Product Name", "")),
                        brand_name=safe_str(row.get("Brand Name", "")),
                        product_type=safe_str(row.get("Product Type", "")),
                        retail_price=retail_price,
                        sale_price=sale_price,
                        model_number=safe_str(row.get("Model Number", "")),
                        color=safe_str(row.get("Color", "")),
                        variants=safe_str(row.get("Variants", "")),
                        vendor_name=safe_str(row.get("Vendor Name", "")),
                        extra_fields=extra_fields,
                    )

                documents.append({
                    "id": document.id,
                    "filename": document.filename,
                    "rows": document.total_rows,
                    "extra_fields": extra_columns,
                })
            except Exception as e:
                # Remove from recent uploads if processing failed
                if file_hash in recent_uploads:
                    del recent_uploads[file_hash]
                
                errors.append({
                    "filename": pdf.name,
                    "error": str(e)
                })
                continue

        response_data = {
            "message": f"Successfully processed {len(documents)} PDF(s)",
            "uploaded": len(documents),
            "skipped": len(skipped),
            "errors": len(errors),
            "documents": documents,
        }
        
        if skipped:
            response_data["skipped_files"] = skipped
            
        if errors:
            response_data["error_files"] = errors

        status_code = status.HTTP_201_CREATED if len(documents) > 0 else status.HTTP_400_BAD_REQUEST
        
        return Response(response_data, status=status_code)


class DocumentListView(APIView):
    def get(self, request):
        docs = PDFDocument.objects.all().order_by("-uploaded_at")
        total_count = docs.count()

        data = {
            "count": total_count,
            "documents": [
                {
                    "id": d.id,
                    "filename": d.filename,
                    "total_rows": d.total_rows,
                    "uploaded_at": d.uploaded_at,
                }
                for d in docs
            ]
        }

        return Response(data)


class ExportExcelView(APIView):
    def get(self, request):
        products = Product.objects.select_related("document").all()

        data = []
        for p in products:
            row_data = {
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
            }
            
            # Add extra fields to the row
            if p.extra_fields:
                row_data.update(p.extra_fields)
            
            data.append(row_data)

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
        total_count = products.count()

        data = {
            "count": total_count,
            "products": [
                {
                    "id": p.id,
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
                    "extra_fields": p.extra_fields,
                }
                for p in products
            ]
        }

        return Response(data)