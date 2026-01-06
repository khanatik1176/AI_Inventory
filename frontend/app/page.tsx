"use client";
import axios from "axios";
import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";

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
};

type Doc = {
  id: number;
  filename: string;
  total_rows: number;
  uploaded_at: string;
  extra_fields?: string[];
  products?: Product[];
};

export default function PdfUploader() {
  const [files, setFiles] = useState<File[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDocIds, setOpenDocIds] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [allExtraFields, setAllExtraFields] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);

  const fetchDocs = useCallback(async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/api/products/documents/");
      setDocs(res.data.documents || res.data);
    } catch (e) {
      console.error(e);
      setError("Failed to fetch documents");
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/api/products/list/");
      const productsData = res.data.products || res.data;
      setProducts(productsData);
      
      const extraFieldKeys = new Set<string>();
      productsData.forEach((p: Product) => {
        if (p.extra_fields) {
          Object.keys(p.extra_fields).forEach(key => extraFieldKeys.add(key));
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

  const upload = async () => {
    if (files.length === 0 || uploadingRef.current) return;
    
    uploadingRef.current = true;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      
      const res = await axios.post("http://127.0.0.1:8000/api/products/upload-pdfs/", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      const uploaded = res.data.uploaded || res.data.documents?.length || 0;
      const skipped = res.data.skipped || 0;
      
      let message = `Successfully uploaded ${uploaded} PDF(s)`;
      if (skipped > 0) {
        message += `, ${skipped} skipped (duplicate)`;
      }
      
      setSuccess(message);
      
      await fetchDocs();
      await fetchProducts();
    } catch (e: any) {
      console.error(e);
      setError(e.response?.data?.error || "Failed to upload PDFs");
    } finally {
      setLoading(false);
      uploadingRef.current = false;
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter((f) => f.type === "application/pdf");
    if (dropped.length) {
      setFiles((prev) => {
        const existingFiles = new Set(prev.map(f => `${f.name}-${f.size}`));
        const newFiles = dropped.filter(f => !existingFiles.has(`${f.name}-${f.size}`));
        return [...prev, ...newFiles];
      });
      setError(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length) {
      setFiles((prev) => {
        const existingFiles = new Set(prev.map(f => `${f.name}-${f.size}`));
        const newFiles = selectedFiles.filter(f => !existingFiles.has(`${f.name}-${f.size}`));
        return [...prev, ...newFiles];
      });
      setError(null);
    }
  };

  const removeFile = (idx: number) => {
    setFiles((s) => s.filter((_, i) => i !== idx));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearAllFiles = () => {
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleDoc = (id: number) =>
    setOpenDocIds((prev) => ({ ...prev, [id]: !prev[id] }));

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-zinc-900 to-black p-6">
      <div className="w-full max-w-7xl mx-auto">
        {/* Notifications */}
        {(error || success) && (
          <div className="fixed top-4 right-4 z-50 max-w-md">
            {error && (
              <div className="bg-red-500/90 backdrop-blur-sm text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
                <button onClick={() => setError(null)} className="ml-auto">×</button>
              </div>
            )}
            {success && (
              <div className="bg-green-500/90 backdrop-blur-sm text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{success}</span>
                <button onClick={() => setSuccess(null)} className="ml-auto">×</button>
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
              <p className="text-sm text-slate-400 mt-1">Upload and manage your product inventory</p>
            </div>
            <Link
              href="http://127.0.0.1:8000/api/products/export-excel/"
              target="_blank"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-semibold hover:scale-105 transition shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export to Excel
            </Link>
          </header>
        </div>

        {/* Upload Section */}
        <div className="bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-6 backdrop-blur-sm mb-6">
          <h2 className="text-xl font-bold text-slate-200 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload Documents
          </h2>

          <section
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="p-8 rounded-xl border-2 border-dashed border-white/20 bg-gradient-to-br from-white/3 to-white/2 hover:from-white/6 hover:border-cyan-500/50 transition cursor-pointer"
          >
            <div className="flex flex-col items-center justify-center text-center">
              <svg className="w-16 h-16 text-cyan-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              
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
              
              <p className="text-xs text-slate-500 mt-4">Supported formats: PDF • Max file size: 10MB</p>
            </div>
          </section>

          {files.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-300 font-medium">{files.length} file(s) selected</span>
                <button
                  onClick={clearAllFiles}
                  className="text-xs text-slate-400 hover:text-white transition"
                >
                  Clear all
                </button>
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {files.map((f, i) => (
                  <div key={`${f.name}-${f.size}-${i}`} className="flex items-center justify-between bg-white/6 px-4 py-3 rounded-lg">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <svg className="w-5 h-5 text-cyan-300 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeWidth="1.5"/>
                        <path d="M14 2v6h6" strokeWidth="1.5"/>
                      </svg>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-200 truncate">{f.name}</div>
                        <div className="text-xs text-slate-400">{(f.size / 1024).toFixed(2)} KB</div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(i)}
                      className="ml-3 text-slate-400 hover:text-red-400 transition"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={upload}
                disabled={loading || uploadingRef.current}
                className="mt-4 w-full px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:scale-[1.02] transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload {files.length} PDF{files.length > 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Documents Section */}
        <div className="bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-6 backdrop-blur-sm mb-6">
          <h2 className="text-xl font-bold text-slate-200 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Uploaded Documents ({docs.length})
          </h2>

          {docs.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-slate-400">No documents uploaded yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {docs.map((d) => (
                <article key={d.id} className="p-5 rounded-xl bg-gradient-to-br from-white/5 to-white/2 border border-white/10 hover:border-cyan-500/50 transition">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-cyan-200 font-semibold truncate mb-1">{d.filename}</div>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {d.total_rows} rows
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {new Date(d.uploaded_at).toLocaleDateString()}
                        </span>
                      </div>
                      {d.extra_fields && d.extra_fields.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {d.extra_fields.map((field, idx) => (
                            <span key={idx} className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded">
                              {field}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => toggleDoc(d.id)}
                      className="px-3 py-1.5 rounded-md bg-white/10 text-xs text-white hover:bg-white/20 transition flex-shrink-0"
                    >
                      {openDocIds[d.id] ? "Hide" : "View"}
                    </button>
                  </div>

                  {openDocIds[d.id] && (
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                      <pre className="text-xs bg-black/30 p-3 rounded text-slate-300 overflow-x-auto max-h-64">{JSON.stringify(d, null, 2)}</pre>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Products Table */}
        <div className="bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-6 backdrop-blur-sm">
          <h2 className="text-xl font-bold text-slate-200 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Product Inventory ({products.length})
          </h2>

          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/5">
                <tr className="text-left text-xs text-slate-300 uppercase tracking-wider">
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
                  {Array.from(allExtraFields).map((field) => (
                    <th key={field} className="px-4 py-3 font-semibold text-cyan-300">
                      {field}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={10 + allExtraFields.size} className="px-4 py-8 text-center">
                      <svg className="w-12 h-12 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="text-slate-400">No products available</p>
                    </td>
                  </tr>
                ) : (
                  products.map((p, idx) => (
                    <tr key={p.id || idx} className="hover:bg-white/5 transition">
                      <td className="px-4 py-3 text-slate-300">{p.document}</td>
                      <td className="px-4 py-3 text-white font-medium">{p.product_name}</td>
                      <td className="px-4 py-3 text-slate-300">{p.brand_name}</td>
                      <td className="px-4 py-3 text-slate-400">{p.product_type}</td>
                      <td className="px-4 py-3 text-green-400">${p.retail_price}</td>
                      <td className="px-4 py-3 text-cyan-400">${p.sale_price}</td>
                      <td className="px-4 py-3 text-slate-400">{p.model_number}</td>
                      <td className="px-4 py-3">
                        {p.color && (
                          <span className="inline-block px-2 py-1 rounded text-xs bg-white/10">
                            {p.color}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{p.variants}</td>
                      <td className="px-4 py-3 text-slate-300">{p.vendor_name}</td>
                      {Array.from(allExtraFields).map((field) => (
                        <td key={field} className="px-4 py-3 text-cyan-200">
                          {p.extra_fields?.[field] || "-"}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}