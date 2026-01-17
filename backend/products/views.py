import hashlib
import time
import pandas as pd

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import Product, PDFDocument
from .parsers.pdf_parser import parse_pdf
from .services import generate_product_metadata, fetch_titles, build_seo_name
from django.http import HttpResponse

recent_uploads = {}

def clean_old_uploads():
    now = time.time()
    for k in list(recent_uploads.keys()):
        if now - recent_uploads[k] > 60:
            del recent_uploads[k]

def safe_str(v) -> str:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return ""
    return str(v).strip()

def safe_float(v) -> float:
    try:
        if v is None or (isinstance(v, float) and pd.isna(v)):
            return 0.0
        s = str(v).replace(",", "").strip()
        return float(s) if s else 0.0
    except Exception:
        return 0.0


class UploadPDFView(APIView):
    def post(self, request):
        files = request.FILES.getlist("files")
        if not files:
            return Response({"error": "No PDFs uploaded"}, status=400)

        clean_old_uploads()

        uploaded_docs = []
        skipped = []
        errors = []

        # Canonical mapping from your PDFs -> DB fields
        # PDF examples: MODEL, TYPE, RP, MRP, Color, Key Features... :contentReference[oaicite:6]{index=6}
        # Some PDFs include MOP too :contentReference[oaicite:7]{index=7}
        FIELD_MAP = {
            "MODEL": "product_name",
            "TYPE": "product_type",
            "Color": "color",
            "RP": "sale_price",      # choose your meaning
            "MRP": "retail_price",
            "MOP": "variants",       # optional: store separately if you want
        }

        for pdf in files:
            pdf.seek(0)
            file_hash = hashlib.md5(pdf.read()).hexdigest()
            pdf.seek(0)

            if file_hash in recent_uploads:
                skipped.append({"filename": pdf.name, "reason": "Duplicate upload (recent)"})
                continue
            recent_uploads[file_hash] = time.time()

            try:
                df, all_columns = parse_pdf(pdf)
                if df.empty:
                    raise ValueError("No table rows found in PDF")

                document = PDFDocument.objects.create(filename=pdf.name, total_rows=len(df))

                # Compute extra columns found (not in our mapping keys)
                normalized_cols = [c.strip() for c in df.columns.tolist()]
                extra_cols = [c for c in normalized_cols if c not in FIELD_MAP.keys()]

                for _, row in df.iterrows():
                    row_dict = {k: row.get(k, "") for k in normalized_cols}

                    # Build extra_fields from unknown columns
                    extra_fields = {}
                    for col in extra_cols:
                        val = row_dict.get(col)
                        if pd.notna(val) and safe_str(val) != "":
                            extra_fields[col] = safe_str(val)

                    # Build product kwargs from known mapping
                    kwargs = {
                        "document": document,
                        "product_name": safe_str(row_dict.get("MODEL", "")),
                        "product_type": safe_str(row_dict.get("TYPE", "")),
                        "color": safe_str(row_dict.get("Color", "")) or safe_str(row_dict.get("COLOR", "")),
                        "sale_price": safe_float(row_dict.get("RP", 0)),
                        "retail_price": safe_float(row_dict.get("MRP", 0)),
                        "variants": safe_str(row_dict.get("MOP", "")),
                        "extra_fields": extra_fields,
                    }

                    # Optional: infer brand/vendor from filename
                    lower = pdf.name.lower()
                    if "hifuture" in lower:
                        kwargs["brand_name"] = "HiFuture"
                    elif "qcy" in lower:
                        kwargs["brand_name"] = "QCY"
                    elif "soundpeats" in lower:
                        kwargs["brand_name"] = "SoundPEATS"

                    Product.objects.create(**kwargs)

                uploaded_docs.append({
                    "id": document.id,
                    "filename": document.filename,
                    "rows": document.total_rows,
                    "extra_fields": extra_cols,
                })

            except Exception as e:
                if file_hash in recent_uploads:
                    del recent_uploads[file_hash]
                errors.append({"filename": pdf.name, "error": str(e)})

        resp = {
            "uploaded": len(uploaded_docs),
            "skipped": len(skipped),
            "errors": len(errors),
            "documents": uploaded_docs,
            "skipped_files": skipped,
            "error_files": errors,
        }
        status_code = status.HTTP_201_CREATED if uploaded_docs else status.HTTP_400_BAD_REQUEST
        return Response(resp, status=status_code)


class DocumentListView(APIView):
    def get(self, request):
        docs = PDFDocument.objects.all().order_by("-uploaded_at")
        return Response({
            "count": docs.count(),
            "documents": [
                {
                    "id": d.id,
                    "filename": d.filename,
                    "total_rows": d.total_rows,
                    "uploaded_at": d.uploaded_at,
                } for d in docs
            ]
        })



