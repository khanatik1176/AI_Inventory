"use client";

import { useState } from "react";
import Modal from "../ui/Modal";
import { api } from "@/lib/api";

export default function AddVendorModal({ open, onClose, refresh }: any) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) {
      setError("Vendor name is required");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      await api.post("/api/products/vendors/", { name });
      refresh();
      setName("");
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.error || "Failed to create vendor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <h2 className="text-xl font-bold text-cyan-300 mb-4">Add Vendor</h2>
      
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-3 py-2 rounded-lg mb-3 text-sm">
          {error}
        </div>
      )}

      <input
        value={name}
        className="w-full p-3 mb-4 bg-black/30 border border-white/10 rounded-lg text-slate-200 placeholder-slate-400 focus:border-cyan-500/50 focus:outline-none transition"
        placeholder="Enter vendor name"
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      
      <button 
        onClick={submit}
        disabled={loading}
        className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 rounded-lg text-white font-semibold transition"
      >
        {loading ? "Creating..." : "Create Vendor"}
      </button>
    </Modal>
  );
}