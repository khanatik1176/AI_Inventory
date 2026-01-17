"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, API_BASE } from "@/lib/api";

type Product = {
  id?: number;
  document: string;

  product_name: string;
  brand_name: string;
  product_type: string;

  retail_price: number;
  sale_price: number;

  model_number: string;
  color: string;
  variants: string;

  vendor_name: string;

  extra_fields?: Record<string, any>;
  metadata?: Record<string, any>;
  seo_name?: string;

  formatted_name_generated?: boolean;
};

type Doc = {
  id: number;
  filename: string;
  total_rows: number;
  uploaded_at: string;
  vendor_name?: string;
  extra_fields?: string[];
};

function classNames(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

const ENDPOINTS = {
  UPLOAD: "/api/products/upload-pdfs/",
  DOCS: "/api/products/documents/",
  LIST: "/api/products/list/",
  EXPORT_CSV: `${API_BASE}/api/products/export-csv/`,

  GENERATE_METADATA: "/api/products/generate-metadata/",
  GENERATE_ONLINE_SEO_NAME: "/api/products/generate-online-seo-name/",
  GENERATE_FORMATTED_NAME: "/api/products/generate-formatted-name/",
};

export default function Page() {
  const [files, setFiles] = useState<File[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [openDocs, setOpenDocs] = useState(false);

  const [loadingUpload, setLoadingUpload] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [loadingSeo, setLoadingSeo] = useState(false);
  const [loadingName, setLoadingName] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [allExtraFields, setAllExtraFields] = useState<Set<string>>(new Set());
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(
    new Set()
  );

  const [vendorName, setVendorName] = useState("");

  // ✅ pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);

  const allSelectableCount = useMemo(
    () => products.filter((p) => p.id).length,
    [products]
  );

  const selectedCount = selectedProductIds.size;

  const fetchDocs = useCallback(async () => {
    try {
      const res = await api.get(ENDPOINTS.DOCS);
      setDocs(res.data.documents || res.data || []);
    } catch (e) {
      console.error(e);
      setError("Failed to fetch documents");
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await api.get(
        `${ENDPOINTS.LIST}?page=${page}&page_size=${pageSize}`
      );
      const productsData = res.data.products || [];
      setProducts(productsData);
      setTotalPages(res.data.total_pages || 1);

      const extraFieldKeys = new Set<string>();
      productsData.forEach((p: Product) => {
        if (p.extra_fields) {
          Object.keys(p.extra_fields).forEach((key) => extraFieldKeys.add(key));
        }
      });
      setAllExtraFields(extraFieldKeys);
    } catch (e) {
      console.error(e);
      setError("Failed to fetch products");
    } finally {
      setLoadingProducts(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchDocs();
    fetchProducts();
  }, [fetchDocs, fetchProducts]);

  useEffect(() => {
    if (!error && !success) return;
    const timer = setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [error, success]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === "application/pdf"
    );
    if (!dropped.length) return;

    setFiles((prev) => {
      const existing = new Set(prev.map((f) => `${f.name}-${f.size}`));
      const newOnes = dropped.filter(
        (f) => !existing.has(`${f.name}-${f.size}`)
      );
      return [...prev, ...newOnes];
    });

    setError(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    setFiles((prev) => {
      const existing = new Set(prev.map((f) => `${f.name}-${f.size}`));
      const newOnes = selected.filter(
        (f) => !existing.has(`${f.name}-${f.size}`)
      );
      return [...prev, ...newOnes];
    });

    setError(null);
  };

  const removeFile = (idx: number) => {
    setFiles((s) => s.filter((_, i) => i !== idx));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearAllFiles = () => {
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const upload = async () => {
    if (files.length === 0 || uploadingRef.current) return;

    if (!vendorName.trim()) {
      setError("Please select a vendor before uploading.");
      return;
    }

    uploadingRef.current = true;
    setLoadingUpload(true);
    setError(null);
    setSuccess(null);

    try {
      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      form.append("vendor_name", vendorName);

      const res = await api.post(ENDPOINTS.UPLOAD, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";

      const uploaded = res.data.uploaded ?? 0;
      const skipped = res.data.skipped ?? 0;

      let message = `Uploaded ${uploaded} PDF(s).`;
      if (skipped > 0) message += ` Skipped ${skipped} duplicate(s).`;
      setSuccess(message);

      // Show toast for each skipped file with its reason
      if (Array.isArray(res.data.skipped_files) && res.data.skipped_files.length > 0) {
        const skippedMessages = res.data.skipped_files
          .map((file: { filename: string; reason: string }) =>
            `File "${file.filename}" was skipped: ${file.reason}`
          )
          .join("\n");
        setError(skippedMessages);
      }

      // refresh
      await fetchDocs();

      // reset pagination to first page after upload
      setPage(1);
      await fetchProducts();

      setSelectedProductIds(new Set());
    } catch (e: any) {
      console.error(e);
      setError(
        e.response?.data?.error ||
          "Failed to upload PDFs"
      );
    } finally {
      setLoadingUpload(false);
      setVendorName("");
      uploadingRef.current = false;
    }
  };

  const toggleSelectProduct = (id?: number) => {
    if (!id) return;
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedProductIds(new Set());

  const selectAll = () => {
    const ids = products.map((p) => p.id).filter(Boolean) as number[];
    setSelectedProductIds(new Set(ids));
  };

  const selectedProducts = useMemo(() => {
    const ids = selectedProductIds;
    return products.filter((p) => p.id && ids.has(p.id));
  }, [products, selectedProductIds]);

  const missingSeoForSelected = useMemo(() => {
    return selectedProducts.filter(
      (p) => !p.seo_name || String(p.seo_name).trim().length === 0
    );
  }, [selectedProducts]);

  const alreadyFormattedSelected = useMemo(() => {
    return selectedProducts.filter((p) => p.formatted_name_generated);
  }, [selectedProducts]);

  const generateMetadataForSelected = async () => {
    const ids = Array.from(selectedProductIds);
    if (ids.length === 0) {
      setError("Select at least 1 product first.");
      return;
    }

    setLoadingMeta(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await api.post(ENDPOINTS.GENERATE_METADATA, {
        product_ids: ids,
      });

      const updated = res.data.updated ?? 0;
      const failed = res.data.failed?.length ?? 0;

      setSuccess(
        `Metadata generated: ${updated} updated${
          failed ? `, ${failed} failed` : ""
        }`
      );

      await fetchProducts();
    } catch (e: any) {
      console.error(e);
      setError(e.response?.data?.error || "Failed to generate metadata");
    } finally {
      setLoadingMeta(false);
    }
  };

  const generateMetadataForDocument = async (docId: number) => {
    setLoadingMeta(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await api.post(ENDPOINTS.GENERATE_METADATA, {
        document_id: docId,
      });

      const updated = res.data.updated ?? 0;
      const failed = res.data.failed?.length ?? 0;

      setSuccess(
        `Metadata generated for document: ${updated} updated${
          failed ? `, ${failed} failed` : ""
        }`
      );
      await fetchProducts();
    } catch (e: any) {
      console.error(e);
      setError(
        e.response?.data?.error ||
          "Failed to generate metadata for this document"
      );
    } finally {
      setLoadingMeta(false);
    }
  };

  const generateOnlineSeoNameForSelected = async () => {
    const ids = Array.from(selectedProductIds);
    if (ids.length === 0) {
      setError("Select at least 1 product first.");
      return;
    }

    setLoadingSeo(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await api.post(ENDPOINTS.GENERATE_ONLINE_SEO_NAME, {
        product_ids: ids,
      });

      const updated = res.data.updated ?? 0;
      const failed = res.data.failed?.length ?? 0;

      setSuccess(
        `SEO names generated: ${updated} updated${
          failed ? `, ${failed} failed` : ""
        }`
      );

      await fetchProducts();
    } catch (e: any) {
      console.error(e);
      setError(e.response?.data?.error || "Failed to generate SEO names");
    } finally {
      setLoadingSeo(false);
    }
  };

  const generateFormattedNameForSelected = async () => {
    const ids = Array.from(selectedProductIds);
    if (ids.length === 0) {
      setError("Select at least 1 product first.");
      return;
    }

    // must have seo_name first
    if (missingSeoForSelected.length > 0) {
      setError(
        `SEO name missing for ${missingSeoForSelected.length} selected product(s). Generate SEO name first.`
      );
      return;
    }

    // must only be generated once
    if (alreadyFormattedSelected.length > 0) {
      setError(
        `Product name already generated once for ${alreadyFormattedSelected.length} selected product(s).`
      );
      return;
    }

    setLoadingName(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await api.post(ENDPOINTS.GENERATE_FORMATTED_NAME, {
        product_ids: ids,
      });

      const updated = res.data.updated ?? 0;
      const failed = res.data.failed?.length ?? 0;

      setSuccess(
        `Product names formatted: ${updated} updated${
          failed ? `, ${failed} failed` : ""
        }`
      );

      await fetchProducts();
    } catch (e: any) {
      console.error(e);
      setError(e.response?.data?.error || "Failed to format product names");
    } finally {
      setLoadingName(false);
    }
  };

  const copyMetadata = async (p: Product) => {
    try {
      const text = JSON.stringify(p.metadata || {}, null, 2);
      await navigator.clipboard.writeText(text);
      setSuccess("Metadata copied to clipboard");
    } catch (e) {
      console.error(e);
      setError("Failed to copy");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-zinc-900 to-black p-6">
      <div className="w-full max-w-7xl mx-auto">
        {/* Toasts */}
        {(error || success) && (
          <div className="fixed top-4 right-4 z-50 max-w-md">
            {error && (
              <div className="bg-red-500/90 backdrop-blur-sm text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 mb-2">
                <span className="flex-1">{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-white/90 hover:text-white"
                >
                  ×
                </button>
              </div>
            )}
            {success && (
              <div className="bg-green-500/90 backdrop-blur-sm text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
                <span className="flex-1">{success}</span>
                <button
                  onClick={() => setSuccess(null)}
                  className="ml-auto text-white/90 hover:text-white"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        )}

        {/* Header */}
        <div className="bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-6 backdrop-blur-sm mb-6">
          <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-cyan-300 drop-shadow-md">
                AI Inventory Manager
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Upload PDF price lists, extract products, generate SEO metadata
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={ENDPOINTS.EXPORT_CSV}
                target="_blank"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/10 text-white font-semibold hover:bg-white/20 transition shadow-lg"
              >
                Export CSV
              </Link>
            </div>
          </header>
        </div>

        {/* Upload */}
        <div className="bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-6 backdrop-blur-sm mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold text-slate-200">Upload Documents</h2>

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-300">Vendor:</span>
              <select
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-slate-200"
              >
                <option value="">Select vendor</option>
                <option value="iTechSmart">iTechSmart</option>
                <option value="VendorX">VendorX</option>
                <option value="VendorY">VendorY</option>
              </select>
            </div>
          </div>

          <section
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="p-8 rounded-xl border-2 border-dashed border-white/20 bg-gradient-to-br from-white/3 to-white/2 hover:from-white/6 hover:border-cyan-500/50 transition cursor-pointer"
          >
            <div className="flex flex-col items-center justify-center text-center">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="application/pdf"
                onChange={handleFileSelect}
                className="hidden"
                id="pdf-input"
              />

              <label htmlFor="pdf-input" className="cursor-pointer">
                <span className="text-lg text-slate-200 font-medium">
                  Drag & drop PDF files here
                </span>
                <span className="block text-sm text-slate-400 mt-2">
                  or <span className="text-cyan-300 underline">browse files</span>
                </span>
              </label>

              <p className="text-xs text-slate-500 mt-4">
                Supported: PDF • No PDFs are stored on server
              </p>
            </div>
          </section>

          {files.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-300 font-medium">
                  {files.length} file(s) selected
                </span>
                <button
                  onClick={clearAllFiles}
                  className="text-xs text-slate-400 hover:text-white transition"
                >
                  Clear all
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {files.map((f, i) => (
                  <div
                    key={`${f.name}-${f.size}-${i}`}
                    className="flex items-center justify-between bg-white/6 px-4 py-3 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-200 truncate">{f.name}</div>
                      <div className="text-xs text-slate-400">
                        {(f.size / 1024).toFixed(2)} KB
                      </div>
                    </div>

                    <button
                      onClick={() => removeFile(i)}
                      className="ml-3 text-slate-400 hover:text-red-400 transition"
                      aria-label="remove file"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={upload}
                disabled={loadingUpload || uploadingRef.current}
                className={classNames(
                  "mt-4 w-full px-6 py-3 rounded-lg text-white font-semibold shadow-lg transition flex items-center justify-center gap-2",
                  "bg-gradient-to-r from-purple-500 to-pink-500 hover:scale-[1.02]",
                  (loadingUpload || uploadingRef.current) &&
                    "opacity-50 cursor-not-allowed hover:scale-100"
                )}
              >
                {loadingUpload ? "Processing..." : `Upload ${files.length} PDF(s)`}
              </button>
            </div>
          )}
        </div>

        {/* Collapsible Documents */}
        <div className="bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-6 backdrop-blur-sm mb-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-200">
              Uploaded Documents ({docs.length})
            </h2>

            <button
              onClick={() => setOpenDocs((s) => !s)}
              className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
            >
              {openDocs ? "Collapse" : "Expand"}
            </button>
          </div>

          {openDocs && (
            <div className="mt-4">
              {docs.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  No documents uploaded yet
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {docs.map((d) => (
                    <article
                      key={d.id}
                      className="p-5 rounded-xl bg-gradient-to-br from-white/5 to-white/2 border border-white/10 hover:border-cyan-500/50 transition"
                    >
                      <div className="text-sm text-cyan-200 font-semibold truncate mb-1">
                        {d.filename}
                      </div>
                      <div className="text-xs text-slate-400">
                        {d.total_rows} rows •{" "}
                        {new Date(d.uploaded_at).toLocaleDateString()}
                      </div>

                      <div className="text-xs text-slate-400 mt-2">
                        Vendor:{" "}
                        <span className="text-slate-200">
                          {d.vendor_name || "—"}
                        </span>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => generateMetadataForDocument(d.id)}
                          disabled={loadingMeta}
                          className={classNames(
                            "px-3 py-1.5 rounded-md text-xs transition",
                            "bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30",
                            loadingMeta && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {loadingMeta ? "Working..." : "Generate Metadata"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Products */}
        <div className="bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-6 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold text-slate-200">
              Product Inventory ({products.length})
            </h2>

            <div className="flex flex-wrap gap-2 items-center">
              <div className="text-sm text-slate-400">
                Selected:{" "}
                <span className="text-slate-200 font-semibold">{selectedCount}</span>
              </div>

              <button
                onClick={generateOnlineSeoNameForSelected}
                disabled={loadingSeo || selectedCount === 0}
                className={classNames(
                  "px-4 py-2 rounded-lg font-semibold transition",
                  "bg-purple-500 text-white hover:brightness-110",
                  (loadingSeo || selectedCount === 0) &&
                    "opacity-50 cursor-not-allowed"
                )}
              >
                {loadingSeo ? "Generating SEO..." : "Generate SEO Name (Selected)"}
              </button>

              <button
                onClick={generateFormattedNameForSelected}
                disabled={loadingName || selectedCount === 0}
                className={classNames(
                  "px-4 py-2 rounded-lg font-semibold transition",
                  "bg-amber-400 text-black hover:brightness-110",
                  (loadingName || selectedCount === 0) &&
                    "opacity-50 cursor-not-allowed"
                )}
              >
                {loadingName ? "Formatting..." : "Generate Product Name (Selected)"}
              </button>

              <button
                onClick={generateMetadataForSelected}
                disabled={loadingMeta || selectedCount === 0}
                className={classNames(
                  "px-4 py-2 rounded-lg font-semibold transition",
                  "bg-cyan-500 text-black hover:brightness-110",
                  (loadingMeta || selectedCount === 0) &&
                    "opacity-50 cursor-not-allowed"
                )}
              >
                {loadingMeta ? "Generating..." : "Generate Metadata (Selected)"}
              </button>

              <button
                onClick={() =>
                  selectedProductIds.size === allSelectableCount
                    ? clearSelection()
                    : selectAll()
                }
                disabled={products.length === 0}
                className={classNames(
                  "px-4 py-2 rounded-lg transition",
                  "bg-white/10 text-white hover:bg-white/20",
                  products.length === 0 && "opacity-50 cursor-not-allowed"
                )}
              >
                {selectedProductIds.size === allSelectableCount
                  ? "Unselect All"
                  : "Select All"}
              </button>

              <button
                onClick={clearSelection}
                disabled={selectedCount === 0}
                className={classNames(
                  "px-4 py-2 rounded-lg transition",
                  "bg-white/10 text-white hover:bg-white/20",
                  selectedCount === 0 && "opacity-50 cursor-not-allowed"
                )}
              >
                Clear
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/5">
                <tr className="text-left text-xs text-slate-300 uppercase tracking-wider">
                  <th className="px-4 py-3 font-semibold">
                    <input
                      type="checkbox"
                      checked={
                        products.length > 0 &&
                        selectedProductIds.size === allSelectableCount
                      }
                      onChange={(e) =>
                        e.target.checked ? selectAll() : clearSelection()
                      }
                    />
                  </th>

                  <th className="px-4 py-3 font-semibold">Document</th>
                  <th className="px-4 py-3 font-semibold">Product Name</th>
                  <th className="px-4 py-3 font-semibold">SEO Name</th>
                  <th className="px-4 py-3 font-semibold">Brand</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Retail</th>
                  <th className="px-4 py-3 font-semibold">Sale</th>
                  <th className="px-4 py-3 font-semibold">Color</th>
                  <th className="px-4 py-3 font-semibold">Variants</th>
                  <th className="px-4 py-3 font-semibold">Vendor</th>
                  <th className="px-4 py-3 font-semibold">Metadata</th>

                  {Array.from(allExtraFields).map((field) => (
                    <th
                      key={field}
                      className="px-4 py-3 font-semibold text-cyan-300"
                    >
                      {field}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-white/10">
                {loadingProducts ? (
                  <tr>
                    <td
                      colSpan={12 + allExtraFields.size}
                      className="px-4 py-16 text-center"
                    >
                      <div className="flex flex-col items-center justify-center">
                        <svg className="animate-spin h-8 w-8 text-cyan-400 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                        </svg>
                        <span className="text-cyan-300 font-semibold text-lg">Loading products...</span>
                      </div>
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td
                      colSpan={12 + allExtraFields.size}
                      className="px-4 py-16 text-center"
                    >
                      <div className="flex flex-col items-center justify-center">
                        <svg width="64" height="64" fill="none" className="mb-3">
                          <circle cx="32" cy="32" r="30" fill="#0ea5e9" fillOpacity="0.08" />
                          <path d="M20 40c0-4 8-6 12-6s12 2 12 6v2H20v-2Z" fill="#38bdf8" />
                          <ellipse cx="32" cy="28" rx="6" ry="8" fill="#38bdf8" />
                          <ellipse cx="32" cy="28" rx="3" ry="4" fill="#0ea5e9" />
                        </svg>
                        <span className="text-slate-400 font-semibold text-lg">
                          No product data available
                        </span>
                        <span className="text-slate-500 text-sm mt-1">
                          Upload a PDF to get started!
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  products.map((p, idx) => (
                    <tr key={p.id || idx} className="hover:bg-white/5 transition">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={p.id ? selectedProductIds.has(p.id) : false}
                          onChange={() => toggleSelectProduct(p.id)}
                        />
                      </td>

                      <td className="px-4 py-3 text-slate-300">{p.document}</td>

                      <td className="px-4 py-3 text-white font-medium">
                        {p.product_name}
                      </td>

                      <td className="px-4 py-3 text-slate-300">
                        {p.seo_name ? (
                          <span className="text-purple-300">{p.seo_name}</span>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-300">{p.brand_name}</td>
                      <td className="px-4 py-3 text-slate-400">{p.product_type}</td>

                      <td className="px-4 py-3 text-green-400">${p.retail_price}</td>
                      <td className="px-4 py-3 text-cyan-400">${p.sale_price}</td>

                      <td className="px-4 py-3">
                        {p.color ? (
                          <span className="inline-block px-2 py-1 rounded text-xs bg-white/10">
                            {p.color}
                          </span>
                        ) : (
                          ""
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-400">{p.variants}</td>
                      <td className="px-4 py-3 text-slate-300">{p.vendor_name}</td>

                      <td className="px-4 py-3 text-slate-300">
                        {p.metadata && Object.keys(p.metadata).length > 0 ? (
                          <div className="flex flex-col gap-2">
                            <details className="cursor-pointer">
                              <summary className="text-cyan-300 text-xs">
                                View
                              </summary>
                              <pre className="mt-2 text-xs bg-black/30 p-2 rounded max-w-[420px] overflow-x-auto">
                                {JSON.stringify(p.metadata, null, 2)}
                              </pre>
                            </details>

                            <button
                              onClick={() => copyMetadata(p)}
                              className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition w-fit"
                            >
                              Copy JSON
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
                      </td>

                      {Array.from(allExtraFields).map((field) => (
                        <td key={field} className="px-4 py-3 text-cyan-200">
                          {p.extra_fields?.[field] ?? "-"}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ✅ Pagination */}
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 rounded bg-white/10 text-white disabled:opacity-40"
            >
              Prev
            </button>

            <div className="text-sm text-slate-300 flex items-center gap-3">
              <span>
                Page <span className="text-white font-semibold">{page}</span> /{" "}
                {totalPages}
              </span>

              <select
                value={pageSize}
                onChange={(e) => {
                  setPage(1);
                  setPageSize(Number(e.target.value));
                }}
                className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-slate-200 text-xs"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-4 py-2 rounded bg-white/10 text-white disabled:opacity-40"
            >
              Next
            </button>
          </div>

          <p className="text-xs text-slate-500 mt-3">
            Flow: Select products → Generate SEO Name → Generate Product Name (once) → Generate Metadata.
          </p>
        </div>
      </div>
    </div>
  );
}