import axiosInstance from "./axiosInstance.js";

const student = "/student";

export function getStudentProfile() {
  return axiosInstance.get(`${student}/profile`).then((res) => res.data?.data ?? res.data);
}

export function getStudentExamSummary() {
  return axiosInstance.get(`${student}/dashboard/exam-summary`).then((res) => res.data?.data ?? res.data);
}

export function getStudentUpcomingExaminations(params = {}) {
  return axiosInstance
    .get(`${student}/dashboard/upcoming-examinations`, { params: { limit: params.limit ?? 6 } })
    .then((res) => res.data?.data ?? res.data);
}

export function getStudentAverageResultsOverExaminations() {
  return axiosInstance.get(`${student}/dashboard/results-trend`).then((res) => res.data?.data ?? res.data);
}

export function getStudentExaminations() {
  return axiosInstance.get(`${student}/examinations`).then((res) => res.data?.data ?? res.data);
}

export function getStudentExaminationById(id) {
  return axiosInstance.get(`${student}/examination/${id}`).then((res) => res.data?.data ?? res.data);
}
