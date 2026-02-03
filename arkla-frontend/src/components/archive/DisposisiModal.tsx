"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { SuratListItem, SuratDetail } from "@/lib/types";
import { apiClient } from "@/lib/api-client";

interface DisposisiModalProps {
  surat: SuratListItem;
  onClose: () => void;
}

const kategoriLabels: Record<string, string> = {
  masuk_biasa: "Surat Masuk Biasa",
  undangan: "Undangan",
  masuk_penting: "Surat Masuk Penting",
  keluar: "Surat Keluar Dewan",
  keluar_sekwan: "Keluar Sekwan",
  rahasia: "Rahasia",
};

export default function DisposisiModal({
  surat,
  onClose,
}: DisposisiModalProps) {
  const [detail, setDetail] = useState<SuratDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const response = await apiClient.getSuratDetail(surat.id);
        // Backend returns { status: "success", data: { id, kategori, details: {...} } }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const apiResponse = response as any;
        const rawData = apiResponse.data || apiResponse;

        // Flatten data: merge details into root level
        const flatData: SuratDetail = {
          ...rawData,
          ...(rawData.details || {}),
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (flatData as any).details;

        setDetail(flatData);
      } catch (err) {
        console.error("Failed to fetch surat detail:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [surat.id]);

  // Get display values - move before handlePrint
  const getNomorUrut = () => {
    if (surat.nomor_urut_display) {
      return surat.nomor_urut_display.split("/")[0];
    }
    return "-";
  };

  const getIndex = () => kategoriLabels[surat.kategori] || surat.kategori;
  const getKode = () => surat.kode_arsip || "-";

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const handlePrint = () => {
    if (!detail && !surat) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const index = getIndex();
    const kode = getKode();
    const nomorUrut = getNomorUrut();
    const isiRingkas = detail?.isi_ringkas || surat.isi_ringkas || "-";
    const asalSurat = detail?.asal_surat || "-";
    const tanggal = formatDate(detail?.tgl_surat || detail?.tgl_surat_masuk);
    const nomorSurat = detail?.nomor_surat || "-";
    const lampiran = detail?.lampiran || "-";
    const diteruskan = detail?.kepada || detail?.diperuntukan || "-";

    // Ukuran kertas: 10.2cm (lebar) x 15.7cm (tinggi) - portrait
    // Margin: kiri 0.7cm, kanan 1.1cm, atas 1.4cm, bawah 0.3cm
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Lembar Disposisi - ${surat.nomor_urut_display || surat.id}</title>
          <style>
            @page {
              /*size: 102mm 157mm;*/
              size: A4 portrait;
              margin: 14mm 11mm 3mm 7mm;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 9pt;
            }
            .container {
              /* Tidak ada border luar */
              width: 102mm;
              height: 157mm;
            }
            /* Header LEMBAR DISPOSISI */
            .header {
              text-align: center;
              font-weight: bold;
              font-size: 11pt;
              padding: 3px 0;
              text-decoration: underline;
              border-bottom: 2px solid black;
            }
            /* Row 1: INDEX, KODE, Nomor Urut, Tgl Penyelesaian */
            .row1 {
              display: flex;
              border-bottom: 1px solid black;
            }
            .row1 .cell {
              padding: 2px 4px;
              border-right: 1px solid black;
            }
            .row1 .cell:last-child {
              border-right: none;
            }
            .row1 .cell-index { width: 22%; }
            .row1 .cell-kode { width: 18%; }
            .row1 .cell-nomor { width: 22%; }
            .row1 .cell-tgl { width: 38%; }
            .label-underline {
              text-decoration: underline;
              font-size: 8pt;
            }
            .value-italic {
              font-style: italic;
              font-size: 9pt;
            }
            /* Isi Ringkas section */
            .isi-ringkas {
              padding: 3px 4px;
              border-bottom: 1px solid black;
              min-height: 28mm;
            }
            .isi-ringkas-label {
              font-weight: bold;
              font-size: 9pt;
              text-decoration: underline;
            }
            .isi-ringkas-value {
              font-style: italic;
              font-size: 9pt;
              margin-top: 2px;
              line-height: 1.4;
            }
            /* Row 2: Asal Surat, Tanggal, Nomor, Lamp */
            .row2 {
              display: flex;
              border-bottom: 1px solid black;
              min-height: 20mm;
            }
            .row2 .cell {
              padding: 2px 4px;
              border-right: 1px solid black;
            }
            .row2 .cell:last-child {
              border-right: none;
            }
            .row2 .cell-asal { width: 28%; }
            .row2 .cell-tanggal { width: 25%; }
            .row2 .cell-nomor { width: 25%; }
            .row2 .cell-lamp { width: 22%; }
            /* Bottom section */
            .bottom {
              display: flex;
              min-height: 45mm;
            }
            .bottom-left {
              width: 50%;
              border-right: 1px solid black;
              padding: 2px 4px;
            }
            .bottom-right {
              width: 50%;
              padding: 2px 4px;
            }
            .bottom-header {
              font-size: 8pt;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">LEMBAR DISPOSISI</div>
            
            <div class="row1">
              <div class="cell cell-index">
                <span class="label-underline">INDEX</span><br/>
                <span class="value-italic">${index}</span>
              </div>
              <div class="cell cell-kode">
                <span class="label-underline">KODE</span><br/>
                <span class="value-italic">${kode}</span>
              </div>
              <div class="cell cell-nomor">
                <span class="label-underline">Nomor Urut</span><br/>
                <span class="value-italic">${nomorUrut}</span>
              </div>
              <div class="cell cell-tgl">
                <span class="label-underline">Tgl. Penyelesaian</span><br/>
                <span class="value-italic"></span>
              </div>
            </div>
            
            <div class="isi-ringkas">
              <span class="isi-ringkas-label">Isi Ringkas :</span>
              <div class="isi-ringkas-value">${isiRingkas}</div>
            </div>
            
            <div class="row2">
              <div class="cell cell-asal">
                <span class="label-underline">Asal Surat</span><br/>
                <span class="value-italic">${asalSurat}</span>
              </div>
              <div class="cell cell-tanggal">
                <span class="label-underline">Tanggal</span><br/>
                <span class="value-italic">${tanggal}</span>
              </div>
              <div class="cell cell-nomor">
                <span class="label-underline">Nomor:</span><br/>
                <span class="value-italic">${nomorSurat}</span>
              </div>
              <div class="cell cell-lamp">
                <span class="label-underline">Lamp.:</span><br/>
                <span class="value-italic">${lampiran}</span>
              </div>
            </div>
            
            <div class="bottom">
              <div class="bottom-left">
                <span class="bottom-header">Diajukan / Diteruskan<br/>kepada :</span>
                <div class="value-italic" style="margin-top: 3px;">${diteruskan}</div>
              </div>
              <div class="bottom-right">
                <span class="bottom-header">Informasi / Instruksi</span>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Image src="/iconprint.svg" alt="Print" width={24} height={24} />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Preview Lembar Disposisi
              </h2>
              <p className="text-sm text-gray-500">
                {surat.nomor_urut_display || surat.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto max-h-[calc(90vh-140px)]">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-[#2C5F6F] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="bg-gray-100 p-6 rounded-lg">
              {/* Printable Content */}
              <div
                ref={printRef}
                className="bg-white mx-auto shadow-lg"
                style={{
                  width: "210mm",
                  minHeight: "148mm",
                  padding: "12mm 11mm 3mm 6.5mm",
                }}
              >
                <div className="border-2 border-black h-full flex flex-col">
                  {/* Header */}
                  <div className="text-center font-bold text-lg py-2 border-b-2 border-black underline">
                    LEMBAR DISPOSISI
                  </div>

                  {/* Info Row 1: INDEX, KODE, Nomor Urut, Tgl Penyelesaian */}
                  <div className="flex border-b border-black">
                    <div className="flex-1 p-2 border-r border-black">
                      <div className="text-xs text-gray-500">INDEX</div>
                      <div className="font-medium">{getIndex()}</div>
                    </div>
                    <div className="flex-1 p-2 border-r border-black">
                      <div className="text-xs text-gray-500">KODE</div>
                      <div className="font-medium">{getKode()}</div>
                    </div>
                    <div className="flex-1 p-2 border-r border-black">
                      <div className="text-xs text-gray-500">Nomor Urut</div>
                      <div className="font-medium">{getNomorUrut()}</div>
                    </div>
                    <div className="flex-1 p-2">
                      <div className="text-xs text-gray-500">
                        Tgl. Penyelesaian
                      </div>
                      <div className="font-medium">-</div>
                    </div>
                  </div>

                  {/* Isi Ringkas */}
                  <div className="p-3 border-b border-black">
                    <div className="font-bold mb-1">Isi Ringkas :</div>
                    <div className="text-sm leading-relaxed">
                      {detail?.isi_ringkas || surat.isi_ringkas || "-"}
                    </div>
                  </div>

                  {/* Info Row 2: Asal Surat, Tanggal, Nomor, Lamp */}
                  <div className="flex border-b border-black">
                    <div className="w-1/4 p-2 border-r border-black">
                      <div className="text-xs text-gray-500">Asal Surat</div>
                      <div className="font-medium text-sm">
                        {detail?.asal_surat || "-"}
                      </div>
                    </div>
                    <div className="w-1/4 p-2 border-r border-black">
                      <div className="text-xs text-gray-500">Tanggal</div>
                      <div className="font-medium text-sm">
                        {formatDate(detail?.tgl_surat)}
                      </div>
                    </div>
                    <div className="w-1/4 p-2 border-r border-black">
                      <div className="text-xs text-gray-500">Nomor :</div>
                      <div className="font-medium text-sm">
                        {detail?.nomor_surat || "-"}
                      </div>
                    </div>
                    <div className="w-1/4 p-2">
                      <div className="text-xs text-gray-500">Lamp.:</div>
                      <div className="font-medium text-sm">-</div>
                    </div>
                  </div>

                  {/* Bottom Section */}
                  <div className="flex flex-1">
                    {/* Left: Diteruskan */}
                    <div className="w-1/2 border-r border-black flex flex-col">
                      <div className="p-2 border-b border-black">
                        <div className="text-xs text-gray-500">
                          Diajukan / Diteruskan kepada :
                        </div>
                      </div>
                      <div className="p-2 flex-1">
                        <div className="font-medium">
                          {detail?.kepada || detail?.diperuntukan || "-"}
                        </div>
                      </div>
                    </div>
                    {/* Right: Instruksi */}
                    <div className="w-1/2 flex flex-col">
                      <div className="p-2 border-b border-black">
                        <div className="text-xs text-gray-500">
                          Informasi / Instruksi
                        </div>
                      </div>
                      <div className="p-2 flex-1">
                        <div className="font-medium">-</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Tutup
          </button>
          <button
            onClick={handlePrint}
            disabled={isLoading}
            className="px-6 py-2 bg-[#2C5F6F] text-white rounded-lg hover:bg-[#244f5c] disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <Image
              src="/iconprint.svg"
              alt="Print"
              width={16}
              height={16}
              className="invert"
            />
            Cetak
          </button>
        </div>
      </div>
    </div>
  );
}
