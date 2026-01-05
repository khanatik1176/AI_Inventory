// ...existing code...
"use client";
import axios from "axios";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

type Doc = any;

export default function PdfUploader() {
  const [files, setFiles] = useState<File[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDocIds, setOpenDocIds] = useState<Record<number, boolean>>({});

  const fetchDocs = useCallback(async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/api/products/documents/");
      setDocs(res.data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const upload = async () => {
    if (files.length === 0) return;
    setLoading(true);
    try {
      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      await axios.post("http://127.0.0.1:8000/api/products/upload-pdfs/", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFiles([]);
      await fetchDocs();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter((f) => f.type === "application/pdf");
    if (dropped.length) setFiles((prev) => [...prev, ...dropped]);
  };

  const removeFile = (idx: number) => setFiles((s) => s.filter((_, i) => i !== idx));

  const toggleDoc = (id: number) =>
    setOpenDocIds((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-zinc-900 to-black flex items-center justify-center p-6">
      <div className="w-full max-w-4xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-6 backdrop-blur-sm">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold text-cyan-300 drop-shadow-md">
            AI Inventory — Upload PDFs
          </h1>
          <Link
            href="http://127.0.0.1:8000/api/products/export-excel/"
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-semibold hover:scale-105 transition"
          >
            Download Excel
          </Link>
        </header>

        <section
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="mb-6 p-6 rounded-xl border border-white/6 bg-gradient-to-br from-white/3 to-white/2 hover:from-white/6 transition cursor-pointer"
        >
          <label className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex-1">
              <input
                type="file"
                multiple
                accept="application/pdf"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
                className="hidden"
                id="pdf-input"
              />
              <div className="text-sm text-slate-200">
                Drag & drop PDFs here or{" "}
                <label htmlFor="pdf-input" className="text-cyan-300 underline cursor-pointer">
                  browse
                </label>
              </div>
              <p className="text-xs text-slate-400 mt-1">Supported: PDF files</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={upload}
                disabled={files.length === 0 || loading}
                className="px-4 py-2 rounded-md bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow hover:scale-105 transition"
              >
                {loading ? "Uploading..." : "Upload PDFs"}
              </button>
            </div>
          </label>

          {files.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/6 px-3 py-2 rounded-full text-sm">
                  <svg className="w-4 h-4 text-cyan-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeWidth="1.5"/>
                    <path d="M14 2v6h6" strokeWidth="1.5"/>
                  </svg>
                  <span className="max-w-xs truncate">{f.name}</span>
                  <button onClick={() => removeFile(i)} className="text-slate-300 hover:text-white ml-2">×</button>
                </div>
              ))}
            </div>
          )}
        </section>

        <h2 className="text-lg font-semibold text-slate-200 mb-4">Uploaded Documents</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {docs.map((d: Doc) => (
            <article key={d.id} className="p-4 rounded-xl bg-gradient-to-br from-white/3 to-white/2 border border-white/6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm text-cyan-200 font-medium truncate">{d.filename}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {d.total_rows ?? "-"} rows • {d.uploaded_at ? new Date(d.uploaded_at).toLocaleString() : "—"}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => toggleDoc(d.id)}
                    className="px-3 py-1 rounded-md bg-white/6 text-sm text-white hover:bg-white/10 transition"
                  >
                    {openDocIds[d.id] ? "Hide" : "View"}
                  </button>
                </div>
              </div>

              {openDocIds[d.id] && (
                <div className="mt-4 space-y-3">
                  <div className="text-xs text-slate-300">Metadata</div>
                  <pre className="text-xs bg-black/20 p-2 rounded text-slate-200 overflow-x-auto">{JSON.stringify(d, null, 2)}</pre>

                  {Array.isArray(d.products) && d.products.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-slate-100 mt-2">Products</div>
                      <div className="mt-2 grid grid-cols-1 gap-2 max-h-48 overflow-auto">
                        {d.products.map((p: any) => (
                          <div key={p.id} className="flex items-center justify-between bg-white/4 p-2 rounded">
                            <div className="text-sm text-slate-100">{p.product_name}</div>
                            <div className="text-xs text-slate-400">{p.brand_name}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}