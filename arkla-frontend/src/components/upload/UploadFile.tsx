"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { KategoriSurat } from "@/lib/types";

interface UploadFileProps {
  kategori: KategoriSurat;
  uploadedFile: File | null;
  onFileUpload: (file: File) => void;
  onBack: () => void;
  onNext: () => void; // Tambah prop onNext
}

const kategoriLabels: Record<KategoriSurat, string> = {
  masuk_biasa: "masuk-biasa",
  undangan: "undangan",
  masuk_penting: "masuk-penting",
  keluar: "keluar-dewan",
  keluar_sekwan: "keluar-sekwan",
  rahasia: "rahasia",
};

export default function UploadFile({
  kategori,
  uploadedFile,
  onFileUpload,
  onBack,
  onNext,
}: UploadFileProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      setError("Format file tidak didukung. Gunakan PDF, JPG, atau PNG.");
      return false;
    }

    if (file.size > maxSize) {
      setError("Ukuran file melebihi 10MB.");
      return false;
    }

    setError(null);
    return true;
  };

  const handleFile = useCallback(
    (file: File) => {
      if (validateFile(file)) {
        onFileUpload(file);

        // Create preview for images
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = (e) => {
            setPreview(e.target?.result as string);
          };
          reader.readAsDataURL(file);
        } else {
          setPreview(null);
        }
      }
    },
    [onFileUpload]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleRemoveFile = () => {
    onFileUpload(null as unknown as File);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  return (
    <div>
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
      >
        <Image src="/iconarrowleft.svg" alt="Back" width={16} height={16} />
        <span>Kembali</span>
      </button>

      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Upload File Surat
        </h2>
        <p className="text-gray-500">
          Upload file surat dalam format PDF atau gambar (JPG, PNG) - Maksimal
          10MB
        </p>
        <p className="text-sm text-[#2C5F6F] mt-2">
          Kategori: <span className="font-medium">{kategoriLabels[kategori]}</span>
        </p>
      </div>

      {/* Upload Area */}
      {!uploadedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
            isDragging
              ? "border-[#2C5F6F] bg-[#2C5F6F]/5"
              : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Image
                src="/iconupload.svg"
                alt="Upload"
                width={32}
                height={32}
              />
            </div>
            <p className="text-gray-700 font-medium mb-2">
              Drag & Drop file di sini
            </p>
            <p className="text-gray-400 text-sm mb-4">atau</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-2 bg-[#2C5F6F] text-white rounded-lg hover:bg-[#244f5c] transition-colors"
            >
              Pilih File
            </button>
            <p className="text-gray-400 text-xs mt-4">
              Format: PDF, JPG, PNG - Maksimal 10MB
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      ) : (
        /* File Preview */
        <div className="border rounded-xl p-6 bg-green-50 border-green-200">
          <div className="flex items-start gap-4">
            {/* Thumbnail */}
            <div className="w-24 h-32 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
              {preview ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Image
                    src="/icondaftarsurat.svg"
                    alt="PDF"
                    width={32}
                    height={32}
                  />
                </div>
              )}
            </div>

            {/* File Info */}
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 mb-1">
                {uploadedFile.name}
              </h3>
              <p className="text-sm text-gray-500 mb-2">
                {formatFileSize(uploadedFile.size)}
              </p>
              <div className="w-full bg-green-200 rounded-full h-1.5 mb-2">
                <div className="bg-green-500 h-1.5 rounded-full w-full" />
              </div>
              <p className="text-sm text-green-600 flex items-center gap-1">
                <Image
                  src="/iconcheckcircle.svg"
                  alt="Success"
                  width={14}
                  height={14}
                />
                File berhasil diupload
              </p>
            </div>

            {/* Remove Button */}
            <button
              onClick={handleRemoveFile}
              className="text-red-500 hover:text-red-700"
            >
              <Image
                src="/iconxcircle.svg"
                alt="Remove"
                width={24}
                height={24}
              />
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      {uploadedFile && (
        <div className="flex gap-4 mt-6">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Ganti File
          </button>
          <button
            onClick={onNext}
            className="flex-1 px-6 py-3 bg-[#2C5F6F] text-white rounded-lg hover:bg-[#244f5c] transition-colors font-medium"
          >
            Lanjutkan ke OCR Processing
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}