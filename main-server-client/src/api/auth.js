import axiosInstance from "./axiosInstance.js";

export function login(credentials) {
  return axiosInstance.post("/auth/login", credentials).then((res) => res.data);
}

export function completeTemporaryPassword(payload) {
  return axiosInstance.post("/auth/complete-temporary-password", payload).then((res) => res.data);
}

export function requestPasswordResetOtp(payload) {
  return axiosInstance.post("/auth/forgot-password/request", payload).then((res) => res.data);
}

export function verifyPasswordResetOtp(payload) {
  return axiosInstance.post("/auth/forgot-password/verify", payload).then((res) => res.data);
}

export function resetPasswordWithOtp(payload) {
  return axiosInstance.post("/auth/forgot-password/reset", payload).then((res) => res.data);
}
