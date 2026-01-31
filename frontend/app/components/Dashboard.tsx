"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, API_BASE } from "@/lib/api";
import { logout } from "@/lib/auth";
import { useToast } from "@/contexts/ToastContext";
import AddProductModal from "./modals/AddProductModal";
import UploadDocumentsModal from "./modals/UploadDocumentsModal";

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

type Vendor = {
  id: number;
  name: string;
  created_at: string;
};

// Color mapping for common color names
const COLOR_MAP: Record<string, string> = {
  // Basic colors
  "red": "#FF0000",
  "blue": "#0000FF",
  "green": "#00FF00",
  "yellow": "#FFFF00",
  "orange": "#FFA500",
  "purple": "#800080",
  "pink": "#FFC0CB",
  "brown": "#A52A2A",
  "black": "#000000",
  "white": "#FFFFFF",
  "gray": "#808080",
  "grey": "#808080",
  "silver": "#C0C0C0",
  "gold": "#FFD700",
  
  // Extended colors
  "rose gold": "#E8B4B8",
  "navy blue": "#000080",
  "sky blue": "#87CEEB",
  "dark blue": "#00008B",
  "light blue": "#ADD8E6",
  "teal": "#008080",
  "turquoise": "#40E0D0",
  "cyan": "#00FFFF",
  "lime": "#00FF00",
  "forest green": "#228B22",
  "olive": "#808000",
  "mint green": "#98FF98",
  "dark green": "#006400",
  "maroon": "#800000",
  "crimson": "#DC143C",
  "coral": "#FF7F50",
  "salmon": "#FA8072",
  "hot pink": "#FF69B4",
  "magenta": "#FF00FF",
  "violet": "#EE82EE",
  "indigo": "#4B0082",
  "lavender": "#E6E6FA",
  "plum": "#DDA0DD",
  "beige": "#F5F5DC",
  "tan": "#D2B48C",
  "khaki": "#F0E68C",
  "ivory": "#FFFFF0",
  "cream": "#FFFDD0",
  "pearl": "#EAE0C8",
  "charcoal": "#36454F",
  "slate gray": "#708090",
  "light gray": "#D3D3D3",
  "dark gray": "#A9A9A9",
  "bronze": "#CD7F32",
  "copper": "#B87333",
  "platinum": "#E5E4E2",
  "titanium": "#878681"
};

function classNames(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

// Improved Tooltip component with better positioning
function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    // Calculate position relative to viewport
    const centerX = rect.left + rect.width / 2 + scrollLeft;
    const topY = rect.top + scrollTop -300; // Position above the element with some spacing
    
    setPosition({
      x: centerX,
      y: topY
    });
    setShow(true);
  };

  const handleMouseLeave = () => {
    setShow(false);
  };

  return (
    <>
      <div
        ref={containerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block relative"
      >
        {children}
      </div>
      {show && (
        <div
          className="fixed z-[999] px-3 py-2 text-sm bg-slate-800/95 backdrop-blur-sm text-white rounded-lg shadow-xl border border-white/20 pointer-events-none whitespace-nowrap"
          style={{
            left: position.x,
            top: position.y,
            transform: 'translateX(-50%)',
            maxWidth: '300px'
          }}
        >
          <div className="break-words">{content}</div>
          {/* Arrow pointing down */}
          <div 
            className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800/95"
            style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.1))' }}
          />
        </div>
      )}
    </>
  );
}

// Color balls component
function ColorBalls({ colorString }: { colorString: string }) {
  if (!colorString) return <span className="text-slate-500 text-xs">—</span>;

  const colors = colorString.split(',').map(c => c.trim()).filter(Boolean);

  return (
    <div className="flex flex-wrap gap-1.5">
      {colors.map((color, index) => {
        const colorKey = color.toLowerCase();
        const hexColor = COLOR_MAP[colorKey] || '#808080'; // Default to gray if color not found

        return (
          <Tooltip key={index} content={color}>
            <div
              className="w-5 h-5 rounded-full border-2 border-white/20 cursor-help shadow-sm"
              style={{ backgroundColor: hexColor }}
            />
          </Tooltip>
        );
      })}
    </div>
  );
}

// Document icon component
function DocumentIcon({ documentName }: { documentName: string }) {
  const isManual = documentName === "Manual Entry" || documentName.includes("Manual");

  return (
    <Tooltip content={documentName}>
      {isManual ? (
        // Manual entry icon
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-500/20 border border-green-500/30 cursor-help">
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
      ) : (
        // File upload icon
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 cursor-help">
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      )}
    </Tooltip>
  );
}

