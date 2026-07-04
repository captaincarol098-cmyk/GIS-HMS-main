import { create } from "zustand";
import { api } from "@/lib/api";

type User = { id: string; username: string; email: string; role: "super_admin" | "admin"; barangay_id?: string | null; barangay_name?: string | null };

type AuthStore = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  async login(username, password) {
    set({ isLoading: true });
    try {
      console.log("Attempting login with username:", username);
      console.log("API URL:", process.env.NEXT_PUBLIC_API_URL);
      const res = await api.post("/api/auth/login", { username, password });
      console.log("Login response:", res.data);
      localStorage.setItem("access_token", res.data.access_token);
      localStorage.setItem("refresh_token", res.data.refresh_token);
      set({ user: res.data.user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      console.error("Login error:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      console.error("Error message:", error.message);
      if (error.code === "ERR_NETWORK") {
        console.error("Network error - backend may not be reachable");
      }
      set({ isLoading: false });
      throw error;
    }
  },
  async logout() {
    try {
      console.log("Starting logout process...");
      console.log("API URL:", process.env.NEXT_PUBLIC_API_URL);
      // Call backend logout endpoint
      const response = await api.post("/api/auth/logout");
      console.log("Logout API response:", response.data);
    } catch (error: any) {
      console.error("Logout API error:", error);
      console.error("Error status:", error.response?.status);
      console.error("Error data:", error.response?.data);
      console.error("Error message:", error.message);
      // Continue with local cleanup even if API call fails
    } finally {
      console.log("Clearing local storage and auth state...");
      // Always clear local storage
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      set({ user: null, isAuthenticated: false });
      console.log("Logout complete");
    }
  },
  async refreshUser() {
    try {
      const res = await api.get("/api/auth/me");
      set({ user: res.data, isAuthenticated: true });
    } catch (error) {
      console.error("Refresh user error:", error);
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      set({ user: null, isAuthenticated: false });
      throw error;
    }
  },
}));
