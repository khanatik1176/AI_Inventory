"use client";

import { useState, useRef, useEffect } from "react";
import Modal from "../ui/Modal";
import { api } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";

// Static data for dropdowns
const PRODUCT_TYPES = [
  "Headphone", "EarPhones", "TWS", "Neckbands", "Speakers", "Smart Rings", 
  "Tools and Gears", "Small Electronics", "Adapters", "Cables", "Car Chargers", 
  "Hub and Docks", "Power Bank", "Phone Coolers", "Smart Mosquito Device", 
  "Mosquito Bat", "Nail Clippers", "Trimmers", "Phones", "Cooking Appliances", 
  "Smart Watch", "Smart Trackers"
];

const BRANDS = [
  "Anker", "CMF", "Amazfit", "Xiaomi", "Samsung", "AWEI", "SoundBeat",
  "Apple", "OnePlus", "Realme", "Vivo", "Oppo", "Honor", "Huawei",
  "Nokia", "Sony", "JBL", "Bose", "Sennheiser", "Audio-Technica",
  "Skullcandy", "Beats", "Plantronics", "Marshall", "Harman Kardon",
  "Bang & Olufsen", "Jabra", "QCY", "Haylou", "Redmi"
];

const COLORS = [
  { name: "Red", hex: "#FF0000" },
  { name: "Blue", hex: "#0000FF" },
  { name: "Green", hex: "#00FF00" },
  { name: "Yellow", hex: "#FFFF00" },
  { name: "Orange", hex: "#FFA500" },
  { name: "Purple", hex: "#800080" },
  { name: "Pink", hex: "#FFC0CB" },
  { name: "Brown", hex: "#A52A2A" },
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Gray", hex: "#808080" },
  { name: "Silver", hex: "#C0C0C0" },
  { name: "Gold", hex: "#FFD700" },
  { name: "Rose Gold", hex: "#E8B4B8" },
  { name: "Navy Blue", hex: "#000080" },
  { name: "Sky Blue", hex: "#87CEEB" },
  { name: "Dark Blue", hex: "#00008B" },
  { name: "Light Blue", hex: "#ADD8E6" },
  { name: "Teal", hex: "#008080" },
  { name: "Turquoise", hex: "#40E0D0" },
  { name: "Cyan", hex: "#00FFFF" },
  { name: "Lime", hex: "#00FF00" },
  { name: "Forest Green", hex: "#228B22" },
  { name: "Olive", hex: "#808000" },
  { name: "Mint Green", hex: "#98FF98" },
  { name: "Dark Green", hex: "#006400" },
  { name: "Maroon", hex: "#800000" },
  { name: "Crimson", hex: "#DC143C" },
  { name: "Coral", hex: "#FF7F50" },
  { name: "Salmon", hex: "#FA8072" },
  { name: "Hot Pink", hex: "#FF69B4" },
  { name: "Magenta", hex: "#FF00FF" },
  { name: "Violet", hex: "#EE82EE" },
  { name: "Indigo", hex: "#4B0082" },
  { name: "Lavender", hex: "#E6E6FA" },
  { name: "Plum", hex: "#DDA0DD" },
  { name: "Beige", hex: "#F5F5DC" },
  { name: "Tan", hex: "#D2B48C" },
  { name: "Khaki", hex: "#F0E68C" },
  { name: "Ivory", hex: "#FFFFF0" },
  { name: "Cream", hex: "#FFFDD0" },
  { name: "Pearl", hex: "#EAE0C8" },
  { name: "Charcoal", hex: "#36454F" },
  { name: "Slate Gray", hex: "#708090" },
  { name: "Light Gray", hex: "#D3D3D3" },
  { name: "Dark Gray", hex: "#A9A9A9" },
  { name: "Bronze", hex: "#CD7F32" },
  { name: "Copper", hex: "#B87333" },
  { name: "Platinum", hex: "#E5E4E2" },
  { name: "Titanium", hex: "#878681" }
];

interface DropdownProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  required?: boolean;
  canCreate?: boolean;
  onCreate?: (value: string) => Promise<void>;
}

