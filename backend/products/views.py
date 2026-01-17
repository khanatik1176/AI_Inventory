import hashlib
import time
import re
import pandas as pd
from django.core.paginator import Paginator
from django.http import HttpResponse

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import Product, PDFDocument
from .parsers.pdf_parser import parse_pdf
from .services import generate_product_metadata, fetch_seo_suggestions, create_seo_name


recent_uploads = {}

def clean_old_uploads():
    now = time.time()
    for k in list(recent_uploads.keys()):
        if now - recent_uploads[k] > 60:
            del recent_uploads[k]

def safe_str(v) -> str:
    if v is None:
        return ""
    if isinstance(v, float) and pd.isna(v):
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

def normalize_key(k: str) -> str:
    k = safe_str(k)
    k = re.sub(r"\s+", " ", k).strip()
    return k.upper()

def slug_join(*parts: str) -> str:
    cleaned = []
    for p in parts:
        p = safe_str(p)
        p = p.replace("/", " ").replace("|", " ")
        p = " ".join(p.split())
        p = p.replace(" ", "-")
        p = "".join(ch for ch in p if ch.isalnum() or ch in "-_")
        if p:
            cleaned.append(p)
    return "-".join(cleaned)

def is_valid_product_row(base_name: str, product_type: str, sale: float, retail: float) -> bool:
    # Must have a model/base name
    if not safe_str(base_name):
        return False

    # Reject footers / random strings
    joined = f"{base_name} {product_type}".lower()
    if "official distributor" in joined or "price list" in joined:
        return False

    # Optional: reject if all prices are zero AND looks like junk
    if sale == 0.0 and retail == 0.0 and len(base_name) < 2:
        return False

    return True

def detect_brand_from_pdf(pdf_file, filename="") -> str:
    fn = (filename or "").upper()

    # filename fallback
    if "SOUNDPEATS" in fn:
        return "SoundPEATS"
    if "QCY" in fn:
        return "QCY"
    if "HIFUTURE" in fn or "HI-FUTURE" in fn or "HI FUTURE" in fn:
        return "HiFuture"

    # PDF text fallback (first 2 pages)
    try:
        import pdfplumber
        pdf_file.seek(0)
        with pdfplumber.open(pdf_file) as pdf:
            text = " ".join((p.extract_text() or "") for p in pdf.pages[:2]).upper()
        if "SOUNDPEATS" in text:
            return "SoundPEATS"
        if "QCY" in text:
            return "QCY"
        if "HIFUTURE" in text or "HI-FUTURE" in text or "HI FUTURE" in text:
            return "HiFuture"
    except Exception:
        pass

    return ""



class UploadPDFView(APIView):
    def post(self, request):
        files = request.FILES.getlist("files")
        vendor_name = safe_str(request.data.get("vendor_name", ""))

        if not files:
            return Response({"error": "No PDFs uploaded"}, status=400)
        if not vendor_name:
            return Response({"error": "vendor_name is required"}, status=400)

        clean_old_uploads()

        uploaded_docs, skipped, errors = [], [], []

        def pick(row_dict, *keys):
            for k in keys:
                if k in row_dict and safe_str(row_dict[k]):
                    return row_dict[k]
            return ""

        for pdf in files:
            try:
                # Hash for dedupe by content (NOT filename)
                pdf.seek(0)
                file_bytes = pdf.read()
                pdf_hash = hashlib.md5(file_bytes).hexdigest()
                pdf.seek(0)

                if PDFDocument.objects.filter(file_hash=pdf_hash).exists():
                    skipped.append({"filename": pdf.name, "reason": "Exact PDF already exists"})
                    continue

                if pdf_hash in recent_uploads:
                    skipped.append({"filename": pdf.name, "reason": "Recent duplicate upload"})
                    continue
                recent_uploads[pdf_hash] = time.time()

                # Parse all pages
                df, _ = parse_pdf(pdf)
                if df.empty:
                    raise ValueError("No table rows found in PDF")

                brand = detect_brand_from_pdf(pdf, pdf.name)

                document = PDFDocument.objects.create(
                    filename=pdf.name,
                    total_rows=0,
                    vendor_name=vendor_name,
                    file_hash=pdf_hash,
                )

                inserted = 0
                extra_cols = set()
                for _, row in df.iterrows():
                    base_name = safe_str(row.get("MODEL"))
                    product_type = safe_str(row.get("TYPE"))
                    color = safe_str(row.get("COLOR"))
                    sale_price = safe_float(row.get("RP"))
                    retail_price = safe_float(row.get("MRP"))

                    # strong row validation (kills dummy rows)
                    if not base_name or not product_type:
                        continue
                    if sale_price <= 0 and retail_price <= 0:
                        continue

                    # Collect extra columns
                    extra_fields = {}
                    for k in row.keys():
                        norm_k = normalize_key(k)
                        if norm_k not in {"MODEL", "TYPE", "COLOR", "RP", "MRP"}:
                            extra_fields[norm_k] = safe_str(row.get(k))
                            extra_cols.add(norm_k)

                    Product.objects.create(
                        document=document,
                        base_name=base_name,          # ✅ keep original extracted model
                        product_name=base_name,       # ✅ shown initially
                        brand_name=brand or "SoundPEATS",  # fallback if needed
                        product_type=product_type,
                        retail_price=retail_price,
                        sale_price=sale_price,
                        color=color,
                        variants="",
                        vendor_name=vendor_name,
                        extra_fields=extra_fields,
                    )
                    inserted += 1
                document.total_rows = inserted
                document.save(update_fields=["total_rows"])

                uploaded_docs.append({
                    "id": document.id,
                    "filename": document.filename,
                    "rows": document.total_rows,
                    "vendor_name": document.vendor_name,
                    "extra_fields": list(extra_cols),
                })

            except Exception as e:
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
                    "vendor_name": d.vendor_name,
                    "total_rows": d.total_rows,
                    "uploaded_at": d.uploaded_at,
                } for d in docs
            ]
        })


