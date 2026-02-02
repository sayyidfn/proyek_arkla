"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { KategoriSurat, ProcessSuratResponse } from "@/lib/types";
import { apiClient } from "@/lib/api-client";

interface ProcessingOCRProps {
  file: File;
  kategori: KategoriSurat;
  onComplete: (result: ProcessSuratResponse) => void;
  onError: (error: string) => void;
}

interface ProcessingStep {
  id: string;
  label: string;
  status: "pending" | "processing" | "completed" | "error";
}

const initialSteps: ProcessingStep[] = [
  {
    id: "convert",
    label: "Konversi dokumen ke format digital",
    status: "pending",
  },
  { id: "ocr", label: "Pengenalan karakter (OCR)", status: "pending" },
  { id: "metadata", label: "Ekstraksi metadata surat", status: "pending" },
  {
    id: "identify",
    label: "Identifikasi nomor surat dan tanggal",
    status: "pending",
  },
  { id: "detect", label: "Deteksi pengirim dan penerima", status: "pending" },
  {
    id: "classify",
    label: "Klasifikasi prioritas dan tingkat kerahasiaan",
    status: "pending",
  },
];

const kategoriLabels: Record<KategoriSurat, string> = {
  masuk_biasa: "masuk-biasa",
  undangan: "undangan",
  masuk_penting: "masuk-penting",
  keluar: "keluar-dewan",
  keluar_sekwan: "keluar-sekwan",
  rahasia: "rahasia",
};

export default function ProcessingOCR({
  file,
  kategori,
  onComplete,
  onError,
}: ProcessingOCRProps) {
  const [steps, setSteps] = useState<ProcessingStep[]>(initialSteps);
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  // Prevent double execution in React StrictMode
  const hasStartedRef = useRef(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  useEffect(() => {
    // Prevent double execution
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    
    const processFile = async () => {
      try {
        // Simulate step progression while API is processing
        const stepInterval = setInterval(() => {
          setCurrentStepIndex((prev) => {
            if (prev < steps.length - 1) {
              setSteps((currentSteps) =>
                currentSteps.map((step, index) => {
                  if (index < prev + 1) return { ...step, status: "completed" };
                  if (index === prev + 1)
                    return { ...step, status: "processing" };
                  return step;
                }),
              );
              setProgress(Math.min(((prev + 2) / steps.length) * 100, 95));
              return prev + 1;
            }
            return prev;
          });
        }, 800);

        // Start first step
        setSteps((currentSteps) =>
          currentSteps.map((step, index) =>
            index === 0 ? { ...step, status: "processing" } : step,
          ),
        );

        // Call actual API
        const result = await apiClient.processSurat(file, kategori);

        // Clear interval and complete all steps
        clearInterval(stepInterval);
        setSteps((currentSteps) =>
          currentSteps.map((step) => ({ ...step, status: "completed" })),
        );
        setProgress(100);

        // Wait a moment to show completion, then proceed
        setTimeout(() => {
          onComplete(result);
        }, 500);
      } catch (error) {
        console.error("Processing error:", error);
        setSteps((currentSteps) =>
          currentSteps.map((step, index) =>
            index === currentStepIndex ? { ...step, status: "error" } : step,
          ),
        );
        onError(
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memproses dokumen",
        );
      }
    };

    processFile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, kategori]); // Only depend on file and kategori, not callbacks

  return (
    <div className="max-w-2xl mx-auto">
      {/* Loading Animation */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 relative">
          <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
          <div
            className="absolute inset-0 border-4 border-[#2C5F6F] rounded-full animate-spin"
            style={{
              borderTopColor: "transparent",
              borderRightColor: "transparent",
            }}
          ></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src="/iconsparkles.svg"
              alt="AI"
              width={32}
              height={32}
              className="animate-pulse"
            />
          </div>
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          AI OCR Processing
        </h2>
        <p className="text-gray-500">
          Sistem sedang mengekstrak data dari dokumen menggunakan AI
        </p>
      </div>

      {/* File Info Card */}
      <div className="bg-gray-50 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
            <Image
              src="/icondaftarsurat.svg"
              alt="File"
              width={20}
              height={20}
            />
          </div>
          <div>
            <p className="font-medium text-gray-900">{file.name}</p>
            <p className="text-sm text-gray-500">
              {formatFileSize(file.size)} • Kategori: {kategoriLabels[kategori]}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">Ekstraksi teks dengan AI...</span>
          <span className="text-[#2C5F6F] font-medium">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#2C5F6F] rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Processing Steps */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-medium text-gray-900 mb-4">
          Proses yang Sedang Berjalan:
        </h3>
        <ul className="space-y-3">
          {steps.map((step) => (
            <li key={step.id} className="flex items-center gap-3">
              {/* Status Icon */}
              {step.status === "completed" && (
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
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
              )}
              {step.status === "processing" && (
                <div className="w-5 h-5 rounded-full bg-[#2C5F6F] animate-pulse" />
              )}
              {step.status === "pending" && (
                <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
              )}
              {step.status === "error" && (
                <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
              )}

              {/* Label */}
              <span
                className={`text-sm ${
                  step.status === "completed"
                    ? "text-gray-900"
                    : step.status === "processing"
                      ? "text-[#2C5F6F] font-medium"
                      : step.status === "error"
                        ? "text-red-600"
                        : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
