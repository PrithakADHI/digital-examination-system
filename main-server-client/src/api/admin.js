import axiosInstance from "./axiosInstance.js";

const admin = "/admin";

// Dashboard (new endpoints - to be implemented on server)
export function getExamSummary() {
  return axiosInstance.get(`${admin}/dashboard/exam-summary`).then((res) => res.data?.data ?? res.data);
}

export function getUserCounts() {
  return axiosInstance.get(`${admin}/dashboard/user-counts`).then((res) => res.data?.data ?? res.data);
}

export function getTopStudents() {
  return axiosInstance.get(`${admin}/dashboard/top-students`).then((res) => res.data?.data ?? res.data);
}

export function getExamsCreationTrend() {
  return axiosInstance.get(`${admin}/dashboard/exams-creation-trend`).then((res) => res.data?.data ?? res.data);
}

export function getExamAverageScores() {
  return axiosInstance.get(`${admin}/dashboard/exam-average-scores`).then((res) => res.data?.data ?? res.data);
}

// Examinations
export function getExaminations(params = {}) {
  return axiosInstance
    .get(`${admin}/examination`, {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? 10,
        search: params.search,
      },
    })
    .then((res) => ({
      data: res.data?.data ?? [],
      pagination: res.data?.pagination ?? { total: 0, page: 1, limit: 10, totalPages: 0 },
    }));
}

export function getExamination(id) {
  return axiosInstance.get(`${admin}/examination/${id}`).then((res) => res.data?.data ?? res.data);
}

export function createExamination(payload) {
  return axiosInstance.post(`${admin}/examination`, payload).then((res) => res.data);
}

export function updateExamination(id, payload) {
  return axiosInstance.put(`${admin}/examination/${id}`, payload).then((res) => res.data);
}

export function deleteExamination(id) {
  return axiosInstance.delete(`${admin}/examination/${id}`).then((res) => res.data);
}

export function patchExaminationCenters(id, center_fk_list) {
  return axiosInstance.patch(`${admin}/examination/${id}/centers`, { center_fk_list }).then((res) => res.data);
}

// Centers (for dropdowns)
export function getCenters(params = {}) {
  return axiosInstance
    .get(`${admin}/center`, { params: { page: params.page ?? 1, limit: params.limit ?? 100 } })
    .then((res) => ({
      data: res.data?.data ?? [],
      pagination: res.data?.pagination ?? {},
    }));
}

export function createCenter(payload) {
  return axiosInstance.post(`${admin}/center`, payload).then((res) => res.data);
}

export function updateCenter(id, payload) {
  return axiosInstance.put(`${admin}/center/${id}`, payload).then((res) => res.data);
}

export function deleteCenter(id) {
  return axiosInstance.delete(`${admin}/center/${id}`).then((res) => res.data);
}

// Users (for exam setter dropdown)
export function getUsers(params = {}) {
  return axiosInstance
    .get(`${admin}/users`, { params: { role: params.role, ...params } })
    .then((res) => ({
      data: res.data?.data ?? [],
      pagination: res.data?.pagination ?? {},
    }));
}

export function createUser(payload) {
  return axiosInstance.post(`${admin}/users`, payload).then((res) => res.data);
}

export function updateUser(id, payload) {
  return axiosInstance.put(`${admin}/users/${id}`, payload).then((res) => res.data);
}

export function deactivateUser(id) {
  return axiosInstance.patch(`${admin}/users/${id}/deactivate`).then((res) => res.data);
}

export function activateUser(id) {
  return axiosInstance.patch(`${admin}/users/${id}/activate`).then((res) => res.data);
}

// Student Assignment
export function getAnswersBySubject(subjectId) {
  return axiosInstance.get(`${admin}/answers/subject/${subjectId}`).then((res) => res.data?.data ?? []);
}

export function assignBulkStudents(payload) {
  return axiosInstance.post(`${admin}/assign-bulk-students`, payload).then((res) => res.data);
}
