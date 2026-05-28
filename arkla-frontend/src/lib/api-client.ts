import {
  PaginatedResponse,
  SuratListItem,
  SuratDetail,
  ProcessSuratResponse,
  VerifyRequest,
  VerifyResponse,
  KategoriSurat,
  DashboardStats,
  AuthUser,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  LogoutResponse,
  MeResponse,
} from "./types";
import { API_BASE_URL } from "./config";

class APIClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    // Auto-inject Bearer Token if present in localStorage (crucial for cross-origin deployments)
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("arkla_access_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    try {
      const response = await fetch(url, {
        credentials: "include", // Tambahan penting untuk cookie HttpOnly
        ...options,
        headers,
      });

      if (response.status === 401) {
        // Clear tokens and cookies on 401
        if (typeof window !== "undefined") {
          localStorage.removeItem("arkla_access_token");
          document.cookie = "arkla_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure";
          document.cookie = "arkla_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure";
        }

        // Abaikan redirect 401 jika user sedang mengakses endpoint login/me
        const isAuthEndpoint = endpoint.includes("/auth/login") || endpoint.includes("/auth/me");
        if (!isAuthEndpoint && typeof window !== "undefined") {
          window.location.href = "/login?reason=session_expired";
        }
        
        // Ekstrak pesan dari backend jika ada
        const errorJson = await response.json().catch(() => ({}));
        const detail = errorJson.detail;
        const msg = (detail && typeof detail === "object") ? detail.message : (detail || "Sesi berakhir. Silakan login kembali.");
        throw new Error(msg);
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        let errorMessage = "Terjadi kesalahan.";
        if (error.detail) {
          if (typeof error.detail === "object" && error.detail.message) {
            errorMessage = error.detail.message;
          } else {
            errorMessage = String(error.detail);
          }
        } else if (error.message) {
          errorMessage = error.message;
        } else {
          errorMessage = `API Error: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      return response.json();
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        throw new Error(
          "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.",
        );
      }
      throw error;
    }
  }

  // ==================== SURAT ====================

  /**
   * Get list of surat with pagination and filters
   */
  async getSuratList(params?: {
    kategori?: KategoriSurat;
    date_from?: string;
    date_to?: string;
    kode?: string;
    search?: string;
    include_unverified?: boolean;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<SuratListItem>> {
    const searchParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          // Boolean harus tetap string untuk URLSearchParams, tapi format yang benar
          if (typeof value === "boolean") {
            searchParams.append(key, value ? "true" : "false");
          } else {
            searchParams.append(key, String(value));
          }
        }
      });
    }

    const query = searchParams.toString();
    return this.request<PaginatedResponse<SuratListItem>>(
      `/surat${query ? `?${query}` : ""}`,
    );
  }

  /**
   * Get single surat detail
   */
  async getSuratDetail(suratId: string): Promise<SuratDetail> {
    return this.request<SuratDetail>(`/surat/${suratId}`);
  }

  /**
   * Delete surat
   */
  async deleteSurat(
    suratId: string,
  ): Promise<{ status: string; message: string }> {
    return this.request(`/surat/${suratId}`, { method: "DELETE" });
  }

  // ==================== PROCESS ====================

  /**
   * Process uploaded surat (OCR + AI extraction)
   * @param file - The file to process
   * @param kategori - Document category
   * @param useOptimized - Use optimized single API call (default: true)
   * @param skipPreprocessing - Skip image preprocessing (default: false - preprocessing helps with low quality images)
   */
  async processSurat(
    file: File,
    kategori: KategoriSurat,
    useOptimized: boolean = true,
    skipPreprocessing: boolean = false, // Enable preprocessing by default for better OCR quality
  ): Promise<ProcessSuratResponse> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category_id", kategori);
    formData.append("use_optimized", String(useOptimized));
    formData.append("skip_preprocessing", String(skipPreprocessing));

    // Use AbortController for timeout (120 seconds - reduced for faster feedback)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch(`${this.baseUrl}/process-surat`, {
        method: "POST",
        body: formData,
        credentials: "include",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const errorMessage = error.detail || error.message || error.code;

        // Map error codes to user-friendly messages
        if (error.code === "GEMINI_CONFIG_ERROR") {
          throw new Error(
            "Server belum dikonfigurasi untuk memproses dokumen. Hubungi administrator.",
          );
        } else if (error.code === "INVALID_FILE") {
          throw new Error(
            "Format file tidak didukung. Gunakan PDF, JPG, atau PNG.",
          );
        } else if (error.code === "FILE_TOO_LARGE") {
          throw new Error("Ukuran file terlalu besar. Maksimal 10MB.");
        } else if (error.code === "OCR_FAILED") {
          throw new Error(
            "Gagal memproses gambar. Pastikan gambar jelas dan tidak rusak.",
          );
        } else if (response.status === 500) {
          throw new Error("Terjadi kesalahan server. Coba lagi nanti.");
        }

        throw new Error(errorMessage || `Error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error(
            "Timeout: Proses OCR memakan waktu terlalu lama. Coba lagi dengan gambar yang lebih kecil.",
          );
        }
        if (error.message === "Failed to fetch") {
          throw new Error(
            "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.",
          );
        }
      }
      throw error;
    }
  }

  /**
   * Verify and save extracted data
   */
  async verifySurat(data: VerifyRequest): Promise<VerifyResponse> {
    return this.request<VerifyResponse>("/verify", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ==================== DASHBOARD ====================

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      // Limit max 100 sesuai backend constraint
      const data = await this.getRecentSurat(100);
      const today = new Date().toISOString().split("T")[0];

      const verifiedData = data.filter((s) => s.overall_confidence !== null);
      const avgConfidence =
        verifiedData.length > 0
          ? verifiedData.reduce(
              (sum, s) => sum + (s.overall_confidence || 0),
              0,
            ) / verifiedData.length
          : 0;

      return {
        total_arsip: data.length,
        pending_review: data.filter(
          (s) => s.requires_manual_review || !s.verified_at,
        ).length,
        today_count: data.filter(
          (s) => s.created_at && s.created_at.startsWith(today),
        ).length,
        accuracy_rate: Math.round(avgConfidence * 100),
      };
    } catch (error) {
      console.error("getDashboardStats error:", error);
      return {
        total_arsip: 0,
        pending_review: 0,
        today_count: 0,
        accuracy_rate: 0,
      };
    }
  }

  /**
   * Get recent surat for dashboard
   */
  async getRecentSurat(limit: number = 5): Promise<SuratListItem[]> {
    try {
      // Pastikan limit tidak melebihi 100 (backend constraint)
      const safeLimit = Math.min(limit, 100);
      const url = `/surat?include_unverified=true&limit=${safeLimit}&page=1`;
      const response =
        await this.request<PaginatedResponse<SuratListItem>>(url);
      return response.data;
    } catch (error) {
      console.error("getRecentSurat error:", error);
      return [];
    }
  }

  // ==================== HEALTH ====================

  /**
   * Check API health
   */
  async checkHealth(): Promise<{ status: string; environment: string }> {
    return this.request("/health");
  }

  // ==================== EXPORT ====================

  /**
   * Export surat to Excel/CSV
   */
  async exportSurat(params: {
    kategori: KategoriSurat;
    date_from?: string;
    date_to?: string;
    include_unverified?: boolean;
    format?: "xlsx" | "csv";
  }): Promise<{
    status: string;
    file_url: string;
    filename: string;
    record_count: number;
  }> {
    const searchParams = new URLSearchParams();
    searchParams.append("kategori", params.kategori);
    if (params.date_from) searchParams.append("date_from", params.date_from);
    if (params.date_to) searchParams.append("date_to", params.date_to);
    if (params.include_unverified !== undefined) {
      searchParams.append(
        "include_unverified",
        String(params.include_unverified),
      );
    }
    searchParams.append("format", params.format || "xlsx");

    return this.request(`/export?${searchParams.toString()}`, {
      method: "POST",
    });
  }

  /**
   * Get download URL for exported file
   */
  getDownloadUrl(filename: string): string {
    return `${this.baseUrl}/download/${filename}`;
  }

  // ==================== DISPOSISI ====================

  /**
   * Get disposisi preview HTML
   */
  async getDisposisiPreview(suratId: string): Promise<string> {
    const response = await fetch(
      `${this.baseUrl}/preview-disposisi/${suratId}`,
      {
        credentials: "include",
      }
    );
    if (!response.ok) {
      throw new Error(`Failed to get disposisi preview: ${response.status}`);
    }
    return response.text();
  }

  // ==================== AUTHENTICATION ====================

  /**
   * Login user
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
    
    if (response.status === "success" && response.access_token) {
      if (typeof window !== "undefined") {
        localStorage.setItem("arkla_access_token", response.access_token);
      }
    }
    
    return response;
  }

  /**
   * Logout user
   */
  async logout(): Promise<LogoutResponse> {
    if (typeof window !== "undefined") {
      localStorage.removeItem("arkla_access_token");
    }
    return this.request<LogoutResponse>("/auth/logout", {
      method: "POST",
    });
  }

  /**
   * Get current authenticated user details
   */
  async getMe(): Promise<MeResponse> {
    return this.request<MeResponse>("/auth/me", {
      method: "GET",
    });
  }

  /**
   * Register new user (operator/admin, Admin only)
   */
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    return this.request<RegisterResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
}

export const apiClient = new APIClient();
export default apiClient;
