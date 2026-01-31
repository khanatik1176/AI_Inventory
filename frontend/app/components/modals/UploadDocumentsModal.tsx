"use client";

import React, { useRef, useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";

interface UploadDocumentsModalProps {
  open: boolean;
  onClose: () => void;
  vendors: Array<{ id: number; name: string; created_at: string }>;
  refreshDocuments: () => void;
  refreshProducts: () => void;
  refreshVendors: () => void;
}

export default function UploadDocumentsModal({
  open,
  onClose,
  vendors,
  refreshDocuments,
  refreshProducts,
  refreshVendors,
}: UploadDocumentsModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [vendorName, setVendorName] = useState("");
  const [vendorSearchTerm, setVendorSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToast();

  // Filter vendors based on search term
  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(vendorSearchTerm.toLowerCase())
  );

  // Check if search term matches any existing vendor
  const exactMatch = vendors.find(vendor => 
    vendor.name.toLowerCase() === vendorSearchTerm.toLowerCase()
  );

  // Reset modal when opening/closing
  useEffect(() => {
    if (open) {
      setFiles([]);
      setVendorName("");
      setVendorSearchTerm("");
      setIsDropdownOpen(false);
    }
  }, [open]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === "application/pdf"
    );
    if (!dropped.length) {
      addToast("warning", "Please select PDF files only.");
      return;
    }

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
    setFiles(files.filter((_, i) => i !== idx));
  };

  const clearAllFiles = () => {
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const selectVendor = (vendor: { id: number; name: string }) => {
    setVendorName(vendor.name);
    setVendorSearchTerm(vendor.name);
    setIsDropdownOpen(false);
  };

  const createNewVendor = async () => {
    if (!vendorSearchTerm.trim()) return;

    try {
      await api.post("/api/products/vendors/", {
        name: vendorSearchTerm.trim(),
      });
      
      addToast("success", `Vendor &ldquo;${vendorSearchTerm}&rdquo; created successfully!`);
      setVendorName(vendorSearchTerm.trim());
      setIsDropdownOpen(false);
      refreshVendors();
    } catch (e: any) {
      addToast("error", e.response?.data?.error || "Failed to create vendor");
    }
  };

  const upload = async () => {
    if (files.length === 0) {
      addToast("warning", "Please select at least one PDF file first.");
      return;
    }

    if (!vendorName.trim()) {
      addToast("warning", "Please select or create a vendor first.");
      return;
    }

    if (uploadingRef.current) return;

    uploadingRef.current = true;
    setLoading(true);

    try {
      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      form.append("vendor_name", vendorName);

      const res = await api.post("/api/products/upload-pdfs/", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const uploaded = res.data.uploaded ?? 0;
      const skipped = res.data.skipped ?? 0;

      let message = `Uploaded ${uploaded} PDF(s) successfully!`;
      if (skipped > 0) message += ` Skipped ${skipped} duplicate(s).`;
      
      addToast("success", message);

      // Show warnings for skipped files
      if (Array.isArray(res.data.skipped_files) && res.data.skipped_files.length > 0) {
        res.data.skipped_files.forEach((file: { filename: string; reason: string }) => {
          addToast("warning", `&ldquo;${file.filename}&rdquo; was skipped: ${file.reason}`);
        });
      }

      refreshDocuments();
      refreshProducts();
      onClose();
    } catch (e: any) {
      addToast("error", e.response?.data?.error || "Failed to upload PDFs");
    } finally {
      setLoading(false);
      uploadingRef.current = false;
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-slate-900/95 via-zinc-900/95 to-black/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-cyan-300">Upload Documents</h2>
            <p className="text-sm text-slate-400 mt-1">
              Select a vendor and upload PDF files to extract product data
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition text-slate-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-8">
            {/* Vendor Selection Section */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-200">
                  Select or Create Vendor
                </h3>
              </div>

              <div className="relative" ref={dropdownRef}>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Vendor Name *
                </label>
                <input
                  type="text"
                  value={vendorSearchTerm}
                  onChange={(e) => {
                    setVendorSearchTerm(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder="Search for vendor or type new name..."
                  className="w-full p-3 bg-black/30 border border-white/10 rounded-lg text-slate-200 placeholder-slate-400 focus:border-cyan-500/50 focus:outline-none transition"
                />

                {/* Dropdown */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800/95 backdrop-blur-sm border border-white/10 rounded-lg shadow-xl z-20 max-h-64 overflow-y-auto">
                    {filteredVendors.length > 0 && (
                      <div className="p-2">
                        <div className="text-xs text-slate-400 px-2 py-1 uppercase tracking-wide">
                          Existing Vendors
                        </div>
                        {filteredVendors.map((vendor) => (
                          <button
                            key={vendor.id}
                            onClick={() => selectVendor(vendor)}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200 transition flex items-center justify-between"
                          >
                            <span>{vendor.name}</span>
                            <span className="text-xs text-slate-400">
                              {new Date(vendor.created_at).toLocaleDateString()}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {vendorSearchTerm.trim() && !exactMatch && (
                      <div className={`p-2 ${filteredVendors.length > 0 ? 'border-t border-white/10' : ''}`}>
                        <div className="text-xs text-slate-400 px-2 py-1 uppercase tracking-wide">
                          Create New
                        </div>
                        <button
                          onClick={createNewVendor}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-cyan-500/20 text-cyan-300 transition flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Create &ldquo;{vendorSearchTerm.trim()}&rdquo;
                        </button>
                      </div>
                    )}

                    {!vendorSearchTerm.trim() && filteredVendors.length === 0 && (
                      <div className="p-4 text-center text-slate-400">
                        Start typing to search or create a vendor
                      </div>
                    )}
                  </div>
                )}
              </div>

              {vendorName && (
                <div className="mt-4 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-cyan-300">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Selected: <span className="font-semibold">{vendorName}</span>
                  </div>
                </div>
              )}
            </div>

            {/* File Upload Section */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-200">
                  Upload PDF Files
                </h3>
              </div>

              {/* File Upload Area */}
              <section
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                className="p-8 md:p-12 rounded-xl border-2 border-dashed border-white/20 bg-gradient-to-br from-cyan-500/5 via-blue-500/5 to-purple-500/5 hover:from-cyan-500/10 hover:border-cyan-500/50 transition-all duration-300 cursor-pointer group mb-6"
              >
                <div className="flex flex-col items-center justify-center text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="pdf-upload"
                  />

                  <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center">
                    {/* Round Icon Container */}
                    <div className="mb-6 w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 group-hover:from-cyan-500/30 group-hover:to-blue-500/30 transition-all duration-300 flex items-center justify-center shadow-lg">
                      <svg className="w-10 h-10 md:w-12 md:h-12 text-cyan-400 group-hover:text-cyan-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    
                    {/* Text Content */}
                    <span className="text-lg md:text-xl text-slate-200 font-semibold block mb-2">
                      Drag &amp; drop PDF files here
                    </span>
                    <span className="text-sm text-slate-400">
                      or <span className="text-cyan-300 underline font-medium">browse files</span>
                    </span>
                  </label>

                  <p className="text-xs text-slate-500 mt-6 flex items-center gap-2 flex-wrap justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Supported format: PDF • Files are processed securely</span>
                  </p>
                </div>
              </section>

              {/* Selected Files */}
              {files.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-semibold text-slate-200">
                      Selected Files ({files.length})
                    </h4>
                    <button
                      onClick={clearAllFiles}
                      className="text-sm text-slate-400 hover:text-red-400 transition"
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                    {files.map((f, i) => (
                      <div
                        key={`${f.name}-${f.size}-${i}`}
                        className="flex items-center justify-between bg-white/5 px-3 py-3 rounded-lg group hover:bg-white/10 transition"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="p-2 bg-red-500/20 rounded-lg flex-shrink-0">
                            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-slate-200 truncate font-medium" title={f.name}>
                              {f.name}
                            </div>
                            <div className="text-xs text-slate-400">
                              {(f.size / 1024 / 1024).toFixed(2)} MB
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => removeFile(i)}
                          className="ml-3 p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition opacity-0 group-hover:opacity-100 flex-shrink-0"
                          aria-label="remove file"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer - Fixed Upload Button */}
        <div className="p-6 border-t border-white/10 flex-shrink-0">
          <button
            onClick={upload}
            disabled={loading || !vendorName.trim() || files.length === 0}
            className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition shadow-lg flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
                Uploading {files.length} file(s)...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload {files.length > 0 ? `${files.length} PDF(s)` : 'Documents'}
              </>
            )}
          </button>

          {(!vendorName.trim() || files.length === 0) && (
            <p className="text-xs text-slate-400 text-center mt-2">
              {!vendorName.trim() && files.length === 0 
                ? "Please select a vendor and add PDF files to upload"
                : !vendorName.trim() 
                ? "Please select or create a vendor first"
                : "Please add at least one PDF file"
              }
            </p>
          )}
        </div>
      </div>
    </div>
  );
}