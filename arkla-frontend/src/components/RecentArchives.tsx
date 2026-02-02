"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { SuratListItem, KategoriSurat } from "@/lib/types";

// Helper function untuk format kategori
const formatKategori = (kategori: KategoriSurat): string => {
  const labels: Record<KategoriSurat, string> = {
    masuk_biasa: "Surat Masuk",
    undangan: "Undangan",
    masuk_penting: "Surat Penting",
    keluar: "Surat Keluar",
    keluar_sekwan: "Keluar Sekwan",
    rahasia: "Rahasia",
  };
  return labels[kategori] || kategori;
};

// Helper function untuk format tanggal
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// Helper function untuk status badge
const getStatusBadge = (item: SuratListItem) => {
  if (!item.verified_at) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        Pending
      </span>
    );
  }
  if (item.requires_manual_review) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
        Review
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
      Selesai
    </span>
  );
};

export default function RecentArchives() {
  const [data, setData] = useState<SuratListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const recentSurat = await apiClient.getRecentSurat(5);
        setData(recentSurat);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch recent surat:", err);
        setError("Gagal memuat data");
        // Keep empty array if API fails
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
          Arsip Terbaru
        </h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2C5F6F]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-4 sm:p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">
            Arsip Terbaru
          </h2>
          <a
            href="/archive"
            className="text-xs sm:text-sm text-[#2C5F6F] hover:underline font-medium"
          >
            Lihat Semua
          </a>
        </div>
      </div>

      {error ? (
        <div className="p-4 sm:p-6 text-center text-red-500">{error}</div>
      ) : data.length === 0 ? (
        <div className="p-4 sm:p-6 text-center text-gray-500">
          Belum ada arsip surat
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanggal
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nomor Urut
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kategori
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Kode Arsip
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {data.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.nomor_urut_display || "-"}
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatKategori(item.kategori)}
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-sm text-gray-600 hidden lg:table-cell">
                      {item.kode_arsip || "-"}
                    </td>
                    <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                      {getStatusBadge(item)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden divide-y divide-gray-100">
            {data.map((item) => (
              <div
                key={item.id}
                className="p-4 hover:bg-gray-50 active:bg-gray-100"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-900">
                        {item.nomor_urut_display || "-"}
                      </span>
                      {item.kode_arsip && (
                        <span className="text-xs text-gray-500">
                          • {item.kode_arsip}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      {formatKategori(item.kategori)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDate(item.created_at)}
                    </p>
                  </div>
                  {getStatusBadge(item)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