const ENDPOINTS = {
  UPLOAD: "/api/products/upload-pdfs/",
  DOCS: "/api/products/documents/",
  LIST: "/api/products/list/",
  VENDORS: "/api/products/vendors/",
  EXPORT_CSV: `${API_BASE}/api/products/export-csv/`,

  GENERATE_METADATA: "/api/products/generate-metadata/",
  GENERATE_ONLINE_SEO_NAME: "/api/products/generate-online-seo-name/",
  GENERATE_FORMATTED_NAME: "/api/products/generate-formatted-name/",
};

export default function Page() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [openDocs, setOpenDocs] = useState(false);
  const [openProductModal, setOpenProductModal] = useState(false);
  const [openUploadModal, setOpenUploadModal] = useState(false);

  const [loadingMeta, setLoadingMeta] = useState(false);
  const [loadingSeo, setLoadingSeo] = useState(false);
  const [loadingName, setLoadingName] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [allExtraFields, setAllExtraFields] = useState<Set<string>>(new Set());
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(
    new Set()
  );

  // ✅ pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  const { addToast } = useToast();

  const allSelectableCount = useMemo(
    () => products.filter((p) => p.id).length,
    [products]
  );

  const selectedCount = selectedProductIds.size;

  const fetchVendors = useCallback(async () => {
    try {
      const res = await api.get(ENDPOINTS.VENDORS);
      setVendors(res.data.vendors || []);
    } catch (e: any) {
      if (e.response?.status === 401) {
        addToast("error", "Session expired. Please log in again.");
        logout();
      } else {
        console.error(e);
        addToast("error", "Failed to fetch vendors");
      }
    }
  }, [addToast]);

  const fetchDocs = useCallback(async () => {
    try {
      const res = await api.get(ENDPOINTS.DOCS);
      setDocs(res.data.documents || res.data || []);
    } catch (e: any) {
      if (e.response?.status === 401) {
        addToast("error", "Session expired. Please log in again.");
        logout();
      } else {
        console.error(e);
        addToast("error", "Failed to fetch documents");
      }
    }
  }, [addToast]);

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
    } catch (e: any) {
      if (e.response?.status === 401) {
        addToast("error", "Session expired. Please log in again.");
        logout();
      } else {
        console.error(e);
        addToast("error", "Failed to fetch products");
      }
    } finally {
      setLoadingProducts(false);
    }
  }, [page, pageSize, addToast]);

  useEffect(() => {
    fetchVendors();
    fetchDocs();
    fetchProducts();
  }, [fetchVendors, fetchDocs, fetchProducts]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error("Logout error:", e);
      // Force logout even if API call fails
      logout();
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
      addToast("warning", "Select at least 1 product first.");
      return;
    }

    setLoadingMeta(true);

    try {
      const res = await api.post(ENDPOINTS.GENERATE_METADATA, {
        product_ids: ids,
      });

      const updated = res.data.updated ?? 0;
      const failed = res.data.failed?.length ?? 0;

      addToast(
        "success",
        `Metadata generated: ${updated} updated${
          failed ? `, ${failed} failed` : ""
        }`
      );

      await fetchProducts();
    } catch (e: any) {
      if (e.response?.status === 401) {
        addToast("error", "Session expired. Please log in again.");
        logout();
      } else {
        console.error(e);
        addToast("error", e.response?.data?.error || "Failed to generate metadata");
      }
    } finally {
      setLoadingMeta(false);
    }
  };

  const generateMetadataForDocument = async (docId: number) => {
    setLoadingMeta(true);

    try {
      const res = await api.post(ENDPOINTS.GENERATE_METADATA, {
        document_id: docId,
      });

      const updated = res.data.updated ?? 0;
      const failed = res.data.failed?.length ?? 0;

      addToast(
        "success",
        `Metadata generated for document: ${updated} updated${
          failed ? `, ${failed} failed` : ""
        }`
      );
      await fetchProducts();
    } catch (e: any) {
      if (e.response?.status === 401) {
        addToast("error", "Session expired. Please log in again.");
        logout();
      } else {
        console.error(e);
        addToast(
          "error",
          e.response?.data?.error ||
            "Failed to generate metadata for this document"
        );
      }
    } finally {
      setLoadingMeta(false);
    }
  };

  const generateOnlineSeoNameForSelected = async () => {
    const ids = Array.from(selectedProductIds);
    if (ids.length === 0) {
      addToast("warning", "Select at least 1 product first.");
      return;
    }

    setLoadingSeo(true);

    try {
      const res = await api.post(ENDPOINTS.GENERATE_ONLINE_SEO_NAME, {
        product_ids: ids,
      });

      const updated = res.data.updated ?? 0;
      const failed = res.data.failed?.length ?? 0;

      addToast(
        "success",
        `SEO names generated: ${updated} updated${
          failed ? `, ${failed} failed` : ""
        }`
      );

      await fetchProducts();
    } catch (e: any) {
      if (e.response?.status === 401) {
        addToast("error", "Session expired. Please log in again.");
        logout();
      } else {
        console.error(e);
        addToast("error", e.response?.data?.error || "Failed to generate SEO names");
      }
    } finally {
      setLoadingSeo(false);
    }
  };

  const generateFormattedNameForSelected = async () => {
    const ids = Array.from(selectedProductIds);
    if (ids.length === 0) {
      addToast("warning", "Select at least 1 product first.");
      return;
    }

    // must have seo_name first
    if (missingSeoForSelected.length > 0) {
      addToast(
        "error",
        `SEO name missing for ${missingSeoForSelected.length} selected product(s). Generate SEO name first.`
      );
      return;
    }

    // must only be generated once
    if (alreadyFormattedSelected.length > 0) {
      addToast(
        "error",
        `Product name already generated once for ${alreadyFormattedSelected.length} selected product(s).`
      );
      return;
    }

    setLoadingName(true);

    try {
      const res = await api.post(ENDPOINTS.GENERATE_FORMATTED_NAME, {
        product_ids: ids,
      });

      const updated = res.data.updated ?? 0;
      const failed = res.data.failed?.length ?? 0;

      addToast(
        "success",
        `Product names formatted: ${updated} updated${
          failed ? `, ${failed} failed` : ""
        }`
      );

      await fetchProducts();
    } catch (e: any) {
      if (e.response?.status === 401) {
        addToast("error", "Session expired. Please log in again.");
        logout();
      } else {
        console.error(e);
        addToast("error", e.response?.data?.error || "Failed to format product names");
      }
    } finally {
      setLoadingName(false);
    }
  };

  const copyMetadata = async (p: Product) => {
    try {
      const text = JSON.stringify(p.metadata || {}, null, 2);
      await navigator.clipboard.writeText(text);
      addToast("success", "Metadata copied to clipboard");
    } catch (e) {
      console.error(e);
      addToast("error", "Failed to copy");
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
                Upload PDF price lists, extract products, generate SEO metadata
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setOpenUploadModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:from-purple-600 hover:to-pink-600 transition shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload Documents
              </button>

              <button
                onClick={() => setOpenProductModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-500 text-white font-semibold hover:bg-green-600 transition shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Product
              </button>

              <Link
                href={ENDPOINTS.EXPORT_CSV}
                target="_blank"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/10 text-white font-semibold hover:bg-white/20 transition shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </Link>

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition shadow-lg"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Logout
              </button>
            </div>
          </header>
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

          {/* Table Container with relative positioning for tooltips */}
          <div className="relative">
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

                    <th className="px-4 py-3 font-semibold">Product Name</th>
                    <th className="px-4 py-3 font-semibold">SEO Name</th>
                    <th className="px-4 py-3 font-semibold">Brand</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Retail</th>
                    <th className="px-4 py-3 font-semibold">Sale</th>
                    <th className="px-4 py-3 font-semibold">Color</th>
                    <th className="px-4 py-3 font-semibold text-center">
                      <Tooltip content="Document Source">
                        <svg className="w-4 h-4 mx-auto cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </Tooltip>
                    </th>
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
                          <ColorBalls colorString={p.color} />
                        </td>

                        <td className="px-4 py-3 text-center">
                          <DocumentIcon documentName={p.document} />
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

      {/* MODALS */}
      <AddProductModal
        open={openProductModal}
        onClose={() => setOpenProductModal(false)}
        refresh={fetchProducts}
        vendors={vendors}
      />

      <UploadDocumentsModal
        open={openUploadModal}
        onClose={() => setOpenUploadModal(false)}
        vendors={vendors}
        refreshDocuments={fetchDocs}
        refreshProducts={fetchProducts}
        refreshVendors={fetchVendors}
      />
    </div>
  );
}