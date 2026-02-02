"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ProcessSuratResponse, KategoriSurat } from "@/lib/types";
import { apiClient } from "@/lib/api-client";

interface ValidationFormProps {
  result: ProcessSuratResponse;
  file: File;
  onDiscard: () => void;
  onSuccess: () => void;
}

const kategoriLabels: Record<KategoriSurat, string> = {
  masuk_biasa: "Surat Masuk Biasa",
  undangan: "Undangan",
  masuk_penting: "Surat Masuk Penting",
  keluar: "Surat Keluar Dewan",
  keluar_sekwan: "Keluar Sekwan",
  rahasia: "Rahasia",
};

// Fields by kategori - sesuai dengan struktur dokumen asli CSV
const fieldsByKategori: Record<KategoriSurat, string[]> = {
  masuk_biasa: [
    "nomor_urut",
    "index_surat",
    "kode",
    "tgl_surat",
    "isi_ringkas",
    "asal_surat",
    "nomor_surat",
    "lampiran",
    "pengolah",
    "tgl_diteruskan",
    "disposisi_ketua",
    "tgl_masuk",
    "tujuan",
    "tgl_surat_turun",
    "disposisi_sekwan",
  ],
  undangan: [
    "nomor_urut",
    "index_surat",
    "kode",
    "tgl_surat_masuk",
    "tgl_penyelesaian",
    "isi_ringkas",
    "asal_surat",
    "nomor_surat",
    "lampiran",
    "keterangan",
    "tgl_masuk_surat",
    "diperuntukan",
    "tgl_surat_turun",
    "disposisi_sekwan",
  ],
  masuk_penting: [
    "nomor_urut",
    "index_surat",
    "kode",
    "tgl_surat_masuk",
    "isi_ringkas",
    "asal_surat",
    "nomor_surat",
    "lampiran",
    "pengolah",
    "tgl_diteruskan",
    "disposisi_ketua",
    "tgl_masuk",
    "tujuan",
    "tgl_surat_turun",
    "disposisi_sekwan",
  ],
  keluar: [
    "nomor_urut",
    "index_surat",
    "kode",
    "isi_ringkas",
    "kepada",
    "pengolah",
    "tgl_surat",
    "lampiran",
    "catatan",
  ],
  keluar_sekwan: [
    "nomor_urut",
    "index_surat",
    "kode",
    "isi_ringkas",
    "kepada",
    "pengolah",
    "tgl_surat",
    "lampiran",
    "catatan",
  ],
  rahasia: [
    "nomor_urut",
    "index_surat",
    "kode",
    "tgl_terima_surat",
    "isi_ringkas",
    "asal_surat",
    "nomor_surat",
    "lampiran",
    "pengolah",
    "tgl_diteruskan",
    "catatan",
  ],
};

const fieldLabels: Record<string, string> = {
  // Identitas
  nomor_urut: "Nomor Urut",
  index_surat: "Index",
  kode: "Kode Klasifikasi",

  // Tanggal-tanggal
  tgl_surat: "Tanggal Surat",
  tgl_surat_masuk: "Tanggal Surat Masuk",
  tgl_masuk: "Tanggal Masuk",
  tgl_masuk_surat: "Tanggal Masuk Surat",
  tgl_terima_surat: "Tanggal Terima Surat",
  tgl_diteruskan: "Tanggal Diteruskan",
  tgl_surat_turun: "Tanggal Surat Turun",
  tgl_penyelesaian: "Tanggal Penyelesaian",

  // Konten
  isi_ringkas: "Isi Ringkas (AI Summary)",
  nomor_surat: "Nomor Surat",
  lampiran: "Lampiran",

  // Pihak terkait
  asal_surat: "Asal Surat",
  kepada: "Kepada",
  tujuan: "Tujuan",
  diperuntukan: "Diperuntukan",
  pengolah: "Pengolah",

  // Disposisi
  disposisi_ketua: "Disposisi Ketua",
  disposisi_sekwan: "Disposisi Sekwan",
  catatan: "Catatan",
  keterangan: "Keterangan",
};

