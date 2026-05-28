"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const { user } = useAuth();

  return (
    <DashboardLayout title="Registrasi Staff" subtitle="Manajemen Pengguna">
      <div className="flex flex-col items-center justify-center py-6 sm:py-10">
        {user && user.role !== "admin" && (
          <div className="mb-6 w-full max-w-lg rounded-xl bg-amber-50 p-4 border border-amber-200 text-amber-800 text-xs font-semibold leading-relaxed">
            Peringatan: Halaman ini hanya ditujukan untuk Administrator. Sebagai Operator, Anda mungkin tidak memiliki izin dari API backend untuk mendaftarkan akun baru.
          </div>
        )}
        <RegisterForm />
      </div>
    </DashboardLayout>
  );
}
