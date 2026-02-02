"use client";

import Image from "next/image";
import { SuratListItem } from "@/lib/types";

interface DeleteConfirmModalProps {
  surat: SuratListItem;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmModal({
  surat,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-scale-up">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <Image
              src="/icontrash.svg"
              alt="Delete"
              width={32}
              height={32}
              className="opacity-70"
            />
          </div>
        </div>

        {/* Content */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Hapus Surat?
          </h3>
          <p className="text-gray-500 text-sm">
            Apakah Anda yakin ingin menghapus surat{" "}
            <span className="font-medium text-gray-700">
              {surat.nomor_urut_display || surat.id}
            </span>
            ? Tindakan ini tidak dapat dibatalkan.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Ya, Hapus
          </button>
        </div>
      </div>
    </div>
  );
}
