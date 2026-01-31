"use client";

import { useState } from "react";
import Modal from "../ui/Modal";
import { api } from "@/lib/api";

export default function AddProductModal({
  open,
  onClose,
  vendors,
  refresh,
}: any) {
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!data.product_name?.trim()) {
      setError("Product name is required");
      return;
    }
    if (!data.vendor_name) {
      setError("Please select a vendor");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.post("/api/products/manual-create/", data);
      refresh();
      setData({});
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.error || "Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setData({ ...data, [field]: value });
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex flex-col h-[80vh]">
        {/* Fixed Header */}
        <div className="flex-shrink-0 border-b border-white/10 pb-4 mb-4">
          <h2 className="text-xl font-bold text-cyan-300">
            Add Product
          </h2>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-1 -mx-1">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-3 py-2 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-3 pb-4">
            {[
              { field: "product_name", label: "Product Name", required: true },
              { field: "brand_name", label: "Brand Name" },
              { field: "product_type", label: "Product Type" },
              { field: "retail_price", label: "Retail Price", type: "number" },
              { field: "sale_price", label: "Sale Price", type: "number" },
              { field: "model_number", label: "Model Number" },
              { field: "color", label: "Color" },
              { field: "variants", label: "Variants" },
            ].map(({ field, label, required, type = "text" }) => (
              <input
                key={field}
                type={type}
                placeholder={`${label}${required ? " *" : ""}`}
                value={data[field] || ""}
                className="w-full p-3 bg-black/30 border border-white/10 rounded-lg text-slate-200 placeholder-slate-400 focus:border-cyan-500/50 focus:outline-none transition"
                onChange={(e) => updateField(field, e.target.value)}
              />
            ))}

            <select
              value={data.vendor_name || ""}
              className="w-full p-3 bg-black/30 border border-white/10 rounded-lg text-slate-200 focus:border-cyan-500/50 focus:outline-none transition"
              onChange={(e) => updateField("vendor_name", e.target.value)}
            >
              <option value="">Select Vendor *</option>
              {vendors?.map((v: any) => (
                <option key={v.id} value={v.name}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Fixed Footer Button */}
        <div className="flex-shrink-0 border-t border-white/10 pt-4 mt-4">
          <button 
            onClick={submit}
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 rounded-lg text-white font-semibold transition"
          >
            {loading ? "Creating..." : "Create Product"}
          </button>
        </div>
      </div>
    </Modal>
  );
}