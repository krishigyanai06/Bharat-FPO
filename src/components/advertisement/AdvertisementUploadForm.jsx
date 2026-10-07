import React, { useState, useRef } from "react";
import {
  Upload,
  ImagePlus,
  Sparkles,
  RefreshCw,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import TenantTargetingSelector from "./TenantTargetingSelector";

const MAX_IMAGES = 5;

const formatFileSize = (bytes) => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

export default function AdvertisementUploadForm({
  isSuperAdmin,
  availableTenants = [],
  uploading = false,
  onUpload,
}) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  // SuperAdmin targeting state
  const [visibleToAll, setVisibleToAll] = useState(true);
  const [selectedTenantIds, setSelectedTenantIds] = useState([]);

  const fileInputRef = useRef(null);

  // Process files
  const handleFileSelection = (files) => {
    const validImageFiles = [];
    const newPreviews = [];

    const availableSlots = MAX_IMAGES - selectedFiles.length;
    if (availableSlots <= 0) {
      toast.error(`You can upload a maximum of ${MAX_IMAGES} images at a time.`);
      return;
    }

    const filesToProcess = Array.from(files).slice(0, availableSlots);

    if (files.length > availableSlots) {
      toast(
        `Only ${availableSlots} more image(s) could be added (max ${MAX_IMAGES} per batch).`,
        { icon: "ℹ️" }
      );
    }

    for (const f of filesToProcess) {
      if (!f.type.startsWith("image/")) {
        toast.error(`${f.name} is not a supported image file`);
        continue;
      }
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`${f.name} exceeds 10MB limit`);
        continue;
      }
      validImageFiles.push(f);
      newPreviews.push({
        name: f.name,
        size: f.size,
        url: URL.createObjectURL(f),
      });
    }

    setSelectedFiles((prev) => [...prev, ...validImageFiles]);
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (index) => {
    if (previews[index]?.url) {
      URL.revokeObjectURL(previews[index].url);
    }
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClearAll = () => {
    previews.forEach((p) => {
      if (p.url) URL.revokeObjectURL(p.url);
    });
    setSelectedFiles([]);
    setPreviews([]);
    setSelectedTenantIds([]);
    setVisibleToAll(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) {
      return toast.error("Please select at least one image to upload");
    }

    if (isSuperAdmin && !visibleToAll && selectedTenantIds.length === 0) {
      return toast.error(
        "Please select at least one tenant to target or choose 'All Tenants'"
      );
    }

    const success = await onUpload({
      files: selectedFiles,
      visibleToAll,
      selectedTenantIds,
    });

    if (success) {
      handleClearAll();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-xs space-y-5">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Upload
              className={`w-4 h-4 ${
                isSuperAdmin ? "text-purple-600" : "text-emerald-600"
              }`}
            />
            Upload New Posters
          </h2>
          <p className="text-xs text-gray-500">
            Upload up to <span className="font-semibold text-gray-700">{MAX_IMAGES} images</span> per batch (JPG, PNG, WebP)
          </p>
        </div>

        {isSuperAdmin && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>SuperAdmin Targeting Enabled</span>
          </div>
        )}
      </div>

      {/* DRAG & DROP DROPZONE */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
          isDragging
            ? isSuperAdmin
              ? "border-purple-500 bg-purple-50/60 scale-[0.99]"
              : "border-emerald-500 bg-emerald-50/60 scale-[0.99]"
            : isSuperAdmin
            ? "border-gray-200 hover:border-purple-400 hover:bg-purple-50/20 bg-gray-50/50"
            : "border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/20 bg-gray-50/50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/webp, image/jpg"
          multiple
          className="hidden"
          onChange={handleInputChange}
        />

        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
            isSuperAdmin
              ? "bg-purple-100/80 text-purple-600"
              : "bg-emerald-100/80 text-emerald-600"
          }`}
        >
          <ImagePlus className="w-6 h-6" />
        </div>

        <p className="text-sm font-semibold text-gray-800">
          Click to browse or drag & drop poster images here
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Supports JPEG, PNG, WebP (Max 10MB each, up to {MAX_IMAGES} files at once)
        </p>
      </div>

      {/* TARGETING SELECTOR (FOR SUPER ADMIN) */}
      {isSuperAdmin && (
        <TenantTargetingSelector
          visibleToAll={visibleToAll}
          onChangeVisibleToAll={setVisibleToAll}
          selectedTenantIds={selectedTenantIds}
          onToggleTenant={(tId) => {
            setSelectedTenantIds((prev) =>
              prev.includes(tId)
                ? prev.filter((id) => id !== tId)
                : [...prev, tId]
            );
          }}
          onSelectAll={() =>
            setSelectedTenantIds(availableTenants.map((t) => t._id || t.id))
          }
          onClearAll={() => setSelectedTenantIds([])}
          availableTenants={availableTenants}
        />
      )}

      {/* PREVIEWS LIST */}
      {previews.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">
              Selected Images ({previews.length}/{MAX_IMAGES})
            </span>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-red-600 hover:text-red-700 font-medium cursor-pointer"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {previews.map((item, index) => (
              <div
                key={index}
                className="relative group rounded-xl border border-gray-200 bg-gray-50 overflow-hidden shadow-2xs"
              >
                <div className="aspect-[4/3] w-full bg-gray-100 flex items-center justify-center overflow-hidden">
                  <img
                    src={item.url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-2 bg-white">
                  <p
                    className="text-[11px] font-medium text-gray-800 truncate"
                    title={item.name}
                  >
                    {item.name}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {formatFileSize(item.size)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile(index);
                  }}
                  className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-md transition-all opacity-90 hover:opacity-100 cursor-pointer"
                  title="Remove image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={handleClearAll}
              disabled={uploading}
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={uploading || selectedFiles.length === 0}
              className={`inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer ${
                isSuperAdmin
                  ? "bg-purple-600 hover:bg-purple-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading {selectedFiles.length} Poster(s)...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    Upload {selectedFiles.length} Poster
                    {selectedFiles.length > 1 ? "s" : ""}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