class ProductTableView(APIView):
    def get(self, request):
        products = Product.objects.select_related("document").all().order_by("-created_at")
        return Response({
            "count": products.count(),
            "products": [
                {
                    "id": p.id,
                    "document": p.document.filename,
                    "product_name": p.product_name,
                    "seo_name": p.seo_name,  # ✅ ADD THIS
                    "brand_name": p.brand_name,
                    "product_type": p.product_type,
                    "retail_price": p.retail_price,
                    "sale_price": p.sale_price,
                    "model_number": p.model_number,
                    "color": p.color,
                    "variants": p.variants,
                    "vendor_name": p.vendor_name,
                    "extra_fields": p.extra_fields,
                    "metadata": p.metadata,
                } for p in products
            ]
        })




class ExportCSVView(APIView):
    def get(self, request):
        products = Product.objects.select_related("document").all()

        data = []
        for p in products:
            row = {
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
                "Metadata": p.metadata,
            }
            if p.extra_fields:
                row.update(p.extra_fields)
            data.append(row)

        df = pd.DataFrame(data)

        resp = HttpResponse(content_type="text/csv")
        resp["Content-Disposition"] = 'attachment; filename="products.csv"'
        df.to_csv(resp, index=False)
        return resp

class GenerateMetadataView(APIView):
    def post(self, request):
        product_ids = request.data.get("product_ids")
        document_id = request.data.get("document_id")

        qs = Product.objects.all()
        if product_ids:
            qs = qs.filter(id__in=product_ids)
        elif document_id:
            qs = qs.filter(document_id=document_id)
        else:
            return Response({"error": "Provide product_ids or document_id"}, status=400)

        updated = 0
        failed = []

        for p in qs:
            try:
                payload = {
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

                p.metadata = generate_product_metadata(payload)
                p.save(update_fields=["metadata"])
                updated += 1
            except Exception as e:
                failed.append({"id": p.id, "error": str(e)})

        return Response({"updated": updated, "failed": failed})

        
def _clean_piece(s: str) -> str:
    s = (s or "").strip()
    s = " ".join(s.split())
    return s.replace("/", "-").replace("\\", "-").replace("|", "-")


class GenerateFormattedNameView(APIView):
    """
    Updates product_name ONLY ONCE and ONLY IF seo_name exists.

    Final format:
      Brand_Name-Product_Name-Product_Type-{seo_name}
    """

    def post(self, request):
        ids = request.data.get("product_ids", [])
        if not ids:
            return Response({"error": "product_ids required"}, status=400)

        updated = 0
        skipped = []

        for p in Product.objects.filter(id__in=ids):
            # ✅ must have seo_name
            if not p.seo_name or not str(p.seo_name).strip():
                skipped.append({"id": p.id, "reason": "seo_name not generated yet"})
                continue

            # ✅ only once: we mark using a flag pattern inside product_name
            # You can change this marker if you want
            if p.product_name and "|SEO|" in p.product_name:
                skipped.append({"id": p.id, "reason": "already formatted once"})
                continue

            brand = _clean_piece(p.brand_name) or "Brand"
            base = _clean_piece(p.product_name) or "Product"
            ptype = _clean_piece(p.product_type) or "Type"
            seo = _clean_piece(p.seo_name)

            # ✅ CONCAT ACTUAL seo_name
            formatted = f"{brand}-{base}-{ptype}|SEO|{seo}"

            # ensure length <= 255
            p.product_name = formatted[:255]
            p.save(update_fields=["product_name"])
            updated += 1

        return Response({"updated": updated, "skipped": skipped})


class GenerateOnlineSeoNameView(APIView):
    def post(self, request):
        ids = request.data.get("product_ids", [])
        if not ids:
            return Response({"error": "product_ids required"}, status=400)

        updated = 0
        failed = []

        for p in Product.objects.filter(id__in=ids):
            try:
                query = f"{p.brand_name} {p.product_name} {p.product_type}"
                suggestions = fetch_titles(query, 15)

                seo_name = build_seo_name({
                    "brand": p.brand_name,
                    "name": p.product_name,
                    "type": p.product_type,
                    "color": p.color,
                }, suggestions)

                # ✅ fallback if empty
                if not seo_name or not str(seo_name).strip():
                    seo_name = f"{p.brand_name} {p.product_name} {p.product_type}".strip()

                p.seo_name = seo_name[:500]
                p.save(update_fields=["seo_name"])
                updated += 1

            except Exception as e:
                failed.append({"id": p.id, "error": str(e)})

        return Response({"updated": updated, "failed": failed})