function SearchableDropdown({ 
  label, 
  value, 
  onChange, 
  options, 
  placeholder, 
  required = false,
  canCreate = false,
  onCreate
}: DropdownProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exactMatch = options.find(option => 
    option.toLowerCase() === searchTerm.toLowerCase()
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (option: string) => {
    onChange(option);
    setSearchTerm(option);
    setIsOpen(false);
  };

  const handleCreate = async () => {
    if (onCreate && searchTerm.trim()) {
      await onCreate(searchTerm.trim());
      onChange(searchTerm.trim());
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-slate-300 mb-2">
        {label} {required && "*"}
      </label>
      <input
        type="text"
        value={value || searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setIsOpen(true);
          if (!e.target.value) onChange("");
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="w-full p-3 bg-black/30 border border-white/10 rounded-lg text-slate-200 placeholder-slate-400 focus:border-cyan-500/50 focus:outline-none transition"
      />

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800/95 backdrop-blur-sm border border-white/10 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
          {filteredOptions.length > 0 && (
            <div className="p-2">
              <div className="text-xs text-slate-400 px-2 py-1 uppercase tracking-wide">
                Available Options
              </div>
              {filteredOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => handleSelect(option)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200 transition"
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {canCreate && searchTerm.trim() && !exactMatch && (
            <div className={`p-2 ${filteredOptions.length > 0 ? 'border-t border-white/10' : ''}`}>
              <div className="text-xs text-slate-400 px-2 py-1 uppercase tracking-wide">
                Create New
              </div>
              <button
                onClick={handleCreate}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-cyan-500/20 text-cyan-300 transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create &ldquo;{searchTerm.trim()}&rdquo;
              </button>
            </div>
          )}

          {canCreate && searchTerm.trim() && !exactMatch && filteredOptions.length === 0 && (
            <div className="p-4 text-center text-slate-400 text-sm">
              No matches found. You can create a new {label.toLowerCase()}.
            </div>
          )}

          {!canCreate && filteredOptions.length === 0 && searchTerm.trim() && (
            <div className="p-4 text-center text-slate-400 text-sm">
              No matches found for &ldquo;{searchTerm}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ColorDropdownProps {
  label: string;
  selectedColors: string[];
  onChange: (colors: string[]) => void;
}

function ColorDropdown({ label, selectedColors, onChange }: ColorDropdownProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredColors = COLORS.filter(color =>
    color.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addColor = (colorName: string) => {
    if (!selectedColors.includes(colorName)) {
      onChange([...selectedColors, colorName]);
    }
    setSearchTerm("");
    setIsOpen(false);
  };

  const removeColor = (colorName: string) => {
    onChange(selectedColors.filter(c => c !== colorName));
  };

  const getColorHex = (colorName: string) => {
    return COLORS.find(c => c.name === colorName)?.hex || "#000000";
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-slate-300 mb-2">
        {label}
      </label>
      
      {/* Selected Colors Chips */}
      {selectedColors.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedColors.map((color) => (
            <div
              key={color}
              className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm"
            >
              <div
                className="w-4 h-4 rounded-full border border-white/20"
                style={{ backgroundColor: getColorHex(color) }}
              />
              <span className="text-slate-200">{color}</span>
              <button
                onClick={() => removeColor(color)}
                className="text-slate-400 hover:text-red-400 transition"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        type="text"
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Search and select colors..."
        className="w-full p-3 bg-black/30 border border-white/10 rounded-lg text-slate-200 placeholder-slate-400 focus:border-cyan-500/50 focus:outline-none transition"
      />

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800/95 backdrop-blur-sm border border-white/10 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
          {filteredColors.length > 0 ? (
            <div className="p-2">
              <div className="text-xs text-slate-400 px-2 py-1 uppercase tracking-wide">
                Available Colors
              </div>
              {filteredColors.map((color) => (
                <button
                  key={color.name}
                  onClick={() => addColor(color.name)}
                  disabled={selectedColors.includes(color.name)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-slate-200 transition flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div
                    className="w-4 h-4 rounded-full border border-white/20 flex-shrink-0"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span>{color.name}</span>
                  {selectedColors.includes(color.name) && (
                    <span className="ml-auto text-xs text-green-400">Selected</span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-slate-400 text-sm">
              No colors found matching &ldquo;{searchTerm}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AddProductModal({
  open,
  onClose,
  vendors,
  refresh,
}: any) {
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const { addToast } = useToast();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setData({});
      setSelectedColors([]);
      setError(null);
    }
  }, [open]);

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
      const submitData = {
        ...data,
        color: selectedColors.join(", ") // Convert array to comma-separated string
      };

      await api.post("/api/products/manual-create/", submitData);
      addToast("success", "Product created successfully!");
      refresh();
      setData({});
      setSelectedColors([]);
      onClose();
    } catch (e: any) {
      const errorMsg = e.response?.data?.error || "Failed to create product";
      setError(errorMsg);
      addToast("error", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setData({ ...data, [field]: value });
  };

  const createNewVendor = async (vendorName: string) => {
    try {
      await api.post("/api/products/vendors/", { name: vendorName });
      addToast("success", `Vendor &ldquo;${vendorName}&rdquo; created successfully!`);
      // Refresh vendors list if needed
      if (refresh) refresh();
    } catch (e: any) {
      const errorMsg = e.response?.data?.error || "Failed to create vendor";
      addToast("error", errorMsg);
      throw new Error(errorMsg);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex flex-col h-[85vh] relative">
        {/* Red Cross Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 transition-all duration-200 border border-red-500/20 hover:border-red-500/40"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Fixed Header */}
        <div className="flex-shrink-0 border-b border-white/10 pb-4 mb-4 pr-16">
          <h2 className="text-2xl font-bold text-cyan-300">Add Product</h2>
          <p className="text-sm text-slate-400 mt-1">
            Create a new product entry manually
          </p>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-1 -mx-1">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-3 py-2 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4 pb-4">
            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                placeholder="Enter product name"
                value={data.product_name || ""}
                className="w-full p-3 bg-black/30 border border-white/10 rounded-lg text-slate-200 placeholder-slate-400 focus:border-cyan-500/50 focus:outline-none transition"
                onChange={(e) => updateField("product_name", e.target.value)}
              />
            </div>

            {/* Vendor Dropdown */}
            <SearchableDropdown
              label="Vendor"
              value={data.vendor_name || ""}
              onChange={(value) => updateField("vendor_name", value)}
              options={vendors?.map((v: any) => v.name) || []}
              placeholder="Search or create vendor..."
              required={true}
              canCreate={true}
              onCreate={createNewVendor}
            />

            {/* Product Type Dropdown */}
            <SearchableDropdown
              label="Product Type"
              value={data.product_type || ""}
              onChange={(value) => updateField("product_type", value)}
              options={PRODUCT_TYPES}
              placeholder="Search product type..."
              canCreate={false}
            />

            {/* Brand Dropdown */}
            <SearchableDropdown
              label="Brand"
              value={data.brand_name || ""}
              onChange={(value) => updateField("brand_name", value)}
              options={BRANDS}
              placeholder="Search brand..."
              canCreate={false}
            />

            {/* Color Multi-Select */}
            <ColorDropdown
              label="Colors"
              selectedColors={selectedColors}
              onChange={setSelectedColors}
            />

            {/* Price Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Retail Price
                </label>
                <input
                  type="text"
                  placeholder="0.00"
                  value={data.retail_price || ""}
                  className="w-full p-3 bg-black/30 border border-white/10 rounded-lg text-slate-200 placeholder-slate-400 focus:border-cyan-500/50 focus:outline-none transition"
                  onChange={(e) => updateField("retail_price", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Sale Price
                </label>
                <input
                  type="text"
                  placeholder="0.00"
                  value={data.sale_price || ""}
                  className="w-full p-3 bg-black/30 border border-white/10 rounded-lg text-slate-200 placeholder-slate-400 focus:border-cyan-500/50 focus:outline-none transition"
                  onChange={(e) => updateField("sale_price", e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer Button */}
        <div className="flex-shrink-0 border-t border-white/10 pt-4 mt-4">
          <button 
            onClick={submit}
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 rounded-lg text-white font-semibold transition shadow-lg flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
                Creating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Product
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}