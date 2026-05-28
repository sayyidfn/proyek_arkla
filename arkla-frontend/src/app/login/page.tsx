"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50/50">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#2C5F6F] border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm font-medium text-gray-500">Memeriksa sesi...</p>
        </div>
      </div>
    );
  }

  // Jika sudah login, jangan tampilkan form
  if (user) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 relative overflow-hidden bg-[#F8FAFC]">
      {/* Decorative luxury mesh background shapes */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#2C5F6F]/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#2C5F6F]/10 rounded-full blur-[150px] pointer-events-none"></div>

      <LoginForm />
    </main>
  );
}
