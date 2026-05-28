"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import apiClient from "@/lib/api-client";

export const RegisterForm: React.FC = () => {
  const { user } = useAuth();
  const [username, setUsername] = useState("");
  const [nama, setNama] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"admin" | "operator">("operator");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validasi dasar
    if (password.length < 8) {
      setErrorMsg("Password minimal harus terdiri dari 8 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Password dan Konfirmasi Password tidak cocok.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiClient.register({
        username,
        nama,
        password,
        confirm_password: confirmPassword,
        role,
      });

      if (response.status === "success") {
        setSuccessMsg(
          `Akun staf baru (${username}) dengan role ${
            role === "admin" ? "Administrator" : "Operator"
          } berhasil dibuat!`
        );
        // Reset form
        setUsername("");
        setNama("");
        setPassword("");
        setConfirmPassword("");
        setRole("operator");
      } else {
        setErrorMsg(response.message || "Gagal membuat akun.");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Terjadi kesalahan server saat mendaftarkan user.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-lg animate-slide-up">
      <div className="overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-2xl">
        {/* Banner Header */}
        <div className="bg-gradient-to-br from-[#2C5F6F] to-[#1e424e] px-8 py-8 text-white relative">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full blur-lg -mr-4 -mt-4"></div>
          <h2 className="text-xl font-bold tracking-tight">Daftarkan Staff Baru</h2>
          <p className="mt-1 text-xs text-teal-100/70">
            Form pendaftaran operator dan administrator baru sistem ARKLA
          </p>
        </div>

        {/* Body */}
        <div className="px-8 py-8">
          {/* Error Alert */}
          {errorMsg && (
            <div className="mb-6 flex items-start gap-3 rounded-xl bg-rose-50 p-4 border border-rose-100 text-rose-800 animate-fade-in">
              <svg
                className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-xs font-semibold leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Success Alert */}
          {successMsg && (
            <div className="mb-6 flex items-start gap-3 rounded-xl bg-emerald-50 p-4 border border-emerald-100 text-emerald-800 animate-fade-in">
              <svg
                className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-xs font-semibold leading-relaxed">{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="nama"
                className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2"
              >
                Nama Lengkap
              </label>
              <input
                id="nama"
                name="nama"
                type="text"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Masukkan nama lengkap staf"
                className="block w-full rounded-xl border border-gray-200 bg-gray-50/50 py-3 px-4 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-[#2C5F6F] focus:bg-white focus:ring-4 focus:ring-[#2C5F6F]/10 outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="username"
                className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2"
              >
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username unik"
                className="block w-full rounded-xl border border-gray-200 bg-gray-50/50 py-3 px-4 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-[#2C5F6F] focus:bg-white focus:ring-4 focus:ring-[#2C5F6F]/10 outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="role"
                className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2"
              >
                Hak Akses (Role)
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "operator")}
                className="block w-full rounded-xl border border-gray-200 bg-gray-50/50 py-3 px-4 text-sm text-gray-900 transition-all duration-200 focus:border-[#2C5F6F] focus:bg-white focus:ring-4 focus:ring-[#2C5F6F]/10 outline-none cursor-pointer"
              >
                <option value="operator">Operator (Input & Daftar Surat)</option>
                <option value="admin">Administrator (Akses Penuh)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2"
                >
                  Password (Min. 8 Karakter)
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Buat sandi baru"
                    className="block w-full rounded-xl border border-gray-200 bg-gray-50/50 py-3 pl-4 pr-11 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-[#2C5F6F] focus:bg-white focus:ring-4 focus:ring-[#2C5F6F]/10 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600 transition-colors outline-none"
                    title={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2"
                >
                  Konfirmasi Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi sandi baru"
                    className="block w-full rounded-xl border border-gray-200 bg-gray-50/50 py-3 pl-4 pr-11 text-sm text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-[#2C5F6F] focus:bg-white focus:ring-4 focus:ring-[#2C5F6F]/10 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600 transition-colors outline-none"
                    title={showConfirmPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
                  >
                    {showConfirmPassword ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2C5F6F] py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#2C5F6F]/20 transition-all duration-200 hover:bg-[#204652] hover:shadow-[#2C5F6F]/10 active:scale-98 disabled:pointer-events-none disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Mendaftarkan...</span>
                  </>
                ) : (
                  <span>Daftarkan Akun Baru</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
