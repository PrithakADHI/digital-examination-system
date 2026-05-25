import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as adminApi from "../api/admin.js";
import { adminKeys } from "../api/queryKeys.js";

export function useExamSummary() {
  return useQuery({
    queryKey: adminKeys.examSummary(),
    queryFn: adminApi.getExamSummary,
  });
}

export function useUserCounts() {
  return useQuery({
    queryKey: adminKeys.userCounts(),
    queryFn: adminApi.getUserCounts,
  });
}

export function useTopStudents() {
  return useQuery({
    queryKey: adminKeys.topStudents(),
    queryFn: adminApi.getTopStudents,
  });
}

export function useExamsCreationTrend() {
  return useQuery({
    queryKey: adminKeys.examsCreationTrend(),
    queryFn: adminApi.getExamsCreationTrend,
  });
}

export function useExamAverageScores() {
  return useQuery({
    queryKey: adminKeys.examAverageScores(),
    queryFn: adminApi.getExamAverageScores,
  });
}

export function useExaminations(params) {
  return useQuery({
    queryKey: adminKeys.examinations(params),
    queryFn: () => adminApi.getExaminations(params),
  });
}

export function useExamination(id, options = {}) {
  return useQuery({
    queryKey: adminKeys.examination(id),
    queryFn: () => adminApi.getExamination(id),
    enabled: !!id && (options.enabled !== false),
    ...options,
  });
}

export function useCenters(params) {
  return useQuery({
    queryKey: adminKeys.centers(params),
    queryFn: () => adminApi.getCenters(params),
  });
}

export function useUsers(params) {
  return useQuery({
    queryKey: adminKeys.users(params),
    queryFn: () => adminApi.getUsers(params),
  });
}

export function useCreateExamination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.createExamination,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.examinations() });
      qc.invalidateQueries({ queryKey: adminKeys.dashboard() });
    },
  });
}

export function useUpdateExamination(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => adminApi.updateExamination(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.examinations() });
      qc.invalidateQueries({ queryKey: adminKeys.examination(id) });
      qc.invalidateQueries({ queryKey: adminKeys.dashboard() });
    },
  });
}

export function useDeleteExamination() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.deleteExamination,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.examinations() });
      qc.invalidateQueries({ queryKey: adminKeys.dashboard() });
    },
  });
}

export function usePatchExaminationCenters(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (center_fk_list) => adminApi.patchExaminationCenters(id, center_fk_list),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.examinations() });
      qc.invalidateQueries({ queryKey: adminKeys.examination(id) });
    },
  });
}

export function useCreateCenter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.createCenter,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.centers() });
    },
  });
}

export function useUpdateCenter(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => adminApi.updateCenter(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.centers() });
    },
  });
}

export function useDeleteCenter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.deleteCenter,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.centers() });
    },
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.createUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });
}

export function useUpdateUser(id) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => adminApi.updateUser(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.deactivateUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });
}

export function useActivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.activateUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });
}

export function useAnswersBySubject(subjectId) {
  return useQuery({
    queryKey: adminKeys.answersBySubject(subjectId),
    queryFn: () => adminApi.getAnswersBySubject(subjectId),
    enabled: !!subjectId,
  });
}

export function useAssignBulkStudents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.assignBulkStudents,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: adminKeys.answersBySubject(variables.subject_fk_id) });
    },
  });
}

export function useQuestionsReviewList() {
  return useQuery({
    queryKey: ["questionsReviewList"],
    queryFn: adminApi.getQuestionsReviewList,
  });
}

export function useQuestionsReviewDetail(paperId) {
  return useQuery({
    queryKey: ["questionsReviewDetail", paperId],
    queryFn: () => adminApi.getQuestionsReviewDetail(paperId),
    enabled: !!paperId,
    retry: false,
  });
}

export function useApproveOrDisapproveQuestionPaper() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ paperId, ...payload }) => adminApi.approveOrDisapproveQuestionPaper(paperId, payload),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["questionsReviewList"] });
      qc.invalidateQueries({ queryKey: ["questionsReviewDetail", variables.paperId] });
    },
  });
}
