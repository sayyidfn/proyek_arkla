"use client";

import { useState, useEffect, use, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import DashboardLayout from "@/components/DashboardLayout";
import { apiClient } from "@/lib/api-client";
import { SuratDetail, KategoriSurat } from "@/lib/types";
import DisposisiModal from "@/components/archive/DisposisiModal";
import Toast from "@/components/Toast";

const kategoriLabels: Record<KategoriSurat, string> = {
  masuk_biasa: "Surat Masuk Biasa",
  undangan: "Undangan",
  masuk_penting: "Surat Masuk Penting",
  keluar: "Surat Keluar Dewan",
  keluar_sekwan: "Keluar Sekwan",
  rahasia: "Rahasia",
};

// Fields per kategori
const fieldsByKategori: Record<
  KategoriSurat,
  { key: string; label: string }[]
> = {
  masuk_biasa: [
    { key: "nomor_surat", label: "Nomor Surat" },
    { key: "tgl_surat", label: "Tanggal Surat" },
    { key: "asal_surat", label: "Asal Surat" },
    { key: "tujuan", label: "Tujuan" },
    { key: "pengolah", label: "Pengolah" },
    { key: "lampiran", label: "Lampiran" },
    { key: "disposisi_ketua", label: "Disposisi Ketua" },
    { key: "disposisi_sekwan", label: "Disposisi Sekwan" },
  ],
  undangan: [
    { key: "nomor_surat", label: "Nomor Surat" },
    { key: "tgl_surat_masuk", label: "Tanggal Surat Masuk" },
    { key: "asal_surat", label: "Asal Surat" },
    { key: "diperuntukan", label: "Diperuntukan" },
    { key: "lampiran", label: "Lampiran" },
    { key: "keterangan", label: "Keterangan" },
    { key: "disposisi_sekwan", label: "Disposisi Sekwan" },
  ],
  masuk_penting: [
    { key: "nomor_surat", label: "Nomor Surat" },
    { key: "tgl_surat_masuk", label: "Tanggal Surat Masuk" },
    { key: "asal_surat", label: "Asal Surat" },
    { key: "tujuan", label: "Tujuan" },
    { key: "pengolah", label: "Pengolah" },
    { key: "lampiran", label: "Lampiran" },
    { key: "disposisi_ketua", label: "Disposisi Ketua" },
    { key: "disposisi_sekwan", label: "Disposisi Sekwan" },
  ],
  keluar: [
    { key: "nomor_surat", label: "Nomor Surat" },
    { key: "tgl_surat", label: "Tanggal Surat" },
    { key: "kepada", label: "Kepada" },
    { key: "pengolah", label: "Pengolah" },
    { key: "lampiran", label: "Lampiran" },
    { key: "catatan", label: "Catatan" },
  ],
  keluar_sekwan: [
    { key: "nomor_surat", label: "Nomor Surat" },
    { key: "tgl_surat", label: "Tanggal Surat" },
    { key: "kepada", label: "Kepada" },
    { key: "pengolah", label: "Pengolah" },
    { key: "lampiran", label: "Lampiran" },
    { key: "catatan", label: "Catatan" },
  ],
  rahasia: [
    { key: "nomor_surat", label: "Nomor Surat" },
    { key: "tgl_terima_surat", label: "Tanggal Terima Surat" },
    { key: "asal_surat", label: "Asal Surat" },
    { key: "pengolah", label: "Pengolah" },
    { key: "lampiran", label: "Lampiran" },
    { key: "catatan", label: "Catatan" },
  ],
};

interface PageProps {
  params: Promise<{ id: string }>;
}

// Loading component
function DetailLoading() {
  return (
    <DashboardLayout title="Detail Surat">
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-[#2C5F6F] border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  );
}

// Inner component that uses searchParams
function SuratDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get("edit") === "true";

  const [surat, setSurat] = useState<SuratDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(isEditMode);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showDisposisi, setShowDisposisi] = useState(false);
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({ show: false, message: "", type: "success" });

  useEffect(() => {
    const fetchSurat = async () => {
      try {
        const response = await apiClient.getSuratDetail(id);

        // Backend returns { status: "success", data: { id, kategori, details: {...} } }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const apiResponse = response as any;
        const rawData = apiResponse.data || apiResponse;

        // Flatten data: merge details into root level
        // Important: Don't override non-null root values with null detail values
        const details = rawData.details || {};
        const flatData: SuratDetail = { ...rawData };

        // Merge details but preserve non-null root values (like isi_ringkas from main table)
        Object.entries(details).forEach(([key, value]) => {
          // Only override if the detail value is not null/undefined
          // OR if the root value is null/undefined
          if (value !== null && value !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (flatData as any)[key] = value;
          }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (flatData as any).details;

        setSurat(flatData);

        // Initialize form data from flattened data
        const initial: Record<string, string> = {};
        Object.entries(flatData).forEach(([key, value]) => {
          if (
            value !== null &&
            value !== undefined &&
            typeof value !== "object"
          ) {
            initial[key] = String(value);
          }
        });
        setFormData(initial);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSurat();
  }, [id]);

  const handleInputChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!surat) return;

    setIsSaving(true);
    try {
      await apiClient.verifySurat({
        surat_id: surat.id,
        extracted_data: formData,
        kode_arsip: formData.kode_arsip || surat.kode_arsip || undefined,
      });

      setToast({
        show: true,
        message: "Surat berhasil disimpan",
        type: "success",
      });
      setIsEditing(false);

      // Refresh data - flatten like initial fetch
      const response = await apiClient.getSuratDetail(id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const apiResponse = response as any;
      const rawData = apiResponse.data || apiResponse;

      // Flatten data: merge details but preserve non-null root values
      const details = rawData.details || {};
      const flatData: SuratDetail = { ...rawData };

      Object.entries(details).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (flatData as any)[key] = value;
        }
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (flatData as any).details;
      setSurat(flatData);
    } catch (err) {
      setToast({
        show: true,
        message: err instanceof Error ? err.message : "Gagal menyimpan",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="w-10 h-10 border-4 border-[#2C5F6F] border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !surat) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-96">
          <Image
            src="/iconalertcircle.svg"
            alt="Error"
            width={48}
            height={48}
            className="opacity-50 mb-4"
          />
          <p className="text-gray-500 mb-4">
            {error || "Surat tidak ditemukan"}
          </p>
          <button
            onClick={() => router.push("/archive")}
            className="px-4 py-2 bg-[#2C5F6F] text-white rounded-lg"
          >
            Kembali ke Daftar
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const fields = fieldsByKategori[surat.kategori] || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/archive")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Image
                src="/iconarrowleft.svg"
                alt="Back"
                width={20}
                height={20}
              />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {surat.nomor_urut_display || "Detail Surat"}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {kategoriLabels[surat.kategori]} •{" "}
                {formatDate(surat.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDisposisi(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Image src="/iconprint.svg" alt="Print" width={16} height={16} />
              <span className="text-sm font-medium">Cetak Disposisi</span>
            </button>
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-[#2C5F6F] text-white rounded-lg hover:bg-[#244f5c] disabled:opacity-50 transition-colors"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Image
                      src="/icondownload.svg"
                      alt="Save"
                      width={16}
                      height={16}
                      className="invert"
                    />
                  )}
                  <span className="text-sm font-medium">Simpan</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#2C5F6F] text-white rounded-lg hover:bg-[#244f5c] transition-colors"
              >
                <Image
                  src="/iconedit.svg"
                  alt="Edit"
                  width={16}
                  height={16}
                  className="invert"
                />
                <span className="text-sm font-medium">Edit</span>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info Card */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="font-semibold text-gray-900">Informasi Surat</h2>
              </div>
              <div className="p-6 space-y-4">
                {/* Kode Arsip & Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                      Kode Arsip
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.kode_arsip || ""}
                        onChange={(e) =>
                          handleInputChange("kode_arsip", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">
                        {surat.kode_arsip || "-"}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                      Status
                    </label>
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                        surat.verified_at
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {surat.verified_at ? "Terverifikasi" : "Perlu Review"}
                    </span>
                  </div>
                </div>

                {/* Dynamic Fields */}
                <div className="grid grid-cols-2 gap-4">
                  {fields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                        {field.label}
                      </label>
                      {isEditing ? (
                        field.key.includes("disposisi") ||
                        field.key.includes("catatan") ? (
                          <textarea
                            value={formData[field.key] || ""}
                            onChange={(e) =>
                              handleInputChange(field.key, e.target.value)
                            }
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent resize-none"
                          />
                        ) : (
                          <input
                            type={field.key.includes("tgl") ? "date" : "text"}
                            value={formData[field.key] || ""}
                            onChange={(e) =>
                              handleInputChange(field.key, e.target.value)
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent"
                          />
                        )
                      ) : (
                        <p className="text-gray-900">
                          {field.key.includes("tgl")
                            ? formatDate(
                                String(
                                  (surat as unknown as Record<string, unknown>)[
                                    field.key
                                  ] || "",
                                ),
                              )
                            : String(
                                (surat as unknown as Record<string, unknown>)[
                                  field.key
                                ] || "-",
                              )}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Isi Ringkas Card */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Isi Ringkas</h2>
                <div className="flex items-center gap-1 text-[#2C5F6F]">
                  <Image
                    src="/iconsparkles.svg"
                    alt="AI"
                    width={14}
                    height={14}
                  />
                  <span className="text-xs">AI Generated</span>
                </div>
              </div>
              <div className="p-6">
                {isEditing ? (
                  <textarea
                    value={formData.isi_ringkas || ""}
                    onChange={(e) =>
                      handleInputChange("isi_ringkas", e.target.value)
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent resize-none"
                  />
                ) : (
                  <p className="text-gray-700 leading-relaxed">
                    {surat.isi_ringkas || "Tidak ada ringkasan"}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Confidence Card */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="font-semibold text-gray-900">Confidence AI</h2>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="relative w-24 h-24">
                    <svg className="w-full h-full -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="8"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        fill="none"
                        stroke={
                          (surat.overall_confidence || 0) >= 0.8
                            ? "#22c55e"
                            : (surat.overall_confidence || 0) >= 0.6
                              ? "#eab308"
                              : "#ef4444"
                        }
                        strokeWidth="8"
                        strokeDasharray={`${(surat.overall_confidence || 0) * 251.2} 251.2`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-gray-900">
                        {Math.round((surat.overall_confidence || 0) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-center text-sm text-gray-500">
                  {surat.requires_manual_review
                    ? "Memerlukan review manual"
                    : "Ekstraksi berhasil"}
                </p>
              </div>
            </div>

            {/* Metadata Card */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="font-semibold text-gray-900">Metadata</h2>
              </div>
              <div className="p-6 space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">ID Surat</span>
                  <span className="text-gray-900 font-mono text-xs">
                    {surat.id?.slice(0, 8) || "-"}...
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Dibuat</span>
                  <span className="text-gray-900">
                    {formatDate(surat.created_at)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Diverifikasi</span>
                  <span className="text-gray-900">
                    {surat.verified_at ? formatDate(surat.verified_at) : "-"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Disposisi Modal */}
      {showDisposisi && (
        <DisposisiModal surat={surat} onClose={() => setShowDisposisi(false)} />
      )}

      {/* Toast */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast((prev) => ({ ...prev, show: false }))}
        />
      )}
    </DashboardLayout>
  );
}

// Main page component with Suspense wrapper
export default function SuratDetailPage({ params }: PageProps) {
  const { id } = use(params);

  return (
    <Suspense fallback={<DetailLoading />}>
      <SuratDetailContent id={id} />
    </Suspense>
  );
}
