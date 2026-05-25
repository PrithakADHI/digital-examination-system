import axios from "axios";

const TOKEN_KEY = "des_token";
const REFRESH_TOKEN_KEY = "des_refresh_token";
const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setStoredToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function setStoredRefreshToken(token) {
  if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token);
  else localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

const axiosInstance = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (err) => Promise.reject(err)
);

axiosInstance.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;
    const isUnauthorized = err.response?.status === 401;
    const isAuthRequest =
      originalRequest?.url?.includes("/auth/login") ||
      originalRequest?.url?.includes("/auth/token");

    if (isUnauthorized && !originalRequest?._retry && !isAuthRequest) {
      originalRequest._retry = true;
      const refreshToken = getStoredRefreshToken();

      if (refreshToken) {
        try {
          const refreshRes = await axios.post(`${baseURL}/auth/token`, { token: refreshToken });
          const newAccessToken = refreshRes.data?.accessToken;
          const newRefreshToken = refreshRes.data?.refreshToken;

          if (newAccessToken) {
            setStoredToken(newAccessToken);
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }

          if (newRefreshToken) {
            setStoredRefreshToken(newRefreshToken);
          }

          return axiosInstance(originalRequest);
        } catch (refreshErr) {
          clearStoredToken();
          localStorage.removeItem("user");
          if (!window.location.pathname.startsWith("/login")) {
            window.location.href = "/login";
          }
          return Promise.reject(refreshErr);
        }
      }

      clearStoredToken();
      localStorage.removeItem("user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(err);
  }
);

export default axiosInstance;
