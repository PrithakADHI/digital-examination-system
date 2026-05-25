import axiosInstance from "./axiosInstance.js";

export function login(credentials) {
  return axiosInstance.post("/auth/login", credentials).then((res) => res.data);
}

export function completeTemporaryPassword(payload) {
  return axiosInstance.post("/auth/complete-temporary-password", payload).then((res) => res.data);
}
