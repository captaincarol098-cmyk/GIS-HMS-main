import axios from "axios";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({ 
  baseURL: API_URL,
  withCredentials: true
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original?._retry && typeof window !== "undefined") {
      original._retry = true;
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        const res = await axios.post(`${API_URL}/api/auth/refresh`, {}, { headers: { Authorization: `Bearer ${refresh}` } });
        localStorage.setItem("access_token", res.data.access_token);
        original.headers.Authorization = `Bearer ${res.data.access_token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);
