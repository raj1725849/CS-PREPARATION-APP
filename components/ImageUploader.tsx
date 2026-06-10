"use client";

import React, { useState, useRef, useCallback } from "react";
import { UploadCloud, X, Plus } from "lucide-react";

export interface UploadedImage {
  id: string;
  file: File;
  base64: string;
  mimeType: string;
  preview: string;
  name: string;
  sizeKB: number;
  status: "uploading" | "ready" | "error";
  errorMessage?: string;
}

interface ImageUploaderProps {
  onImagesReady: (files: UploadedImage[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

export default function ImageUploader({
  onImagesReady,
  maxImages = 10,
  disabled = false,
}: ImageUploaderProps) {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Trigger file picker ──────────────────────────────────
  const openFilePicker = () => {
    if (disabled) return;
    // Reset input value so same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  // ── Drag handlers ────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length) processFiles(dropped);
  };

  // ── File input onChange ──────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (!selected.length) return;
    processFiles(selected);
    // Reset so same file can trigger onChange again
    e.target.value = "";
  };

  // ── base64 converter ─────────────────────────────────────
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
    });

  // ── Core processing ──────────────────────────────────────
  const processFiles = useCallback(
    async (files: File[]) => {
      // How many slots remain
      const remaining = maxImages - images.length;
      if (remaining <= 0) {
        alert(`Maximum ${maxImages} images already reached.`);
        return;
      }

      const capped = files.slice(0, remaining);
      if (files.length > remaining) {
        alert(
          `Maximum ${maxImages} images allowed — only first ${remaining} added.`
        );
      }

      // Build initial upload objects with status "uploading"
      const newItems: UploadedImage[] = capped.map((file) => {
        const mimeType = file.type;
        const valid =
          ["image/jpeg", "image/jpg", "image/png"].includes(mimeType) &&
          file.size <= 8 * 1024 * 1024;

        return {
          id: crypto.randomUUID(),
          file,
          base64: "",
          mimeType,
          preview: URL.createObjectURL(file),
          name: file.name,
          sizeKB: Math.round(file.size / 1024),
          status: valid ? ("uploading" as const) : ("error" as const),
          errorMessage: !["image/jpeg", "image/jpg", "image/png"].includes(
            mimeType
          )
            ? "Only JPG and PNG supported"
            : file.size > 8 * 1024 * 1024
            ? "Max 8MB per image"
            : undefined,
        };
      });

      // Add to state immediately — shows spinners right away
      setImages((prev) => [...prev, ...newItems]);

      // Process valid ones in parallel
      const validItems = newItems.filter((i) => i.status === "uploading");

      const results = await Promise.allSettled(
        validItems.map(async (item) => {
          const base64 = await fileToBase64(item.file);
          return { id: item.id, base64 };
        })
      );

      // Update each item based on result
      setImages((prev) => {
        const next = [...prev];
        results.forEach((result, i) => {
          const id = validItems[i].id;
          const idx = next.findIndex((img) => img.id === id);
          if (idx === -1) return;
          if (result.status === "fulfilled") {
            next[idx] = {
              ...next[idx],
              status: "ready",
              base64: result.value.base64,
            };
          } else {
            next[idx] = {
              ...next[idx],
              status: "error",
              errorMessage: "Failed to process image",
            };
          }
        });

        // Notify parent with ready images only, deferred to avoid setState during render warning
        const readyImages = next.filter((img) => img.status === "ready");
        setTimeout(() => onImagesReady(readyImages), 0);
        return next;
      });
    },
    [images.length, maxImages, onImagesReady]
  );

  // ── Remove single image ──────────────────────────────────
  const removeImage = (id: string) => {
    setImages((prev) => {
      const next = prev.filter((img) => {
        if (img.id === id) {
          URL.revokeObjectURL(img.preview);
          return false;
        }
        return true;
      });
      setTimeout(() => onImagesReady(next.filter((img) => img.status === "ready")), 0);
      return next;
    });
  };

  // ── Clear all ────────────────────────────────────────────
  const clearAll = () => {
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
    onImagesReady([]);
  };

  const isProcessing = images.some((img) => img.status === "uploading");

