"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import StepIndicator from "@/components/upload/StepIndicator";
import SelectCategory from "@/components/upload/SelectCategory";
import UploadFile from "@/components/upload/UploadFile";
import ProcessingOCR from "@/components/upload/ProcessingOCR";
import ValidationForm from "@/components/upload/ValidationForm";
import { KategoriSurat, ProcessSuratResponse } from "@/lib/types";

export type UploadStep = 1 | 2 | 3 | 4;

export default function UploadPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<UploadStep>(1);
  const [selectedCategory, setSelectedCategory] =
    useState<KategoriSurat | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [processResult, setProcessResult] =
    useState<ProcessSuratResponse | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);

  const handleCategorySelect = (kategori: KategoriSurat) => {
    setSelectedCategory(kategori);
  };

  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as UploadStep);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as UploadStep);
    }
  };

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
  };

  const handleProcessComplete = (result: ProcessSuratResponse) => {
    setProcessResult(result);
    setProcessingError(null);
    setCurrentStep(4);
  };

  const handleProcessError = (error: string) => {
    setProcessingError(error);
    // Go back to step 2 on error
    setCurrentStep(2);
  };

  const handleCancel = () => {
    setCurrentStep(1);
    setSelectedCategory(null);
    setUploadedFile(null);
    setProcessResult(null);
    setProcessingError(null);
  };

  const handleSuccess = () => {
    // Redirect to dashboard or archive after successful save
    router.push("/");
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <SelectCategory
            selectedCategory={selectedCategory}
            onSelect={handleCategorySelect}
          />
        );
      case 2:
        return (
          <>
            {processingError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
                <p className="font-medium">Error saat memproses dokumen:</p>
                <p className="text-sm">{processingError}</p>
              </div>
            )}
            <UploadFile
              kategori={selectedCategory!}
              uploadedFile={uploadedFile}
              onFileUpload={handleFileUpload}
              onBack={handlePrevStep}
              onNext={handleNextStep}
            />
          </>
        );
      case 3:
        return (
          <ProcessingOCR
            file={uploadedFile!}
            kategori={selectedCategory!}
            onComplete={handleProcessComplete}
            onError={handleProcessError}
          />
        );
      case 4:
        return (
          <ValidationForm
            result={processResult!}
            file={uploadedFile!}
            onDiscard={handleCancel}
            onSuccess={handleSuccess}
          />
        );
      default:
        return null;
    }
  };

  return (
    <DashboardLayout title="Input Surat Baru">
      <div className={currentStep === 4 ? "" : "max-w-6xl mx-auto"}>
        {/* Step Indicator */}
        <div className="flex justify-center sm:justify-end mb-4 sm:mb-6">
          <StepIndicator currentStep={currentStep} />
        </div>

        {/* Breadcrumb */}
        <div className="text-xs sm:text-sm text-gray-500 mb-2">
          <span className="hidden sm:inline">Input Surat Baru</span>
          <span className="sm:hidden">Input</span>
          {currentStep === 1 && " • Pilih Kategori"}
          {currentStep === 2 && " • Upload File"}
          {currentStep === 3 && " • OCR Processing"}
          {currentStep === 4 && " • Validation"}
        </div>

        {/* Title */}
        <h1 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
          {currentStep === 1 && "Pilih Kategori Surat"}
          {currentStep === 2 && "Upload Dokumen"}
          {currentStep === 3 && "AI OCR Processing"}
          {currentStep === 4 && "Validation & Finalization"}
        </h1>

        {/* Step Content */}
        {renderStep()}

        {/* Navigation Buttons (Step 1 only) */}
        {currentStep === 1 && (
          <div className="flex justify-between items-center mt-6 sm:mt-8">
            <button
              onClick={handleCancel}
              className="text-gray-600 hover:text-gray-800 text-sm sm:text-base"
            >
              Cancel
            </button>
            <button
              onClick={handleNextStep}
              disabled={!selectedCategory}
              className={`px-4 sm:px-6 py-2 rounded-lg flex items-center gap-2 text-sm sm:text-base ${
                selectedCategory
                  ? "bg-[#2C5F6F] text-white hover:bg-[#244f5c] active:bg-[#1e4249]"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              Next Step
              <span>›</span>
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
