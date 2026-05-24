import { useQuery } from "@tanstack/react-query";
import * as teacherApi from "../api/teacher.js";
import { teacherKeys } from "../api/queryKeys.js";

export function useTeacherExamSummary() {
  return useQuery({
    queryKey: teacherKeys.examSummary(),
    queryFn: teacherApi.getTeacherExamSummary,
  });
}

export function useTeacherUpcomingExaminations() {
  return useQuery({
    queryKey: teacherKeys.upcomingExaminations(),
    queryFn: () => teacherApi.getTeacherUpcomingExaminations({ limit: 6 }),
  });
}

export function useTeacherTopStudents() {
  return useQuery({
    queryKey: teacherKeys.topStudents(),
    queryFn: () => teacherApi.getTeacherTopStudents({ limit: 3 }),
  });
}

export function useTeacherAverageResultsOverExaminations() {
  return useQuery({
    queryKey: teacherKeys.averageResultsOverExaminations(),
    queryFn: teacherApi.getTeacherAverageResultsOverExaminations,
  });
}

export function useAssignedQuestionsToWrite() {
  return useQuery({
    queryKey: teacherKeys.assignedQuestionsToWrite(),
    queryFn: teacherApi.getAssignedQuestionsToWrite,
  });
}

export function useQuestionPaper(subjectId) {
  return useQuery({
    queryKey: ["questionPaper", subjectId],
    queryFn: () => teacherApi.getQuestionPaperById(subjectId),
    enabled: !!subjectId,
    retry: false,
  });
}

export function useAssignedPapersToCheck() {
  return useQuery({
    queryKey: teacherKeys.assignedPapersToCheck(),
    queryFn: teacherApi.getAllAssignedPapersToCheck,
  });
}

export function useAllSubmissions() {
  return useQuery({
    queryKey: teacherKeys.allSubmissions(),
    queryFn: teacherApi.getAllSubmissions,
  });
}

export function useStudentsToGrade(subjectId) {
  return useQuery({
    queryKey: teacherKeys.studentsToGrade(subjectId),
    queryFn: () => teacherApi.getStudentsToGrade(subjectId),
    enabled: !!subjectId,
  });
}

export function useStudentSubmission(subjectId, studentId) {
  return useQuery({
    queryKey: teacherKeys.studentSubmission(subjectId, studentId),
    queryFn: () => teacherApi.getStudentSubmissionDetail(subjectId, studentId),
    enabled: !!subjectId && !!studentId,
  });
}

import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useAssignQuestionMark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: teacherApi.assignQuestionMark,
    onSuccess: (_, variables) => {
      // Logic for invalidating specific submission/student lists can be added here
      queryClient.invalidateQueries({ queryKey: teacherKeys.all });
    },
  });
}

export function useTeacherCenterStudents() {
  return useQuery({
    queryKey: teacherKeys.centerStudents(),
    queryFn: teacherApi.getTeacherCenterStudents,
  });
}

export function useTeacherStudentDetail(studentId, options = {}) {
  return useQuery({
    queryKey: teacherKeys.studentDetail(studentId),
    queryFn: () => teacherApi.getTeacherStudentDetail(studentId),
    enabled: !!studentId && (options.enabled !== false),
    ...options,
  });
}

export function useCreateTeacherStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: teacherApi.createTeacherStudent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teacherKeys.centerStudents() });
    },
  });
}

export function useUpdateTeacherStudent(studentId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => teacherApi.updateTeacherStudent(studentId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teacherKeys.centerStudents() });
      qc.invalidateQueries({ queryKey: teacherKeys.studentDetail(studentId) });
    },
  });
}

export function useDeactivateTeacherStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: teacherApi.deactivateTeacherStudent,
    onSuccess: (_, studentId) => {
      qc.invalidateQueries({ queryKey: teacherKeys.centerStudents() });
      qc.invalidateQueries({ queryKey: teacherKeys.studentDetail(studentId) });
    },
  });
}

export function useActivateTeacherStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: teacherApi.activateTeacherStudent,
    onSuccess: (_, studentId) => {
      qc.invalidateQueries({ queryKey: teacherKeys.centerStudents() });
      qc.invalidateQueries({ queryKey: teacherKeys.studentDetail(studentId) });
    },
  });
}

export function useDeleteTeacherStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: teacherApi.deleteTeacherStudent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teacherKeys.centerStudents() });
    },
  });
}