export default function ValidationForm({
  result,
  file,
  onDiscard,
  onSuccess,
}: ValidationFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [kodeArsip, setKodeArsip] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);

  // Initialize form data from extraction result
  useEffect(() => {
    if (result.extracted_data) {
      const initialData: Record<string, string> = {};
      Object.entries(result.extracted_data).forEach(([key, value]) => {
        // Include all values, even empty strings (but not null/undefined)
        if (value !== null && value !== undefined) {
          initialData[key] = String(value);
        }
      });
      // Also set isi_ringkas from top-level response if available
      if (result.isi_ringkas) {
        initialData.isi_ringkas = result.isi_ringkas;
      }
      setFormData(initialData);
    }

    // Generate preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }, [result, file]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      await apiClient.verifySurat({
        surat_id: result.surat_id,
        extracted_data: formData,
        kode_arsip: kodeArsip || undefined,
      });

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan data");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegenerate = () => {
    // TODO: Implement regenerate summary feature if needed
  };

  const fields = fieldsByKategori[result.kategori] || [];
  const confidence = Math.round((result.confidence?.overall || 0) * 100);

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-auto lg:h-[calc(100vh-200px)]">
      {/* Left: Document Preview */}
      <div className="h-[300px] sm:h-[400px] lg:h-auto lg:flex-1 bg-gray-100 rounded-xl overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 px-3 sm:px-4 py-2 flex items-center justify-center gap-2">
          <button
            onClick={() => setZoom((z) => Math.max(z - 25, 25))}
            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded"
          >
            <Image
              src="/iconzoomout.svg"
              alt="Zoom Out"
              width={16}
              height={16}
            />
          </button>
          <span className="text-xs sm:text-sm text-gray-600 min-w-[40px] sm:min-w-[50px] text-center">
            {zoom}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(z + 25, 200))}
            className="p-1.5 sm:p-2 hover:bg-gray-100 rounded"
          >
            <Image src="/iconzoomin.svg" alt="Zoom In" width={16} height={16} />
          </button>
          <div className="w-px h-6 bg-gray-300 mx-1 sm:mx-2" />
          <button className="p-1.5 sm:p-2 hover:bg-gray-100 rounded">
            <Image src="/iconrotate.svg" alt="Rotate" width={16} height={16} />
          </button>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
          {preview ? (
            <img
              src={preview}
              alt="Document Preview"
              className="max-w-full shadow-lg"
              style={{ transform: `scale(${zoom / 100})` }}
            />
          ) : (
            <div className="text-center text-gray-500">
              <Image
                src="/icondaftarsurat.svg"
                alt="PDF"
                width={64}
                height={64}
                className="mx-auto mb-4 opacity-50"
              />
              <p>Preview tidak tersedia untuk file PDF</p>
            </div>
          )}
        </div>
      </div>

      {/* Right: Form */}
      <div className="w-full lg:w-[450px] bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Image src="/iconsparkles.svg" alt="AI" width={20} height={20} />
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                AI Extraction Results
              </h3>
            </div>
            <span
              className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                confidence >= 80
                  ? "bg-green-100 text-green-700"
                  : confidence >= 60
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
              }`}
            >
              {confidence}%
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500">
            Kategori:{" "}
            <span className="text-[#2C5F6F] font-medium">
              {kategoriLabels[result.kategori]}
            </span>
          </p>
        </div>

        {/* Form Fields */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
          {/* Row: Kode Arsip, Index, No. Urut */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
                Kode Arsip
              </label>
              <input
                type="text"
                value={kodeArsip}
                onChange={(e) => setKodeArsip(e.target.value)}
                placeholder="005"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent text-sm"
              />
            </div>
            {fields.includes("index_surat") && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
                  Index
                </label>
                <input
                  type="text"
                  value={formData.index_surat || ""}
                  onChange={(e) =>
                    handleInputChange("index_surat", e.target.value)
                  }
                  placeholder="Undangan"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent text-sm"
                />
              </div>
            )}
            {fields.includes("nomor_urut") && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
                  No. Urut
                </label>
                <input
                  type="text"
                  value={formData.nomor_urut || ""}
                  onChange={(e) =>
                    handleInputChange("nomor_urut", e.target.value)
                  }
                  placeholder="229"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent text-sm"
                />
              </div>
            )}
          </div>

          {/* Nomor Surat */}
          {fields.includes("nomor_surat") && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
                Nomor Surat <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.nomor_surat || ""}
                  onChange={(e) =>
                    handleInputChange("nomor_surat", e.target.value)
                  }
                  placeholder="229/SKD/1/2026"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent pr-8 text-sm"
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M11.5 2.5L13.5 4.5M2 14L2.5 11.5L12 2L14 4L4.5 13.5L2 14Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Tanggal Fields - 2 columns */}
          <div className="grid grid-cols-2 gap-3">
            {fields.includes("tgl_surat") && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
                  Tanggal Surat <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.tgl_surat || ""}
                  onChange={(e) =>
                    handleInputChange("tgl_surat", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent text-sm"
                />
              </div>
            )}
            {fields.includes("tgl_surat_masuk") && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
                  Tanggal Surat Masuk
                </label>
                <input
                  type="date"
                  value={formData.tgl_surat_masuk || ""}
                  onChange={(e) =>
                    handleInputChange("tgl_surat_masuk", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent text-sm"
                />
              </div>
            )}
            {fields.includes("tgl_masuk") && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
                  Tanggal Masuk
                </label>
                <input
                  type="date"
                  value={formData.tgl_masuk || ""}
                  onChange={(e) =>
                    handleInputChange("tgl_masuk", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent text-sm"
                />
              </div>
            )}
            {fields.includes("tgl_masuk_surat") && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
                  Tgl Masuk Surat
                </label>
                <input
                  type="date"
                  value={formData.tgl_masuk_surat || ""}
                  onChange={(e) =>
                    handleInputChange("tgl_masuk_surat", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent text-sm"
                />
              </div>
            )}
            {fields.includes("tgl_terima_surat") && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
                  Tgl Terima Surat
                </label>
                <input
                  type="date"
                  value={formData.tgl_terima_surat || ""}
                  onChange={(e) =>
                    handleInputChange("tgl_terima_surat", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent text-sm"
                />
              </div>
            )}
            {fields.includes("tgl_keluar") && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
                  Tanggal Keluar
                </label>
                <input
                  type="date"
                  value={formData.tgl_keluar || ""}
                  onChange={(e) =>
                    handleInputChange("tgl_keluar", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent text-sm"
                />
              </div>
            )}
          </div>

          {/* Asal/Tujuan Surat */}
          {fields.includes("asal_surat") && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
                Asal Surat <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.asal_surat || ""}
                onChange={(e) =>
                  handleInputChange("asal_surat", e.target.value)
                }
                placeholder="Nama instansi pengirim"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent text-sm"
              />
            </div>
          )}

          {fields.includes("kepada") && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
                Kepada <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.kepada || ""}
                onChange={(e) => handleInputChange("kepada", e.target.value)}
                placeholder="Walikota Bandung"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent text-sm"
              />
            </div>
          )}

          {fields.includes("tujuan") && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
                Tujuan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.tujuan || ""}
                onChange={(e) => handleInputChange("tujuan", e.target.value)}
                placeholder="Ketua DPRD"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent text-sm"
              />
            </div>
          )}

          {fields.includes("diperuntukan") && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
                Diperuntukan
              </label>
              <input
                type="text"
                value={formData.diperuntukan || ""}
                onChange={(e) =>
                  handleInputChange("diperuntukan", e.target.value)
                }
                placeholder="Ketua DPRD, Wakil Ketua"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent text-sm"
              />
            </div>
          )}

          {/* Pengolah */}
          {fields.includes("pengolah") && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
                Pengolah
              </label>
              <input
                type="text"
                value={formData.pengolah || ""}
                onChange={(e) => handleInputChange("pengolah", e.target.value)}
                placeholder="Umum / Persidangan / Keuangan"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent text-sm"
              />
            </div>
          )}

          {/* Lampiran & Sifat */}
          <div className="grid grid-cols-2 gap-3">
            {fields.includes("lampiran") && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
                  Lampiran
                </label>
                <input
                  type="text"
                  value={formData.lampiran || ""}
                  onChange={(e) =>
                    handleInputChange("lampiran", e.target.value)
                  }
                  placeholder="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent text-sm"
                />
              </div>
            )}
            {fields.includes("kode") && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
                  Kode Klasifikasi
                </label>
                <input
                  type="text"
                  value={formData.kode || ""}
                  onChange={(e) => handleInputChange("kode", e.target.value)}
                  placeholder="005"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent text-sm"
                />
              </div>
            )}
          </div>

          {/* Isi Ringkas / Perihal */}
          {fields.includes("isi_ringkas") && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-500 uppercase">
                  <span className="flex items-center gap-1">
                    <Image
                      src="/iconsparkles.svg"
                      alt="AI"
                      width={12}
                      height={12}
                    />
                    Isi Ringkas (AI Summary)
                  </span>
                </label>
                <button
                  onClick={handleRegenerate}
                  className="flex items-center gap-1 text-xs text-[#2C5F6F] hover:underline"
                >
                  <Image
                    src="/iconregenerati.svg"
                    alt="Regenerate"
                    width={12}
                    height={12}
                  />
                  Regenerate
                </button>
              </div>
              <textarea
                value={formData.isi_ringkas || ""}
                onChange={(e) =>
                  handleInputChange("isi_ringkas", e.target.value)
                }
                rows={3}
                placeholder="AI akan menghasilkan ringkasan otomatis..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent resize-none text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">
                Generated by ARKLA AI (LLM v2.1)
              </p>
            </div>
          )}

          {/* Disposisi & Catatan Section */}
          <div className="border-t pt-3 mt-3">
            <p className="text-xs font-medium text-gray-400 mb-3 uppercase">
              Disposisi & Catatan
            </p>

            {/* Tanggal Disposisi */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {fields.includes("tgl_diteruskan") && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
                    Tgl Diteruskan
                  </label>
                  <input
                    type="date"
                    value={formData.tgl_diteruskan || ""}
                    onChange={(e) =>
                      handleInputChange("tgl_diteruskan", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent text-sm"
                  />
                </div>
              )}
              {fields.includes("tgl_surat_turun") && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
                    Tgl Surat Turun
                  </label>
                  <input
                    type="date"
                    value={formData.tgl_surat_turun || ""}
                    onChange={(e) =>
                      handleInputChange("tgl_surat_turun", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent text-sm"
                  />
                </div>
              )}
              {fields.includes("tgl_penyelesaian") && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
                    Tgl Penyelesaian
                  </label>
                  <input
                    type="date"
                    value={formData.tgl_penyelesaian || ""}
                    onChange={(e) =>
                      handleInputChange("tgl_penyelesaian", e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent text-sm"
                  />
                </div>
              )}
            </div>

            {fields.includes("disposisi_ketua") && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
                  Disposisi Ketua
                </label>
                <textarea
                  value={formData.disposisi_ketua || ""}
                  onChange={(e) =>
                    handleInputChange("disposisi_ketua", e.target.value)
                  }
                  rows={2}
                  placeholder="Catatan disposisi dari Ketua DPRD..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent resize-none text-sm"
                />
              </div>
            )}

            {fields.includes("disposisi_sekwan") && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
                  Disposisi Sekwan
                </label>
                <textarea
                  value={formData.disposisi_sekwan || ""}
                  onChange={(e) =>
                    handleInputChange("disposisi_sekwan", e.target.value)
                  }
                  rows={2}
                  placeholder="Catatan disposisi dari Sekretaris Dewan..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent resize-none text-sm"
                />
              </div>
            )}

            {fields.includes("catatan") && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
                  Catatan
                </label>
                <textarea
                  value={formData.catatan || ""}
                  onChange={(e) => handleInputChange("catatan", e.target.value)}
                  rows={2}
                  placeholder="Catatan tambahan..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent resize-none text-sm"
                />
              </div>
            )}

            {fields.includes("keterangan") && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">
                  Keterangan
                </label>
                <input
                  type="text"
                  value={formData.keterangan || ""}
                  onChange={(e) =>
                    handleInputChange("keterangan", e.target.value)
                  }
                  placeholder="Keterangan tambahan..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent text-sm"
                />
              </div>
            )}
          </div>

          {/* Low Confidence Warning */}
          {result.requires_manual_review && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-700 flex items-center gap-2">
                <Image
                  src="/iconwarning.svg"
                  alt="Warning"
                  width={16}
                  height={16}
                />
                Beberapa field memerlukan review manual karena confidence
                rendah.
              </p>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-4 mb-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={onDiscard}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Discard
          </button>
          {/* <button
            onClick={onDiscard}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Disposition Preview
          </button> */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-[#2C5F6F] text-white rounded-lg hover:bg-[#244f5c] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Image
                  src="/icondownload.svg"
                  alt="Save"
                  width={16}
                  height={16}
                />
                Save to Database
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
