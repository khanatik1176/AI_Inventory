"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { api, API_BASE } from "@/lib/api";

type Product = {
  id?: number;
  document: string;
  product_name: string;
  seo_name?: string;
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
};

function classNames(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

export default function Page() {
  const [files, setFiles] = useState<File[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [openDocIds, setOpenDocIds] = useState<Record<number, boolean>>({});

  // Documents section collapsible (default collapsed)
  const [docsCollapsed, setDocsCollapsed] = useState(true);

  const [loadingUpload, setLoadingUpload] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [loadingSeoOnline, setLoadingSeoOnline] = useState(false);
  const [loadingFormatName, setLoadingFormatName] = useState(false);

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

  const anyLoading =
    loadingUpload ||
    loadingMeta ||
    loadingSeoOnline ||
    loadingFormatName ||
    uploadingRef.current;

  const fetchDocs = useCallback(async () => {
    const res = await api.get("/api/products/documents/");
    setDocs(res.data.documents || res.data);
  }, []);

  const fetchProducts = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchDocs().catch(() => toast.error("Failed to fetch documents"));
    fetchProducts().catch(() => toast.error("Failed to fetch products"));
  }, [fetchDocs, fetchProducts]);

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

  // Selected products (full objects)
  const selectedProducts = useMemo(() => {
    const idSet = selectedProductIds;
    return products.filter((p) => p.id && idSet.has(p.id));
  }, [products, selectedProductIds]);

  // ✅ Rule: Format allowed only if ALL selected have seo_name AND none already formatted
  const canFormatSelected = useMemo(() => {
    if (selectedProducts.length === 0) return false;

    const allHaveSeo = selectedProducts.every(
      (p) => p.seo_name && String(p.seo_name).trim().length > 0
    );

const noneAlreadyFormatted = selectedProducts.every(
  (p) => !p.product_name?.includes("|SEO|")
);
    return allHaveSeo && noneAlreadyFormatted;
  }, [selectedProducts]);

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

    const t = toast.loading("Uploading PDFs...");

    try {
      const form = new FormData();
      files.forEach((f) => form.append("files", f));

      const res = await api.post("/api/products/upload-pdfs/", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const uploaded = res.data.uploaded || res.data.documents?.length || 0;
      const skipped = res.data.skipped || 0;

      toast.success(
        `Uploaded ${uploaded} PDF(s)${skipped ? `, skipped ${skipped}` : ""}`,
        { id: t }
      );

      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";

      await fetchDocs();
      await fetchProducts();

      setSelectedProductIds(new Set());
      setDocsCollapsed(true);
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Upload failed", { id: t });
    } finally {
      setLoadingUpload(false);
      uploadingRef.current = false;
    }
  };

  // metadata generation (optional)
  const generateMetadataForSelected = async () => {
    const ids = Array.from(selectedProductIds);
    if (ids.length === 0) return toast.error("Select at least 1 product");

    setLoadingMeta(true);
    const t = toast.loading("Generating metadata...");

    try {
      const res = await api.post("/api/products/generate-metadata/", {
        product_ids: ids,
      });

      const updated = res.data.updated ?? 0;
      const failed = res.data.failed?.length ?? 0;

      toast.success(
        `Metadata updated: ${updated}${failed ? `, failed ${failed}` : ""}`,
        { id: t }
      );

      await fetchProducts();
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Metadata generation failed", {
        id: t,
      });
    } finally {
      setLoadingMeta(false);
    }
  };

  // ✅ Online SEO name -> updates seo_name
  const generateSeoNamesOnline = async () => {
    const ids = Array.from(selectedProductIds);
    if (ids.length === 0) return toast.error("Select at least 1 product");

    setLoadingSeoOnline(true);
    const t = toast.loading("Generating SEO names (online)...");

    try {
      const res = await api.post("/api/products/generate-online-seo-name/", {
        product_ids: ids,
      });

      const updated = res.data.updated ?? 0;
      const failed = res.data.failed?.length ?? 0;

      toast.success(
        `SEO names updated: ${updated}${failed ? `, failed ${failed}` : ""}`,
        { id: t }
      );

      await fetchProducts();
    } catch (e: any) {
      toast.error(e.response?.data?.error || "SEO generation failed", { id: t });
    } finally {
      setLoadingSeoOnline(false);
    }
  };

  // ✅ Format -> updates product_name (backend enforces: seo_name required + only once)
  const generateFormattedProductName = async () => {
    const ids = Array.from(selectedProductIds);
    if (ids.length === 0) return toast.error("Select at least 1 product");

    // Frontend guard (backend also guards)
    if (!canFormatSelected) {
      return toast.error(
        "Generate SEO Name first (and ensure names are not already formatted)."
      );
    }

    setLoadingFormatName(true);
    const t = toast.loading("Updating product names (format)...");

    try {
      const res = await api.post("/api/products/generate-formatted-name/", {
        product_ids: ids,
      });

      const updated = res.data.updated ?? 0;
      const skipped = res.data.skipped ?? [];

      if (skipped.length) {
        toast(
          `Updated: ${updated}. Skipped: ${skipped.length} (missing seo_name or already formatted).`,
          { id: t, icon: "⚠️" }
        );
      } else {
        toast.success(`Product names updated: ${updated}`, { id: t });
      }

      await fetchProducts();
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Format name update failed", {
        id: t,
      });
    } finally {
      setLoadingFormatName(false);
    }
  };

  // copy helpers
  const copyMetadata = async (p: Product) => {
    try {
      const text = JSON.stringify(p.metadata || {}, null, 2);
      await navigator.clipboard.writeText(text);
      toast.success("Metadata copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const copySeoName = async (p: Product) => {
    try {
      await navigator.clipboard.writeText(p.seo_name || "");
      toast.success("SEO name copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-zinc-900 to-black p-6">
      <div className="w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-6 backdrop-blur-sm mb-6">
          <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-cyan-300 drop-shadow-md">
                AI Inventory Manager
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Upload PDFs, extract products, generate SEO + metadata
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
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
                  or <span className="text-cyan-300 underline">browse files</span>
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

        {/* Documents - Collapsible (default collapsed) */}
        <div className="bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-6 backdrop-blur-sm mb-6">
          <button
            onClick={() => setDocsCollapsed((v) => !v)}
            className="w-full flex items-center justify-between"
          >
            <h2 className="text-xl font-bold text-slate-200">
              Uploaded Documents ({docs.length})
            </h2>
            <span className="text-slate-400 text-sm">
              {docsCollapsed ? "Show ▾" : "Hide ▴"}
            </span>
          </button>

          {!docsCollapsed && (
            <>
              {docs.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  No documents uploaded yet
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

                        <button
                          onClick={() => toggleDoc(d.id)}
                          className="px-3 py-1.5 rounded-md bg-white/10 text-xs text-white hover:bg-white/20 transition"
                        >
                          {openDocIds[d.id] ? "Hide" : "View"}
                        </button>
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
            </>
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
                  "bg-white/10 text-white hover:bg-white/20",
                  (loadingMeta || selectedProductIds.size === 0) &&
                    "opacity-50 cursor-not-allowed"
                )}
              >
                {loadingMeta ? "Generating..." : "Generate Metadata"}
              </button>

              <button
                onClick={generateSeoNamesOnline}
                disabled={loadingSeoOnline || selectedProductIds.size === 0}
                className={classNames(
                  "px-4 py-2 rounded-lg font-semibold transition",
                  "bg-cyan-500 text-black hover:brightness-110",
                  (loadingSeoOnline || selectedProductIds.size === 0) &&
                    "opacity-50 cursor-not-allowed"
                )}
              >
                {loadingSeoOnline ? "Working..." : "Generate SEO Name (Online)"}
              </button>

              <button
                onClick={generateFormattedProductName}
                disabled={loadingFormatName || !canFormatSelected}
                className={classNames(
                  "px-4 py-2 rounded-lg font-semibold transition",
                  "bg-purple-500 text-white hover:brightness-110",
                  (loadingFormatName || !canFormatSelected) &&
                    "opacity-50 cursor-not-allowed"
                )}
                title={
                  !canFormatSelected
                    ? "Generate SEO Name first, and ensure product names are not already formatted."
                    : ""
                }
              >
                {loadingFormatName ? "Working..." : "Format Product Name"}
              </button>

              <button
                onClick={() =>
                  selectedProductIds.size === allSelectableCount
                    ? clearSelection()
                    : selectAll()
                }
                disabled={anyLoading || products.length === 0}
                className={classNames(
                  "px-4 py-2 rounded-lg transition",
                  "bg-white/10 text-white hover:bg-white/20",
                  (anyLoading || products.length === 0) &&
                    "opacity-50 cursor-not-allowed"
                )}
              >
                {selectedProductIds.size === allSelectableCount
                  ? "Unselect All"
                  : "Select All"}
              </button>

              <button
                onClick={clearSelection}
                disabled={anyLoading || selectedProductIds.size === 0}
                className={classNames(
                  "px-4 py-2 rounded-lg transition",
                  "bg-white/10 text-white hover:bg-white/20",
                  (anyLoading || selectedProductIds.size === 0) &&
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
                  <th className="px-4 py-3 font-semibold">SEO Name</th>
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
                      colSpan={13 + allExtraFields.size}
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

                      <td className="px-4 py-3 text-cyan-200">
                        {p.seo_name && p.seo_name.trim() ? (
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-[260px]">
                              {p.seo_name}
                            </span>
                            <button
                              onClick={() => copySeoName(p)}
                              className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition"
                            >
                              Copy
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
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
            ✅ “Format Product Name” is enabled only when all selected products
            have <b>seo_name</b> and are not already formatted.
          </p>
        </div>
      </div>
    </div>
  );
}