class ProductTableView(APIView):
    def get(self, request):
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 20))
        page_size = max(1, min(page_size, 200))

        qs = Product.objects.select_related("document").all().order_by("-created_at")

        paginator = Paginator(qs, page_size)
        page_obj = paginator.get_page(page)

        products = []
        for p in page_obj.object_list:
            products.append({
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
                "metadata": p.metadata,
                "seo_name": p.seo_name,
                "formatted_name_generated": p.formatted_name_generated,
            })

        return Response({
            "count": qs.count(),
            "total_pages": paginator.num_pages,
            "page": page_obj.number,
            "page_size": page_size,
            "products": products,
        })


class ExportCSVView(APIView):
    def get(self, request):
        products = Product.objects.select_related("document").all()
        data = []
        for p in products:
            row = {
                "Document": p.document.filename,
                "Vendor Name": p.vendor_name,
                "Brand Name": p.brand_name,
                "Base Name": p.base_name,
                "Product Name": p.product_name,
                "SEO Name": p.seo_name,
                "Product Type": p.product_type,
                "Retail Price": p.retail_price,
                "Sale Price": p.sale_price,
                "Color": p.color,
                "Variants": p.variants,
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


class GenerateOnlineSeoNameView(APIView):
    def post(self, request):
        ids = request.data.get("product_ids", [])
        if not ids:
            return Response({"error": "product_ids required"}, status=400)

        updated, failed = 0, []
        for p in Product.objects.filter(id__in=ids):
            try:
                query = f"{p.brand_name} {p.base_name or p.product_name} {p.product_type}".strip()
                suggestions = fetch_seo_suggestions(query, 15)
                seo_name = create_seo_name({
                    "brand": p.brand_name,
                    "name": p.base_name or p.product_name,
                    "type": p.product_type,
                    "color": p.color,
                }, suggestions)
                p.seo_name = seo_name
                p.save(update_fields=["seo_name"])
                updated += 1
            except Exception as e:
                failed.append({"id": p.id, "error": str(e)})

        return Response({"updated": updated, "failed": failed})


class GenerateFormattedNameView(APIView):
    def post(self, request):
        ids = request.data.get("product_ids", [])
        if not ids:
            return Response({"error": "product_ids required"}, status=400)

        updated, failed = 0, []
        for p in Product.objects.filter(id__in=ids):
            try:
                if not p.seo_name or not p.seo_name.strip():
                    failed.append({"id": p.id, "error": "seo_name missing"})
                    continue

                # only once
                if p.formatted_name_generated:
                    failed.append({"id": p.id, "error": "already generated once"})
                    continue

                base = p.base_name or p.product_name

                # ✅ uses REAL seo_name (not hardcoded)
                new_name = slug_join(p.brand_name, base, p.product_type, p.seo_name)

                p.product_name = new_name
                p.formatted_name_generated = True
                p.save(update_fields=["product_name", "formatted_name_generated"])
                updated += 1

            except Exception as e:
                failed.append({"id": p.id, "error": str(e)})

        return Response({"updated": updated, "failed": failed})


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

        updated, failed = 0, []
        for p in qs:
            try:
                payload = {
                    "product_name": p.product_name,
                    "brand_name": p.brand_name,
                    "product_type": p.product_type,
                    "retail_price": p.retail_price,
                    "sale_price": p.sale_price,
                    "color": p.color,
                    "variants": p.variants,
                    "vendor_name": p.vendor_name,
                    "seo_name": p.seo_name,
                    "extra_fields": p.extra_fields,
                }
                p.metadata = generate_product_metadata(payload)
                p.save(update_fields=["metadata"])
                updated += 1
            except Exception as e:
                failed.append({"id": p.id, "error": str(e)})

        return Response({"updated": updated, "failed": failed})
