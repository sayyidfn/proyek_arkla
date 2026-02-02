"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import DashboardLayout from "@/components/DashboardLayout";
import { apiClient } from "@/lib/api-client";
import { SuratListItem, KategoriSurat, Pagination } from "@/lib/types";
import DisposisiModal from "@/components/archive/DisposisiModal";
import DeleteConfirmModal from "@/components/archive/DeleteConfirmModal";
import Toast from "@/components/Toast";

const kategoriOptions: { value: KategoriSurat | ""; label: string }[] = [
  { value: "", label: "Semua Kategori" },
  { value: "masuk_biasa", label: "Surat Masuk Biasa" },
  { value: "undangan", label: "Undangan" },
  { value: "masuk_penting", label: "Surat Masuk Penting" },
  { value: "keluar", label: "Surat Keluar Dewan" },
  { value: "keluar_sekwan", label: "Surat Keluar Sekwan" },
  { value: "rahasia", label: "Rahasia" },
];

// Loading fallback component
function ArchiveLoading() {
  return (
    <DashboardLayout title="Daftar Surat">
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#2C5F6F] border-t-transparent rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  );
}

// Main content component that uses searchParams
function ArchiveContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [data, setData] = useState<SuratListItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    total_pages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [kategori, setKategori] = useState<KategoriSurat | "">(
    (searchParams.get("kategori") as KategoriSurat) || "",
  );
  const [kodeArsip, setKodeArsip] = useState(searchParams.get("kode") || "");
  const [dateFrom, setDateFrom] = useState(searchParams.get("date_from") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("date_to") || "");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get("page") || "1"),
  );

  // Modal states
  const [selectedSurat, setSelectedSurat] = useState<SuratListItem | null>(
    null,
  );
  const [showDisposisiModal, setShowDisposisiModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [suratToDelete, setSuratToDelete] = useState<SuratListItem | null>(
    null,
  );

  // Toast
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({ show: false, message: "", type: "success" });

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.getSuratList({
        kategori: kategori || undefined,
        kode: kodeArsip || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        search: search || undefined,
        include_unverified: true,
        page: currentPage,
        limit: 10,
      });

      setData(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data");
    } finally {
      setIsLoading(false);
    }
  }, [kategori, kodeArsip, dateFrom, dateTo, search, currentPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (kategori) params.set("kategori", kategori);
    if (kodeArsip) params.set("kode", kodeArsip);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (search) params.set("search", search);
    if (currentPage > 1) params.set("page", String(currentPage));

    const newUrl = params.toString() ? `?${params.toString()}` : "/archive";
    window.history.replaceState({}, "", newUrl);
  }, [kategori, kodeArsip, dateFrom, dateTo, search, currentPage]);

  // Handlers
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchData();
  };

  const handleView = (surat: SuratListItem) => {
    router.push(`/archive/${surat.id}`);
  };

  const handleEdit = (surat: SuratListItem) => {
    router.push(`/archive/${surat.id}?edit=true`);
  };

  const handlePrint = (surat: SuratListItem) => {
    setSelectedSurat(surat);
    setShowDisposisiModal(true);
  };

  const handleDeleteClick = (surat: SuratListItem) => {
    setSuratToDelete(surat);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!suratToDelete) return;

    try {
      await apiClient.deleteSurat(suratToDelete.id);
      setToast({
        show: true,
        message: "Surat berhasil dihapus",
        type: "success",
      });
      setShowDeleteModal(false);
      setSuratToDelete(null);
      fetchData();
    } catch (err) {
      setToast({
        show: true,
        message: err instanceof Error ? err.message : "Gagal menghapus surat",
        type: "error",
      });
    }
  };

  const handleExportExcel = async () => {
    // Export hanya bisa per kategori
    if (!kategori) {
      setToast({
        show: true,
        message: "Pilih kategori surat terlebih dahulu untuk export",
        type: "error",
      });
      return;
    }

    try {
      const params = new URLSearchParams();
      params.set("kategori", kategori);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      params.set("format", "xlsx");

      const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/export?${params.toString()}`;
      window.open(url, "_blank");

      setToast({
        show: true,
        message: "Export Excel dimulai...",
        type: "info",
      });
    } catch (err) {
      setToast({
        show: true,
        message: "Gagal export Excel",
        type: "error",
      });
    }
  };

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Get kategori label
  const getKategoriLabel = (kat: KategoriSurat) => {
    return kategoriOptions.find((k) => k.value === kat)?.label || kat;
  };

  // Pagination
  const pageNumbers = [];
  for (let i = 1; i <= pagination.total_pages; i++) {
    if (
      i === 1 ||
      i === pagination.total_pages ||
      (i >= currentPage - 1 && i <= currentPage + 1)
    ) {
      pageNumbers.push(i);
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      pageNumbers.push(-1); // Ellipsis
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              Daftar Surat
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Kelola dan telusuri arsip surat
            </p>
          </div>
          <button
            onClick={handleExportExcel}
            disabled={!kategori}
            className={`flex items-center justify-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
              kategori
                ? "border-gray-300 hover:bg-gray-50 active:bg-gray-100"
                : "border-gray-200 bg-gray-100 cursor-not-allowed opacity-50"
            }`}
            title={
              kategori ? "Export ke Excel" : "Pilih kategori terlebih dahulu"
            }
          >
            <Image
              src="/icondownload.svg"
              alt="Export"
              width={16}
              height={16}
            />
            <span className="text-sm font-medium">Export Excel</span>
          </button>
        </div>

        {/* Filters Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            {/* Kategori Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kategori Surat
              </label>
              <select
                value={kategori}
                onChange={(e) => {
                  setKategori(e.target.value as KategoriSurat | "");
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent bg-white"
              >
                {kategoriOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Kode Arsip & Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kode Arsip
                </label>
                <input
                  type="text"
                  value={kodeArsip}
                  onChange={(e) => setKodeArsip(e.target.value)}
                  placeholder="Cari berdasarkan no, regulasi, pengirim, atau judul..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent"
                  />
                  <span className="flex items-center text-gray-400">-</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pencarian
              </label>
              <div className="relative">
                <Image
                  src="/iconsearch.svg"
                  alt="Search"
                  width={18}
                  height={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari berdasarkan no, regulasi, pengirim, atau judul surat..."
                  className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C5F6F] focus:border-transparent"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Success Toast Indicator */}
        {toast.show && toast.type === "success" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <svg
                className="w-3 h-3 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <span className="text-green-700 text-sm font-medium">
              {toast.message}
            </span>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-[#2C5F6F] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64 text-red-500">
              <p>{error}</p>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Image
                src="/icondaftarsurat.svg"
                alt="Empty"
                width={48}
                height={48}
                className="opacity-30 mb-4"
              />
              <p>Tidak ada data surat</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        No. Urut
                      </th>
                      <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Kode
                      </th>
                      <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Indeks
                      </th>
                      <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Isi Ringkas
                      </th>
                      <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                        Pengirim
                      </th>
                      <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                        Tanggal
                      </th>
                      <th className="px-4 lg:px-6 py-3 lg:py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.map((surat, index) => (
                      <tr
                        key={surat.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-sm text-gray-900">
                          {surat.nomor_urut_display?.split("/")[0] ||
                            String(index + 1 + (currentPage - 1) * 10).padStart(
                              3,
                              "0",
                            )}
                        </td>
                        <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-sm text-gray-900">
                          {surat.kode_arsip || "-"}
                        </td>
                        <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-sm text-gray-900">
                          {getKategoriLabel(surat.kategori).replace(
                            "Surat ",
                            "",
                          )}
                        </td>
                        <td className="px-4 lg:px-6 py-3 lg:py-4 text-sm text-gray-900 max-w-xs truncate">
                          {surat.isi_ringkas || "-"}
                        </td>
                        <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-sm text-gray-600 max-w-xs truncate hidden lg:table-cell">
                          {surat.asal_surat || "-"}
                        </td>
                        <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-sm text-gray-600 hidden lg:table-cell">
                          {formatDate(surat.created_at)}
                        </td>
                        <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleView(surat)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Lihat Detail"
                            >
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 16 16"
                                fill="none"
                              >
                                <path
                                  d="M1.37468 8.23224C1.31912 8.08256 1.31912 7.91792 1.37468 7.76824C1.91581 6.45614 2.83435 5.33427 4.01386 4.54484C5.19336 3.75541 6.58071 3.33398 8.00001 3.33398C9.41932 3.33398 10.8067 3.75541 11.9862 4.54484C13.1657 5.33427 14.0842 6.45614 14.6253 7.76824C14.6809 7.91792 14.6809 8.08256 14.6253 8.23224C14.0842 9.54434 13.1657 10.6662 11.9862 11.4556C10.8067 12.2451 9.41932 12.6665 8.00001 12.6665C6.58071 12.6665 5.19336 12.2451 4.01386 11.4556C2.83435 10.6662 1.91581 9.54434 1.37468 8.23224Z"
                                  stroke="currentColor"
                                  strokeWidth="1.33333"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z"
                                  stroke="currentColor"
                                  strokeWidth="1.33333"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleEdit(surat)}
                              className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 16 16"
                                fill="none"
                              >
                                <path
                                  d="M8 2H3.33333C2.97971 2 2.64057 2.14048 2.39052 2.39052C2.14048 2.64057 2 2.97971 2 3.33333V12.6667C2 13.0203 2.14048 13.3594 2.39052 13.6095C2.64057 13.8595 2.97971 14 3.33333 14H12.6667C13.0203 14 13.3594 13.8595 13.6095 13.6095C13.8595 13.3594 14 13.0203 14 12.6667V8"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M12.2504 1.75015C12.5156 1.48493 12.8753 1.33594 13.2504 1.33594C13.6255 1.33594 13.9852 1.48493 14.2504 1.75015C14.5156 2.01537 14.6646 2.37508 14.6646 2.75015C14.6646 3.12522 14.5156 3.48493 14.2504 3.75015L8.24172 9.75948C8.08342 9.91765 7.88786 10.0334 7.67305 10.0962L5.75772 10.6562C5.70036 10.6729 5.63955 10.6739 5.58166 10.6591C5.52377 10.6442 5.47094 10.6141 5.42869 10.5719C5.38643 10.5296 5.35631 10.4768 5.34148 10.4189C5.32665 10.361 5.32766 10.3002 5.34439 10.2428L5.90439 8.32748C5.96741 8.11285 6.08341 7.91752 6.24172 7.75948L12.2504 1.75015Z"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => handlePrint(surat)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Cetak Disposisi"
                            >
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 16 16"
                                fill="none"
                              >
                                <path
                                  d="M4 6V1.33333H12V6"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M3.33333 10H12.6667C13.0203 10 13.3594 9.85952 13.6095 9.60948C13.8595 9.35943 14 9.02029 14 8.66667V6.66667C14 6.31304 13.8595 5.97391 13.6095 5.72386C13.3594 5.47381 13.0203 5.33333 12.6667 5.33333H3.33333C2.97971 5.33333 2.64057 5.47381 2.39052 5.72386C2.14048 5.97391 2 6.31304 2 6.66667V8.66667C2 9.02029 2.14048 9.35943 2.39052 9.60948C2.64057 9.85952 2.97971 10 3.33333 10Z"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M12 10V14.6667H4V10"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteClick(surat)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Hapus"
                            >
                              <svg
                                width="18"
                                height="18"
                                viewBox="0 0 16 16"
                                fill="none"
                              >
                                <path
                                  d="M2 4H14"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M12.6667 4V13.3333C12.6667 14 12 14.6667 11.3333 14.6667H4.66667C4 14.6667 3.33333 14 3.33333 13.3333V4"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M5.33333 4V2.66667C5.33333 2 6 1.33333 6.66667 1.33333H9.33333C10 1.33333 10.6667 2 10.6667 2.66667V4"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="md:hidden divide-y divide-gray-100">
                {data.map((surat, index) => (
                  <div
                    key={surat.id}
                    className="p-4 hover:bg-gray-50 active:bg-gray-100"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            #
                            {surat.nomor_urut_display?.split("/")[0] ||
                              String(
                                index + 1 + (currentPage - 1) * 10,
                              ).padStart(3, "0")}
                          </span>
                          <span className="text-xs text-gray-500">
                            {surat.kode_arsip || "-"}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 line-clamp-2">
                          {surat.isi_ringkas || "-"}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <span>
                            {getKategoriLabel(surat.kategori).replace(
                              "Surat ",
                              "",
                            )}
                          </span>
                          <span>•</span>
                          <span>{formatDate(surat.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleView(surat)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 16 16"
                            fill="none"
                          >
                            <path
                              d="M1.37468 8.23224C1.31912 8.08256 1.31912 7.91792 1.37468 7.76824C1.91581 6.45614 2.83435 5.33427 4.01386 4.54484C5.19336 3.75541 6.58071 3.33398 8.00001 3.33398C9.41932 3.33398 10.8067 3.75541 11.9862 4.54484C13.1657 5.33427 14.0842 6.45614 14.6253 7.76824C14.6809 7.91792 14.6809 8.08256 14.6253 8.23224C14.0842 9.54434 13.1657 10.6662 11.9862 11.4556C10.8067 12.2451 9.41932 12.6665 8.00001 12.6665C6.58071 12.6665 5.19336 12.2451 4.01386 11.4556C2.83435 10.6662 1.91581 9.54434 1.37468 8.23224Z"
                              stroke="currentColor"
                              strokeWidth="1.33333"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z"
                              stroke="currentColor"
                              strokeWidth="1.33333"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEdit(surat)}
                          className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg"
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 16 16"
                            fill="none"
                          >
                            <path
                              d="M8 2H3.33333C2.97971 2 2.64057 2.14048 2.39052 2.39052C2.14048 2.64057 2 2.97971 2 3.33333V12.6667C2 13.0203 2.14048 13.3594 2.39052 13.6095C2.64057 13.8595 2.97971 14 3.33333 14H12.6667C13.0203 14 13.3594 13.8595 13.6095 13.6095C13.8595 13.3594 14 13.0203 14 12.6667V8"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M12.2504 1.75015C12.5156 1.48493 12.8753 1.33594 13.2504 1.33594C13.6255 1.33594 13.9852 1.48493 14.2504 1.75015C14.5156 2.01537 14.6646 2.37508 14.6646 2.75015C14.6646 3.12522 14.5156 3.48493 14.2504 3.75015L8.24172 9.75948C8.08342 9.91765 7.88786 10.0334 7.67305 10.0962L5.75772 10.6562C5.70036 10.6729 5.63955 10.6739 5.58166 10.6591C5.52377 10.6442 5.47094 10.6141 5.42869 10.5719C5.38643 10.5296 5.35631 10.4768 5.34148 10.4189C5.32665 10.361 5.32766 10.3002 5.34439 10.2428L5.90439 8.32748C5.96741 8.11285 6.08341 7.91752 6.24172 7.75948L12.2504 1.75015Z"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handlePrint(surat)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 16 16"
                            fill="none"
                          >
                            <path
                              d="M4 6V1.33333H12V6"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M3.33333 10H12.6667C13.0203 10 13.3594 9.85952 13.6095 9.60948C13.8595 9.35943 14 9.02029 14 8.66667V6.66667C14 6.31304 13.8595 5.97391 13.6095 5.72386C13.3594 5.47381 13.0203 5.33333 12.6667 5.33333H3.33333C2.97971 5.33333 2.64057 5.47381 2.39052 5.72386C2.14048 5.97391 2 6.31304 2 6.66667V8.66667C2 9.02029 2.14048 9.35943 2.39052 9.60948C2.64057 9.85952 2.97971 10 3.33333 10Z"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M12 10V14.6667H4V10"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteClick(surat)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 16 16"
                            fill="none"
                          >
                            <path
                              d="M2 4H14"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M12.6667 4V13.3333C12.6667 14 12 14.6667 11.3333 14.6667H4.66667C4 14.6667 3.33333 14 3.33333 13.3333V4"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M5.33333 4V2.66667C5.33333 2 6 1.33333 6.66667 1.33333H9.33333C10 1.33333 10.6667 2 10.6667 2.66667V4"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Pagination */}
          {!isLoading && data.length > 0 && (
            <div className="px-4 md:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
                Menampilkan {(currentPage - 1) * pagination.limit + 1} -{" "}
                {Math.min(currentPage * pagination.limit, pagination.total)}{" "}
                dari {pagination.total}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="hidden sm:inline">Sebelumnya</span>
                  <span className="sm:hidden">←</span>
                </button>
                <div className="hidden sm:flex items-center gap-1">
                  {pageNumbers.map((num, idx) =>
                    num === -1 ? (
                      <span
                        key={`ellipsis-${idx}`}
                        className="px-2 text-gray-400"
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={num}
                        onClick={() => setCurrentPage(num)}
                        className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                          currentPage === num
                            ? "bg-[#2C5F6F] text-white"
                            : "border border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {num}
                      </button>
                    ),
                  )}
                </div>
                <span className="sm:hidden px-3 py-1.5 text-xs font-medium">
                  {currentPage} / {pagination.total_pages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.min(pagination.total_pages, p + 1),
                    )
                  }
                  disabled={currentPage === pagination.total_pages}
                  className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="hidden sm:inline">Selanjutnya</span>
                  <span className="sm:hidden">→</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Disposisi Modal */}
      {showDisposisiModal && selectedSurat && (
        <DisposisiModal
          surat={selectedSurat}
          onClose={() => {
            setShowDisposisiModal(false);
            setSelectedSurat(null);
          }}
        />
      )}

      {/* Delete Confirm Modal */}
      {showDeleteModal && suratToDelete && (
        <DeleteConfirmModal
          surat={suratToDelete}
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
            setShowDeleteModal(false);
            setSuratToDelete(null);
          }}
        />
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

// Export default with Suspense wrapper
export default function ArchivePage() {
  return (
    <Suspense fallback={<ArchiveLoading />}>
      <ArchiveContent />
    </Suspense>
  );
}