  return (
    <div className="w-full space-y-4">

      {/* ── Single hidden file input — controlled by ref ── */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        multiple
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />

      {/* ── Summary bar ─────────────────────────────────── */}
      {images.length > 0 && (
        <div className="flex justify-between items-center">
          {isProcessing ? (
            <div className="flex items-center gap-2 text-[13px] text-[#64748b]">
              <span className="w-3.5 h-3.5 border-2 border-[#94a3b8] border-t-[#1a3a5c] rounded-full animate-spin" />
              Processing images...
            </div>
          ) : (
            <span className="text-[13px] font-medium text-[#1a3a5c]">
              {images.filter((i) => i.status === "ready").length} of{" "}
              {images.length} image{images.length !== 1 ? "s" : ""} ready
            </span>
          )}
          <button
            type="button"
            onClick={clearAll}
            className="text-[12px] text-[#dc2626] hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Upload zone (full) or Add more (compact) ─────── */}
      {images.length === 0 ? (
        <div
          onClick={openFilePicker}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={[
            "border-2 rounded-xl px-6 py-8 flex flex-col items-center justify-center transition-all select-none",
            disabled
              ? "opacity-50 cursor-not-allowed border-dashed border-[#cbd5e1] bg-[#f8fafc]"
              : isDragging
              ? "border-solid border-[#e8590c] bg-[#fff7f5] cursor-pointer"
              : "border-dashed border-[#cbd5e1] bg-[#f8fafc] cursor-pointer hover:border-[#1a3a5c] hover:bg-[#f1f5f9]",
          ].join(" ")}
        >
          <UploadCloud className="w-10 h-10 text-[#94a3b8] mb-3" />
          <p className="text-[15px] font-medium text-[#1a3a5c]">
            Upload Answer Sheet Images
          </p>
          <p className="text-[13px] text-[#64748b] mt-1 text-center">
            Drag & drop or click to browse
          </p>
          <div className="flex gap-2 mt-4">
            {["JPG", "PNG", `Up to ${maxImages} pages`].map((label) => (
              <span
                key={label}
                className="bg-[#e2e8f0] text-[#475569] text-[11px] px-2.5 py-0.5 rounded-full"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div
          onClick={openFilePicker}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={[
            "w-full h-12 border-[1.5px] border-dashed rounded-xl flex items-center justify-center gap-1.5 transition-colors select-none",
            disabled
              ? "opacity-50 cursor-not-allowed border-[#cbd5e1] text-[#cbd5e1]"
              : isDragging
              ? "border-[#e8590c] text-[#e8590c] cursor-pointer"
              : "border-[#cbd5e1] text-[#64748b] cursor-pointer hover:border-[#1a3a5c] hover:text-[#1a3a5c]",
          ].join(" ")}
        >
          <Plus className="w-4 h-4" />
          <span className="text-[13px] font-medium">Add more pages</span>
        </div>
      )}

      {/* ── Thumbnail grid ───────────────────────────────── */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {images.map((img, idx) => (
            <div
              key={img.id}
              className={[
                "relative w-full aspect-[3/4] rounded-xl overflow-hidden border-[1.5px] shadow-sm",
                img.status === "error"
                  ? "bg-[#fef2f2] border-[#fca5a5]"
                  : "bg-[#f1f5f9] border-[#e2e8f0]",
              ].join(" ")}
            >
              {/* Uploading spinner overlay */}
              {img.status === "uploading" && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80">
                  <span className="w-7 h-7 border-[3px] border-[#e2e8f0] border-t-[#1a3a5c] rounded-full animate-spin" />
                  <p className="text-[11px] text-[#94a3b8] mt-2">
                    Processing...
                  </p>
                </div>
              )}

              {/* Ready — show image */}
              {img.status === "ready" && (
                <>
                  <img
                    src={img.preview}
                    alt={`Page ${idx + 1}`}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                  {/* Ready badge */}
                  <div className="absolute top-1.5 left-1.5 z-20 bg-green-600/90 rounded-full px-2 py-0.5">
                    <span className="text-[10px] text-white font-medium">
                      ✓ Ready
                    </span>
                  </div>
                  {/* Page number */}
                  <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/50 to-transparent z-20 flex items-end pb-1.5 pl-2">
                    <span className="text-[10px] text-white font-medium">
                      Page {idx + 1}
                    </span>
                  </div>
                </>
              )}

              {/* Error state */}
              {img.status === "error" && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-3 text-center">
                  <span className="text-red-500 text-2xl mb-1">⚠</span>
                  <p className="text-[11px] text-[#dc2626] leading-tight">
                    {img.errorMessage}
                  </p>
                </div>
              )}

              {/* Remove button — always on top */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(img.id);
                }}
                className="absolute top-1.5 right-1.5 z-30 w-[22px] h-[22px] rounded-full bg-black/60 hover:bg-red-600/80 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
