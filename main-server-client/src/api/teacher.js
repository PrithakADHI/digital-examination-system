import axiosInstance from "./axiosInstance.js";

const teacher = "/teacher";

export function getTeacherExamSummary() {
  return axiosInstance.get(`${teacher}/dashboard/exam-summary`).then((res) => res.data?.data ?? res.data);
}

export function getTeacherUpcomingExaminations(params = {}) {
  return axiosInstance
    .get(`${teacher}/dashboard/upcoming-examinations`, { params: { limit: params.limit ?? 6 } })
    .then((res) => res.data?.data ?? res.data);
}

export function getTeacherTopStudents(params = {}) {
  return axiosInstance
    .get(`${teacher}/dashboard/top-students`, { params: { limit: params.limit ?? 3 } })
    .then((res) => res.data?.data ?? res.data);
}

export function getTeacherAverageResultsOverExaminations() {
  return axiosInstance
    .get(`${teacher}/dashboard/average-results-over-examinations`)
    .then((res) => res.data?.data ?? res.data);
}

export function getAssignedQuestionsToWrite() {
  return axiosInstance.get(`${teacher}/all-questions-to-set`).then((res) => res.data?.data ?? res.data);
}

export function createTeacherQuestionPaper(payload) {
  return axiosInstance.post(`${teacher}/create-question`, payload).then((res) => res.data?.data ?? res.data);
}

export function getQuestionPaperById(subjectId) {
  return axiosInstance.get(`${teacher}/question-paper/${subjectId}`).then((res) => res.data?.data ?? res.data);
}

export function uploadQuestionImage(formData) {
  return axiosInstance.post(`${teacher}/upload-image`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  }).then((res) => res.data?.data ?? res.data);
}

export function getAllAssignedPapersToCheck() {
  return axiosInstance.get(`${teacher}/assigned-papers-to-check`).then((res) => res.data?.data ?? res.data);
}

export function getStudentsToGrade(subjectId) {
  return axiosInstance.get(`${teacher}/student-answers-to-check/${subjectId}`).then((res) => res.data?.data ?? res.data);
}

export function getAllSubmissions() {
  return axiosInstance.get(`${teacher}/all-student-answers-to-check`).then((res) => res.data?.data ?? res.data);
}

export function getStudentSubmissionDetail(subjectId, studentId) {
  return axiosInstance
    .get(`${teacher}/student-answers-to-check/${subjectId}/student/${studentId}`)
    .then((res) => res.data?.data ?? res.data);
}

export function assignQuestionMark(payload) {
  return axiosInstance.post(`${teacher}/assign-question-mark`, payload).then((res) => res.data?.data ?? res.data);
}

export function getTeacherCenterStudents() {
  return axiosInstance.get(`${teacher}/center-students`).then((res) => res.data?.data ?? res.data);
}

export function getTeacherStudentDetail(studentId) {
  return axiosInstance.get(`${teacher}/student/${studentId}`).then((res) => res.data?.data ?? res.data);
}

export function createTeacherStudent(payload) {
  return axiosInstance.post(`${teacher}/student`, payload).then((res) => res.data?.data ?? res.data);
}

export function updateTeacherStudent(studentId, payload) {
  return axiosInstance.put(`${teacher}/student/${studentId}`, payload).then((res) => res.data?.data ?? res.data);
}

export function deactivateTeacherStudent(studentId) {
  return axiosInstance.patch(`${teacher}/student/${studentId}/deactivate`).then((res) => res.data?.data ?? res.data);
}

export function activateTeacherStudent(studentId) {
  return axiosInstance.patch(`${teacher}/student/${studentId}/activate`).then((res) => res.data?.data ?? res.data);
}

export function deleteTeacherStudent(studentId) {
  return axiosInstance.delete(`${teacher}/student/${studentId}`).then((res) => res.data?.data ?? res.data);
}
