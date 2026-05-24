import { useQuery } from "@tanstack/react-query";
import * as studentApi from "../api/student.js";
import { studentKeys } from "../api/queryKeys.js";

export function useStudentProfile() {
  return useQuery({
    queryKey: studentKeys.profile(),
    queryFn: studentApi.getStudentProfile,
  });
}

export function useStudentExamSummary() {
  return useQuery({
    queryKey: studentKeys.examSummary(),
    queryFn: studentApi.getStudentExamSummary,
  });
}

export function useStudentUpcomingExaminations() {
  return useQuery({
    queryKey: studentKeys.upcomingExaminations(),
    queryFn: () => studentApi.getStudentUpcomingExaminations({ limit: 6 }),
  });
}

export function useStudentAverageResultsOverExaminations() {
  return useQuery({
    queryKey: studentKeys.averageResultsOverExaminations(),
    queryFn: studentApi.getStudentAverageResultsOverExaminations,
  });
}

export function useStudentExaminations() {
  return useQuery({
    queryKey: studentKeys.examinations(),
    queryFn: studentApi.getStudentExaminations,
  });
}

export function useStudentExaminationDetail(id) {
  return useQuery({
    queryKey: studentKeys.examinationDetail(id),
    queryFn: () => studentApi.getStudentExaminationById(id),
    enabled: !!id,
  });
}
