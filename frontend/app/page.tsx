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
};

type Doc = {
  id: number;
  filename: string;
  total_rows: number;
  uploaded_at: string;
  extra_fields?: string[];
  products?: Product[];
};

function classNames(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

export default function Page() {
  const [files, setFiles] = useState<File[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [openDocIds, setOpenDocIds] = useState<Record<number, boolean>>({});

  const [loadingUpload, setLoadingUpload] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [allExtraFields, setAllExtraFields] = useState<Set<string>>(new Set());
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(
    new Set()
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);

  const allSelectableCount = useMemo(
    () => products.filter((p) => p.id).length,
    [products]
  );

  const fetchDocs = useCallback(async () => {
    try {
      const res = await api.get("/api/products/documents/");
      setDocs(res.data.documents || res.data);
    } catch (e) {
      console.error(e);
      setError("Failed to fetch documents");
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await api.get("/api/products/list/");
      const productsData = res.data.products || res.data;
      setProducts(productsData);

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
    }
  }, []);

  useEffect(() => {
    fetchDocs();
    fetchProducts();
  }, [fetchDocs, fetchProducts]);

  // toast auto-hide
  useEffect(() => {
    if (!error && !success) return;
    const timer = setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [error, success]);

  const toggleDoc = (id: number) =>
    setOpenDocIds((prev) => ({ ...prev, [id]: !prev[id] }));

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

    uploadingRef.current = true;
    setLoadingUpload(true);
    setError(null);
    setSuccess(null);

    try {
      const form = new FormData();
      files.forEach((f) => form.append("files", f));

      const res = await api.post("/api/products/upload-pdfs/", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";

      const uploaded = res.data.uploaded || res.data.documents?.length || 0;
      const skipped = res.data.skipped || 0;

      let message = `Successfully uploaded ${uploaded} PDF(s)`;
      if (skipped > 0) message += `, ${skipped} skipped (duplicate)`;
      setSuccess(message);

      // Refresh data
      await fetchDocs();
      await fetchProducts();

      // Clear selection because product list changed
      setSelectedProductIds(new Set());
    } catch (e: any) {
      console.error(e);
      setError(e.response?.data?.error || "Failed to upload PDFs");
    } finally {
      setLoadingUpload(false);
      uploadingRef.current = false;
    }
  };

  // selection helpers
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

  // metadata generation
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
      const res = await api.post("/api/products/generate-metadata/", {
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
      const res = await api.post("/api/products/generate-metadata/", {
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
              <p className="text-xs text-slate-500 mt-1">
                API: <span className="text-slate-300">{API_BASE}</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`${API_BASE}/api/products/export-excel/`}
                target="_blank"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-semibold hover:scale-105 transition shadow-lg"
              >
                Export Excel
              </Link>

              <Link
                href={`${API_BASE}/api/products/export-csv/`}
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
          <h2 className="text-xl font-bold text-slate-200 mb-4">
            Upload Documents
          </h2>

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
                  or{" "}
                  <span className="text-cyan-300 underline">browse files</span>
                </span>
              </label>

              <p className="text-xs text-slate-500 mt-4">
                Supported: PDF • Larger PDFs may take longer to process
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
                      <div className="text-sm text-slate-200 truncate">
                        {f.name}
                      </div>
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

        {/* Documents */}
        <div className="bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-6 backdrop-blur-sm mb-6">
          <h2 className="text-xl font-bold text-slate-200 mb-4">
            Uploaded Documents ({docs.length})
          </h2>

          {docs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              No documents uploaded yet
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {docs.map((d) => (
                <article
                  key={d.id}
                  className="p-5 rounded-xl bg-gradient-to-br from-white/5 to-white/2 border border-white/10 hover:border-cyan-500/50 transition"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-cyan-200 font-semibold truncate mb-1">
                        {d.filename}
                      </div>
                      <div className="text-xs text-slate-400">
                        {d.total_rows} rows •{" "}
                        {new Date(d.uploaded_at).toLocaleDateString()}
                      </div>
                      {d.extra_fields && d.extra_fields.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {d.extra_fields.slice(0, 6).map((field, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded"
                            >
                              {field}
                            </span>
                          ))}
                          {d.extra_fields.length > 6 && (
                            <span className="text-xs text-slate-400">
                              +{d.extra_fields.length - 6} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => generateMetadataForDocument(d.id)}
                        disabled={loadingMeta}
                        className={classNames(
                          "px-3 py-1.5 rounded-md text-xs transition",
                          "bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30",
                          loadingMeta && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {loadingMeta ? "Working..." : "Generate SEO"}
                      </button>

                      <button
                        onClick={() => toggleDoc(d.id)}
                        className="px-3 py-1.5 rounded-md bg-white/10 text-xs text-white hover:bg-white/20 transition"
                      >
                        {openDocIds[d.id] ? "Hide" : "View"}
                      </button>
                    </div>
                  </div>

                  {openDocIds[d.id] && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <pre className="text-xs bg-black/30 p-3 rounded text-slate-300 overflow-x-auto max-h-64">
                        {JSON.stringify(d, null, 2)}
                      </pre>
                    </div>
                  )}
                </article>
              ))}
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
                <span className="text-slate-200 font-semibold">
                  {selectedProductIds.size}
                </span>
              </div>

              <button
                onClick={generateMetadataForSelected}
                disabled={loadingMeta || selectedProductIds.size === 0}
                className={classNames(
                  "px-4 py-2 rounded-lg font-semibold transition",
                  "bg-cyan-500 text-black hover:brightness-110",
                  (loadingMeta || selectedProductIds.size === 0) &&
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
                disabled={loadingMeta || products.length === 0}
                className={classNames(
                  "px-4 py-2 rounded-lg transition",
                  "bg-white/10 text-white hover:bg-white/20",
                  (loadingMeta || products.length === 0) &&
                    "opacity-50 cursor-not-allowed"
                )}
              >
                {selectedProductIds.size === allSelectableCount
                  ? "Unselect All"
                  : "Select All"}
              </button>

              <button
                onClick={clearSelection}
                disabled={loadingMeta || selectedProductIds.size === 0}
                className={classNames(
                  "px-4 py-2 rounded-lg transition",
                  "bg-white/10 text-white hover:bg-white/20",
                  (loadingMeta || selectedProductIds.size === 0) &&
                    "opacity-50 cursor-not-allowed"
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
                  <th className="px-4 py-3 font-semibold">Brand</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Retail</th>
                  <th className="px-4 py-3 font-semibold">Sale</th>
                  <th className="px-4 py-3 font-semibold">Model</th>
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
                {products.length === 0 ? (
                  <tr>
                    <td
                      colSpan={12 + allExtraFields.size}
                      className="px-4 py-8 text-center text-slate-400"
                    >
                      No products available
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
                      <td className="px-4 py-3 text-slate-300">{p.brand_name}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {p.product_type}
                      </td>
                      <td className="px-4 py-3 text-green-400">
                        ${p.retail_price}
                      </td>
                      <td className="px-4 py-3 text-cyan-400">
                        ${p.sale_price}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {p.model_number}
                      </td>
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
                      <td className="px-4 py-3 text-slate-300">
                        {p.vendor_name}
                      </td>

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

          <p className="text-xs text-slate-500 mt-3">
            Tip: Use “Select All” then generate metadata once for faster SEO
            generation.
          </p>
        </div>
      </div>
    </div>
  );
}
