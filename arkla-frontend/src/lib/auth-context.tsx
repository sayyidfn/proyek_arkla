"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import apiClient from "./api-client";
import { AuthUser, LoginRequest } from "./types";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fungsi untuk refresh profil user saat ini
  const refreshUser = useCallback(async () => {
    try {
      const response = await apiClient.getMe();
      if (response.status === "success" && response.user) {
        setUser(response.user);
        // Sync role cookie so middleware can guard /register correctly
        if (typeof window !== "undefined") {
          document.cookie = `arkla_role=${response.user.role}; path=/; SameSite=Lax; Secure`;
        }
      } else {
        setUser(null);
        if (typeof window !== "undefined") {
          document.cookie = "arkla_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure";
          document.cookie = "arkla_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure";
        }
      }
    } catch (error) {
      setUser(null);
      if (typeof window !== "undefined") {
        document.cookie = "arkla_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure";
        document.cookie = "arkla_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure";
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cek sesi saat inisialisasi
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Fungsi Login
  const login = useCallback(async (data: LoginRequest) => {
    setIsLoading(true);
    try {
      const response = await apiClient.login(data);
      if (response.status === "success" && response.user) {
        setUser(response.user);
        // Set both cookies so Next.js middleware can guard routes correctly
        if (typeof window !== "undefined") {
          const maxAge = data.remember_me ? 7 * 24 * 3600 : 8 * 3600;
          document.cookie = `arkla_logged_in=true; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;
          document.cookie = `arkla_role=${response.user.role}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;
        }
      } else {
        throw new Error(response.message || "Gagal masuk. Silakan coba lagi.");
      }
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fungsi Logout
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await apiClient.logout();
    } catch (error) {
      console.error("Gagal logout di server:", error);
    } finally {
      setUser(null);
      setIsLoading(false);
      // Clear both cookies and redirect
      if (typeof window !== "undefined") {
        document.cookie = "arkla_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure";
        document.cookie = "arkla_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure";
        window.location.href = "/login";
      }
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
